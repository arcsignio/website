#!/bin/bash
# ArcSign Installer for macOS and Linux
# Usage: bash <(curl -fsSL https://arcsign.io/install.sh)

set -e

# ─── Resolve latest release from GitHub ─────────────────────
GITHUB_REPO="arcsignio/arcsign"
echo "Fetching latest ArcSign release from GitHub..."
VERSION=$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/latest" \
    | grep '"tag_name":' \
    | sed -E 's/.*"v?([^"]+)".*/\1/')

if [ -z "$VERSION" ]; then
    echo "Error: Could not fetch latest version. Check your network or the repo URL."
    exit 1
fi

DOWNLOAD_BASE="https://github.com/${GITHUB_REPO}/releases/download/v${VERSION}"
OS_TYPE=""

echo "======================================"
echo "  ArcSign Installer v${VERSION}"
echo "======================================"
echo ""

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="macos"
    echo "Detected: macOS"
elif [[ "$OSTYPE" == "linux"* ]]; then
    OS_TYPE="linux"
    echo "Detected: Linux"
else
    echo "Error: Unsupported OS. This installer supports macOS and Linux."
    echo "For Windows, use: irm https://arcsign.io/install.ps1 | iex"
    exit 1
fi

# Detect architecture and set download URL
ARCH=$(uname -m)
if [[ "$OS_TYPE" == "macos" ]]; then
    if [[ "$ARCH" == "arm64" ]]; then
        DOWNLOAD_URL="${DOWNLOAD_BASE}/ArcSign-${VERSION}-macOS-ARM64.dmg"
        FILENAME="ArcSign-${VERSION}-macOS-ARM64.dmg"
        echo "Architecture: Apple Silicon (M1/M2/M3/M4)"
    elif [[ "$ARCH" == "x86_64" ]]; then
        echo "Error: Intel Mac version is not yet available."
        echo "Please check back later or build from source."
        exit 1
    else
        echo "Error: Unknown architecture: $ARCH"
        exit 1
    fi
elif [[ "$OS_TYPE" == "linux" ]]; then
    if [[ "$ARCH" == "x86_64" ]]; then
        DOWNLOAD_URL="${DOWNLOAD_BASE}/ArcSign-${VERSION}-Linux-x64.AppImage"
        FILENAME="ArcSign-${VERSION}-Linux-x64.AppImage"
        echo "Architecture: x86_64"
    else
        echo "Error: Only x86_64 is supported on Linux. Detected: $ARCH"
        exit 1
    fi
fi

# ─── Find USB drives ───────────────────────────────────────

echo ""
echo "Searching for USB drives..."
echo ""

USB_DRIVES=()

if [[ "$OS_TYPE" == "macos" ]]; then
    # Use diskutil to find only genuine USB drives (excludes internal disks, DMGs, etc.)
    while IFS= read -r disk; do
        [[ -z "$disk" ]] && continue
        info=$(diskutil info "$disk" 2>/dev/null)
        protocol=$(echo "$info" | grep "Protocol:" | awk '{print $2}')
        removable=$(echo "$info" | grep "Removable Media:" | awk '{print $3}')
        mountpoint=$(echo "$info" | grep "Mount Point:" | sed 's/.*Mount Point: *//')
        if [[ "$protocol" == "USB" && "$removable" == "Removable" && -n "$mountpoint" ]]; then
            USB_DRIVES+=("$mountpoint")
        fi
    done < <(diskutil list -plist external 2>/dev/null | grep -oE 'disk[0-9]+s[0-9]+' | sort -u || true)
elif [[ "$OS_TYPE" == "linux" ]]; then
    # Look for USB drives mounted under /media or /mnt
    while IFS= read -r line; do
        USB_DRIVES+=("$line")
    done < <(lsblk -nro MOUNTPOINT,TRAN 2>/dev/null | grep "usb" | awk '{print $1}' | grep -v "^$" || \
             df -h | grep -E "^/dev/sd[b-z]" | awk '{print $NF}' | grep -E "^/(media|mnt)" || true)
fi

if [[ ${#USB_DRIVES[@]} -eq 0 ]]; then
    echo "No USB drives found!"
    echo ""
    echo "Please insert your USB drive and try again."
    echo "Or download manually from: https://arcsign.io"
    exit 1
fi

echo "Available drives:"
echo ""
for i in "${!USB_DRIVES[@]}"; do
    DRIVE="${USB_DRIVES[$i]}"
    SIZE=$(df -h "$DRIVE" | tail -1 | awk '{print $2}')
    AVAIL=$(df -h "$DRIVE" | tail -1 | awk '{print $4}')
    echo "  [$((i+1))] $DRIVE  (Size: $SIZE, Available: $AVAIL)"
done
echo ""

# ─── Select drive ──────────────────────────────────────────

if [[ ${#USB_DRIVES[@]} -eq 1 ]]; then
    USB_PATH="${USB_DRIVES[0]}"
    echo "Auto-selected: $USB_PATH"
    echo ""
    echo -n "Install ArcSign to this drive? (y/n): "
    read -r confirm </dev/tty
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "Installation cancelled."
        exit 0
    fi
else
    while true; do
        echo -n "Select USB drive number (1-${#USB_DRIVES[@]}): "
        read -r choice </dev/tty
        if [[ "$choice" =~ ^[0-9]+$ ]] && [[ "$choice" -ge 1 ]] && [[ "$choice" -le ${#USB_DRIVES[@]} ]]; then
            USB_PATH="${USB_DRIVES[$((choice-1))]}"
            break
        else
            echo "Invalid selection. Please enter a number between 1 and ${#USB_DRIVES[@]}"
        fi
    done

    echo ""
    echo "Selected: $USB_PATH"
    echo ""
    echo -n "Install ArcSign to '$USB_PATH'? (y/n): "
    read -r confirm </dev/tty
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "Installation cancelled."
        exit 0
    fi
fi

# ─── Download & Install ───────────────────────────────────

TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo ""
echo "Downloading ArcSign v${VERSION}..."
curl -fSL -o "$FILENAME" "$DOWNLOAD_URL"

if [[ "$OS_TYPE" == "macos" ]]; then
    echo "Mounting disk image..."
    hdiutil attach "$FILENAME" -mountpoint /tmp/arcsign-dmg -nobrowse -quiet

    echo "Installing to USB drive..."
    if [[ -d "$USB_PATH/ArcSign.app" ]]; then
        echo "Removing old version..."
        rm -rf "$USB_PATH/ArcSign.app"
    fi

    cp -R /tmp/arcsign-dmg/ArcSign.app "$USB_PATH/"
    hdiutil detach /tmp/arcsign-dmg -quiet 2>/dev/null || true
    xattr -cr "$USB_PATH/ArcSign.app" 2>/dev/null || true

    INSTALL_LOCATION="$USB_PATH/ArcSign.app"
    LAUNCH_CMD="open \"$USB_PATH/ArcSign.app\""

elif [[ "$OS_TYPE" == "linux" ]]; then
    echo "Installing to USB drive..."
    if [[ -f "$USB_PATH/ArcSign.AppImage" ]]; then
        echo "Removing old version..."
        rm -f "$USB_PATH/ArcSign.AppImage"
    fi

    cp "$FILENAME" "$USB_PATH/ArcSign.AppImage"
    chmod +x "$USB_PATH/ArcSign.AppImage"

    INSTALL_LOCATION="$USB_PATH/ArcSign.AppImage"
    LAUNCH_CMD="\"$USB_PATH/ArcSign.AppImage\""
fi

# Cleanup
cd /
rm -rf "$TEMP_DIR"

echo ""
echo "======================================"
echo "  Installation Complete!"
echo "======================================"
echo ""
echo "ArcSign v${VERSION} has been installed to: $INSTALL_LOCATION"
echo ""
echo "To start:"
if [[ "$OS_TYPE" == "macos" ]]; then
    echo "  1. Open Finder and navigate to your USB drive"
    echo "  2. Double-click 'ArcSign.app'"
    echo ""
    echo "  Or run: $LAUNCH_CMD"
elif [[ "$OS_TYPE" == "linux" ]]; then
    echo "  1. Open your file manager and navigate to your USB drive"
    echo "  2. Double-click 'ArcSign.AppImage'"
    echo ""
    echo "  Or run: $LAUNCH_CMD"
fi
echo ""
echo "Your wallet data will be stored on this USB drive."
echo "Unplug the USB when not in use for maximum security!"
echo ""
