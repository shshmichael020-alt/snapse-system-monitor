param (
    [int]$SizeMB = 400,
    [int]$HoldSec = 4,
    [string]$LogFile = ""
)

$startTime = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$isoStart = [DateTime]::UtcNow.ToString("o")

Write-Host "Starting Memory Ramp Workload: Size=${SizeMB}MB, Hold=${HoldSec}s at ${isoStart}"

$chunks = [System.Collections.Generic.List[byte[]]]::new()
$chunkSize = 10 * 1024 * 1024 # 10MB chunk
$numChunks = [Math]::Floor($SizeMB / 10)

try {
    for ($i = 0; $i -lt $numChunks; $i++) {
        $buf = [byte[]]::new($chunkSize)
        for ($k = 0; $k -lt $buf.Length; $k += 4096) {
            $buf[$k] = 1 # touch pages to ensure physical allocation
        }
        $chunks.Add($buf)
    }

    Start-Sleep -Seconds $HoldSec
}
finally {
    $chunks.Clear()
    $chunks = $null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}

$endTime = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$isoEnd = [DateTime]::UtcNow.ToString("o")

Write-Host "Memory Ramp Completed at ${isoEnd}"

if ($LogFile -ne "") {
    $entry = [PSCustomObject]@{
        Workload = "Memory_Ramp"
        SizeMB = $SizeMB
        HoldSec = $HoldSec
        StartTimestampMs = $startTime
        EndTimestampMs = $endTime
        IsoStart = $isoStart
        IsoEnd = $isoEnd
    }
    $entry | Export-Csv -Path $LogFile -NoTypeInformation -Append
}
