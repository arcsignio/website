---
title: "Clear-Signing: Understand What You're Authorizing the Moment You Sign"
description: "Blind signing is a positioning flaw for any cold wallet. ArcSign v1.5.0 decodes calldata and EIP-712 typed data locally, turning a string of hex into human-readable intent—transfers, approvals, unlimited approve, DEX swaps. This post breaks down the decoding architecture, why we insist on zero external APIs, and the honesty principle: if it can't decode, it says so."
pubDate: 2026-06-23
locale: en
tags: ["Technical"]
author: "ArcSign Security Team"
heroImage: "/blog/images/clear-signing-explained-hero.png"
relatedSlugs: ["arcsign-v1-5-0-release", "walletconnect-dapp-tutorial", "token-approval-revoke"]
---

The core promise of a cold wallet is "secure signing." But if, the moment you press sign, the screen only shows a truncated string of hex—`0xa9059cbb000000...`—then that promise is hollow. You have no idea what you're authorizing. This is called **blind signing**, and for a [cold wallet](/blog/what-is-cold-storage) that markets itself on security, it's a flaw in the very positioning.

ArcSign v1.5.0's clear-signing feature exists to fix exactly this: it decodes raw hex into human-readable intent, right on your own machine. This post breaks down how it works, along with several deliberate design trade-offs.

> **Clear-signing in one sentence**
>
> WalletConnect and mint signing screens no longer show truncated hex. Instead, ArcSign decodes locally what the transaction is actually doing—a transfer, an approval, an unlimited approve, a setApprovalForAll, or a decoded DEX swap. When it can't decode something, it honestly says "unable to read" and shows the raw hex.

## The Problem: What a Transaction Actually Looks Like

When a dApp asks you to sign a transaction over [WalletConnect](/blog/walletconnect-dapp-tutorial), the heart of what it sends is a `data` field—a string of hex. The first 4 bytes of that hex are the **function selector**, and the rest is the ABI-encoded arguments.

For example, the `data` of an ERC-20 transfer looks like this:

```
0xa9059cbb                                          ← selector for transfer(address,uint256)
  000000000000000000000000<recipient address 20 bytes>      ← argument 1: recipient
  0000000000000000000000000000000000000000000de0b6b3a7640000  ← argument 2: amount
```

To a human, this is gibberish. But once you know that `0xa9059cbb` maps to `transfer(address,uint256)`, you can decode it back into "send 1 token to some address." That's exactly what decoding does.

## Local Decoding, Zero External APIs

ArcSign uses [viem](https://viem.sh)—a well-maintained TypeScript Ethereum library—to decode **locally in the frontend**. This is a deliberate privacy decision:

**The decoding process makes no network requests at all.** No calls to 4byte.directory, no Etherscan label API, no sending the contents of your transaction to any third party to "interpret for you." Doing that would amount to leaking "what you're about to sign" to an external service. Decoding happens on your machine, using a built-in list of ABIs.

We even wrote a test for this—verifying that the decoding flow genuinely performs zero fetches, pinning "privacy" down as an invariant guarded by CI rather than leaving it as a slogan.

## What Decoding Covers

ArcSign ships with a set of ABIs for known functions (`KNOWN_ABIS`), covering the operations you'll encounter most in daily use—and the ones you most need to see clearly:

- **`transfer` / `transferFrom`** — token transfers, decoded into amount and recipient
- **`approve`** — approvals. If it's an **unlimited approval** (the amount is the maximum `uint256` value), it's flagged in red—this is one of the operations most often abused in phishing
- **`setApprovalForAll`** — handing control of an entire batch of NFTs to some operator; flagged in red when set to `true`
- **Permit2 / Permit** — EIP-712 authorization signatures, labeled as "authorization signature"
- **native transfers** — sending ETH/BNB and the like directly

Token names are resolved using the local [token list](/blog/erc20-token-management) (also with zero external APIs).

## Special Handling for DEX Swaps

Swaps are one of the most common operations over WalletConnect, but also the hardest to decode—every DEX's router function signature is different. v1.5.0 adds structured decoding for the major DEXes:

- **Uniswap / PancakeSwap V2** (`swapExactTokensForTokens` and similar)
- **V3** (`exactInputSingle` / `exactInput`, including packed path parsing)
- **1inch / KyberSwap** (the aggregator's swap description struct)
- **OpenOcean and generic aggregators** (`swapExactIn`)

The decoded result is shown as "**A → B, minimum received X**"—so you can tell at a glance what you're swapping and what the slippage floor is.

Swap decoding follows a "fixed cases first, generic detection as fallback" strategy: it first matches against known router signatures, and only falls back to a structured generic detector (`detectSwap`) when nothing matches. That detector is **extremely conservative**—if there's any uncertainty it returns `null`, preferring to display "unable to read" over guessing at a swap that might be wrong.

Drawing out the decoding decision flow makes it clearer how "honesty" is built into the branches:

```
calldata sent by the dApp (hex)
        │
        ▼
  take first 4 bytes = function selector
        │
        ▼
  found in local KNOWN_ABIS?
        │
   ┌────┴─────┐
  yes           no
   │             │
   ▼             ▼
 viem local decode   is it a swap sig? (detectSwap, very conservative)
   │             │
   │        ┌────┴────┐
   │       yes          no
   │        │            │
   │        ▼            ▼
   │     decode A→B   online toggle on? → fetch ABI from Sourcify
   │     min received X   │
   │        │       ┌────┴────┐
   │        │     found      not found / can't decode
   ▼        ▼       │            │
 ┌──────────────────┘            ▼
 │  readable summary       ⚠️ unable to read this tx
 │ (red flag: unlimited approve /   + expandable raw hex
 │   setApprovalForAll)       (no false sense of safety)
 └──────────────────────────────┘
```

When in doubt, it heads toward "unable to read" rather than guessing—this conservative branch design is the concrete implementation of the honesty principle.

## The Honesty Principle: If It Can't Decode, It Says So

This is the most important design philosophy in the entire feature.

If a transaction **can't be decoded**—an unknown selector, malformed data, a contract it has never seen—ArcSign **does not** invent an interpretation. It clearly shows "⚠️ unable to read this transaction" and provides an expandable section so you can inspect the raw hex.

Why does this matter? Because for a security tool, **a confident but wrong interpretation is more dangerous than honestly admitting "I can't read this."** If we displayed a harmless-looking fake summary for a malicious transaction, that would be worse than showing a string of hex—the user would sign with confidence, based on wrong information. So ArcSign's decoder would rather fall back conservatively to "unable to read" than risk offering a possibly misleading interpretation.

## Online ABI Fallback (Optional)

A local list of ABIs can never cover every contract. So v1.5.0 adds an **optional** online fallback: when the local list can't decode a contract, it can fetch a verified ABI from [Sourcify](https://sourcify.dev) (a decentralized contract verification service) to decode it.

This feature:

- **Can be enabled by default, but with a one-time privacy notice**—because it sends the contract address to Sourcify, and users deserve to know
- **Has an encrypted USB cache**—ABIs that have been fetched are stored locally, so there's no need to fetch them again next time
- **Still honors the honesty principle**—even if an ABI is fetched but the semantics still can't be resolved, it displays "unable to read" all the same

Fetching an ABI ≠ understanding the intent. Sourcify gives you a contract's function interface, but if what that function does isn't covered by our presentation logic, the honest thing is still to fall back to unreadable.

## Decode in the Frontend, but the Security Gate Is in the Backend

There's one point that's easy to confuse and worth clarifying: clear-signing's **decoding** is done in the frontend (viem decoding locally), but this does not violate ArcSign's principle that "security decisions live in the backend."

The distinction is this: decoding is **auxiliary presentation of information**—it helps you understand a transaction, but it is not a security gate. The real security enforcement (blacklist hits, danger determination, refusing to sign) happens in the Go backend, before the private key is ever used (see the [signing security gate post](/blog/signing-security-gate) for that part). Clear-signing lets you understand; the security gate decides whether to block—two separate things, handled in separate layers.

## Why This Feature Matters

"What You See Is What You Sign" is one of the core concepts of hardware wallet security. A cold wallet that lets you blind-sign throws away its most important line of defense—because the very essence of a phishing attack is getting you to sign a transaction that works against you without your knowing it (an unlimited approve, a `setApprovalForAll`).

v1.5.0's clear-signing restores that line of defense: at the most critical moment—the moment of signing—you can understand what you're authorizing.

To see the other upgrades in this release, head back to the **[v1.5.0 release overview](/blog/arcsign-v1-5-0-release)**.
