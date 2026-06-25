---
title: "Wallet Drainer Toolkits Explained: How Inferno, Pink, and Angel Stole $500M+"
description: "Wallet drainer toolkits turned crypto phishing into a SaaS — Inferno, Pink, and Angel Drainer have caused $500M+ in losses. We break down the attack flow, the SaaS economics, the on-chain fingerprints, and how ArcSign Clear Signing intercepts drainer Permit2 and setApprovalForAll signatures before you press confirm."
pubDate: 2026-05-18
updatedDate: 2026-06-25
locale: en
tags: ["Security"]
author: "ArcSign Security Team"
heroImage: "/blog/images/wallet-drainer-toolkits-explained-hero.png"
relatedSlugs: ["blind-signing-risks", "address-poisoning-attack", "phishing-attack-prevention", "token-approval-revoke"]
---

## Why 2026 Crypto Phishing Is Harder to Defend Against Than Ever

When most people hear "crypto scam," they picture a "support agent" in a private chat, an "investment mentor" on Telegram, or a fake wallet page asking for a seed phrase. Those attacks are linear: **one human attacker, one human victim, hours of effort**. Volume goes up, but slowly.

Starting in 2024, that changed. A small group of anonymous developers **productized the entire phishing pipeline** into a subscription-based, revenue-sharing SaaS with customer support — the wallet drainer toolkit. For a monthly fee or a 20–30% cut of stolen funds, anyone can rent a full kit: phishing site templates, Permit2 auto-scanners, cross-chain asset movers, and mixing pipelines. What used to require a hacker who could write Solidity AND build a frontend can now be operated by a teenager with a template.

According to [Scam Sniffer](https://scamsniffer.io) and Chainalysis's 2025 reports, **the three dominant drainer toolkits — Inferno, Pink, and Angel — caused over $500M in cumulative losses between 2024 and 2026**, hitting 270,000+ wallets. This piece dissects how those three operate, what their on-chain fingerprints are, and exactly where ArcSign can step in to stop the attack.

**Why Read This Carefully**

Drainer toolkits lowered the floor on "being a phisher" from "need technical skill" to "need money." Once you understand how they work, you'll see why [blind signing](/blog/blind-signing-risks), [address poisoning](/blog/address-poisoning-attack), and [clipboard hijacking](/blog/clipboard-hijack-attack) all spiked together in 2024 — they're not independent attacks. They're the same group of operators selling the same toolkits.

## What Is a Wallet Drainer? Phishing-as-a-Service, Crypto Edition

A wallet drainer is not a single piece of malware. It's a **full Phishing-as-a-Service platform** that ships with five modules:

### Module 1: Fake Frontend Site Templates

The kit ships with pixel-perfect clones of Uniswap, OpenSea, Blur, LayerZero, Optimism, Arbitrum, Base, and other well-known protocols. Buyers swap a logo and a domain and they have a phishing site that looks identical to the real product. Some drainer operators even sell "concierge" support — they'll help you pick keywords and bid Google Ads above the real protocol's site.

### Module 2: Wallet Connection Layer (WalletConnect / EIP-1193 Injection)

When a victim hits "Connect Wallet," the drainer connects via standard [WalletConnect v2](/blog/walletconnect-dapp-tutorial) and silently reads the victim's full asset state: every token, every NFT, balances across every chain. This read looks like a perfectly legal RPC call. No EVM-side interface warns you.

### Module 3: Asset Evaluation + Signature Generation Engine

This is the actual "intelligence" of a drainer. Within 1–2 seconds of connection, the backend **dynamically generates the most profitable signature request** for that specific wallet:

| Victim Wallet Profile | Drainer Generates |
| --- | --- |
| Heavy in USDC / USDT / DAI | `Permit2.PermitBatch` to sweep all stablecoins at once |
| Owns blue-chip NFTs (BAYC, Azuki, Pudgy) | `setApprovalForAll(operator, true)` |
| Holds stETH, rETH, cbETH (LSTs) | `Permit` + `transferFrom` combination |
| Mostly ETH, few tokens | Fake "claim airdrop" function that actually calls `transfer(operator, balance - gasReserve)` |
| Active across multiple EVM chains | Parallel signatures targeting each chain |

That dynamic generation means **drainers don't waste a Permit2 signature on a $100 wallet**. They wait for whales to connect, then drop the big payload. So "I'm small, they won't target me" is a bad assumption — they'll just send you a smaller-payload version of the same attack.

### Module 4: Auto-Liquidation and Cross-Chain Routing

The moment you sign, the backend, within milliseconds: (a) calls `transferFrom` to move tokens to a relay address; (b) bridges to harder-to-trace chains via Across, Stargate, or cBridge (Linea, Scroll, zkSync are favorites); (c) routes through Tornado-replacement mixers like Railgun and Privacy Pools, or cashes out through "burner addresses" at OKX or HTX.

### Module 5: Profit Split and Laundering Rails

The toolkit operator typically auto-skims 20–30% off the top, sending the rest to the buyer. Buyers receive already-once-laundered funds; the platform takes a stable platform cut. ZachXBT has repeatedly doxxed the on-chain splitter addresses for Inferno Drainer throughout 2024.

Drainers Leave Zero Trace on Your Computer

Traditional botnets and trojans drop files, edit the registry, install scheduled tasks. Drainers operate **entirely inside the browser tab**. They don't install anything on your computer — they only need you to "connect a wallet and sign." That's why antivirus software never catches them and reinstalling your OS doesn't help: they were never in your OS to begin with.

## The Big Three: Technical Fingerprints of Inferno, Pink, and Angel

### Inferno Drainer (Launched 2023-11 → "Retired" 2024-08 → Relaunched as Inferno 2.0 in 2024-11)

The first true SaaS-style drainer. After ZachXBT publicly doxxed Inferno's core operator addresses in August 2024, the platform announced a high-profile "retirement" and open-sourced its tooling — only for the same operators to relaunch three months later as Inferno 2.0 using nearly identical backend infrastructure. **The Inferno family is responsible for over $220M in losses.**

Technical fingerprints:
- After connecting, victims see a fake "Sign In" dialog that's actually an EIP-712 Permit2 structure
- Relay addresses often use `0x0000...` vanity prefixes to manufacture an "official" feel
- Cross-chain laundering prefers LayerZero → Linea routes

### Pink Drainer (Launched 2024-03)

The "boutique" drainer. Pink doesn't mass-produce low-quality phishing sites — it goes after **high-value targets**: DeFi founders, NFT collectors, Twitter big accounts. Known cases include two separate Ethereum core developers losing personal wallets totaling $11M.

Technical fingerprints:
- Phishing sites are **exceptionally polished** — fonts, animations, responsive design are all production-grade
- Initial vector is often a DM on X or Telegram pretending to be a "partnership" or "interview" request
- Prefers `Permit2.PermitBatch` sweeping 5–8 tokens at once
- Estimated cumulative loss: **$140M**

### Angel Drainer (Launched 2024-01 → Angel 2.0 in Q1 2025)

The most technical of the three. Angel's signature move is **active DNS hijacking** — buying expired DeFi protocol domains, or running subdomain phishing (e.g., `app-uniswap.org` clone of `app.uniswap.org`). Angel 2.0 added **cross-chain Permit2 auto-exploitation** in 2025 — a single signature drains across multiple chains.

Technical fingerprints:
- Multiple incidents of legitimate DNS records being modified, including DeFi protocols affected during the Squarespace breach
- Relay addresses use "noise patterns" — many EOAs and small contracts mixed together
- Estimated cumulative loss: **$160M**

| Drainer | Origin | Primary Tactic | Estimated Loss (2024–2026) | Main Victims |
| --- | --- | --- | --- | --- |
| **Inferno** | 2023-11 | Mass phishing sites + Permit2 | $220M | Retail NFT holders, airdrop farmers |
| **Pink** | 2024-03 | Targeted whale phishing + social eng. | $140M | DeFi founders, KOLs |
| **Angel** | 2024-01 | DNS hijack + cross-chain auto-exploit | $160M | DeFi users / institutions |
| **Total** | — | — | **~$520M** | **270K+ wallets** |

## The Drainer Attack Flow: 5 Stages, 5 Chances to Get Out

We can decompose every drainer attack into 5 stages, from "you see the site" to "your assets are gone." Each stage is a different defense surface:

**1. Acquisition (Traffic)**

Drainers use Google Ads, X / Twitter Ads, pinned Discord messages, Telegram bots, SEO squatting, and compromised protocol Discord channels to drive traffic to the phishing page. **Your defense here is "only bookmarks, never search results."** Since 2024, more than 40% of "Uniswap" or "OpenSea" Google Ads results have been drainer-purchased.

**2. Connection (Wallet Connect)**

You click "Connect Wallet." The drainer reads your address via WalletConnect or an injected provider. **No loss has happened yet** — connecting costs nothing, signs nothing. But the drainer's backend has already begun profiling your assets.

**3. Signature Request (The Drain Signature)**

The drainer dynamically generates the most efficient drain signature for your asset profile — usually `Permit2.PermitBatch` or `setApprovalForAll`. **This is your last escape point.** Reject if you can't read it: total win. Confirm: total loss.

**4. Execution (Asset Movement)**

Within 200 ms of your signature, the drainer's executor runs `transferFrom` to a relay address. **You cannot get the assets back at this stage** — no "cancel transaction" button, no blockchain customer support.

**5. Laundering**

The relay bridges, mixes, and offramps. Within an hour, your assets are usually scattered across 20+ addresses and 3+ chains. **All you can do here is report and tag**, hoping to leave breadcrumbs for future on-chain forensics.

### Why "Don't Connect Your Wallet" Is Bad Advice

Beginners often say "I never connect to anything." That's overcorrecting — connecting is harmless to a cold wallet. **The actual attack moment is always "you pressed Sign."** Put 100% of your vigilance on the signing interface, not on connection paranoia.

## Five Red Flags Every Drainer Signature Carries

No matter which drainer toolkit is behind the curtain, to actually achieve "one signature drains everything," the signature itself has telltale signs. Learn to spot these five red flags and you'll block 95% of drainer attacks:

| # | Red Flag | Why It's a Red Flag |
| --- | --- | --- |
| 1 | **Signature type is `PermitBatch` or `PermitSingle`** | 99% of legitimate DApp interactions never need a Permit2 batch authorization |
| 2 | **`spender` is an unfamiliar contract address** | Should be Uniswap Router, Aave Pool, or another known address — never some random `0xFee...` |
| 3 | **`amount` is `2^256 - 1` (unlimited)** | Even Uniswap doesn't ask for unlimited approvals |
| 4 | **`deadline` is far in the future** | Normal approvals have deadlines of "now + 10–30 minutes," not "+10 years" |
| 5 | **`setApprovalForAll(operator, true)`** | Always stop and ask: do you really want to hand over your entire NFT collection? |

Drainers Manufacture a "Sense of Normalcy"

More sophisticated drainers will first ask you to sign an **innocuous "sign-in message"** (just a plain string), getting you used to pressing approve. Then the **second signature** is the actual drain. This technique is called **Trust Priming**. The only defense is: **treat every signature as an independent event from scratch** — never relax because the previous one was safe.

## How ArcSign Helps You Catch Drainers Before You Sign

The honest framing the rest of this post already nails: **drainers don't steal your key — they steal your signature.** So a cold wallet's defense against drainers comes down to whether it lets you *see and understand* what you're about to sign. Here's what ArcSign actually does:

**1. Clear-signing: see what you're really signing**

ArcSign locally decodes WalletConnect / mint calldata and EIP-712 typed data (Permit, Permit2, ERC-20 `approve`, ERC-721 `setApprovalForAll`) into readable intent. It uses a small set of curated ABI fragments matched by 4-byte selector for the common cases; a Permit2 message surfaces the spender and token rather than a raw hex blob. Crucially, an infinite `approve` (amount = max uint) and `setApprovalForAll(..., true)` each get an **inline red flag** — the exact two patterns most drainer signatures rely on. See the [Clear Signing deep dive](/blog/blind-signing-risks).

**2. Blacklist check on the destination (free for everyone)**

Before releasing a signature, ArcSign checks the signing destination address against an offline blacklist (OFAC + ScamSniffer + MetaMask phishing lists). If the spender / destination is a known-malicious address, the backend refuses to sign unless you explicitly acknowledge. This runs offline and is free for all users — not a Pro-gated feature.

**3. Transaction simulation (Pro): net asset change before you sign**

For EVM transactions, ArcSign Pro simulates the call and previews "what happens to your wallet" before signing — e.g., "−5,000 USDC, −3,000 USDT, −1 NFT (BAYC #4xxx)." If that doesn't match what you thought you were doing (you expected to mint one NFT, but the sim shows multiple leaving your wallet), reject. Simulation surfaces a warning to inform your decision; it covers 5 major EVM chains and is a Pro feature.

**4. The private key never leaves the USB**

Even if a drainer tricks you into signing one authorization, [ArcSign's XOR three-shard key protection](/blog/xor-encryption-explained) and [mlock memory hardening](/blog/mlock-memory-protection) ensure the private key itself never leaks. The attack surface is strictly bounded to "what that one signature could authorize" — never "every future asset you ever put in this wallet." That's the last line of defense, but the best line is still "don't sign what you can't read."

Design Philosophy: Extending [Zero Trust](/blog/zero-trust-wallet) From Key Storage to the Signing UI

Many cold wallets define "security" narrowly as "the key doesn't leak." But drainers never steal your key — they steal your signature. ArcSign extends zero-trust into the signing interaction itself: clear-signing so you can read what you're authorizing, a free blacklist check on the destination, and Pro simulation so you can preview the outcome before you confirm.

## Eight Specific Habits That Beat Drainers

| # | Habit | Difficulty | Drainer Stage Blocked |
| --- | --- | --- | --- |
| 1 | **Always reach DApps via bookmarks** (no search results, no ads) | Easy | Stage 1 (Acquisition) |
| 2 | **Reject any signature you can't read** | Easy | Stage 3 (Signature) |
| 3 | **Never approve unlimited amounts** — use N × transaction amount | Medium | Stage 3 loss cap |
| 4 | **Revoke old approvals monthly** via [Token Approvals](/blog/token-approval-revoke) | Medium | Stage 3 surface reduction |
| 5 | **Use a Clear-Signing cold wallet** (like ArcSign) | Easy | Stage 3 |
| 6 | **Separate cold storage from DApp-interacting wallet** | Medium | Stage 4 loss cap |
| 7 | **Any "Connect-then-immediate-Permit2" is phishing** | Easy | Stage 3 |
| 8 | **Follow ScamSniffer blacklist + ZachXBT reports** | Medium | Early identification |

### Advanced: Wallet Layering

For mid-to-large asset holders, run three wallet tiers: (1) **Cold storage** (e.g., ArcSign USB cold wallet) — 99% of assets live here, never connected to DApps; (2) **Hot interaction** (small EVM wallet) — connects to DApps, tests, claims airdrops; even if phished, the loss is bounded; (3) **Gateway** (multi-sig or backup) — sits between the two for large transfers. This layered architecture has saved multiple whales in past drainer attacks — the drainer only reaches the hot tier.

## Already Hit by a Drainer? The 60-Minute Self-Rescue Flow

If you suspect you just signed a drainer signature, **the first 60 minutes are the golden window**:

**1. Revoke All Approvals Immediately**

Go to [Revoke.cash](https://revoke.cash) or ArcSign's Token Approvals interface and **revoke every approval on that wallet** — not just the one you just signed, because the drainer may have planted other Permits you didn't notice. Pro users can use ArcSign's batch revoke to clear everything in one click.

**2. invalidateNonces (Permit2-Specific)**

Go to [permit2.uniswap.org](https://permit2.uniswap.org) and call `invalidateNonces` to invalidate all unused Permit2 nonces on your wallet. This kills any Permit2 signature the drainer is holding before they execute. Costs a bit of gas, but far cheaper than letting them sweep your assets.

**3. Move Remaining Assets to a Fresh Wallet**

Even after revoking, **that wallet can no longer be trusted** — the drainer may have planted delayed-execution signatures you don't know about. Create a brand-new address (ideally with a new [seed phrase](/blog/seed-phrase-backup-guide)) and move all remaining assets there. Treat the old wallet as "burned."

**4. Report and Tag On-Chain**

Tag the phishing site and contract address as "Drainer" on ScamSniffer, ChainAbuse, and Etherscan. For large losses, contact on-chain forensics (Chainalysis, TRM Labs). Local victims can report to their national fraud hotlines.

**Never Hire "On-Chain Detectives"**

The most common secondary scam is a DM on Telegram / X / Discord saying "I can help you recover," "I'm a professional on-chain investigator," or "I can unfreeze your assets." **These are 100% scams.** Legitimate forensics firms don't cold-DM, and they never take upfront payments.

## FAQ

### Q: I never use Telegram and never click DM links. Can I still get hit?

Yes. The dominant drainer traffic channels in 2024–2026 **aren't Telegram** — they're **Google Ads, Twitter Ads, SEO, and pinned Discord messages**. The top sponsored Google result for "Uniswap" has a 30–40% chance of being drainer-bought. Treating bookmarks as the only valid entry to DApps is a baseline 2026 habit.

### Q: How do drainers differ from regular malware?

The big one: **drainers leave zero artifacts on your computer**. They live entirely in the browser tab and depend on you "actively connecting and signing." Antivirus doesn't see them, reinstalling your OS doesn't help, switching computers doesn't help — if you bring the same authorized [private key](/blog/private-key-management-best-practices) to the same site, the same thing happens. Traditional malware attacks the *computer*; drainers attack the *signing behavior*. The defense surfaces are completely different.

### Q: Will a hardware wallet (Ledger, Trezor) block drainers?

Partially. Both Ledger and Trezor have added Clear Signing for major DApps since 2023, parsing the common signatures into readable text. But for drainer-style dynamically generated Permit2 PermitBatch payloads, `setApprovalForAll` calls, or obscure contract methods, **the hardware screen often falls back to raw hex** — that's [blind signing](/blog/blind-signing-risks). Drainers deliberately pick contract call patterns hardware screens can't render. So "I'm safe because I use hardware" is no longer a valid assumption in 2026. ArcSign is a desktop app, so its signing screen isn't constrained by a tiny hardware display — it can show readable clear-signing for the common signature types, an inline red flag on infinite `approve` / `setApprovalForAll`, and Pro simulation.

### Q: Can drainers actually steal from a USB cold wallet?

Only if you **actively sign the phishing signature yourself**. A USB cold wallet's design ([private key never leaves the device](/blog/usb-cold-wallet-benefits), [mlock memory hardening](/blog/mlock-memory-protection), XOR three-shard) blocks 99% of key-exfiltration attacks — but drainers don't steal keys, they trick you into signing authorizations. So your cold wallet's resistance to drainers is **entirely determined by whether its signing UI lets you understand what you're signing**. That's why ArcSign treats Clear Signing as a first-class concern, equal to key storage: neither alone is enough.
