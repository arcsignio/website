---
title: "Bitcoin Cold Storage 2026: How to Keep BTC Safe After FTX, Mt. Gox & Bybit"
description: "Exchanges keep getting hacked. If your Bitcoin is on an exchange, it's not yours. Learn the right way to cold store BTC in 2026 — offline, encrypted, and built on proven security techniques like AES-256-GCM and XOR sharding."
pubDate: 2026-04-02
updatedDate: 2026-04-23
locale: en
tags: ["Security", "Bitcoin"]
author: "ArcSign Security Team"
heroImage: "/blog/images/bitcoin-cold-storage-guide-hero.png"
relatedSlugs: ["sim-swap-attack-prevention", "clipboard-hijack-attack", "arcsign-troubleshooting"]
---

Bitcoin was designed so you could be your own bank. But being your own bank comes with one non-negotiable responsibility: **securing your private keys**. Leave your BTC on an exchange and you're trusting a third party with everything. The history of crypto is littered with disasters that prove how badly that trust can be misplaced.

This guide covers everything you need to know about Bitcoin [cold storage](/blog/what-is-cold-storage) in 2026 — from the hacks that should motivate you to act, to the step-by-step process of setting up your own offline BTC wallet.

## Why Cold Storage for Bitcoin Matters

A **[cold storage](/blog/what-is-cold-storage) wallet** keeps your Bitcoin private keys entirely offline. No server can reach them. No hacker can exfiltrate them over the internet. When you want to sign a transaction, you sign it locally on an offline device and broadcast only the signed transaction — your keys never touch the network.

Contrast this with hot wallets and exchange accounts, where your keys (or the keys controlling your funds) live on internet-connected systems around the clock. Every moment they're online is a moment they're exposed.

> **The Core Rule of Bitcoin Security**
>
> **"Not your keys, not your coins."** If you don't hold the private key, you don't own the Bitcoin — you have an IOU from whoever does hold it.

## The Cost of Exchange Hacks: FTX, Mt. Gox, Bybit

Exchange failures and hacks are not edge cases. They are a recurring pattern that has destroyed billions of dollars in customer funds. Here are three cases that define the stakes:

| Loss | Event |
| :--- | :--- |
| **$450M** | Mt. Gox hack (2014) — ~850,000 BTC lost |
| **$8B** | FTX collapse (2022) — customer funds misappropriated |
| **$1.4B** | Bybit hack (Feb 2025) — largest single crypto theft ever |

### Mt. Gox (2014): The Original Warning

Mt. Gox once handled over 70% of all Bitcoin transactions worldwide. Hackers exploited its systems over years, stealing approximately 850,000 BTC — worth around $450 million at the time, and worth tens of billions at today's prices. Customers waited years for partial repayment through a lengthy bankruptcy process. Many never fully recovered their losses.

### FTX (2022): When the Exchange Is the Threat

The FTX collapse showed that exchange hacks aren't always external. In November 2022, FTX and its affiliated trading firm Alameda Research imploded, taking approximately $8 billion of customer funds with them. The funds had been used without customers' knowledge or consent. Thousands of users who held BTC on FTX woke up with nothing.

### Bybit (February 2025): The Record-Breaking Heist

In February 2025, Bybit suffered what is now the largest single cryptocurrency theft in history — $1.4 billion in assets drained in one attack. Sophisticated attackers compromised Bybit's multisig infrastructure through a supply-chain attack on Safe's front end, manipulating signing flows so that authorized personnel unknowingly approved malicious transactions. Even "secure" exchange infrastructure can be compromised at the UI layer.

> **The Pattern Is Clear**
>
> Whether the attacker is an external hacker, a compromised front end, or the exchange itself — funds held on exchanges are funds you do not fully control. Cold storage is the only way to eliminate this third-party risk.

## Types of Bitcoin Cold Storage

Not all cold storage is equal. Here is a comparison of the three main approaches:

| Type | Security | Cost | Ease of Use | Backup |
| --- | --- | --- | --- | --- |
| **Paper Wallet** | Medium | Free | Hard | Physical paper only |
| **Dedicated Hardware Wallet** (Coldcard, Ledger, Trezor) | High | $60–$200+ | Medium | 24-word seed phrase |
| **USB Software Wallet** | High | Often free | Easy | Encrypted file |

### Paper Wallets

A paper wallet is simply a printed Bitcoin address and private key. It costs nothing and is technically offline — but paper can be lost, damaged by water or fire, faded, or discovered by someone with physical access. There is also no native transaction interface; spending requires importing the key into software, which temporarily exposes it. Paper wallets are largely considered obsolete in 2026.

### Dedicated Hardware Wallets

Bitcoin-focused devices like the Coldcard, Ledger Nano X, and Trezor Model T store private keys inside a secure element chip. They're well-tested and widely trusted, and remain the most mainstream way to hold BTC. The drawbacks are cost ($60–$200+), supply chain trust issues (you must trust the manufacturer), and the **[seed phrase](/blog/seed-phrase-backup-guide) problem** — your backup is a 24-word mnemonic written on paper, which reintroduces physical security risks that cold storage was meant to solve.

### USB Software Wallets

USB software wallets run the wallet software on your computer but keep all key material exclusively on the USB drive. When you unplug the USB, nothing sensitive remains on the host machine. The better options back up to an **encrypted file** — far more durable and resistant to physical compromise than a paper [seed phrase](/blog/seed-phrase-backup-guide). One caveat: USB software wallets vary in which chains they support, so if you want to hold native Bitcoin, choose software (or a dedicated hardware wallet) that explicitly supports BTC.

## The Security Techniques Behind Bitcoin Cold Storage

Whichever tool you choose, good cold storage is built on a handful of industry-standard cryptographic techniques. Understanding these concepts helps you judge whether a wallet is genuinely secure.

### BIP44 HD Wallet: m/44'/0'/0'

Mainstream Bitcoin HD (hierarchical deterministic) wallets derive keys using the **BIP44** standard, with `m/44'/0'/0'` as Bitcoin's standard derivation path. This is the same standard used by Ledger, Trezor, and every major wallet. Your entire Bitcoin key hierarchy — including any number of addresses — is derived from a single master seed, meaning one backup covers everything.

### XOR Sharding: Multi-Part Key Protection

Rather than storing the master seed as a single vulnerable object, advanced cold storage applies **XOR sharding**: the seed is split into multiple shards using XOR operations. Each shard alone is cryptographically meaningless — it reveals nothing about the original seed. Reconstructing the seed requires a sufficient number of shards. Even if one storage medium is lost or stolen, the attacker has only one shard and cannot recover your assets. XOR sharding is one of the techniques ArcSign pioneered in its EVM cold wallet.

### AES-256-GCM Encrypted Backup

An ideal backup file is encrypted with **[AES-256](/blog/aes256-encryption-simple)-GCM** — the same encryption standard used by national governments and financial institutions. The file is encrypted on export, so if someone intercepts or steals your backup, it is cryptographically useless without your decryption key. That makes an encrypted backup file far safer than a paper seed phrase that can be photographed, copied, or found in a drawer years later.

> **Machine-Readable Encrypted Backup vs Paper Seed Phrase**
>
> A paper seed phrase is human-readable and can be photographed, copied, or found in a drawer years later. By contrast, a machine-readable backup file encrypted with AES-256-GCM is useless without the key — the design philosophy used by modern cold wallets like ArcSign.

## Step-by-Step: Setting Up BTC Cold Storage

The following is a general process for setting up Bitcoin cold storage. This guide is not tied to any single product; use a tool that **explicitly supports native Bitcoin**, such as a dedicated hardware wallet (Coldcard, Ledger, Trezor) or a reputable Bitcoin-only software wallet.

**1. Choose a BTC-Capable Cold Storage Tool**

Confirm the wallet actually supports native Bitcoin. Dedicated hardware wallets (Coldcard, Ledger, Trezor) are the most common choice; if you use software, pick an open-source, verifiable option that clearly lists BTC support, download it from the official source, and verify the checksum.

**2. Initialize the Wallet Offline**

Create a new wallet on an offline or clean machine. The wallet should generate its master seed locally using a cryptographically secure random number generator, and the seed should never leave the device in plaintext.

**3. Get Your Bitcoin Receiving Address**

Mainstream wallets derive your BTC address using the BIP44 path `m/44'/0'/0'` (or the corresponding BIP49 / BIP84 paths) and display a receiving address.

**4. Back Up Your Keys Securely**

Back up according to the wallet type: hardware wallets typically use a 24-word seed phrase, which you must write down offline and store safely; more advanced software wallets offer an encrypted backup file. Keep the backup in a different physical location from your primary device.

**5. Transfer BTC from Exchange to Cold Storage**

Copy your Bitcoin receiving address and use it as the withdrawal destination from your exchange. Start with a small test transaction to confirm receipt before withdrawing your full balance. Once confirmed, withdraw everything you want in cold storage.

**6. Store Safely Offline**

When done, store the device or USB safely. Your BTC is now in cold storage. To send BTC, connect the device, sign the transaction locally, and then broadcast.

## Backup Strategy: The 3-2-1 Rule for Bitcoin

Even the best cold storage setup can be undone by poor backup practices. Apply the **3-2-1 rule**:

- **3 copies** of your backup — your primary device, plus two independent backups (if you use an encrypted file backup, one of these can be a cloud copy).

- **2 different media types** — e.g. a hardware device / USB drive plus a backup stored elsewhere.

- **1 copy offsite** — one copy at a relative's home, a bank safety deposit box, or a geographically separate location.

> **Why Encrypted Backups Are Cloud-Safe**
>
> If your backup file is AES-256-GCM encrypted before it ever leaves the wallet, it's safe to upload to cloud storage as an additional redundancy layer. Even if your cloud account is compromised, the file is cryptographically locked without your password. Note: a paper seed phrase or an unencrypted private key should **never** be uploaded to the cloud.

### Test Your Backup Before You Need It

At least once, go through the full restore process using only your backup (not your primary device). Confirm that your Bitcoin address is correctly recovered. A backup you've never tested is a backup of unknown reliability.

## FAQ

### Q: What is the safest way to store Bitcoin in 2026?

Cold storage — keeping private keys completely offline — is the safest method. For native Bitcoin, use a dedicated hardware wallet (Coldcard, Ledger, Trezor) or a trustworthy software wallet that explicitly supports BTC, paired with an encrypted backup. For the full picture, see our [private key management best practices](/blog/private-key-management-best-practices).

### Q: What happened to customer Bitcoin on FTX, Mt. Gox, and Bybit?

Mt. Gox lost ~850,000 BTC (~$450M at the time) to hackers in 2014. FTX collapsed in 2022 with approximately $8 billion in customer funds misappropriated. Bybit was hacked in February 2025 for $1.4 billion in a supply-chain attack. In all cases, customers who held their own keys were unaffected.

### Q: Does ArcSign support Bitcoin?

No. ArcSign is an **EVM-only cold wallet**. It currently supports 7 EVM chains (Ethereum, BSC, Polygon, Arbitrum, Optimism, Base, Avalanche) and does not support native Bitcoin. For BTC cold storage, use a dedicated Bitcoin wallet. That said, the same security *principles* described here — offline keys and encrypted backups — apply equally. If you also hold ETH or stablecoins, ArcSign brings this same USB cold-storage approach to those 7 EVM chains.

### Q: What is XOR sharding and how does it protect my assets?

XOR sharding splits your master seed into multiple parts. Any single part reveals nothing about your seed, and a sufficient number of parts is required to reconstruct it. This means a single lost or stolen storage medium cannot compromise your assets. It's one of the techniques ArcSign uses in its EVM cold wallet.

### Q: Is ArcSign free?

Yes. ArcSign is completely free and open source (Apache 2.0). All core features — including cold storage for 7 EVM chains, XOR sharding, and AES-256-GCM encrypted backups — are available at no cost with a standard USB drive. Note that ArcSign is built for EVM chains and does not support native Bitcoin.
