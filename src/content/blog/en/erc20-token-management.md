---
title: "ERC-20 Token Management: Add, Hide, and Customize Tokens (2026 Guide)"
description: "ERC-20 token management guide: why custom tokens need manual adding, ArcSign's add/hide/customize flow, fake-token detection, and 6-chain governance SOP."
pubDate: 2026-04-27
locale: en
tags: ["Tutorial"]
author: "ArcSign Security Team"
heroImage: "/blog/images/erc20-token-management-hero.png"
relatedSlugs: ["arcsign-windows-linux-guide", "how-to-revoke-token-approvals", "clipboard-hijack-attack"]
---

## 1. Why doesn't my wallet show my tokens?

If you've ever sent a smaller-cap or freshly issued token to your wallet only to see a balance of 0 — take a breath. **Your tokens are not lost.** Your wallet simply doesn't recognize the contract yet. To understand why, we need to start with the design of ERC-20 itself.

Each EVM chain sees thousands of new contracts deployed daily. Ethereum mainnet alone hosts over **500,000 ERC-20 contracts**. No wallet can preload all of them — the app would balloon to hundreds of MB, the whitelist would be unmanageable, and scam tokens would slip in through the gaps. So virtually every wallet uses the same playbook:

**"Show only a curated token list by default. Anything else, the user adds manually by contract address."**

That's why "add / hide / customize tokens" isn't an advanced feature — it's an everyday EVM wallet skill. Once you internalize it, you'll see clearly: your assets are always there, you just have to invite them into the UI.

> **Mental model**
>
> On-chain balance = the truth. Wallet UI = a window onto the truth. Even when the UI shows 0, if Etherscan shows the balance and the contract address is correct, your tokens are safe. Token management is the act of telling your wallet which contracts to look at.

## 2. ERC-20 standard and how token lists actually work

ERC-20 defines the minimum interface every Ethereum-style token contract must implement. To display a token correctly, a wallet has to read the following from the contract:

// Required ERC-20 functions (excerpt)
function name() external view returns (string memory);
function symbol() external view returns (string memory);
function decimals() external view returns (uint8);
function balanceOf(address account) external view returns (uint256);
function transfer(address to, uint256 amount) external returns (bool);

`name`, `symbol`, and `decimals` are static metadata — read once, cache forever. `balanceOf` is the dynamic read every refresh hits. The catch: **the wallet has to know the contract address before it can call `balanceOf`**. No address = no query = no balance in the UI.

### Token Lists: a two-tier whitelist + custom architecture

Like most mature wallets, ArcSign uses a two-tier token-list system:

| Tier | Source | Contents | Update cadence |
| --- | --- | --- | --- |
| **L1 Built-in list** | ArcSign curated + Uniswap Token Lists / CMC | Top ~200 tokens per chain (USDT, USDC, WBTC, ARB, OP, PEPE, …) | Per app release |
| **L2 Custom list** | User-added contract addresses | Anything not in L1: small-caps, new launches, private allocations | Real-time, stored locally on USB |

Together, the two tiers cover virtually every legitimate token you'll encounter. L1 nails out-of-box experience; L2 keeps you flexible for any edge case. Important: **your custom list lives only on your USB — it never gets uploaded**, fully aligned with ArcSign's "data never leaves the device" principle.

## 3. ArcSign's 4-step custom-token flow

Say you just received a new token from a DEX, but ArcSign's UI doesn't show it. Here's the standard playbook to bring it in. Every step happens offline, inside your USB, with zero on-chain transactions:

**1. Get the contract address from Etherscan / BscScan**

Never use a Google search. Go directly to `etherscan.io` (or its sibling: `bscscan.com`, `polygonscan.com`, `arbiscan.io`, `optimistic.etherscan.io`, `basescan.org`), search for the token name, find the "Contract" tab and the 0x address. **Confirm the green "✓ Verified" badge in the upper-left** before copying.

**2. Switch ArcSign to the correct chain**

Plug in USB → unlock ArcSign → use the chain selector at the top to switch to the right network (Ethereum / BSC / Polygon / Arbitrum / Optimism / Base). Token contracts are **chain-specific** — USDT on BSC and USDT on Ethereum are different contracts with different addresses, so make sure they line up.

**3. "Add Token" → paste the contract address**

From the assets page, hit "Add Token" (or the "+" button) → paste the address you copied. ArcSign auto-fetches `name`, `symbol`, and `decimals` via read-only RPC (Alchemy on most chains, NodeReal on BSC) and shows a preview. If the contract is a known scam or flagged by multiple sources, a red warning banner appears.

**4. Confirm — no signature required**

Verify the name and symbol match what Etherscan shows → click "Confirm." The token immediately appears in your asset list with the real balance. The whole flow uses **no on-chain transaction, no signature, no gas** — you simply edited the local token list on your USB.

> **Pro tip: add directly from the Activity feed**
>
> If you've already received the token in a transaction, ArcSign's "Activity" page lists that tx with an "Add this token" shortcut. One click and it's in your list — no manual address copying.

## 4. Hide tokens: clean UI & defend against spam

"Hide" is not "delete." Your on-chain balance is permanent and untouchable. Hiding simply removes the token from your ArcSign UI. There are three common scenarios:

- **Clean up airdrop spam:** after testing 100 DApps, you've collected stacks of $0.001-value junk. Hide them, regain a clean view.

- **Remove fake tokens:** dust-attack lookalikes that mimic mainstream tokens — hide so you never accidentally tap them.

- **Tokens you're done with:** like an old governance token from a defunct L2.

### How to hide

Long-press (or right-click) the token in your asset list → choose "Hide token" → confirm. It vanishes from the UI but can be unhidden from "Settings → Hidden Tokens" any time. Hiding does not affect: (1) your on-chain balance; (2) your ability to re-add the token later via [WalletConnect](/blog/walletconnect-dapp-tutorial) or the custom-token flow.

> **Critical principle: hide ≠ "safely dispose of"**
>
> If you receive an obvious phishing token, **do not** try to `transfer` or swap it out (even if your goal is just to "throw it away"). Any active interaction can trigger the malicious contract. The right move is to hide it and forget it. Trying to deal with it might be the very action that drains the rest of your wallet.

## 5. Fake tokens: 5 common scams and a detection checklist

Fake tokens are a chronic problem in the EVM ecosystem. According to Etherscan 2025 stats, more than **3,000 new scam-token contracts are deployed on Ethereum mainnet every day**. Here are the five most common patterns:

| Pattern | What it looks like | Real intent |
| --- | --- | --- |
| **Lookalike copies** | Symbol "USDC" or "USDT", same logo | You think you got a stablecoin and try to swap it for real money |
| **URL-named tokens** | Token name reads "Visit arcsign-airdrop.io" or "Claim 1000 USDT at xxx.com" | Lures you to a phishing site to sign a malicious approve |
| **Backdoored ERC-20** | Looks like ERC-20 but transfer / approve hide custom logic | Calling them silently grants extra allowance to the attacker |
| **Address-similarity attack** | First and last 4 chars match a real token contract | You glance only at head/tail and trust the wrong contract |
| **Honeypot tokens** | You can buy but not sell; price only goes up | Pump pulls in liquidity; only the deployer can exit |

### Detection checklist: 5 indicators to verify

1. **Etherscan "✓ Verified" badge with public source code.** Unverified contracts are 95% scams.

2. **Contract age ≥ 30 days, holders ≥ 1,000.** A token deployed 5 minutes ago has zero credibility.

3. **Listed on CoinGecko / CoinMarketCap.** Cross-check the official token page's contract address.

4. **Address matches the project's official Twitter and website.** Three independent sources agreeing is the bar.

5. **No red warning in ArcSign's preview.** The built-in scam-list filters known fakes automatically.

> **Iron rule**
>
> If you don't recognize a token: **don't approve, don't swap, don't click any embedded links**. Default assumption: it's a scam. Sleep on it for three days — legitimate opportunities don't evaporate that fast. Related reading: our [Phishing Attack Prevention guide](/blog/phishing-attack-prevention) and [Token Approval Management](/blog/token-approval-revoke).

## 6. The 6-chain EVM token governance SOP

ArcSign supports **Ethereum, BSC, Polygon, Arbitrum, Optimism, and Base** — each with its own token list. Multi-chain users should run a personal token-governance SOP, ideally once a month:

**1. Monthly reconciliation: align on-chain reality with the UI**

For each chain, compare ArcSign's asset list against the ERC-20 Token tab on Etherscan / BscScan / etc. New legit tokens? Add them. Spam? Hide. The point is to keep the UI faithful to the on-chain truth.

**2. Categorize: Core / Investment / Watch / Hidden**

ArcSign supports custom labels. Suggested four-bucket model: (1) Core (USDT, ETH, BTC long-term holdings); (2) Investment (mid-term swing trades); (3) Watch (small test positions); (4) Hidden (spam). Combined with monthly reconciliation, you'll always know where you stand.

**3. Sync custom-token list to your backup USB**

After adding a batch of custom tokens, export an updated `.arcsign` encrypted backup file and copy it to your secondary USB. The backup is [AES-256](/blog/aes256-encryption-simple) encrypted out of the box — even if the file lands in someone else's hands, they can't decrypt it.

**4. Pair with your quarterly approval audit**

Run "token governance" and "approval audit" in the same session each quarter. Forgotten tokens often correspond to forgotten approvals; tackling them together is the highest-leverage cleanup of the year.

## 7. Privacy & security power tips

### 1. Multi-account separation for privacy

ArcSign derives multiple addresses from the same seed. Allocate tokens across accounts deliberately: a "main" account for core long-term holdings (BTC / ETH / [stablecoin](/blog/stablecoin-storage-guide)s), a "DeFi" account for DApp interactions, an "airdrop" account for new-protocol experiments. Chain-analysis firms have a much harder time linking your on-chain activity together.

### 2. Use a custom RPC endpoint to reduce IP correlation

By default, balance reads go through built-in **public RPC plus Multicall3** with no API key and no third-party account binding — there's no shared Alchemy key tying your wallets together. If you want even more privacy, you can still switch to a custom RPC (Infura, QuickNode, or self-hosted) in ArcSign's settings; rotating providers or self-hosting raises the bar further. We'll dive deeper in our upcoming [Custom RPC tutorial](/blog/arcsign-custom-rpc).

### 3. Zero-interaction principle for dust attacks

When small unsolicited tokens land in your wallet, **don't** consolidate them into your main account. Chain analysis treats addresses sharing a tx input as the same entity — one consolidation tx links every address you touched. Right move: hide them, leave them be. Untouched dust never leaks anything.

### 4. Use watch-only accounts to evaluate new tokens

Want to track a new token's price and balance without putting funds at risk? Add the contract address to a watch-only address and observe from afar. Watch-only addresses don't have a corresponding private key — perfect for paper trading and market scouting.

> **ArcSign's commitment**
>
> Whether you manage 5 ERC-20 tokens or 500, ArcSign sticks to three principles: **(1) the token list lives on USB only; (2) every signature happens offline, the private key never leaves the device; (3) token management is free with no Pro tier locks.** Token governance is a daily habit, not a one-time chore.

## FAQ

### Q: I sent tokens to my wallet, but the UI shows 0. Why?

Wallets ship with a curated token list of a few hundred mainstream assets (USDT, USDC, WBTC, etc.). With millions of ERC-20 contracts deployed across each EVM chain, no wallet can preload them all. If you transferred a less-common token, the balance is on-chain — your wallet just hasn't "noticed" the contract yet. Add it manually via the contract address and the balance appears immediately. ArcSign's custom-token flow works the same way across all 7 supported EVM chains.

### Q: A free token suddenly appeared in my wallet. Should I claim it?

It's almost certainly not a real airdrop — most likely a dust attack or fake-token scam. Attackers blast lookalike tokens (fake USDC, fake ETH, etc.) to thousands of addresses, hoping you'll connect to a phishing site, sign a malicious approve, or try to swap it. Rule of thumb: don't approve, don't swap, don't click any link in the token's metadata. ArcSign's hide-token feature removes spam from the UI without altering the on-chain state.

### Q: Does adding a custom token in ArcSign require an internet connection or expose my private key?

Adding/hiding/customizing tokens only edits the local token list on your USB — no on-chain transaction, no signature, no private key access. Reading balances uses keyless read-only calls over built-in public RPC plus Multicall3 that only send your public address. Anything that writes to chain (transfer, swap, revoke) is the only operation that touches the private key — and even then, the key is reassembled inside the USB from three XOR shards for 1–5 ms, signs, and is wiped immediately.

### Q: How is ArcSign's token management different from MetaMask or Trust Wallet?

All three let you add custom tokens, but the security model differs. MetaMask / Trust Wallet are hot wallets — keys live on a device that's online, so any compromise can drain your assets along with the token list. ArcSign is a USB cold wallet: the token list and private key both live on the USB, and management works fully offline. Signing happens inside the USB; the private key never leaves the device. ArcSign also ships curated token lists for all 7 EVM chains (including BSC) and auto-flags known scam contracts — a layer most hot wallets simply don't have.
