param (
    [string]$ManifestFile = "D:\OS\Snapse\experiments\manifests\workload_manifest.csv"
)

$manifestDir = [System.IO.Path]::GetDirectoryName($ManifestFile)
if (-not (Test-Path $manifestDir)) {
    New-Item -ItemType Directory -Path $manifestDir -Force | Out-Null
}

$workloadDir = "D:\OS\Snapse\experiments\workloads"
Write-Host "Starting Churn Scenario Benchmark Workload Suite..."

# Phase 1: Baseline Idle (5s)
Write-Host "Phase 1: Baseline Idle (5s)..."
Start-Sleep -Seconds 5

# Phase 2: CPU Burst (3s)
Write-Host "Phase 2: CPU Burst (3s)..."
& "$workloadDir\cpu_burst.ps1" -DurationSec 3 -Threads 4 -LogFile $ManifestFile

# Phase 3: Transition Idle (3s)
Write-Host "Phase 3: Transition Idle (3s)..."
Start-Sleep -Seconds 3

# Phase 4: Memory Ramp (400MB, 4s hold)
Write-Host "Phase 4: Memory Ramp (400MB, 4s)..."
& "$workloadDir\memory_ramp.ps1" -SizeMB 400 -HoldSec 4 -LogFile $ManifestFile

# Phase 5: Transition Idle (3s)
Write-Host "Phase 5: Transition Idle (3s)..."
Start-Sleep -Seconds 3

# Phase 6: Disk I/O (100MB)
Write-Host "Phase 6: Disk I/O (100MB)..."
& "$workloadDir\disk_io.ps1" -TotalMB 100 -LogFile $ManifestFile

# Phase 7: Cooldown Idle (5s)
Write-Host "Phase 7: Cooldown Idle (5s)..."
Start-Sleep -Seconds 5

Write-Host "Churn Scenario Complete. Events logged to $ManifestFile"
