---
title: "ArcSign v1.5.0: Keyless Balances, What-You-See-Is-What-You-Sign, and Free Blacklist Checks"
description: "Three upgrades in ArcSign v1.5.0: token balances on every chain no longer need an Alchemy API key (public RPC + Multicall3), WalletConnect signatures are decoded locally into human-readable intent (clear-signing), and OFAC blacklist checks leave Pro to become free for everyone. Avalanche joins as the 7th EVM chain."
pubDate: 2026-06-23
locale: en
tags: ["Product Update"]
author: "ArcSign Security Team"
heroImage: "/blog/images/arcsign-v1-5-0-release-hero.png"
relatedSlugs: ["arcsign-cross-chain-guide", "walletconnect-dapp-tutorial", "token-approval-revoke"]
---

ArcSign v1.5.0 is the first feature update since we went open source. This release is built around two ideas: **full functionality without an API key**, and **understanding what you're authorizing at the moment you sign it**. There's a fair amount of engineering underneath, but the impact on you boils down to three sentences—you no longer need a key to see your balances, signing a transaction is no longer blind signing, and dangerous addresses are something everyone can now block.

This post is the overview. Each major feature has its own deep-dive article you can follow for the details.

> **v1.5.0 in one sentence**
>
> Token balances no longer require an Alchemy API key on any of the 7 chains; WalletConnect and mint signatures decode calldata into human-readable intent; and OFAC and malicious-address blacklist checks are free for every user, enforced on the backend.

## 1. Token balances no longer need an API key

This is the most immediately noticeable change in the release.

Before v1.4.0, displaying your token balances in ArcSign required you to first sign up for a free [Alchemy](/blog/arcsign-troubleshooting) API key and paste it into settings. For developers that's a minor step, but for ordinary users, "why does a cold wallet need me to register with a third party just to see how much money I have?" is a fair question.

v1.5.0 moves **balance reads** entirely onto a public RPC + Multicall3 path:

- **Public RPC node pool**—each chain ships with several keyless public endpoints, and a failing one is swapped out automatically.
- **Multicall3**—every `balanceOf` query for an address's tokens on a chain is bundled into a **single** `eth_call`: faster, fewer requests.
- **DefiLlama prices**—USD valuations are provided free by DefiLlama, also without a key.

The result: native coins (ETH/BNB/AVAX…), common tokens (USDC/USDT…), and the tokens you've swapped into or imported by hand all have their **balances available on all 7 chains without any API key**, working out of the box—and the queries never send your address to any centralized indexing service.

API keys are now only needed for **NFTs and transaction history**—those two features rely on a third-party indexer to do a full-chain scan, which public RPC can't do. When a key is missing, the interface tells you plainly that "this feature needs a key" instead of silently showing a blank.

For the full details, see: **[How keyless balances work: a breakdown of public RPC + Multicall3](/blog/keyless-balance-multicall)**.

## 2. Clear-signing—understand what you're signing

A cold wallet's core selling point is "secure signing," but if all you see at the moment of signing is a truncated string of hex, that's actually **blind signing**—you don't know what you're authorizing.

v1.5.0 replaces the signing screen for WalletConnect and Pro NFT mints, swapping "truncated hex" for a **locally decoded, human-readable summary**. Both calldata and EIP-712 typed data are decoded on your own machine (zero external APIs, no leakage), telling you what the transaction actually does:

- A plain token transfer—how much, and to whom
- An `approve` authorization—and if it's an **unlimited allowance**, it's flagged in red
- A `setApprovalForAll` (handing over control of an entire batch of NFTs)
- A DEX swap—Uniswap / Pancake V2 & V3, 1inch, KyberSwap, and OpenOcean swaps all decode into "swap A for B, minimum amount received"

If a transaction **can't be decoded**, the screen says so honestly—"unable to interpret this transaction"—and still shows the raw hex. No false sense of security. Honestly admitting "I can't read this" is safer than inventing an interpretation that might be wrong.

For the full details, see: **[Clear-signing: the architecture for decoding calldata and EIP-712 locally](/blog/clear-signing-explained)**.

## 3. Blacklist checks are free for everyone, and the gate is on the backend

v1.5.0 **releases the blacklist check for malicious / OFAC-sanctioned addresses from Pro to everyone**.

The reasoning is simple: a blacklist check is a pure in-memory lookup—zero cost, no API key, no network access required. There's no reason for it to be a paid feature. So this release embeds an offline seed (the public-domain OFAC list plus the MIT-licensed MEW/Revoke malicious-address lists) **directly into the app** (`go:embed`), which means the check works the very first time you open it, **fully offline**.

What matters more is **where the gate sits**. When you go to sign a transaction headed for a blacklisted address, it's the **backend (where the private key is used) that refuses to sign**, unless you explicitly check "I understand the risk." This gate isn't in the frontend UI—the frontend checkbox is just the presentation of informed consent; the part that's genuinely "architecturally impossible to bypass" lives in the Go backend, before the private key is ever used.

It's worth being clear about ArcSign's stance: **we notify, but the final decision is yours**. On a blacklist hit we lay out the information for you and block by default, but you can bypass it after explicitly acknowledging the risk—this is a cold wallet that respects user sovereignty, not one that enforces blocking on behalf of any institution. (Transaction **simulation** remains a Pro feature; the blacklist check is not.)

For the full details, see: **[The signing security gate: an offline blacklist seed with backend-enforced gating](/blog/signing-security-gate)**.

## What else

- **The 7th EVM chain: Avalanche.** Ethereum, BSC, Polygon, Arbitrum, Optimism, Base—and now Avalanche C-Chain.
- **Manual token import + automatic swap logging.** An "import token" dialog, plus automatic logging of swap outputs, stored encrypted on the USB—so any token you've touched shows a balance without a key, and that list never leaves your device.
- **Online ABI fallback (Sourcify).** For verified contracts the local list doesn't cover, you can optionally fetch the ABI from Sourcify to decode, with a one-time privacy notice and an encrypted USB cache. See [the online ABI fallback section in the clear-signing post](/blog/clear-signing-explained) for how it works and the privacy trade-offs.
- **All message-signing paths now go through the XOR-sharded signer** (EIP-191 / EIP-712)—no path ever touches the private key in plaintext form.
- Clearer prompts for NFT / transaction history when a key is missing, instead of silently showing a blank.

## Upgrading and downloading

The `.arcsign` [backup format](/blog/crypto-wallet-backup-guide) hasn't changed—existing wallets and backup files are fully compatible. The desktop app's auto-updater will offer this version automatically, and you can also download it manually from [GitHub Releases](https://github.com/arcsignio/arcsign/releases/latest). Every release ships with `SHA256SUMS` (covering both the installers and the Go shared library), so you can verify download integrity and reproduce the build from source.

ArcSign is open source under Apache 2.0, with source code at [github.com/arcsignio/arcsign](https://github.com/arcsignio/arcsign).

We've broken the engineering details of this release into several deep-dive posts, starting with keyless balances—if you want to know "how a cold wallet manages zero-config balance viewing without sacrificing privacy," that one's worth a read.
