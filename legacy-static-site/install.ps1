# ArcSign Installer for Windows
# Usage: irm https://arcsign.io/install.ps1 | iex

$ErrorActionPreference = "Stop"

# ============================================================
# Version — updated automatically by CI on each release
$VERSION = "1.2.3"
# ============================================================

$DOWNLOAD_BASE = "https://dl.arcsign.io/v$VERSION"

Write-Host "======================================"
Write-Host "  ArcSign Installer for Windows v$VERSION"
Write-Host "======================================"
Write-Host ""

# Check if running on Windows
if ($env:OS -ne "Windows_NT") {
    Write-Host "Error: This installer only supports Windows." -ForegroundColor Red
    exit 1
}

# Download URL
$FILENAME = "ArcSign-$VERSION-Windows-x64.msi"
$DOWNLOAD_URL = "$DOWNLOAD_BASE/$FILENAME"

# List available USB drives
Write-Host "Searching for USB drives..."
Write-Host ""

$usbDrives = @(Get-WmiObject Win32_LogicalDisk | Where-Object { $_.DriveType -eq 2 } | Select-Object DeviceID, VolumeName, @{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB,1)}}, @{N='SizeGB';E={[math]::Round($_.Size/1GB,1)}})

if ($usbDrives.Count -eq 0) {
    Write-Host "No USB drives found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please insert your USB drive and try again."
    Write-Host "Or download manually from: https://arcsign.io"
    exit 1
}

Write-Host "Available USB drives:"
Write-Host ""
$i = 1
foreach ($drive in $usbDrives) {
    $name = if ($drive.VolumeName) { $drive.VolumeName } else { "USB Drive" }
    Write-Host "  [$i] $($drive.DeviceID)\ - $name  (Size: $($drive.SizeGB) GB, Free: $($drive.FreeGB) GB)"
    $i++
}
Write-Host ""

# Select drive
if ($usbDrives.Count -eq 1) {
    $selectedDrive = $usbDrives[0].DeviceID
    $driveName = if ($usbDrives[0].VolumeName) { $usbDrives[0].VolumeName } else { "USB Drive" }
    Write-Host "Auto-selected: $selectedDrive\ ($driveName)"
    $confirm = Read-Host "Install ArcSign to this drive? (y/n)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "Installation cancelled."
        exit 0
    }
} else {
    do {
        $choice = Read-Host "Select USB drive number (1-$($usbDrives.Count))"
    } while ([int]$choice -lt 1 -or [int]$choice -gt $usbDrives.Count)
    $selectedDrive = $usbDrives[[int]$choice - 1].DeviceID
    Write-Host ""
    Write-Host "Selected: $selectedDrive\"
    $confirm = Read-Host "Install ArcSign to '$selectedDrive\'? (y/n)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "Installation cancelled."
        exit 0
    }
}

$INSTALL_PATH = "$selectedDrive\ArcSign"

# Create temp directory
$TEMP_DIR = Join-Path $env:TEMP "arcsign-install"
if (Test-Path $TEMP_DIR) { Remove-Item $TEMP_DIR -Recurse -Force }
New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null

Write-Host ""
Write-Host "Downloading ArcSign v$VERSION..."
$msiPath = Join-Path $TEMP_DIR $FILENAME

try {
    Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $msiPath -UseBasicParsing
} catch {
    Write-Host "Error: Failed to download. Please check your internet connection." -ForegroundColor Red
    Remove-Item $TEMP_DIR -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Installing to $INSTALL_PATH..."

# Remove old version if exists
if (Test-Path $INSTALL_PATH) {
    Write-Host "Removing old version..."
    Remove-Item $INSTALL_PATH -Recurse -Force
}

# Install MSI to USB drive
$msiArgs = "/i `"$msiPath`" INSTALLDIR=`"$INSTALL_PATH`" /qn /norestart"
$process = Start-Process msiexec.exe -ArgumentList $msiArgs -Wait -PassThru

if ($process.ExitCode -ne 0) {
    Write-Host "MSI install failed. Falling back to portable copy..." -ForegroundColor Yellow
    # Fallback: just copy the MSI to USB for manual install
    New-Item -ItemType Directory -Path $INSTALL_PATH -Force | Out-Null
    Copy-Item $msiPath "$INSTALL_PATH\$FILENAME"
    Write-Host "MSI copied to $INSTALL_PATH\$FILENAME"
    Write-Host "Please double-click the MSI file to install manually."
}

# Cleanup
Remove-Item $TEMP_DIR -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "======================================"
Write-Host "  Installation Complete!"
Write-Host "======================================"
Write-Host ""
Write-Host "ArcSign v$VERSION has been installed to: $INSTALL_PATH"
Write-Host ""
Write-Host "Your wallet data will be stored on this USB drive."
Write-Host "Safely eject the USB when not in use for maximum security!"
Write-Host ""
