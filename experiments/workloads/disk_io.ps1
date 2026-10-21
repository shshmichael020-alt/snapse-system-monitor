param (
    [int]$TotalMB = 100,
    [string]$ScratchDir = "D:\OS\Snapse\experiments\scratch",
    [string]$LogFile = ""
)

if (-not (Test-Path $ScratchDir)) {
    New-Item -ItemType Directory -Path $ScratchDir -Force | Out-Null
}

$startTime = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$isoStart = [DateTime]::UtcNow.ToString("o")

Write-Host "Starting Disk I/O Workload: TotalMB=${TotalMB} at ${isoStart}"

$filePath = Join-Path $ScratchDir "io_test_$(Get-Random).dat"
$chunkSize = 1024 * 1024 # 1MB
$buf = [byte[]]::new($chunkSize)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($buf)

try {
    $fs = [System.IO.File]::Create($filePath, $chunkSize, [System.IO.FileOptions]::WriteThrough)
    for ($i = 0; $i -lt $TotalMB; $i++) {
        $fs.Write($buf, 0, $buf.Length)
    }
    $fs.Flush()
    $fs.Close()

    # Read back
    $fsRead = [System.IO.File]::OpenRead($filePath)
    $readBuf = [byte[]]::new($chunkSize)
    while ($fsRead.Read($readBuf, 0, $chunkSize) -gt 0) {
        # consume
    }
    $fsRead.Close()
}
finally {
    if (Test-Path $filePath) {
        Remove-Item -Path $filePath -Force -ErrorAction SilentlyContinue
    }
}

$endTime = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$isoEnd = [DateTime]::UtcNow.ToString("o")

Write-Host "Disk I/O Completed at ${isoEnd}"

if ($LogFile -ne "") {
    $entry = [PSCustomObject]@{
        Workload = "Disk_IO"
        TotalMB = $TotalMB
        StartTimestampMs = $startTime
        EndTimestampMs = $endTime
        IsoStart = $isoStart
        IsoEnd = $isoEnd
    }
    $entry | Export-Csv -Path $LogFile -NoTypeInformation -Append
}
