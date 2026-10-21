# Snapse Windows V1 — GitHub Release & Distribution Checklist

This document details the procedure for packaging, verifying, and publishing the Snapse Windows desktop application to GitHub Releases without committing binary installers into Git version control.

---

## 1. Release Packaging Architecture

- **Artifact Name**: `Snapse-Setup-v1.0.0-x64.exe`
- **Installer Type**: NSIS (Nullsoft Scriptable Install System) 64-bit installer
- **File Size**: 2,683,474 bytes (~2.56 MiB)
- **SHA-256**: `FB2974097B3C90A6C45FC955B21DE5A69E0C381D4EF3D46E2935B6B225891ACA`
- **Target OS**: Windows 10 (version 1803+) and Windows 11 (x86_64)
- **Embedded Dependencies**:
  - `snapse.exe` (Rust native engine + Tauri 2 desktop shell, compiled in release profile with LTO)
  - `WebView2Loader.dll` (bundled beside executable to support GNU/LLVM and MinGW targets)
  - Static frontend assets (React 18 + Vite 5 + Tailwind CSS bundle embedded in binary)

---

## 2. Pre-Release Verification Protocol

Before attaching the installer to any GitHub Release, perform the following local validation steps:

1. **Frontend Production Build**:
   ```powershell
   npm run build
   ```
   *Expected outcome*: Type checking passes (`tsc`) and Vite renders minified HTML/CSS/JS chunks in `dist/`.

2. **Backend Unit & Integration Tests**:
   ```powershell
   cargo test --manifest-path src-tauri/Cargo.toml
   ```
   *Expected outcome*: 10/10 tests pass, covering ring buffer limits, process safety guards, alert thresholds, CSV export, and adaptive controller FSM transitions.

3. **Packaging Build**:
   ```powershell
   npm run tauri build
   ```
   *Expected outcome*: Tauri bundles `dist/` and compiles `snapse.exe` into the NSIS installer at `src-tauri/target/x86_64-pc-windows-gnullvm/release/bundle/nsis/Snapse_1.0.0_x64-setup.exe`.

4. **Staging to Release Directory**:
   Copy the verified installer to `release/Snapse-Setup-v1.0.0-x64.exe`:
   ```powershell
   Copy-Item -Path "src-tauri\target\x86_64-pc-windows-gnullvm\release\bundle\nsis\Snapse_1.0.0_x64-setup.exe" -Destination "release\Snapse-Setup-v1.0.0-x64.exe" -Force
   ```

5. **Generate Cryptographic Checksum**:
   ```powershell
   Get-FileHash -Algorithm SHA256 -Path "release\Snapse-Setup-v1.0.0-x64.exe" | Format-List
   ```

---

## 3. Fresh Installation & Runtime Validation

1. **Clean Installation**:
   - Run `release\Snapse-Setup-v1.0.0-x64.exe` (or silent install via `/S`).
   - Default install path: `C:\Users\<User>\AppData\Local\Programs\Snapse`.
2. **Dependency Verification**:
   - Confirm `snapse.exe` exists in the installation directory.
   - Confirm `WebView2Loader.dll` exists beside `snapse.exe`.
3. **Execution Test**:
   - Launch `snapse.exe`.
   - Verify frameless window initializes with working window caption controls (Minimize, Maximize/Restore, Close).
   - Verify real CPU utilization, memory percentage, disk activity, and network transfer rates update live.
   - Verify process table enumerates real Windows processes with working search and sorting.
4. **Clean Uninstallation**:
   - Run the uninstaller (`Uninstall Snapse.exe` or Windows Settings > Installed Apps).
   - Confirm that application files and `WebView2Loader.dll` are removed cleanly.

---

## 4. GitHub Release Creation Instructions (When Ready)

When publishing to GitHub in the future:

1. **Tag the Commit**:
   ```powershell
   git tag -a v1.0.0 -m "Release Snapse Windows V1 (v1.0.0)"
   git push origin v1.0.0
   ```
2. **Create GitHub Release via Web UI or GitHub CLI**:
   - Title: `Snapse Windows V1 (v1.0.0)`
   - Attach file: `release/Snapse-Setup-v1.0.0-x64.exe`
   - Include SHA-256 checksum in the release notes.
3. **DO NOT** commit the `.exe` installer into Git history. Binaries are distributed exclusively as GitHub Release assets.
