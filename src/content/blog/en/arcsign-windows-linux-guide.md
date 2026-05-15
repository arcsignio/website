---
title: "ArcSign Installation Complete Guide: Windows / macOS / Linux"
description: "Complete ArcSign install guide for Windows 10+, macOS 12+, and Linux. Covers SmartScreen, Gatekeeper bypass, Alchemy API setup, and first wallet creation."
pubDate: 2026-04-20
locale: en
tags: ["Tutorial"]
author: "ArcSign Security Team"
heroImage: "/blog/images/arcsign-windows-linux-guide-hero.png"
relatedSlugs: ["arcsign-windows-macos-setup", "arcsign-troubleshooting", "defi-beginner-guide-2026"]
---

## Why cross-platform matters for a cold wallet

Hot wallets can be restored from the cloud on any device, but a cold wallet is different — its core promise is that **the private key never leaves the USB**. That means every time you sign a transaction, export tax records, or upgrade your hardware, you need a machine that can run ArcSign. If ArcSign only worked on one operating system you would be locked into that ecosystem, which becomes a problem the day you swap laptops, get a Linux work machine, or have a Windows desktop at home.

That is why, starting with v1.2, ArcSign treats **Windows, macOS, and Linux** as first-class citizens. All three builds share the same Go core library and Tauri desktop framework, so the XOR three-shard key protection, [AES-256](/blog/aes256-encryption-simple) encrypted backup, and [mlock](/blog/mlock-memory-protection) memory protection behave identically regardless of the platform. This guide walks you from download to first signature on every one of them.

            Shared facts across platforms

ArcSign is **free software** (planned to open-source after passing 10,000 users). The `.arcsign` backup file is **encrypted with [AES-256](/blog/aes256-encryption-simple) the moment it is exported** — there is no separate "set a backup password" step. Your private key never exists in reconstructed form outside a short **1–5 millisecond** signing window.

## System requirements across all three platforms

ArcSign's hardware footprint is intentionally small — almost any laptop or desktop from the last five years will run it. The official minimums:

| Requirement | Windows | macOS | Linux |
| --- | --- | --- | --- |
| **OS version** | Windows 10 x64 or later | macOS 12 Monterey or later | Ubuntu 20.04+ / Debian 11+ / Fedora 37+ or any AppImage-capable distro |
| **CPU** | Intel / AMD x64 | Intel x64 + Apple Silicon (arm64) | x86_64 |
| **RAM** | 4 GB minimum | 4 GB minimum | 2 GB minimum (bare desktop) |
| **Disk** | ~ 200 MB | ~ 200 MB | ~ 180 MB |
| **USB port** | USB 2.0 or better | USB 2.0 or better (USB-C Macs need an adapter) | USB 2.0 or better |
| **Network** | For provider queries only (signing works offline) | Same | Same |

The full app comes in at **under 200 MB**, lighter than most companion software shipped by hardware wallets, because every sensitive piece of data lives only on the USB stick you plug in — your internal drive never stores private keys.

## Download and SHA-256 verification

The number-one enemy of a cold wallet is a **tampered installer**. If you download a trojanized ArcSign from a look-alike site, no amount of cryptography will save you. Please always do two things before installing:

            1
            Only download from arcsign.io

Type arcsign.io into the address bar by hand — never click search ads. The download page will auto-detect your OS and surface the right file: ArcSign-Setup-x.y.z.exe on Windows, ArcSign-x.y.z.dmg on macOS, and ArcSign-x.y.z.AppImage on Linux (with deb/rpm options for advanced users). Every artifact is hosted on Cloudflare R2 at github.com/arcsignio/arcsign/releases over HTTPS.

            2
            Verify the SHA-256 hash

The download page shows a SHA-256 next to every file. After downloading, run the equivalent of this check in a terminal:

```
# Windows PowerShell
Get-FileHash .\ArcSign-Setup-1.2.3.exe -Algorithm SHA256

# macOS / Linux
shasum -a 256 ArcSign-1.2.3.dmg
sha256sum ArcSign-1.2.3.AppImage
```

The output must match the website value exactly. A mismatch means the file was corrupted or tampered with — delete it and download again.

            ⚠️ Common phishing patterns

Attackers register look-alikes such as arc-sign.io, arcsign.download, or arcsign-wallet.io. Bookmark the real domain and always enter the site from that bookmark. See [our phishing prevention guide](/blog/phishing-attack-prevention) for more detection tips.

## Windows install: handling SmartScreen and antivirus

Windows is the smoothest to install on, but because ArcSign is still a relatively new publisher you will likely see a SmartScreen warning on first run. That warning is routine, not a malware detection.

            1
            Run the setup binary

Double-click ArcSign-Setup-x.y.z.exe. If Windows Defender SmartScreen shows the blue "Windows protected your PC" screen, click **More info**, then **Run anyway**. The installer uses an EV code-signing certificate — SmartScreen's reputation score climbs over time, so the warning goes away as more users install.

            2
            Pick the install location

The default C:\Program Files\ArcSign\ is fine. The installer creates a desktop shortcut and a Start Menu entry automatically. Total install time is roughly 30 seconds and no reboot is required.

            3
            Handle antivirus false positives

Some third-party antivirus products (Avast, Kaspersky, Bitdefender) may flag ArcSign as "unknown" and quarantine it. That is because ArcSign talks to USB devices and calls [mlock](/blog/mlock-memory-protection) — behaviors that look "suspicious" to heuristic scanners. Whitelist the ArcSign install directory and re-launch.

Once installed, launch ArcSign from the Start Menu. Windows may ask for permission to access USB devices on first run — allow it. From there you are in the first-run flow described below.

## macOS install: Intel, Apple Silicon, and Gatekeeper

The macOS build is a **Universal Binary**, so the same file runs natively on Intel x64 and Apple Silicon (arm64). M1/M2/M3/M4 Macs execute the arm64 slice automatically and older Intel Macs run the x64 slice. No wrong-version hazards.

            1
            Mount the DMG and drag to Applications

Double-click the ArcSign-x.y.z.dmg you downloaded. The mounted window shows the ArcSign icon alongside a shortcut to **Applications**. Drag ArcSign onto that shortcut to copy it into /Applications.

            2
            Clear the Gatekeeper prompt

On first launch macOS may say "ArcSign cannot be opened because it is from an unidentified developer." Open **System Settings → Privacy & Security**, scroll to the Security block, and click **Open Anyway** next to the ArcSign-blocked notice. Every subsequent launch works without further prompts.

            3
            Grant USB and removable-media access

macOS 12+ gatekeeps USB access tightly. The first time you plug the USB and start ArcSign, the OS surfaces a permission dialog — click **Allow**. If you accidentally click Deny, re-enable it at **System Settings → Privacy & Security → Removable Volumes**.

            Tip for Apple Silicon users

M-series Macs ship without USB-A ports, so prepare a USB-A to USB-C adapter or a USB-C thumb drive. ArcSign has no requirement on the specific USB connector — any drive the OS can mount is fine.

## Linux install: AppImage, deb, or rpm

Linux users get three packaging formats to match their distro and preferences. For most newcomers we recommend **AppImage** — a single file, no root needed, fully portable, and it never pollutes the system.

### Option A: AppImage (recommended for most people)

            1
            Download and mark executable

Download ArcSign-x.y.z.AppImage. In the file manager, right-click → Properties → Permissions → check "Allow executing file as program", or from a terminal:

```
chmod +x ArcSign-1.2.3.AppImage
./ArcSign-1.2.3.AppImage
```

            2
            Integrate with the app menu (optional)

On first launch the AppImage asks whether to register itself with the system. Choose **Yes** and it creates a .desktop entry so you can relaunch from the application menu. For cleaner management try AppImageLauncher.

### Option B: Debian / Ubuntu (.deb)

```
sudo dpkg -i arcsign_1.2.3_amd64.deb
# If dependencies are missing:
sudo apt --fix-broken install
```

After installation, launch via the arcsign command or from the app menu. The .deb package ships udev rules that grant USB access without sudo.

### Option C: Fedora / RHEL / openSUSE (.rpm)

```
sudo rpm -ivh arcsign-1.2.3-1.x86_64.rpm
# Or with dnf
sudo dnf install ./arcsign-1.2.3-1.x86_64.rpm
```

            USB permissions on AppImage

Without the packaged udev rules, you may need to add yourself to the plugdev group: sudo usermod -aG plugdev $USER. Log out and back in to activate group membership. The deb and rpm builds handle this automatically.

All three formats result in the same ArcSign binary — any performance differences come from the distro itself, not the package format.

## First launch: Alchemy API key and provider setup

ArcSign needs a blockchain node endpoint to show balances and broadcast transactions. For **privacy and speed** we do not ship shared public RPC endpoints — instead you plug in your own free Alchemy API key. Alchemy's free tier covers 300M compute units per month, far more than any individual user needs.

            1
            Create a free Alchemy account

Go to alchemy.com → Sign up → choose "Individual". Create a new App, name it anything you like, and pick "Ethereum Mainnet". On the dashboard, in the API Keys section, copy the **API Key** string (not the HTTP URL).

            2
            Paste the key into ArcSign

Open ArcSign → Settings (bottom-right gear icon) → Providers → Alchemy Key. Paste what you copied. ArcSign uses this one key across Ethereum, Polygon, Arbitrum, Optimism, Base, and the other EVM chains automatically. BSC uses NodeReal's public endpoint and requires no extra setup.

            3
            Create or import a wallet

Plug in your USB stick and either "Create new wallet" (12-word seed generated) or "Import from .arcsign backup". For a full walkthrough of first-time wallet setup, see our [10-minute beginner guide](/blog/arcsign-beginner-setup-guide).

## Cross-platform troubleshooting cheat sheet

Each OS comes with a different set of gotchas. Here are the six most common issues and their fixes:

| Issue | Likely cause | Fix |
| --- | --- | --- |
| USB plugged in but not detected | Permissions, faulty port, unformatted device | Try a different port; Linux — join plugdev; macOS — grant Removable Volumes access |
| Windows fails to launch (error code) | Antivirus quarantine or missing VC++ runtime | Whitelist ArcSign; install VC++ 2019 Redistributable from Microsoft |
| macOS "file is damaged" warning | Gatekeeper quarantine attribute | xattr -d com.apple.quarantine /Applications/ArcSign.app |
| Linux AppImage will not start | Missing libfuse2 (Ubuntu 22+) | sudo apt install libfuse2, or use AppImageLauncher |
| Balances stuck at 0 or failing to load | Alchemy key not set or quota exceeded | Check Settings → Providers; view usage in the Alchemy dashboard |
| WalletConnect fails to connect | Firewall blocking or DApp using v1 protocol | Allow outbound 443; verify the DApp supports WalletConnect v2 |

If none of the above fit, see the [full troubleshooting guide](/blog/arcsign-troubleshooting) or ask on Discord — the team usually responds within 24 hours.

## Three-platform experience comparison

Security parity is identical on every platform. Experience differences come from the host OS:

| Dimension | Windows | macOS | Linux |
| --- | --- | --- | --- |
| Install friction | ★☆☆ (easiest) | ★☆☆ (easiest) | ★★☆ (AppImage easy, deb/rpm advanced) |
| First-run gotchas | SmartScreen warning | Gatekeeper + privacy prompts | Executable bit, udev rules |
| USB hot-plug | Instant | Instant | Instant (with udev) |
| mlock memory protection | Native | Native | Native (strictest) |
| OTA auto-update | Yes | Yes | Manual re-download (AppImage + AppImageUpdate) |
| Code signing | EV code signing | Apple Notarized | GPG signature + SHA-256 |
| System integration | Excellent | Excellent | Good (depends on DE) |
| Privacy & auditability | Medium | Medium | Highest (run on a fully offline box) |

For most users, **Windows or macOS** is the lowest-friction choice. Privacy-focused users and heavy DeFi operators can pair Linux with an **air-gapped secondary machine**: yank the network cable, use the machine purely for signing, and you eliminate an entire class of OS-level attack surface.

## Frequently asked questions

### Q: If I used ArcSign on Windows and switch to Mac or Linux, do I lose my data?

No. All ArcSign data — wallets, history, settings — lives on the USB stick, protected by XOR three-shard encryption and AES-256. It is completely independent of the host OS. Plug the same USB into any machine running ArcSign and everything appears. Lost the USB during a hardware migration? Restore from the 12-word [seed phrase](/blog/seed-phrase-backup-guide) or a .arcsign backup file.

### Q: Can I use the same USB stick across a Windows machine and a Mac simultaneously?

Yes, and we recommend it. The same USB works on all three operating systems. Many users keep a Mac at home, a Windows machine at work, and a Linux laptop on the road — always with a single ArcSign USB. Data consistency is guaranteed by the device itself; no cloud sync needed.

### Q: Is the Linux build really as secure as Windows or macOS?

Yes, and arguably slightly better. All three share the same Go core, so the XOR three-shard implementation, AES-256 backup, and mlock memory protection are byte-identical. Linux has a slight edge because mlock behavior is strictest, there are fewer closed-source background services, and the platform can easily be set up as a fully offline signing host. Trade-offs: no GUI installer and OTA updates require extra tooling.

### Q: Why does ArcSign need an Alchemy API key? Can it talk to the chain directly?

Technically it could use a public RPC, but public nodes have two drawbacks: (1) your query IP is visible to the provider, which can leak wallet activity; (2) free public RPCs rate-limit aggressively and frequently time out. Your own Alchemy key improves both privacy and performance. The key only runs locally — ArcSign never transmits it back to us. For more on RPC privacy, see the [custom RPC guide](/blog/arcsign-custom-rpc).
