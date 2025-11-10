#Requires -RunAsAdministrator
param(
    [Parameter(Mandatory = $true)]
    [string]$InstallerPath,

    [Parameter()]
    [string]$InstallArgs = "/VERYSILENT",

    [Parameter()]
    [string]$InstallDir = "C:\Program Files\SceneFlow Desktop Renderer",

    [Parameter()]
    [string]$LogDir = "$env:APPDATA\SceneFlow\logs"
)

function Assert-FileExists {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        throw "Expected file not found: $Path"
    }
}

function Invoke-Installer {
    Write-Host "Installing SceneFlow Desktop Renderer..."
    Start-Process -FilePath $InstallerPath -ArgumentList $InstallArgs -Wait -PassThru | Out-Null
}

function Launch-App {
    $exe = Join-Path $InstallDir "SceneFlow Desktop Renderer.exe"
    Assert-FileExists $exe
    Write-Host "Launching application: $exe"
    $process = Start-Process -FilePath $exe -PassThru
    Start-Sleep -Seconds 10
    if ($process.HasExited) {
        throw "Application exited unexpectedly with code $($process.ExitCode)"
    }
    $process.CloseMainWindow() | Out-Null
    $process | Stop-Process
}

function Verify-Logs {
    if (-not (Test-Path $LogDir)) {
        throw "Expected logs directory not found: $LogDir"
    }
    $latestLog = Get-ChildItem -Path $LogDir -Filter *.log | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latestLog) {
        throw "No log files found in $LogDir"
    }
    Write-Host "Latest log:" $latestLog.FullName
}

function Uninstall-App {
    Write-Host "Uninstalling SceneFlow Desktop Renderer..."
    $uninstallKey = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall"
    $entry = Get-ChildItem $uninstallKey | Where-Object {
        $_.GetValue("DisplayName") -eq "SceneFlow Desktop Renderer"
    } | Select-Object -First 1

    if ($entry) {
        $uninstaller = $entry.GetValue("UninstallString")
        if ($uninstaller) {
            Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "$uninstaller /VERYSILENT" -Wait
        }
    } else {
        Write-Warning "Uninstall entry not found."
    }

    if (Test-Path $InstallDir) {
        Remove-Item -Recurse -Force $InstallDir
    }
}

try {
    Assert-FileExists $InstallerPath
    Invoke-Installer
    Launch-App
    Verify-Logs
    Write-Host "Smoke test passed."
}
finally {
    Uninstall-App
}

