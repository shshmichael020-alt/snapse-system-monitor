param (
    [switch]$Pilot,
    [int]$Reps = 3,
    [int]$DurationSec = 15
)

$baseDir = "D:\OS\Snapse"
$rawDir = "$baseDir\experiments\raw"
$manifestDir = "$baseDir\experiments\manifests"
$manifestFile = "$manifestDir\experiment_manifest.csv"
$workloadManifest = "$manifestDir\workload_groundtruth.csv"

if (-not (Test-Path $rawDir)) { New-Item -ItemType Directory -Path $rawDir -Force | Out-Null }
if (-not (Test-Path $manifestDir)) { New-Item -ItemType Directory -Path $manifestDir -Force | Out-Null }

if ($Pilot) {
    Write-Host ">>> RUNNING IN PILOT MODE (1 repetition, 10s duration) <<<" -ForegroundColor Yellow
    $Reps = 1
    $DurationSec = 10
}

Write-Host "============================================================"
Write-Host "   SNAPSE EXPERIMENTAL EXECUTION HARNESS"
Write-Host "   Repetitions per condition: $Reps"
Write-Host "   Duration per condition: ${DurationSec}s"
Write-Host "============================================================"

# Ensure benchmark binary is built in release profile for minimal test harness noise
Write-Host "Building benchmark runner (release profile)..."
cargo build --release --bin benchmark --manifest-path "$baseDir\src-tauri\Cargo.toml"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build benchmark runner"
    exit 1
}

$benchExe = "$baseDir\src-tauri\target\x86_64-pc-windows-gnullvm\release\benchmark.exe"
if (-not (Test-Path $benchExe)) {
    # check debug fallback
    $benchExe = "$baseDir\src-tauri\target\x86_64-pc-windows-gnullvm\debug\benchmark.exe"
}

$conditions = @(
    "Fixed_250ms",
    "Fixed_500ms",
    "Fixed_1000ms",
    "Fixed_2000ms",
    "Adaptive_VAC"
)

$workloads = @("Idle_Baseline", "Churn_Bursts")

foreach ($wl in $workloads) {
    Write-Host "`n>>> Evaluating Workload: $wl <<<" -ForegroundColor Cyan

    foreach ($cond in $conditions) {
        $modeArg = switch ($cond) {
            "Fixed_250ms"  { "fixed250" }
            "Fixed_500ms"  { "fixed500" }
            "Fixed_1000ms" { "fixed1000" }
            "Fixed_2000ms" { "fixed2000" }
            "Adaptive_VAC" { "adaptive" }
        }

        for ($r = 1; $r -le $Reps; $r++) {
            Write-Host "Running: Workload=$wl | Condition=$cond | Rep=$r..."

            # If workload is Churn_Bursts, spawn workload script asynchronously
            $wlJob = $null
            if ($wl -eq "Churn_Bursts") {
                $wlJob = Start-Job -ScriptBlock {
                    param($bDir, $wLog)
                    Start-Sleep -Seconds 2
                    # 3s CPU Burst
                    & "$bDir\experiments\workloads\cpu_burst.ps1" -DurationSec 3 -Threads 4 -LogFile $wLog
                    Start-Sleep -Seconds 2
                    # 400MB memory ramp
                    & "$bDir\experiments\workloads\memory_ramp.ps1" -SizeMB 400 -HoldSec 3 -LogFile $wLog
                } -ArgumentList $baseDir, $workloadManifest
            }

            # Execute benchmark collector
            & $benchExe --mode $modeArg --reps 1 --duration-sec $DurationSec --workload $wl --output-dir $rawDir --manifest $manifestFile

            if ($wlJob -ne $null) {
                Wait-Job $wlJob -Timeout 15 | Out-Null
                Remove-Job $wlJob -Force | Out-Null
            }

            # Inter-run cool-down to stabilize CPU thermals and C-states
            Start-Sleep -Seconds 2
        }
    }
}

Write-Host "`nAll benchmark runs completed! Output recorded to $manifestFile" -ForegroundColor Green
