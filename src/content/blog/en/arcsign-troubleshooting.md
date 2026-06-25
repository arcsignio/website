---
title: "ArcSign Troubleshooting Guide: USB Detection, Connection & Signing Issues"
description: "Fix 15+ ArcSign issues: USB detection failures, Alchemy Provider connection errors, WalletConnect signing hangs. Platform-specific solutions for all OS."
pubDate: 2026-04-07
updatedDate: 2026-06-25
locale: en
tags: ["Tutorial"]
author: "ArcSign Security Team"
heroImage: "/blog/images/arcsign-troubleshooting-hero.png"
relatedSlugs: ["how-to-revoke-token-approvals", "eth-staking-arcsign", "usb-cold-wallet-benefits"]
---

## First: ArcSign's Three-Layer Architecture and Where Problems Live

ArcSign is a USB cold-wallet desktop application built on a three-layer architecture: **Tauri frontend (React UI) → FFI → Go shared library (key handling, signing)**. Any layer can produce bugs, but fortunately, problem types can almost always be pinpointed from a symptom.

Before troubleshooting, ask yourself three questions: **(1)** Is my USB being detected by ArcSign? **(2)** Does the wallet page show balances? **(3)** Can I successfully broadcast a transaction? These three questions map to three "fault lines", and this guide walks through each one.

> **ArcSign Is Free Software**
>
> Before troubleshooting, confirm you downloaded the **official build**. ArcSign is completely free. All legitimate download sources are `arcsign.io` or `github.com/arcsignio/arcsign/releases`. If you downloaded a version that asks for payment to unlock basic features, it is almost certainly a counterfeit.

## Issue 1: USB Detection Failures (The Most Common)

Roughly **40% of new-user issues** come from USB detection failures, according to ArcSign community reports. The symptom is usually: after opening ArcSign, the main screen sits on "Please insert a USB device" even though the USB is plugged in. The common causes, in order of frequency, are below.

### Cause A: Unsupported USB Format

ArcSign supports **FAT32** and **exFAT**. Windows' default NTFS is not yet supported, to guarantee consistent read/write behavior across Windows, macOS, and Linux. If your USB is NTFS-formatted, back up its contents and reformat it to exFAT (or FAT32 for drives under 64 GB).

> **Important**
>
> Formatting erases the USB. Copy your data elsewhere first. If the drive already contains ArcSign wallet data, **do not format it**—instead, export the `.arcsign` backup file to your computer, format the drive, and re-import.

### Cause B: Loose Plug or Bad Cable

This sounds basic but is the most frequently overlooked cause. USB-A connectors sometimes need a firm push to seat, and some USB-C cables are "charging only" and don't carry data. Fix: try a different USB port, or use a cable you know can transfer files. If you're using a USB hub, plug directly into the motherboard port instead.

### Cause C: Missing System Permissions

ArcSign needs raw read/write access to USB storage, which requires different permission levels per OS:

**1. macOS: Full Disk Access**

Open System Settings → Privacy & Security → Full Disk Access, click the "+" at the bottom left, add ArcSign.app, and toggle it on. After adding it, fully quit and relaunch ArcSign (not just closing the window). On first launch on Apple Silicon, you may also need to click "Open Anyway" in the Security pane.

**2. Windows: Run as Administrator**

Right-click the ArcSign shortcut → "Run as administrator". To make this permanent, go to Properties → Compatibility → check "Run this program as an administrator". Also confirm Windows Defender or your antivirus isn't flagging ArcSign and blocking its USB access.

**3. Linux: Join the plugdev / disk Group**

Run `sudo usermod -aG plugdev,disk $USER` in a terminal, log out, and log back in. For systemd distros you can also add a udev rule granting ArcSign access to specific USB devices. Arch/Manjaro users should additionally ensure `udisks2` is installed.

### Cause D: Corrupted Partition Table

Rare, but it happens under frequent hot-plugging. The symptom is ArcSign detecting the device but failing to read it. Fix: go to Settings → Diagnostics → "Rescan USB". If that fails, import your `.arcsign` backup into a healthy USB.

## Issue 2: Zero Balance, Tokens Missing

ArcSign's USB only stores keys—**balances and token lists are fetched live from public blockchains**. As of v1.5.0, reading balances needs **no API key at all**: ArcSign uses built-in public RPC plus Multicall3 and free DefiLlama prices across all EVM chains (Ethereum, Polygon, Arbitrum, Optimism, Base, BSC, Avalanche). So if a balance shows 0, it is almost never a "missing key" problem.

### Fix: Retry, or Import the Token (no key needed)

A balance of 0 usually means one of two things:

**1. Public Node Temporarily Down**

The built-in public RPC for that chain may be briefly unreachable or rate-limited. Fix: pull to refresh on the accounts page and wait a few seconds. If one chain is flaky, you can also point ArcSign at your own RPC under Settings → Provider & Indexer for that chain.

**2. Token Not Imported**

ArcSign reads native and well-known token balances automatically, but a brand-new or obscure ERC-20 may not be in its list yet. Fix: Wallet → "Custom Token" below the token list → paste the contract address. ArcSign calls `balanceOf` directly via public RPC—no key, no indexer required.

> **Separate note — NFT gallery and transaction history DO need a key.** Those panels require full-chain indexing, which public RPC can't do. To enable them: add an **Alchemy** key for Ethereum/Polygon/Arbitrum/Optimism/Base, and a **NodeReal** key for BSC (its MegaNode `nr_getTokenHoldings` / `nr_getNFTHoldings` APIs). **Avalanche uses Glacier, which is keyless** (anonymous tier). Both Alchemy and NodeReal have generous free tiers. When a key is missing, the panel clearly states "this feature needs a key" rather than showing blank. This has nothing to do with balances, which already work keyless.

## Issue 3: WalletConnect Won't Connect, DApp Unresponsive

ArcSign natively supports **[WalletConnect](/blog/walletconnect-dapp-tutorial)-dapp-tutorial.html" style="color:var(--primary);">WalletConnect v2**, letting you interact with DEXes, NFT marketplaces, and DeFi protocols from [cold storage](/blog/what-is-cold-storage). But WalletConnect's flow involves QR codes, a WebSocket relay, and session management—plenty of places for things to break.

### Symptom A: QR Code Scanned, No Response on DApp

The most common cause is an **expired QR code**. WalletConnect pairing URIs are typically valid only for 5 minutes. Fix: click "Disconnect" on the DApp to generate a fresh QR code, clear the cache on ArcSign's WalletConnect tab, and rescan.

### Symptom B: Connected, But Sign Button Does Nothing

This means the session exists but the message isn't reaching you. Usually one of these:

| Possible Cause | How to Check | Fix |
| --- | --- | --- |
| Relay blocked by firewall | Visit `relay.walletconnect.com` | Switch network or disable VPN |
| Multiple conflicting sessions | ArcSign "Connected DApps" list | Remove all old sessions and reconnect |
| DApp uses old WC v1 | DApp's WalletConnect version label | ArcSign supports v2 only—contact the DApp |
| Chain ID mismatch | Currently selected chain in ArcSign | Switch to the chain the DApp expects |

### Symptom C: Connection Drops Shortly After Connecting

Typically due to session expiration or a flaky network. ArcSign's default WalletConnect session lifetime is 7 days, after which it automatically asks you to re-authenticate. If you drop frequently, extend the session lifetime in Settings → WalletConnect, or make a habit of re-pairing daily.

## Issue 4: Signing Hangs or Transactions Won't Send

Signing is ArcSign's most critical flow. Between you clicking "Confirm" and the transaction broadcast, the following happens:

**Read the three XOR shards from USB → [mlock](/blog/mlock-memory-protection) memory pages → XOR-reassemble the private key → sign → zero the memory and release → broadcast via RPC**. The total key-exposure window is just 1-5 milliseconds. If it hangs, 8 times out of 10 it's USB I/O or RPC connectivity.

### Symptom A: Stuck on "Signing..." for Over 10 Seconds

Almost always slow USB reads. Possible causes: (1) another process is scanning the USB (antivirus, Spotlight); (2) the drive is failing; (3) the USB hub isn't providing enough power. Fix: pause background scanning, plug directly into a motherboard port, and if that still doesn't work, restore from `.arcsign` backup to a different USB.

### Symptom B: Signed Successfully, But Transaction Stays Pending

This is not an [ArcSign Pro](/blog/arcsign-pro-nft-membership)blem—it's a **gas or nonce** issue on-chain. Check:

**1. Gas Too Low**

Check the current gas market on a block explorer (Etherscan, BscScan). If your transaction's gas is clearly below the current baseline, it will sit for a long time. Fix: click "Speed Up" in ArcSign (re-sends the same nonce with higher gas), or cancel and retry.

**2. Nonce Mismatch**

If you're broadcasting from the same address through multiple wallets at once, nonce collisions can happen. ArcSign auto-fetches the latest on-chain nonce by default, but you can override it in the "Advanced" panel. If you see a nonce error, check the address's pending transactions on a block explorer first, then adjust.

### Symptom C: DEX Swap Keeps Failing

ArcSign's built-in [DEX swap](/blog/how-to-dex-swap-arcsign) integrates OpenOcean and KyberSwap aggregators. Swap failures are usually due to slippage tolerance being too low. Fix: Swap page → Settings → "Slippage tolerance" → raise it to 1% or 2% (low-liquidity tokens may need 3-5%). Also verify you have enough native gas token to cover fees.

## Issue 5: .arcsign Backup Import Fails

One of ArcSign's signature features is the `.arcsign` encrypted backup file: export produces an [AES-256](/blog/aes256-encryption-simple)-GCM encrypted file immediately—no separate password step required (your wallet password IS the backup password). Import failures usually fall into three buckets:

### Case A: Wrong Password

The most common. The password is **case-sensitive** and must be the wallet master password you set at export time, not your OS login password. ArcSign uses **Argon2id** for key derivation, so wrong passwords leak nothing—you simply see "Decryption failed". Retry carefully and watch for Caps Lock and IME state.

### Case B: File Corruption

If the backup file was truncated or modified during transfer (for example, via a flaky cloud sync), import will fail. ArcSign verifies the GCM authentication tag, so any single-bit flip is caught. Fix: re-download or re-copy the original backup. If you have multiple copies, prefer the offline one.

### Case C: Version Mismatch

Backups exported from older ArcSign versions will always import into newer versions (backward compatible), but not vice versa. If you exported on v1.2 and try to import into v1.0, it will fail. Fix: upgrade ArcSign to the latest version from `github.com/arcsignio/arcsign/releases`, then import.

> **Best Backup Practice**
>
> Keep at least **two** independent backups: one on a second USB stored offline, and another in an encrypted cloud drive (since `.arcsign` is already AES-256 encrypted, cloud storage doesn't weaken security). Also keep a paper backup of the 12-word mnemonic as a last-resort recovery.

## Platform-Specific Fixes: Windows / macOS / Linux

### Common macOS Issues

**"ArcSign can't be opened because the developer cannot be verified":** go to System Settings → Privacy & Security → find the ArcSign warning → click "Open Anyway". On Apple Silicon Macs you may additionally need to run `xattr -cr /Applications/ArcSign.app` in a terminal to clear the quarantine attribute.

**Rosetta confusion:** ArcSign ships a Universal Binary (both Intel and Apple Silicon native). You do not need Rosetta. In Activity Monitor, "Kind: Apple" means native; if it shows "Intel", redownload the Universal build.

### Common Windows Issues

**SmartScreen warning:** ArcSign has not yet purchased a Windows code-signing certificate (planned after reaching 10,000 users), so first-run SmartScreen shows a warning. Click "More info" → "Run anyway". You can also temporarily loosen "Windows Security" → "App & browser control".

**Antivirus false positives:** Some antivirus products flag unsigned executables. Fix: whitelist the ArcSign install directory. ArcSign is an open-source project (already open source, Apache 2.0), and will ship reproducible builds that should significantly reduce false positives.

### Common Linux Issues

**Missing AppImage dependencies:** without FUSE, AppImage won't run. Fix: `sudo apt install libfuse2` (Debian/Ubuntu) or `sudo pacman -S fuse2` (Arch).

**Blurry fonts on Wayland:** some Wayland compositors mishandle Tauri's HiDPI detection. Temporary workaround: set `GDK_SCALE=2` before launching ArcSign.

## Quick Diagnostic Reference Table

Bookmark this table—match the symptom, find the first fix to try.

| Symptom | Most Likely Cause | First Thing to Try |
| --- | --- | --- |
| USB not detected at all | Format / permissions | Check FAT32 or exFAT |
| Detected but can't read wallet | Partition table / permissions | Rescan USB |
| Balance shows 0 | Public RPC down, or token not imported (no key needed) | Pull to refresh; use "Custom Token" to add the contract |
| NFT gallery / tx history blank | Indexer key not set | Add Alchemy (ETH/Polygon/Arb/OP/Base) or NodeReal (BSC); Avalanche keyless via Glacier |
| WalletConnect won't scan | QR expired | Regenerate on DApp |
| WalletConnect drops | Relay blocked | Switch network / disable VPN |
| Signing hangs | Slow USB I/O | Pause antivirus scan |
| Transaction pending too long | Gas too low | Speed up transaction |
| DEX swap fails | Slippage too low | Raise to 1-2% |
| Backup import fails | Wrong password | Check Caps Lock |

> **Still Stuck?**
>
> If none of the above works, go to Settings → "Diagnostics" → "Export Logs" to generate a file containing system info and recent errors (no private keys included), then file a support ticket at `arcsign.io/support`. Attaching the log file dramatically speeds up investigation.

## FAQ

### Q: What should I do if ArcSign can't detect my USB drive?

Check these in order: (1) Make sure the USB is fully inserted, try a different port or cable; (2) The USB must be formatted as FAT32 or exFAT (NTFS is not currently supported); (3) On macOS, go to System Settings → Privacy & Security → Full Disk Access and add ArcSign; (4) On Windows, run ArcSign as Administrator; (5) On Linux, make sure your user is in the plugdev or disk group. If still not working, go to Settings → Diagnostics and click "Rescan USB".

### Q: Why does my balance keep showing 0 or fail to load tokens?

Since v1.5.0, balances need **no API key**—ArcSign reads them via built-in public RPC plus Multicall3 and free DefiLlama prices on every EVM chain. A balance of 0 is usually a transient public-node hiccup (pull to refresh) or a token that simply isn't imported yet (Wallet → "Custom Token" → paste the contract address, which calls `balanceOf` directly, keyless). An API key only matters for the **NFT gallery** and **transaction history**: Alchemy for Ethereum/Polygon/Arbitrum/Optimism/Base, NodeReal for BSC, and Avalanche keyless via Glacier.

### Q: I scanned the WalletConnect QR code but the DApp doesn't respond?

Most WalletConnect issues stem from expired sessions. Fix: (1) Click "Disconnect" on the DApp and generate a new QR code; (2) Remove the old session for that DApp from ArcSign's "Connected DApps" list; (3) Make sure your firewall isn't blocking the WalletConnect Relay (`relay.walletconnect.com`); (4) Try switching to a mobile hotspot to rule out corporate network or VPN WebSocket interference.

### Q: Why is my transaction stuck on "Signing..."?

The signing flow reads three XOR shards from the USB, [mlock](/blog/mlock-memory-protection)s memory, performs XOR reassembly, then signs. If it hangs for over 10 seconds, it usually indicates USB I/O trouble. Fix: (1) Don't unplug the USB mid-signing; (2) Reinsert the USB and retry; (3) If another process (e.g. antivirus scanner) is reading the USB, pause it; (4) Check USB health (macOS: First Aid in Disk Utility; Windows: chkdsk). If the problem persists, restore from your `.arcsign` backup file to a different USB.
