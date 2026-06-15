---
title: "Permit2 Signature Phishing: How One EIP-712 Signature Empties an Entire Wallet in Seconds"
description: "Permit2 moved ERC-20 approvals off-chain and into EIP-712 signatures — and dropped the cost of phishing from a real transaction to a single illegible message. We break down PermitSingle, PermitBatch, and PermitTransferFrom attack variants, why most wallet UIs still mislead users, and how ArcSign parses Permit2 messages before you sign to block abuse."
pubDate: 2026-05-20
locale: en
tags: ["Security"]
author: "ArcSign Security Team"
heroImage: "/blog/images/permit2-signature-phishing-hero.png"
relatedSlugs: ["wallet-drainer-toolkits-explained", "blind-signing-risks", "eip-7702-delegation-risks", "token-approval-revoke"]
---

## Why "I Didn't Send a Transaction, I Just Signed" Empties Wallets Now

For five years, crypto security intuition has been: "**As long as I don't confirm a transaction, nothing can move.**" Signing an off-chain message felt free, off-chain, harmless — no gas, no state change, what could go wrong?

Uniswap's **Permit2**, deployed in 2022, rewrote that intuition. Permit2 turns an ERC-20 approval from "**one on-chain `approve()` transaction**" into "**one EIP-712 signature**" — same authorization power, no gas, no on-chain record, no Etherscan trail. To users: no more clicking Approve before every swap. To DApp developers: gasless UX. To attackers: **phishing cost drops from a few dollars of gas plus a public record, to zero cost and complete silence**.

Between 2023 and 2026, **almost every successful [wallet drainer toolkit](/blog/wallet-drainer-toolkits-explained) that stole more than a million dollars used Permit2 phishing as its primary weapon**. Public reports in 2024 alone documented 20+ Permit / Permit2 phishing incidents above $500k each, totaling well over $200M.

            Why Read This Carefully

If you've used Uniswap, 1inch, CoW Swap, Matcha, or OpenSea Seaport in the last year, you've already signed Permit2 authorizations. This post breaks down Permit2's three message structures, how attackers disguise them as innocuous "Sign in to claim" or "Verify ownership" prompts, and why ArcSign treats every EIP-712 message as an on-chain-transaction-grade decision.

## What Permit2 Actually Does: Moving ERC-20 Approvals Off-Chain

To see Permit2's attack surface, you have to see what problem it solved in 2022.

### Before Permit2: Two Old Pain Points

Classic ERC-20 swaps need two transactions: (1) `approve(spender, amount)` for the DEX router, (2) the actual `swap()`. That created two structural problems:

1. **Broken UX**: First-time swappers had to click Confirm twice and pay gas twice.
2. **Every contract needs its own approval**: You approved Uniswap V3 Router, then 1inch Router, then Matcha — same token, three rounds of gas.

Uniswap's solution: deploy a **shared approval layer** — the Permit2 contract at [0x000000000022D473030F116dDEE9F6B43aC78BA3](https://etherscan.io/address/0x000000000022D473030F116dDEE9F6B43aC78BA3), same address across Ethereum, Optimism, Arbitrum, Base, Polygon, BSC, Avalanche, zkSync, and more.

### After Permit2: One On-Chain Approve + N Signatures

The new flow:

1. **One on-chain step**: User signs `approve(Permit2, max_uint256)` for a token, giving Permit2 infinite spending power over that token.
2. **Every subsequent swap**: User signs **only an EIP-712 message** that says "how much, to whom, until when." Permit2 verifies the signature and moves the tokens from the user's wallet to the requested spender.

```
Classic flow:        [on-chain approve] → [on-chain swap]
Permit2 flow:        [on-chain approve Permit2] → [EIP-712 sig] → [DApp wraps swap]
```

UX-wise this is a revolution. Security-wise it's **a brand new attack surface**: users still think "it's just a signature, no big deal" — but that signature grants power **exactly equivalent** to an on-chain `approve()`.

### Three Permit2 Message Types — Each One Weaponizable

The Permit2 contract exposes three families of authorization messages:

| Type | What It Authorizes | How Attackers Use It |
| --- | --- | --- |
| **PermitSingle** | Spender authorization for one token over a time window with a cap | Phishing: ask for max cap, max deadline, wait until funds arrive |
| **PermitBatch** | One signature authorizing multiple tokens to the same spender | Phishing: one signature drains USDC, USDT, WETH, WBTC at once |
| **PermitTransferFrom / Witness** | One-shot transfer signature, no lingering allowance | Phishing: drain the targeted token immediately, leaving no allowance trail |

The nastiest is **PermitBatch** — one signature is a backdoor for many tokens. A typical attacker-crafted PermitBatch looks like this:

```
PermitBatch:
  details: [
    { token: USDC,  amount: 2^160-1, expiration: 2^48-1, nonce: 0 },
    { token: USDT,  amount: 2^160-1, expiration: 2^48-1, nonce: 0 },
    { token: WETH,  amount: 2^160-1, expiration: 2^48-1, nonce: 0 },
    { token: WBTC,  amount: 2^160-1, expiration: 2^48-1, nonce: 0 },
    ... ← attacker stuffs every valuable token in your wallet
  ]
  spender:   0xAttackerSweeper
  sigDeadline: 2^256-1
```

`2^160-1` is the maximum value of Permit2's amount field — about 1.46 × 10^48, far greater than any token's total supply. `2^48-1` as expiration corresponds to year ~89,000 AD. In plain English: **this signature lets the attacker pull any amount of any of these tokens from your wallet until the planet is gone**.

            Why Permit2 Is More Dangerous Than Classic ERC-20 Approve

A classic `approve()` is an on-chain transaction: you see "Confirm transaction," you see a gas fee, Etherscan records it, and if you regret it you can send `approve(spender, 0)` to revoke. Permit2 is a **message signature**: no gas, no on-chain trail, Etherscan sees nothing — **and to revoke you still need to pay gas for a `lockdown()` on-chain transaction**. The whole risk model flips from "actively pay to confirm" to "silently authorize."

## Three Permit2 Attack Variants (With Real Cases)

### Variant 1: "Sign in to verify" Phishing — One Harmless-Looking Message Drains You

The most common version. Attackers design the DApp to say "**Sign this message to verify wallet ownership**" — which looks just like the login flow many real DApps use (after all, [Sign-In with Ethereum / EIP-4361](https://eips.ethereum.org/EIPS/eip-4361) is also pure message signing). But what gets signed isn't a SIWE message — **it's a PermitBatch or PermitTransferFrom**.

The difference is in the wallet UI — and **most wallets pre-2024 showed Permit2 structures terribly**:

```
MetaMask circa 2024 PermitBatch display:

Sign Message
You are signing:
PermitBatch
details (length: 4): {...}
spender: 0x7a2...e91
sigDeadline: 1893456000
```

The user sees "sign message" plus some hex — no plain-English "you're authorizing 4 tokens to be drained by 0x7a2... over the next 75 years." So "verify ownership" gets clicked, and the wallet is outsourced.

Real case: in May 2024, a wallet holding ~$4.8M of USDC, USDT, and stETH signed "signature to verify holder status" on a fake "OG NFT holder claim" site. Within three seconds, a PermitTransferFrom moved all $4.8M out. The on-chain record shows only a single Permit2 transferFrom from the victim's address — **Etherscan never saw any explicit approval from the victim**, because the approval lived entirely off-chain.

### Variant 2: "Approve in Advance, Drain on Demand" — Waiting Sweepers

PermitSingle and PermitBatch don't move funds immediately — they create an **allowance**. After collecting the signature, the attacker waits: for a large inbound transfer, an unstake, an exchange withdrawal.

This variant is as dangerous as [EIP-7702 Sweeper delegation](/blog/eip-7702-delegation-risks): nothing visible happens at the moment of signing. Balance is unchanged. Etherscan shows no new transaction. You feel safe. Three weeks later, you withdraw 50,000 USDC from Coinbase to your wallet — and PermitTransferFrom drains it within 200 ms.

| Stage | What the Victim Sees | What Actually Happened |
| --- | --- | --- |
| Victim signs PermitBatch | "Click here to verify identity" | Attacker holds infinite-allowance over 4 tokens |
| Victim wallet | Balance unchanged, no new tx | Signature stored in attacker backend, waiting |
| 3 weeks later 50K USDC arrives | Looks like a normal inbound | Permit2.transferFrom fires, 50K is gone |

### Variant 3: Cross-Chain Replay Across Same-Address Permit2

Permit2 is deployed at the **same address on every supported chain** — by design, so DApp developers have a consistent interface. But that means **a PermitBatch signed for Permit2 on Ethereum is technically valid for the same-address Permit2 on Optimism, Arbitrum, Base, etc.** — as long as the token name and nonce line up.

Some drainer toolkits (later versions of [Inferno, Pink, Angel](/blog/wallet-drainer-toolkits-explained)) automate this: victim signs a PermitBatch on Ethereum, the attacker backend replays it across 6 chains within seconds. If the victim happens to hold the same tokens on an L2 (very common), those assets vanish in parallel.

            How Is Permit2 Different from EIP-2612 Permit?

EIP-2612 Permit is built into individual ERC-20 tokens — only DAI, USDC, UNI, and a handful of others implement it. Permit2 is **a standalone contract** that works **with every ERC-20** (as long as you first send one `approve(max)` to the Permit2 contract). The attack surface of EIP-2612 is limited to specific tokens; Permit2's surface covers **every token you've ever swapped through any major DEX aggregator**. That's why Permit phishing losses jumped 5× the year Permit2 went live.

## Why Wallet UIs Still Fool Users

EIP-712 was designed for "human-readable signed messages" — but readable is not the same as understandable. To turn a PermitBatch into language a user actually parses, a wallet needs to:

1. Identify the verifying contract as Permit2 (compare to [0x000000000022D473030F116dDEE9F6B43aC78BA3](https://etherscan.io/address/0x000000000022D473030F116dDEE9F6B43aC78BA3));
2. Parse the EIP-712 typed data and map token addresses to symbols and decimals;
3. Translate `2^160-1` to "infinite" and `2^48-1` to "never expires";
4. Map the spender to a known DEX router or flag it as unknown;
5. Simulate what would happen **if this signature were executed right now** — which tokens, what amounts, where to.

Most browser wallets pre-2024 did only step 1. Even after MetaMask shipped [Permit2 transparent signing](https://docs.metamask.io/wallet/concepts/transactions/scams-attacks/) in Q4 2024 and Rabby did it a few months earlier, **most hardware wallet screens (Ledger, Trezor) still show raw hex** — the user sees an unreadable 0x string.

Worse: [blind signing](/blog/blind-signing-risks) has become a habit. Power users sign dozens of EIP-712 messages a day on DeFi sites without parsing them carefully — until one of them is malicious.

### What a Legitimate Permit2 Signature Looks Like

A legitimate Permit2 message from Uniswap, 1inch, CoW Swap, or Matcha will:

1. Have a `spender` pointing at the **DApp's official router** (Etherscan shows millions of transactions and a verified label);
2. Have an `amount` equal to or slightly above your actual swap amount — **not** `2^160-1`;
3. Have an `expiration` of about **current time + 30 days** — **not** `2^48-1` or anywhere near it;
4. Be a **PermitSingle**, not a PermitBatch (you're swapping one token, no reason to authorize four);
5. Have a `sigDeadline` of **current time + 30 minutes** — short enough to bound abuse.

If any of those five is off, stop. **A legitimate swap does not need infinite allowance, a 4-token batch, or a 75-year expiration.**

## How ArcSign Defends Against Permit2

ArcSign treats EIP-712 message signing in the same pipeline as [blind signing](/blog/blind-signing-risks) and [EIP-7702 delegation](/blog/eip-7702-delegation-risks) — once a Permit2 message is detected, the signing UI enters **on-chain-transaction-grade** review:

            1
            Full Permit2 Decoding — Never Raw Hex

The signing screen never shows `PermitBatch` plus a hex blob. ArcSign decodes the message into plain English: "You are about to authorize spender `0x7a2...e91` to drain [USDC: infinite / USDT: infinite / WETH: infinite / WBTC: infinite] from your wallet over the next [27,394 days / never expires]." A signature you can't read should never be a signature you confirm.

            2
            Auto-Flag Abnormal Parameters With a Full-Screen Warning

Any of these triggers a red full-screen warning that requires an explicit checkbox to bypass: (a) `amount` at or near `2^160-1`; (b) `expiration` more than current time + 1 year; (c) `sigDeadline` more than current time + 7 days; (d) PermitBatch containing ≥ 3 tokens; (e) `spender` is a contract deployed less than 30 days ago.

            3
            Spender Static Analysis and Blacklist Lookup

ArcSign's local engine runs immediate checks on the spender address: (a) match against known [drainer toolkit](/blog/wallet-drainer-toolkits-explained) infrastructure blacklists; (b) deployment age; (c) presence of repetitive `transferFrom` traffic (typical sweeper signature); (d) funds-flow correlation with known phishing relays. Any flag → full-screen warning.

            4
            Simulation: What Happens If This Signature Is Used

Before you press Confirm, ArcSign simulates the outcome **if the attacker submitted this signature immediately**. The tokens and amounts that would leave your wallet are shown in red on the signing screen. If the simulation shows funds being drained — the signature is blocked outright.

            5
            Private Key Never Leaves USB; Full Message on the Cold Screen

The core of a Permit2 attack is "**signing the wrong message**" — keeping the private key on USB is not enough by itself. The signing interface itself must live on the cold side. ArcSign renders the full Permit2 decode, static analysis, and simulation results on the USB device's screen, integrated with [XOR three-shard key protection](/blog/xor-encryption-explained) and [mlock memory protection](/blog/mlock-memory-protection) for a complete zero-trust signing chain.

            Design Philosophy: Every EIP-712 Is a Latent On-Chain Action

ArcSign refuses to treat EIP-712 messages as "the cheap kind of signature" — they are authorization grants **exactly equivalent** to on-chain transactions. So we put Permit2 messages and ERC-20 approve transactions through identical review. See [zero-trust wallet](/blog/zero-trust-wallet) for ArcSign's full security model.

## 7 Habits That Keep You Out of Permit2 Phishing

| # | Habit | Vector It Stops |
| --- | --- | --- |
| 1 | **Refuse any Permit2 signature where the spender is an unknown contract** | Sign-in disguise, sweeper |
| 2 | **Refuse any signature with `amount = 2^160-1` or `expiration = 2^48-1`** | Infinite authorization |
| 3 | **Treat any PermitBatch with ≥ 3 tokens as highly suspicious** | Whole-wallet drain |
| 4 | **Refuse "sign in to verify" messages from sites you don't recognize** | EIP-712 disguise |
| 5 | **Hold large balances in a fresh [cold wallet](/blog/usb-cold-wallet-benefits) that's never touched any DApp** | All variants |
| 6 | **Use a [cold wallet](/blog/best-crypto-wallet-2026) that fully decodes Permit2** | Blind Permit2 sign |
| 7 | **Monthly check Permit2 allowances on [Revoke.cash](https://revoke.cash) and revoke anything you don't recognize** | Waiting sweepers |

### Advanced: Scope Permit2 Approvals to the Bare Minimum

If you need to use Permit2 for swaps: (1) Right after each swap, revoke that token's ERC-20 approval to Permit2 on [Revoke.cash](https://revoke.cash); (2) Re-approve for the next swap — yes, you pay extra gas, but Permit2's allowance is "clean" between swaps; (3) Keep large balances in a separate [cold wallet](/blog/cold-vs-hot-wallet) entirely and never let it sign Permit2 messages.

## Already Signed a Suspicious Permit2 Message? Emergency Procedure

If you suspect you just signed Permit2 on a sketchy site — **speed matters more than anything else**. Permit2's risk is that the signature might still be unused (waiting attacks). The faster you revoke, the higher the chance you invalidate it before it's submitted.

            1
            Check Permit2 Allowances on Revoke.cash

Open [Revoke.cash](https://revoke.cash) and switch to the Permit2 tab. Look for unknown spenders with non-zero allowance on any of your tokens. If any are present, go to the next step.

            2
            Revoke On-Chain (Gas Required)

For each suspicious (token, spender) pair, click Revoke on Revoke.cash. This sends a `Permit2.lockdown()` or `Permit2.approve(token, spender, 0, 0)` on-chain transaction that zeroes the allowance. **You can't wait this out**: once the attacker submits the signature within its `sigDeadline`, the allowance activates and funds move immediately. The moment you notice anything wrong, pay gas and revoke.

            3
            Also Revoke the Token's ERC-20 Approval to Permit2

Advanced safety: beyond zeroing the Permit2 allowance, also revoke the underlying `approve(Permit2, max)` you originally made for that token. That severs Permit2's ability to touch that token at all. Re-approve next time you actually need to swap.

            4
            Assume the Wallet Is Compromised; Move to a Fresh Address

Even after revoking, the attacker might hold other approvals you haven't noticed — [ERC-20 allowances](/blog/token-approval-revoke), [EIP-7702 delegations](/blog/eip-7702-delegation-risks), `setApprovalForAll`, etc. The safe play is a fresh address (ideally a new [seed](/blog/seed-phrase-backup-guide)), move remaining assets over, and treat the old wallet as burned ground.

            Never Hire an "On-Chain Detective" to Recover Funds

Like other [phishing victims](/blog/wallet-drainer-toolkits-explained), Permit2 victims are aggressively targeted by secondary scams. Anyone on Telegram, X, or Discord claiming they can "recover your funds" is **100% a scam**. Legitimate forensic firms do not DM you and do not collect retainers up front.

## FAQ

### Q: I never use Uniswap — does that mean I'm safe from Permit2?

No. Permit2 was designed for "any DApp to reuse" — 1inch, CoW Swap, Matcha, OpenSea Seaport, and many NFT marketplaces and aggregators integrate it. Even if you've never opened Uniswap, if you've used any major DEX aggregator or NFT market, **you've almost certainly already signed `approve(Permit2, max)` for the tokens you trade**. Attackers don't care which DApp you use — they care that Permit2 already has infinite spending power on your tokens.

### Q: Do hardware wallets (Ledger, Trezor) protect against Permit2 phishing?

Partially. Ledger added Permit2 clear signing in Q3 2024; Trezor followed in Q1 2025. But it's **mostly limited to the Ethereum-mainnet Uniswap Permit2 instance** — other chains, custom Permit2 deployments, PermitBatch multi-token decoding, and spender blacklist comparison are still unsupported on most firmware. Even on the latest firmware, **hardware wallets typically can't do spender contract static analysis, simulation, or cross-chain blacklist lookups**. ArcSign renders all of those on the larger USB-device screen.

### Q: Can a USB cold wallet still get phished on Permit2?

**Yes.** A USB cold wallet protects against [private key exfiltration](/blog/private-key-management-best-practices) — the key never leaves the device. But Permit2 phishing's core mechanism is "**getting you to actively sign an authorization**." A cold wallet's job there is to **make it obvious what you are signing**. If a user manually checks "I understand the risk" on the full-screen red warning ArcSign throws and clicks Confirm anyway — no cold wallet on earth can stop them. The design goal is to put every relevant fact in front of you so you can make an informed decision, not to override your judgment.

### Q: Why is revoking Permit2 so complicated? Two layers?

Because Permit2 is "**an authorization on top of an authorization**." Layer one: you signed `approve(Permit2, max)` for a token — that's the standard ERC-20 allowance on-chain. Layer two: Permit2 internally tracks its own `allowance(owner, token, spender)` mapping — that's Permit2's own authorization system. Attackers exploit the second layer. Revoking only the second layer (`Permit2.lockdown`) blocks already-signed phishing, but the first-layer ERC-20 approval to Permit2 remains, so a fresh malicious PermitSingle can still be authorized. The robust play is to revoke both layers and re-approve when you actually need to swap.
