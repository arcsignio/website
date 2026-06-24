---
title: "How Keyless Balance Checks Work: Public RPC + Multicall3 Explained"
description: "ArcSign v1.5.0 removes the need for an Alchemy API key to read token balances across all 7 EVM chains. We break down the engineering: a public RPC node pool, Multicall3 batching many balanceOf calls into a single eth_call, a curated common-token table, an encrypted touched-token list, and why this design achieves zero setup without sacrificing privacy."
pubDate: 2026-06-23
locale: en
tags: ["Technical"]
author: "ArcSign Security Team"
heroImage: "/blog/images/keyless-balance-multicall-hero.png"
relatedSlugs: ["arcsign-v1-5-0-release", "arcsign-cross-chain-guide", "multi-chain-management"]
---

ArcSign v1.5.0 removes a step that used to trip up every new user: you no longer need to sign up for an Alchemy API key just to see your token balances. Across all 7 EVM chains, balances now work out of the box — zero setup, no key required.

This article breaks down the engineering behind that — and why "no key" is actually an interesting technical problem, not just "removing a settings field."

> **Why a key used to be required**
>
> There are two kinds of on-chain reads: "look up one address's balance of one token" (a single `balanceOf` via `eth_call`), and "list **which** tokens this address holds" (which requires full-chain indexing). A public node can do the former but not the latter. ArcSign used to route both through the same Alchemy path, so even reading a balance needed a key. v1.5.0 splits the two apart.

## The Core Distinction: Balance vs. Discovery

Let's clear up a commonly confused distinction first, because the entire design revolves around it:

- **"How much USDC does this address hold?"** — This is a `balanceOf` query. You already know which contract to ask; you just want the number. Any RPC node can answer it with `eth_call`. **No indexing, no key needed.**
- **"Which tokens does this address actually hold?"** — This is discovery. You don't know in advance which contracts to ask, so you need to scan the chain's transfer events. That requires a full-chain indexer (Alchemy, NodeReal, and the like), which **public nodes cannot do**.

Before ArcSign v1.4.0, both were bound to the same Alchemy path, so even "checking a balance" — something a public node can do perfectly well — was held hostage by the key requirement.

The core insight in v1.5.0 is this: **reading a balance doesn't require discovery at all**. As long as we have a list of "which contracts to ask," the rest is just a pile of `balanceOf` calls — and that's keyless. So the problem shifts from "how do we obtain a key" to "how do we assemble that list, and how do we query it efficiently."

## Piece One: The Public RPC Node Pool

For each chain, ArcSign ships a set of keyless public RPC endpoints — one primary plus several fallbacks (for example, stable public nodes like publicnode). When the primary endpoint fails, it automatically falls back to the next.

There's an operational detail worth mentioning here: public endpoints break, rate-limit, and go offline. So the node pool isn't a single hardcoded URL but a "primary + fallback" list, one for every chain, with automated tests in CI guarding it — ensuring every chain has at least one working keyless primary endpoint. A single dead public node should never take down balance display for an entire chain.

## Piece Two: Multicall3 Turns N Queries Into One

With endpoints in place, the next problem is efficiency. An address on a single chain might have 10, 20 tokens to check. Firing one `eth_call` per token means 20 round trips — slow, and unfriendly to public nodes (easy to hit rate limits).

The solution is **Multicall3**. This is a contract deployed on nearly every EVM chain at **the same address** (`0xcA11...CA11`). Its `aggregate3` function batches a set of calls into a single transaction and returns all results at once.

So ArcSign's approach is: take every `balanceOf(owner)` call for all the tokens to check for this address on this chain, assemble them into one `aggregate3` batch, send **one** `eth_call` to Multicall3, and get back all the balances. 20 queries become 1 round trip. Each sub-call is set to allow failure (`AllowFailure: true`), so one broken token contract won't bring down the whole batch.

If Multicall fails on one endpoint, it falls back to per-endpoint retries. The entire path is best-effort — if a sub-query fails, it's skipped rather than failing the whole balance check.

## Piece Three: Which Contracts to Ask?

Multicall needs a list of "which tokens to query." That list is the merge of two tables:

**Table A — the curated common-token table.** A hand-picked set of well-known tokens per chain (stablecoins, wrapped native, major assets, plus liquid staking tokens like stETH / ankrBNB), with addresses taken from official CoinGecko token lists. This table is hardcoded in the program — adding a chain or a token means adding a row to this table, and the [multi-chain](/blog/multi-chain-management) balance path picks it up automatically.

**Table B — the tokens you've touched.** Table A can't possibly cover every token everyone holds. So ArcSign maintains a **per-USB encrypted** list recording the tokens you've touched but that aren't in the common list — outputs from swaps, airdrops found by incremental scans, or ones you imported manually. When you swap into a new token, or add one via the "import token" dialog, it gets written to this table (encrypted with AES-256-GCM, the same mechanism as the rest of the wallet's encrypted data).

When checking balances, these two tables are merged per chain (deduplicated, Table A taking priority) and handed to Multicall.

> **Privacy: this list never leaves your device**
>
> Table B is stored encrypted on your USB. No central service knows which tokens you hold — "discovery" is your own machine scanning your own addresses, with the results staying local. This is the opposite privacy model from "send your address to a third-party indexer and let it tell you what you hold."

## Piece Four: Prices

Once we have the balance figures, we still need a USD valuation. This comes from [DefiLlama](https://defillama.com)'s free price API — again, no key required. For tokens the provider doesn't return a price for (some BSC tokens or native coins, for example), ArcSign fills in the gap with DefiLlama.

## Putting the Four Pieces Together

So the complete flow of a single balance check looks like this:

```
Wallet EVM address
     │
     ▼
┌─────────────────────────────────────────────┐
│  For each (address × chain): build token list │
│                                               │
│   Table A common tokens ─┐                    │
│   (hardcoded, curated)   │─→ merge+dedupe ─→ token list │
│   Table B your tokens  ──┘   (Table A first) │
│   (USB encrypted, private)                    │
└─────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│  Public RPC node pool (keyless, primary +    │
│       fallback auto-switch)                   │
│        │                                       │
│        ▼                                       │
│  Multicall3 (0xcA11…CA11, same addr per chain)│
│   one eth_call batches N balanceOf calls      │
└─────────────────────────────────────────────┘
     │
     ▼
  DefiLlama fills USD prices (keyless)
     │
     ▼
  Balance shown ✓  ← zero API key, zero provider config
```

As a step-by-step:

1. Collect all of the wallet's EVM addresses
2. Load your touched-token list (Table B) from the encrypted USB
3. For each (address × chain), merge the common tokens (Table A) with your tokens (Table B)
4. Query all balances at once via public RPC + Multicall3
5. Fill in USD prices with DefiLlama

The entire path **opens no provider config and uses no API key**.

## So What Is a Key Still Used For?

To be clear and avoid confusion: after v1.5.0, **only NFTs and transaction history** still require a provider key. The reason is exactly the distinction from the start — listing your NFTs, or pulling a full transaction history, is fundamentally "discovery," which needs full-chain indexing that public RPC can't do.

The concrete key matrix is:

- **Balances (all 7 chains)** → public RPC + Multicall3, **no key needed**
- **NFTs / transaction history** → Ethereum / Polygon / Arbitrum / Optimism / Base need an Alchemy key; BSC needs NodeReal; Avalanche uses Glacier (anonymous, no key)

And when these features are missing a key, the interface clearly flags "key required" rather than silently showing a blank — another UX issue fixed alongside in v1.5.0.

## Why This Change Matters

For a [cold wallet](/blog/what-is-cold-storage), "seeing how much money you have with zero setup" isn't just convenient. It removes a barrier that turns away non-technical users, and it removes a privacy risk — you no longer have to tie your address activity to a third-party service account through a key.

Balances — the most basic, most frequent operation — should never have required you to go sign up for an account somewhere else. v1.5.0 makes it what it was always supposed to be.

To see the rest of this release's upgrades, head back to the **[v1.5.0 release overview](/blog/arcsign-v1-5-0-release)**.
