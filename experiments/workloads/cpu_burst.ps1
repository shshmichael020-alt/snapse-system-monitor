param (
    [int]$DurationSec = 3,
    [int]$Threads = 4,
    [string]$LogFile = ""
)

$startTime = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$isoStart = [DateTime]::UtcNow.ToString("o")

Write-Host "Starting CPU Burst Workload: Duration=${DurationSec}s, Threads=${Threads} at ${isoStart}"

$jobs = @()
for ($i = 0; $i -lt $Threads; $i++) {
    $jobs += [System.Threading.Tasks.Task]::Run([Action]{
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $targetMs = $DurationSec * 1000
        $acc = 0.0
        while ($sw.ElapsedMilliseconds -lt $targetMs) {
            for ($j = 0; $j -lt 50000; $j++) {
                $acc += [Math]::Sqrt($j) * [Math]::Sin($j)
            }
        }
    })
}

[System.Threading.Tasks.Task]::WaitAll($jobs)

$endTime = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$isoEnd = [DateTime]::UtcNow.ToString("o")

Write-Host "CPU Burst Completed: Duration=${DurationSec}s at ${isoEnd}"

if ($LogFile -ne "") {
    $entry = [PSCustomObject]@{
        Workload = "CPU_Burst"
        DurationSec = $DurationSec
        Threads = $Threads
        StartTimestampMs = $startTime
        EndTimestampMs = $endTime
        IsoStart = $isoStart
        IsoEnd = $isoEnd
    }
    $entry | Export-Csv -Path $LogFile -NoTypeInformation -Append
}
