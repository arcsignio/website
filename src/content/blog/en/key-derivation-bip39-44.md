---
title: "BIP-39 / BIP-44 Explained: How HD Wallets Derive Keys"
description: "Why 12 words recover assets across every chain: from BIP-39 entropy to BIP-44 derivation path (m/44'/60'/0'/0/0) and how ArcSign manages 7 chains from"
pubDate: 2026-04-22
locale: en
tags: ["Security", "Cryptography"]
author: "ArcSign Security Team"
heroImage: "/blog/images/key-derivation-bip39-44-hero.png"
relatedSlugs: ["usb-cold-storage-vs-hardware-wallet-2026", "why-free-wallet-safe", "arcsign-windows-macos-setup"]
---

## Why All Modern Wallets Are HD Wallets

Before 2012, every new crypto address meant a fresh, unrelated private key. Generate 50 deposit addresses this week, and you had 50 independent keys to manage. Lose one and the coins at that address were locked forever. Backups were a nightmare — every new address meant re-backing up the entire wallet file.

In 2012, Bitcoin developer Pieter Wuille published a specification called **BIP-32** (Bitcoin Improvement Proposal 32), introducing the idea of a *Hierarchical Deterministic Wallet* (HD wallet). The core insight is elegantly simple: **start with a single seed, then derive an unlimited number of private keys from it mathematically**. Back up the seed once, and you have backed up every future address.

The following year, BIP-39 (mnemonics) and BIP-44 (multi-chain derivation paths) filled in the missing pieces: a human-transcribable input and an interoperable output structure. Together these three specifications became the shared backbone of every mainstream wallet today — MetaMask, Ledger, Trezor, Trust Wallet, and ArcSign all speak the same language.

            What you'll walk away with

This article takes you from 12 English words all the way to that `0x…` address you see on Etherscan — showing exactly how each step is stitched together with math. By the end you'll understand why the mnemonic is the one thing you need to protect, and why ArcSign can manage BTC, ETH, BNB, Polygon, and 18 more chains from the same USB stick.

## BIP-39: From Entropy to 12 Memorable Words

BIP-39 answers a simple question: **How do you turn 128 or 256 bits of random noise into something a human can copy down without mistakes?** The answer is a standardized 2048-word dictionary, where every 11 bits maps to one English word.

            1
            Generate entropy

Use a cryptographically secure random number generator (CSPRNG) to produce 128 bits (12 words) or 256 bits (24 words) of randomness. This is the only truly random input in the entire wallet — entropy quality determines wallet security.

            2
            Append a checksum

Run SHA-256 on the entropy, take the first N/32 bits, and append them. 128-bit entropy + 4-bit checksum = 132 bits; 256-bit entropy + 8-bit checksum = 264 bits. The checksum lets wallets detect transcription mistakes at input time.

            3
            Slice into 11-bit chunks and map to the dictionary

Split into 11-bit chunks, each of which indexes into the BIP-39 dictionary. 132 / 11 = 12 words; 264 / 11 = 24 words. This is where "abandon ability able about…" comes from.

            4
            Stretch to a 512-bit seed via PBKDF2

Feed the mnemonic string plus an optional user passphrase (empty string is allowed) into PBKDF2-HMAC-SHA512 for 2,048 iterations, producing a 512-bit seed. This seed is the input to BIP-32.

            Why exactly 2048 words?

Because 2048 = 211, so every word cleanly represents 11 bits. The word list itself is carefully curated: each word's first 4 letters are unique (enables fuzzy input), no lookalike words, no profanity. Different languages (English, Japanese, Korean, Traditional Chinese, Simplified Chinese) have their own 2048-word lists — but English is strongly recommended for cross-wallet compatibility.

## BIP-32: One Seed, Infinite Keys

The magic at the heart of BIP-32 is `HMAC-SHA512`: given a parent key and an index, it produces a child key. And the operation is one-way — you can easily derive every child from the parent, but going backwards from a child to the parent is computationally infeasible (equivalent to breaking SHA-512).

### From seed to master key

The 512-bit seed from BIP-39 is split in half: the first 256 bits become the **master private key**, the last 256 bits become the **chain code**. Master key + chain code = an **extended private key** (xprv), the root node of the entire HD tree.

                12-word mnemonic
                abandon × 11 + about

                ↓ PBKDF2-HMAC-SHA512 (2048 iterations)

                512-bit seed
                5eb00bbddcf069084889a8ab9…

                ↓ HMAC-SHA512 with key "Bitcoin seed"

                Master key + chain code
                xprv9s21ZrQH143K…

### Child key derivation (CKD)

With a master key in hand, you can derive the first layer of children. Given a parent extended private key (`k_par`, `c_par`) and an index `i`, BIP-32 defines:

                Compute
                I = HMAC-SHA512(c_par, data)

                Child private key
                k_i = (first 256 bits of I) + k_par (mod n)

                Child chain code
                c_i = last 256 bits of I

The critical property: the same parent + same index always produces the same child. That is the "deterministic" in Hierarchical Deterministic Wallet. Your mnemonic's HD tree derives identical addresses whether you load it in ArcSign today, Ledger tomorrow, or MetaMask next week.

## BIP-44: A Standard Address for the Key Tree

BIP-32 says *how* to derive, but not *how to organize*. If every wallet decided its own branch for BTC and ETH, mnemonics wouldn't be portable — the same seed would show different addresses depending on the app.

**BIP-44 fixes that.** It specifies a five-level standard path:

                Standard path
                m / purpose' / coin_type' / account' / change / address_index

                Example (ETH)
                m / 44' / 60' / 0' / 0 / 0

### What each level means

| Level | Name | Example | Purpose |
| --- | --- | --- | --- |
| **m** | Master | — | Root of the HD tree, sourced from the BIP-39 seed |
| **44'** | Purpose | 44' (hardened) | Fixed 44', signalling "I follow BIP-44" |
| **coin_type'** | Coin Type | 0' (BTC), 60' (ETH), 714' (BNB) | Each chain has a registered number (SLIP-44 table) |
| **account'** | Account | 0', 1', 2'… | Separate "accounts" under one chain (like bank sub-accounts) |
| **change** | Change | 0 = external, 1 = internal (change) | Bitcoin uses this to separate receive vs change addresses; ETH is typically 0 |
| **address_index** | Address Index | 0, 1, 2… | Monotonically increasing address under that account |

### SLIP-44 cheat sheet for popular chains

SLIP-44 (Satoshi Labs Improvement Proposal 44) is the registry of `coin_type` values. A few you'll run into:

| Chain | coin_type | Standard path |
| --- | --- | --- |
| Bitcoin (BTC) | 0' | `m/44'/0'/0'/0/0` |
| Ethereum (ETH) | 60' | `m/44'/60'/0'/0/0` |
| BNB Smart Chain | 714' (60' also common) | `m/44'/60'/0'/0/0` |
| Polygon | 60' (EVM-compatible) | `m/44'/60'/0'/0/0` |
| Solana | 501' | `m/44'/501'/0'/0'` |
| Litecoin (LTC) | 2' | `m/44'/2'/0'/0/0` |

            Why do most EVM chains share 60'?

Because Ethereum, Polygon, BNB Chain, Arbitrum, Base, Optimism, and other EVM-compatible chains use identical address formats, signature schemes, and key lengths. Sharing `coin_type = 60'` means one mnemonic produces the same `0x` address across all of them — which is why your MetaMask address never changes when you switch networks. You're managing one private key that happens to be valid on every EVM-compatible chain. ArcSign still supports per-chain account trees internally so you can either share one address across EVM chains or separate high-value chains into their own accounts.

## Hardened Derivation: The Meaning Behind the Apostrophe

You probably noticed that the first three levels of a BIP-44 path (`44'`, `60'`, `0'`) all carry an apostrophe. That apostrophe marks **Hardened Derivation** — a variant of BIP-32 designed to defend against a specific attack.

### Normal vs hardened, in one table

| Type | Index range | Derivable from parent xpub? | Used for |
| --- | --- | --- | --- |
| **Normal** | 0 ~ 231-1 | ✓ Yes | Change and address_index levels (public-key sharing) |
| **Hardened** | 231 ~ 232-1 (written 0', 1'…) | ✗ No | Purpose, coin_type, account levels (security boundaries) |

### Why do upper levels have to be hardened?

Normal derivation has a convenient but dangerous property: if an attacker gets hold of both your **parent extended public key (xpub)** and **any child private key**, they can derive every other child private key in that subtree — and walk back to the parent private key. This is known as **xpub leakage attack**.

Hardened derivation closes this hole entirely. It computes the HMAC using the parent's private key instead of the public key, so even someone with the xpub and a child private key can't cross a hardened boundary. BIP-44 hardens the first three levels — purpose, coin_type, account — establishing distinct security domains for each "use / chain / account" in your wallet.

            Mental model

**"Apostrophe = hard firewall."** Any level you don't want an xpub leak to punch through should be hardened. The Bitcoin community consensus: `purpose'/coin_type'/account'` must be hardened. The last two levels (change / address_index) stay normal, which is what lets watch-only wallets derive every receive address from just an xpub without ever touching a private key.

## How ArcSign Implements This Stack

ArcSign follows BIP-39 / BIP-32 / BIP-44 verbatim — but layers three reinforcements on top, turning a standard HD wallet into a USB-grade cold wallet:

            1
            Mnemonic + .arcsign backup, side by side

When you create a wallet, ArcSign shows the 12-word BIP-39 mnemonic for you to write down and lets you export an `.arcsign` encrypted backup file ([AES-256](/blog/aes256-encryption-simple)-GCM + [Argon2id](/blog/aes256-encryption-simple), encrypted on export). The mnemonic recovers the keys in any compatible wallet; the `.arcsign` file restores your custom accounts, address book, token lists, connection history — everything — in one click. Mnemonic solves cross-wallet portability; `.arcsign` solves "get my exact setup back."

            2
            The seed never sits around whole

The moment BIP-39 produces the 512-bit seed, ArcSign immediately splits it into three shards using **XOR three-shard encryption** and stores them back on the USB. At signing time, the three shards briefly reassemble inside [mlock](/blog/mlock-memory-protection)-protected memory, derive the private key for the current path, sign, and the whole memory region is zeroed. The private-key exposure window is held under 1–5 milliseconds.

            3
            One seed, 7 chains of private keys

ArcSign ships with a BIP-44 path table for 7 chains (Bitcoin mainnet + 6 major EVM-compatible chains). Switching chains in the Dashboard simply switches the derivation path — from `m/44'/0'/0'/0/0` (BTC) to `m/44'/60'/0'/0/0` (ETH), for example. No re-generation. No re-backup. Every chain's assets share the same 12-word seed.

### Watch-only addresses: xpub's practical payoff

BIP-32's extended public key (xpub) has a practical use you can take advantage of in ArcSign — export an account's xpub to your phone or a second laptop, and that device can display balances and generate new receive addresses without ever seeing a private key. That's the essence of a watch-only wallet. Because the last two levels (change / address_index) are normal derivation, the xpub alone is sufficient to compute every child public key and address.

## Five Pitfalls Users Keep Stepping Into

            1
            Assuming "mnemonic + passphrase" can be reconstructed later

The BIP-39 passphrase (sometimes called "the 25th word") feeds directly into PBKDF2 at seed-derivation time. **A different passphrase produces a completely different seed** — a completely different wallet. Forget the passphrase you picked and the mnemonic becomes useless, because it points to a different (empty) wallet. If you use a passphrase, back it up separately and don't choose anything guessable.

            2
            Writing the mnemonic out of order or skipping a word

Word order is everything in BIP-39 — swap words 5 and 6 and you have a different wallet. The BIP-39 checksum only validates "is this set of 12 words a valid mnemonic?" — it cannot point to which word is wrong. Best practice: copy in groups of three (1-3, 4-6, 7-9, 10-12), number them, and rewrite with a different pen at a different time to cross-check.

            3
            Treating xpub as public information

An xpub contains no private key, but it does expose **every historical and future address** under that account. Anyone holding your xpub can track your flows across the entire HD tree, label your behavior patterns, and even run targeted phishing. Share an xpub only when you're certain the recipient should see every transaction — for ordinary receiving, share a single address instead.

            4
            Thinking different chains are "independent wallets"

They are all branches off the same seed. If your mnemonic leaks, BTC, ETH, BNB, Polygon, and Arbitrum all fall together — the attacker just types the mnemonic into any compatible wallet and lets it auto-scan balances across every coin_type. This is also why "use the same seed for both a cold wallet and a hot wallet" is a bad idea.

            5
            Using online tools to "verify" your mnemonic

Any tool asking you to paste your mnemonic into a webpage, Discord bot, or Telegram bot is a scam. Legitimate wallets never need your mnemonic to pass through a third party — the BIP-39 verification algorithm is entirely local. If you really want to verify, use an open-source offline tool (such as Ian Coleman's BIP-39 tool with networking disabled). ArcSign validates the checksum locally at wallet creation — no lookup needed.

            Further reading

For how the seed gets split into three shards on your USB, see [XOR Three-Shard Encryption (Visual Guide)](/blog/xor-encryption-explained). For five concrete ways to back up a mnemonic, see [The Ultimate Seed Phrase Backup Guide](/blog/seed-phrase-backup-guide). For what actually happens when the USB is stolen, see [USB Backup Strategy](/blog/usb-backup-strategy).

## FAQ

### Q: Why can a single 12-word mnemonic manage wallets on 22 different chains?

Because BIP-39 turns your 12 words into a 512-bit seed, which BIP-32 then expands into a master key via one-way HMAC-SHA512 derivation. BIP-44's standard path (`m/44'/coin_type'/account'/change/index`) assigns each chain a dedicated subtree via the `coin_type` field — Bitcoin is `0'`, Ethereum is `60'`, BNB Chain is `714'`. A single mnemonic can deterministically generate dozens of chains and an unlimited number of addresses, each cryptographically independent from the others.

### Q: What's the difference between BIP-32, BIP-39, and BIP-44?

BIP-32 defines the math of "deriving unlimited child keys from one seed" (Hierarchical Deterministic Wallet). BIP-39 defines how to turn raw entropy into a human-readable 12/24-word mnemonic and then into a seed. BIP-44 sits on top of BIP-32 and specifies the standard path format (`m/44'/coin_type'/account'/change/index`) so different wallets interoperate. Simple mnemonic: BIP-39 is the input, BIP-32 is the engine, BIP-44 is the output structure.

### Q: If I lose my USB but still have my 12-word mnemonic, can I recover my assets?

Yes. HD wallets are designed around the principle that "the mnemonic is the single source of truth." Input your 12 words into any BIP-39 / BIP-44 compatible wallet (ArcSign, Ledger, Trezor, MetaMask, Trust Wallet, and more) and it will deterministically reproduce the same master key, the same child addresses, and the same balances. ArcSign also provides an `.arcsign` encrypted backup file — one-click import restores every setting, faster than typing 12 words one at a time.

### Q: Is deriving keys from math actually safe?

Yes — very safe. Every derivation step uses HMAC-SHA512, a one-way function: computing a child key from a parent is easy, but reversing it is computationally infeasible (equivalent to breaking SHA-512). BIP-32 also supports **Hardened Derivation** (the apostrophe notation like `44'`) which prevents derivation even with the public key + chain code — only the private key works. This is why you see apostrophes in derivation paths. The entire specification has been battle-tested for more than a decade across tens of millions of wallets, making it the most mature and trusted key management architecture in crypto.
