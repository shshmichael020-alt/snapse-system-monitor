#[cfg(windows)]
use windows::Win32::Foundation::{BOOL, HANDLE, HWND, LPARAM, WPARAM, CloseHandle};
#[cfg(windows)]
use windows::Win32::System::Threading::{
    GetCurrentProcess, GetCurrentProcessId, GetProcessTimes, OpenProcess, OpenProcessToken,
    TerminateProcess, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_TERMINATE,
};
#[cfg(windows)]
use windows::Win32::Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowThreadProcessId, IsWindowVisible, PostMessageW, WM_CLOSE,
};

pub struct PlatformOps;

impl PlatformOps {
    /// Check whether current Snapse process has elevated (administrator) privileges
    pub fn is_current_process_elevated() -> bool {
        #[cfg(windows)]
        unsafe {
            let mut token_handle = HANDLE::default();
            if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token_handle).is_ok() {
                let mut elevation = TOKEN_ELEVATION::default();
                let mut return_length = 0u32;
                let size = std::mem::size_of::<TOKEN_ELEVATION>() as u32;

                let success = GetTokenInformation(
                    token_handle,
                    TokenElevation,
                    Some(&mut elevation as *mut _ as *mut _),
                    size,
                    &mut return_length,
                );
                let _ = CloseHandle(token_handle);
                if success.is_ok() {
                    return elevation.TokenIsElevated != 0;
                }
            }
            false
        }
        #[cfg(not(windows))]
        {
            false
        }
    }

    /// Retrieve the creation time in seconds (Unix epoch) for a specific process ID
    pub fn get_process_creation_time(pid: u32) -> Option<u64> {
        #[cfg(windows)]
        unsafe {
            let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
            if let Ok(handle) = handle {
                if handle.is_invalid() {
                    return None;
                }
                let mut creation_time = windows::Win32::Foundation::FILETIME::default();
                let mut exit_time = windows::Win32::Foundation::FILETIME::default();
                let mut kernel_time = windows::Win32::Foundation::FILETIME::default();
                let mut user_time = windows::Win32::Foundation::FILETIME::default();

                let res = GetProcessTimes(
                    handle,
                    &mut creation_time,
                    &mut exit_time,
                    &mut kernel_time,
                    &mut user_time,
                );
                let _ = CloseHandle(handle);

                if res.is_ok() {
                    // Windows FILETIME is in 100-nanosecond intervals since Jan 1, 1601 UTC.
                    // Convert to Unix timestamp: difference between 1601 and 1970 is 11644473600 seconds.
                    let ft64 = ((creation_time.dwHighDateTime as u64) << 32)
                        | (creation_time.dwLowDateTime as u64);
                    let unix_secs = ft64.saturating_sub(116_444_736_000_000_000) / 10_000_000;
                    return Some(unix_secs);
                }
            }
            None
        }
        #[cfg(not(windows))]
        {
            let _ = pid;
            None
        }
    }

    /// Verify safety rules for process termination
    pub fn validate_process_action(pid: u32, expected_start_time: u64) -> Result<(), String> {
        #[cfg(windows)]
        unsafe {
            let current_pid = GetCurrentProcessId();
            if pid == current_pid {
                return Err("Cannot terminate Snapse from its own process manager.".to_string());
            }
        }

        if pid == 0 {
            return Err("Cannot terminate System Idle Process (PID 0).".to_string());
        }
        if pid == 4 {
            return Err("Cannot terminate Windows NT Kernel System Process (PID 4).".to_string());
        }

        // Verify process identity if expected_start_time is provided
        if expected_start_time > 0 {
            if let Some(actual_start_time) = Self::get_process_creation_time(pid) {
                // Allow a small 2-second tolerance for rounding/clock drift
                let diff = if actual_start_time > expected_start_time {
                    actual_start_time - expected_start_time
                } else {
                    expected_start_time - actual_start_time
                };
                if diff > 2 {
                    return Err(format!(
                        "Process identity mismatch: PID {} was recycled by a different process.",
                        pid
                    ));
                }
            } else {
                return Err(format!("Process {} is no longer accessible or has already terminated.", pid));
            }
        }

        Ok(())
    }

    /// Forcefully terminate a process with verification
    pub fn force_terminate_process(pid: u32, expected_start_time: u64) -> Result<(), String> {
        Self::validate_process_action(pid, expected_start_time)?;

        #[cfg(windows)]
        unsafe {
            let handle = OpenProcess(PROCESS_TERMINATE, false, pid);
            match handle {
                Ok(h) if !h.is_invalid() => {
                    let result = TerminateProcess(h, 1);
                    let _ = CloseHandle(h);
                    if result.is_ok() {
                        Ok(())
                    } else {
                        Err(format!("TerminateProcess failed for PID {}: Access denied or protected process.", pid))
                    }
                }
                _ => Err(format!(
                    "Could not open PID {} for termination. Administrator privileges or process permissions required.",
                    pid
                )),
            }
        }
        #[cfg(not(windows))]
        {
            let _ = pid;
            Err("Platform not supported".to_string())
        }
    }

    /// Request a graceful window close by posting WM_CLOSE to process windows
    pub fn request_close_process(pid: u32, expected_start_time: u64) -> Result<(), String> {
        Self::validate_process_action(pid, expected_start_time)?;

        #[cfg(windows)]
        unsafe {
            struct EnumData {
                target_pid: u32,
                windows_found: usize,
            }

            unsafe extern "system" fn enum_window_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
                let data = &mut *(lparam.0 as *mut EnumData);
                let mut proc_id = 0u32;
                GetWindowThreadProcessId(hwnd, Some(&mut proc_id));

                if proc_id == data.target_pid && IsWindowVisible(hwnd).as_bool() {
                    data.windows_found += 1;
                    let _ = PostMessageW(hwnd, WM_CLOSE, WPARAM(0), LPARAM(0));
                }
                BOOL(1)
            }

            let mut data = EnumData {
                target_pid: pid,
                windows_found: 0,
            };

            let _ = EnumWindows(
                Some(enum_window_callback),
                LPARAM(&mut data as *mut _ as isize),
            );

            if data.windows_found > 0 {
                Ok(())
            } else {
                Err(format!(
                    "PID {} does not have accessible top-level windows to close. Use Force End Task instead.",
                    pid
                ))
            }
        }
        #[cfg(not(windows))]
        {
            let _ = pid;
            Err("Platform not supported".to_string())
        }
    }
}
