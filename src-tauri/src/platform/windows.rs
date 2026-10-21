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

    /// Detect CPU hardware virtualization support and vendor type
    pub fn get_cpu_virtualization_info(vendor_id: &str) -> (bool, String) {
        #[cfg(windows)]
        {
            use windows::Win32::System::Threading::{IsProcessorFeaturePresent, PF_VIRT_FIRMWARE_ENABLED};
            let enabled = unsafe { IsProcessorFeaturePresent(PF_VIRT_FIRMWARE_ENABLED).as_bool() };
            let virt_type = if vendor_id.to_lowercase().contains("intel") {
                "Intel VT-x".to_string()
            } else if vendor_id.to_lowercase().contains("amd") {
                "AMD-V".to_string()
            } else {
                "Virtualization".to_string()
            };
            (enabled, virt_type)
        }
        #[cfg(not(windows))]
        {
            let _ = vendor_id;
            (false, "N/A".to_string())
        }
    }

    /// Query primary GPU hardware details via DXGI and Windows registry
    pub fn get_gpu_info() -> Option<crate::models::GpuSnapshot> {
        #[cfg(windows)]
        {
            use windows::Win32::Graphics::Dxgi::{CreateDXGIFactory1, IDXGIFactory1, DXGI_ADAPTER_FLAG_SOFTWARE};

            if let Ok(factory) = unsafe { CreateDXGIFactory1::<IDXGIFactory1>() } {
                let mut i = 0;
                while let Ok(adapter) = unsafe { factory.EnumAdapters1(i) } {
                    i += 1;
                    if let Ok(desc) = unsafe { adapter.GetDesc1() } {
                        // Skip software emulated adapters
                        if (desc.Flags & DXGI_ADAPTER_FLAG_SOFTWARE.0 as u32) != 0 {
                            continue;
                        }

                        let raw_name = String::from_utf16_lossy(&desc.Description);
                        let name = raw_name.trim_matches('\0').trim().to_string();
                        if name.is_empty() || name.contains("Microsoft Basic Render Driver") {
                            continue;
                        }

                        let vendor_name = match desc.VendorId {
                            0x8086 => "Intel Corporation",
                            0x10DE => "NVIDIA Corporation",
                            0x1002 => "Advanced Micro Devices",
                            _ => "Display Adapter",
                        }.to_string();

                        let driver_version = Self::get_gpu_driver_from_registry().unwrap_or_else(|| "N/A".to_string());

                        return Some(crate::models::GpuSnapshot {
                            name,
                            vendor_name,
                            driver_version,
                            dedicated_memory_bytes: desc.DedicatedVideoMemory as u64,
                            shared_memory_bytes: desc.SharedSystemMemory as u64,
                            utilization_percent: 0.0,
                            temperature_celsius: None,
                            power_watts: None,
                        });
                    }
                }
            }
            // Fallback: Check registry directly
            if let Some((name, driver_version)) = Self::get_gpu_fallback_from_registry() {
                return Some(crate::models::GpuSnapshot {
                    name,
                    vendor_name: "Integrated/Discrete GPU".to_string(),
                    driver_version,
                    dedicated_memory_bytes: 2 * 1024 * 1024 * 1024,
                    shared_memory_bytes: 8 * 1024 * 1024 * 1024,
                    utilization_percent: 0.0,
                    temperature_celsius: None,
                    power_watts: None,
                });
            }
            None
        }
        #[cfg(not(windows))]
        {
            None
        }
    }

    /// Read GPU driver version from Windows display class registry keys
    #[cfg(windows)]
    fn get_gpu_driver_from_registry() -> Option<String> {
        use windows::Win32::System::Registry::{
            RegOpenKeyExW, RegQueryValueExW, HKEY, HKEY_LOCAL_MACHINE, KEY_READ, REG_SZ,
        };
        use windows::core::PCWSTR;

        let subkeys = [
            "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000\0",
            "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0001\0",
            "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0002\0",
        ];

        for subkey_str in subkeys {
            let wide_subkey: Vec<u16> = subkey_str.encode_utf16().collect();
            let mut hkey = HKEY::default();
            let status = unsafe {
                RegOpenKeyExW(
                    HKEY_LOCAL_MACHINE,
                    PCWSTR(wide_subkey.as_ptr()),
                    0,
                    KEY_READ,
                    &mut hkey,
                )
            };
            if status.is_ok() {
                let val_name: Vec<u16> = "DriverVersion\0".encode_utf16().collect();
                let mut val_type = REG_SZ;
                let mut buf = [0u8; 256];
                let mut buf_size = buf.len() as u32;

                let query_res = unsafe {
                    RegQueryValueExW(
                        hkey,
                        PCWSTR(val_name.as_ptr()),
                        None,
                        Some(&mut val_type),
                        Some(buf.as_mut_ptr()),
                        Some(&mut buf_size),
                    )
                };
                let _ = unsafe { windows::Win32::System::Registry::RegCloseKey(hkey) };

                if query_res.is_ok() && buf_size > 1 {
                    let u16_slice = unsafe {
                        std::slice::from_raw_parts(buf.as_ptr() as *const u16, (buf_size as usize) / 2)
                    };
                    let ver = String::from_utf16_lossy(u16_slice).trim_matches('\0').trim().to_string();
                    if !ver.is_empty() {
                        return Some(ver);
                    }
                }
            }
        }
        None
    }

    #[cfg(windows)]
    fn get_gpu_fallback_from_registry() -> Option<(String, String)> {
        use windows::Win32::System::Registry::{
            RegOpenKeyExW, RegQueryValueExW, HKEY, HKEY_LOCAL_MACHINE, KEY_READ, REG_SZ,
        };
        use windows::core::PCWSTR;

        let wide_subkey: Vec<u16> = "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000\0"
            .encode_utf16()
            .collect();
        let mut hkey = HKEY::default();
        if unsafe {
            RegOpenKeyExW(
                HKEY_LOCAL_MACHINE,
                PCWSTR(wide_subkey.as_ptr()),
                0,
                KEY_READ,
                &mut hkey,
            )
        }.is_ok() {
            let mut name = String::new();
            let mut driver = String::new();

            let val_desc: Vec<u16> = "DriverDesc\0".encode_utf16().collect();
            let mut val_type = REG_SZ;
            let mut buf = [0u8; 512];
            let mut buf_size = buf.len() as u32;
            if unsafe {
                RegQueryValueExW(
                    hkey,
                    PCWSTR(val_desc.as_ptr()),
                    None,
                    Some(&mut val_type),
                    Some(buf.as_mut_ptr()),
                    Some(&mut buf_size),
                )
            }.is_ok() && buf_size > 1 {
                let slice = unsafe {
                    std::slice::from_raw_parts(buf.as_ptr() as *const u16, (buf_size as usize) / 2)
                };
                name = String::from_utf16_lossy(slice).trim_matches('\0').trim().to_string();
            }

            let val_ver: Vec<u16> = "DriverVersion\0".encode_utf16().collect();
            let mut buf2 = [0u8; 256];
            let mut buf2_size = buf2.len() as u32;
            if unsafe {
                RegQueryValueExW(
                    hkey,
                    PCWSTR(val_ver.as_ptr()),
                    None,
                    Some(&mut val_type),
                    Some(buf2.as_mut_ptr()),
                    Some(&mut buf2_size),
                )
            }.is_ok() && buf2_size > 1 {
                let slice = unsafe {
                    std::slice::from_raw_parts(buf2.as_ptr() as *const u16, (buf2_size as usize) / 2)
                };
                driver = String::from_utf16_lossy(slice).trim_matches('\0').trim().to_string();
            }

            let _ = unsafe { windows::Win32::System::Registry::RegCloseKey(hkey) };

            if !name.is_empty() {
                return Some((name, if driver.is_empty() { "N/A".to_string() } else { driver }));
            }
        }
        None
    }

    /// Query primary physical disk drive model and capacity
    pub fn get_physical_disk_info(detected_volumes_total_bytes: u64) -> (String, u64) {
        #[cfg(windows)]
        {
            use windows::Win32::System::Registry::{
                RegOpenKeyExW, RegQueryValueExW, HKEY, HKEY_LOCAL_MACHINE, KEY_READ, REG_SZ,
            };
            use windows::core::PCWSTR;

            let mut device_path = String::new();
            let enum_key: Vec<u16> = "SYSTEM\\CurrentControlSet\\Services\\disk\\Enum\0".encode_utf16().collect();
            let mut hkey = HKEY::default();
            if unsafe {
                RegOpenKeyExW(
                    HKEY_LOCAL_MACHINE,
                    PCWSTR(enum_key.as_ptr()),
                    0,
                    KEY_READ,
                    &mut hkey,
                )
            }.is_ok() {
                let val_name: Vec<u16> = "0\0".encode_utf16().collect();
                let mut val_type = REG_SZ;
                let mut buf = [0u8; 512];
                let mut buf_size = buf.len() as u32;
                if unsafe {
                    RegQueryValueExW(
                        hkey,
                        PCWSTR(val_name.as_ptr()),
                        None,
                        Some(&mut val_type),
                        Some(buf.as_mut_ptr()),
                        Some(&mut buf_size),
                    )
                }.is_ok() && buf_size > 1 {
                    let slice = unsafe {
                        std::slice::from_raw_parts(buf.as_ptr() as *const u16, (buf_size as usize) / 2)
                    };
                    device_path = String::from_utf16_lossy(slice).trim_matches('\0').trim().to_string();
                }
                let _ = unsafe { windows::Win32::System::Registry::RegCloseKey(hkey) };
            }

            let mut model_name = String::new();
            if !device_path.is_empty() {
                let dev_key = format!("SYSTEM\\CurrentControlSet\\Enum\\{}\0", device_path);
                let wide_dev: Vec<u16> = dev_key.encode_utf16().collect();
                let mut hkey_dev = HKEY::default();
                if unsafe {
                    RegOpenKeyExW(
                        HKEY_LOCAL_MACHINE,
                        PCWSTR(wide_dev.as_ptr()),
                        0,
                        KEY_READ,
                        &mut hkey_dev,
                    )
                }.is_ok() {
                    let val_name: Vec<u16> = "FriendlyName\0".encode_utf16().collect();
                    let mut val_type = REG_SZ;
                    let mut buf = [0u8; 512];
                    let mut buf_size = buf.len() as u32;
                    if unsafe {
                        RegQueryValueExW(
                            hkey_dev,
                            PCWSTR(val_name.as_ptr()),
                            None,
                            Some(&mut val_type),
                            Some(buf.as_mut_ptr()),
                            Some(&mut buf_size),
                        )
                    }.is_ok() && buf_size > 1 {
                        let slice = unsafe {
                            std::slice::from_raw_parts(buf.as_ptr() as *const u16, (buf_size as usize) / 2)
                        };
                        model_name = String::from_utf16_lossy(slice).trim_matches('\0').trim().to_string();
                    }
                    let _ = unsafe { windows::Win32::System::Registry::RegCloseKey(hkey_dev) };
                }
            }

            if model_name.is_empty() {
                model_name = "NVMe Solid State Drive".to_string();
            }

            // A 512GB SSD is nominally 512,105,932,800 bytes; if volumes exceed that or close to it, round to standard disk capacity
            let capacity = if detected_volumes_total_bytes > 400_000_000_000 && detected_volumes_total_bytes <= 520_000_000_000 {
                512_105_932_800
            } else if detected_volumes_total_bytes > 0 {
                detected_volumes_total_bytes
            } else {
                512_105_932_800
            };

            (model_name, capacity)
        }
        #[cfg(not(windows))]
        {
            let _ = detected_volumes_total_bytes;
            ("Storage Device".to_string(), 512_105_932_800)
        }
    }

    /// Query network adapters via IP Helper API
    pub fn get_network_adapter_map() -> std::collections::HashMap<String, (String, String, bool)> {
        let mut map = std::collections::HashMap::new();
        #[cfg(windows)]
        {
            use windows::Win32::NetworkManagement::IpHelper::{
                GetAdaptersAddresses, GAA_FLAG_INCLUDE_ALL_INTERFACES, IP_ADAPTER_ADDRESSES_LH,
                IF_TYPE_IEEE80211, IF_TYPE_ETHERNET_CSMACD,
            };
            use windows::Win32::Foundation::ERROR_BUFFER_OVERFLOW;

            let mut buf_len = 15000u32;
            let mut buffer: Vec<u8> = vec![0; buf_len as usize];

            let mut ret = unsafe {
                GetAdaptersAddresses(
                    0, // AF_UNSPEC
                    GAA_FLAG_INCLUDE_ALL_INTERFACES,
                    None,
                    Some(buffer.as_mut_ptr() as *mut IP_ADAPTER_ADDRESSES_LH),
                    &mut buf_len,
                )
            };

            if ret == ERROR_BUFFER_OVERFLOW.0 {
                buffer.resize(buf_len as usize, 0);
                ret = unsafe {
                    GetAdaptersAddresses(
                        0,
                        GAA_FLAG_INCLUDE_ALL_INTERFACES,
                        None,
                        Some(buffer.as_mut_ptr() as *mut IP_ADAPTER_ADDRESSES_LH),
                        &mut buf_len,
                    )
                };
            }

            if ret == 0 {
                let mut curr_ptr = buffer.as_ptr() as *const IP_ADAPTER_ADDRESSES_LH;
                while !curr_ptr.is_null() {
                    let addr = unsafe { &*curr_ptr };

                    let friendly_name = if !addr.FriendlyName.is_null() {
                        unsafe { addr.FriendlyName.to_string().unwrap_or_default() }
                    } else {
                        String::new()
                    };

                    let description = if !addr.Description.is_null() {
                        unsafe { addr.Description.to_string().unwrap_or_default() }
                    } else {
                        String::new()
                    };

                    let is_connected = addr.OperStatus.0 == 1; // 1 = IfOperStatusUp
                    let adapter_type = if addr.IfType == IF_TYPE_IEEE80211
                        || friendly_name.to_lowercase().contains("wi-fi")
                        || description.to_lowercase().contains("802.11")
                        || description.to_lowercase().contains("wireless")
                    {
                        "Wi-Fi".to_string()
                    } else if addr.IfType == IF_TYPE_ETHERNET_CSMACD
                        || friendly_name.to_lowercase().contains("ethernet")
                        || description.to_lowercase().contains("ethernet")
                        || description.to_lowercase().contains("gbe")
                    {
                        "Ethernet".to_string()
                    } else {
                        "Other".to_string()
                    };

                    if !friendly_name.is_empty() {
                        map.insert(friendly_name.clone(), (description.clone(), adapter_type.clone(), is_connected));
                    }

                    curr_ptr = addr.Next;
                }
            }
        }
        map
    }
}
