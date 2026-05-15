---
title: "How to Revoke Token Approvals: Protect Your Wallet from Forgotten Permissions (2026)"
description: "Forgotten DeFi approvals are a major security risk. Revoke ERC-20 token approvals using ArcSign's free built-in tool across 6 chains to protect your"
pubDate: 2026-04-02
locale: en
tags: ["Tutorial", "Security"]
author: "ArcSign Security Team"
heroImage: "/blog/images/how-to-revoke-token-approvals-hero.png"
relatedSlugs: ["arcsign-beginner-setup-guide", "walletconnect-dapp-tutorial", "usb-backup-strategy"]
---

## What Are Token Approvals?

Every time you interact with a DeFi protocol — swapping on Uniswap, depositing into Aave, staking on a yield farm — the protocol first asks you to sign an **[ERC-20](/blog/erc20-token-management) approval transaction**. This approval grants the smart contract permission to spend your tokens on your behalf, up to a specified amount (or, most dangerously, an **unlimited amount**).

Technically, this is the `approve(spender, amount)` function in the [ERC-20](/blog/erc20-token-management) standard. Your wallet signs a transaction setting an "allowance" — a number recording how many tokens the spender contract is allowed to move from your address.

The critical thing to understand: **this allowance persists forever on-chain unless you explicitly revoke it.** Closing the DApp tab, disconnecting your wallet, even transferring your tokens elsewhere — none of these actions cancel the approval. The permission lives on the blockchain until you send a revocation transaction.

            Key Concept

A [token approval](/blog/token-approval-revoke) is a standing permission stored on-chain. If you have approved 100 DeFi protocols over two years of trading, you may have 100 open permissions right now — even if you haven't used most of those protocols in months.

## Why Forgotten Approvals Are Dangerous

The attack scenario is straightforward and has played out repeatedly:

1. You approve Protocol X to spend unlimited USDC from your wallet while using it six months ago.

2. You stop using Protocol X. The approval remains active.

3. Protocol X is hacked. Its smart contract is upgraded to a malicious version, or an attacker gains control of the contract.

4. The attacker calls `transferFrom(your_wallet, attacker_wallet, your_entire_USDC_balance)` using your standing approval.

5. Your USDC is drained — without you signing anything, without your private key being touched.

            Critical Risk: Unlimited Approvals

Many DeFi UIs default to requesting **unlimited approval** (the maximum uint256 value) to improve UX by avoiding repeated approval prompts. This means a single approval can expose your *entire* token balance — including tokens you deposit later — to a compromised contract indefinitely.

The risk compounds with every new DeFi protocol you use, every chain you operate on, and every year that passes. A veteran DeFi user with 2–3 years of activity across multiple chains may have hundreds of open approvals, many to protocols they have completely forgotten about.

## Real Attack Examples: Billions Lost to Approval Exploits

            Bybit Hack — February 2025 (~$1.5 Billion)

The Bybit hack in February 2025 became one of the largest crypto security incidents in history. While the primary vector involved a compromise of Safe multisig wallet UI (a [supply chain attack](/blog/supply-chain-attack-hardware-wallet)), approval-based exploits played a role in enabling fund movements. The incident highlighted that even institutional-grade setups can be compromised through smart contract interaction patterns — and that every standing approval is a potential attack vector when the upstream contract is compromised.

            Unlimited Approval Drain Attacks — Multiple DeFi Protocols

Dozens of DeFi protocols have suffered hacks where the primary damage vector was existing unlimited approvals. When a protocol's contract is upgraded maliciously (via a compromised admin key or governance attack), the attacker can drain all wallets that hold standing approvals — often millions of dollars in seconds, affecting users who haven't interacted with the protocol in months.

            Phishing + Approval Attacks

A common phishing pattern: a fake DApp site asks you to "approve" a transaction. You sign what looks like a routine approval, but the spender address is the attacker's contract. Your tokens are drained immediately. The first line of defense is knowing which contracts hold your approvals and revoking suspicious or unnecessary ones promptly.

## How to Check Your Current Approvals

Before you can revoke approvals, you need to know what approvals exist. Your options:

**Option 1: ArcSign [token approval](/blog/token-approval-revoke)s page (built-in)** — If you use ArcSign, navigate to the Token Approvals section in the sidebar. It automatically scans all 6 supported EVM chains (Ethereum, BSC, Polygon, Arbitrum, Optimism, Base) and displays every active approval, including the spender contract, token, and approved amount.

**Option 2: Revoke.cash** — A free third-party website. Connect your wallet, select a chain, and it lists your approvals. Requires connecting your wallet to an external site.

**Option 3: Block explorer manual check** — On Etherscan and similar explorers, you can look at the "Token Approvals" tab for your address. This is tedious and only covers one chain at a time.

## Step-by-Step: Revoking Approvals with ArcSign (Free, Built-In, 6 Chains)

ArcSign's Token Approvals management is built directly into the wallet — no third-party site, no external wallet connection, no additional trust assumption. Here is how to use it:

            1
            Open ArcSign and plug in your USB

Launch the ArcSign desktop app and insert your wallet USB. Unlock your wallet with your PIN.

            2
            Navigate to Token Approvals

In the left sidebar, click "Token Approvals." ArcSign will automatically scan all 6 EVM chains for active approvals on your address: Ethereum, BSC, Polygon, Arbitrum, Optimism, and Base.

            3
            Review the approval list

The list shows each approval with: the token (e.g., USDC, WETH), the spender contract name/address, the approved amount (watch for "Unlimited"), and the chain it is on. Look for: approvals you don't recognize, unlimited approvals, and approvals for protocols you no longer use.

            4
            Click "Revoke" on any approval you want to remove

Select the approval to revoke and click the Revoke button. ArcSign will prepare a transaction that sets the allowance to zero for that spender. Review the transaction details on screen.

            5
            Sign the revocation transaction with your USB

Confirm the transaction. Because ArcSign is a cold wallet, signing happens on your USB — your private key never leaves the device. The revocation transaction is broadcast to the network. You will need a small amount of native gas (ETH, BNB, MATIC, etc.) on the relevant chain.

            6
            Verify the approval is cleared

After the transaction confirms, the approval disappears from your list. You can verify on the relevant block explorer by checking the Token Approvals tab for your address.

            Gas Cost Note

Each revocation is one on-chain transaction. On Ethereum mainnet, this costs a small amount of ETH. On L2s (Arbitrum, Optimism, Base, Polygon), gas costs are typically a few cents. BSC gas is also very cheap. If you have many approvals to clear on Ethereum mainnet, consider whether the [ArcSign Pro](/blog/arcsign-pro-nft-membership) batch revoke option (see below) is more cost-effective.

## Alternative: Using Revoke.cash

Revoke.cash is a well-established third-party tool for managing token approvals. It is free to use for individual revocations and supports many chains. The main steps:

1. Visit **revoke.cash** in your browser.

2. Connect your wallet (MetaMask, WalletConnect, or other supported wallets).

3. Select the chain you want to inspect.

4. Review the approval list and click "Revoke" on any approval you want to remove.

5. Confirm the transaction in your wallet.

| Feature | ArcSign Token Approvals | Revoke.cash (Free) |
| --- | --- | --- |
| **Cost** | Free | Free (individual) |
| **Built-in to wallet** | Yes — no external site | No — separate website |
| **Chains (EVM)** | 6 (ETH, BSC, Polygon, Arbitrum, Optimism, Base) | Many chains |
| **Batch revoke** | Yes (Pro tier) | Paid feature on Revoke.cash |
| **Third-party trust required** | No | Yes — you connect wallet to their site |
| **Cold wallet signing** | Yes — USB offline signing | Depends on your wallet setup |

## ArcSign Pro: Batch Revoke

If you have accumulated many approvals across multiple chains, revoking them one by one becomes tedious and expensive — each revocation is a separate transaction and [gas fee](/blog/gas-fee-optimization).

**[ArcSign Pro](/blog/arcsign-pro-nft-membership)'s batch revoke** lets you select multiple approvals across chains and revoke them all in an optimized batch. This significantly reduces the number of transactions you need to sign and can save gas compared to individual revocations.

ArcSign Pro membership is NFT-based — you hold a Pro NFT on BSC, and the wallet automatically unlocks Pro features. ArcSign Pro members can batch-revoke multiple approvals in one click — [see ArcSign Pro features and pricing →](/blog/../../pricing)

## Best Practices for Future Approvals

Prevention is better than cure. These habits will keep your approval footprint clean going forward:

**Always approve exact amounts, never unlimited.** When a DApp asks for "unlimited" approval, change it to the specific amount you plan to use. Many DApps allow this if you look for an "Edit" or custom amount option on the approval prompt.

**Revoke after you finish using a protocol.** If you deposit into a yield farm for a short period and then withdraw, revoke the approval when you are done. Make it a habit: withdraw, then revoke.

**Do a quarterly approval audit.** Schedule a review every three months. Open ArcSign's Token Approvals page and clear anything you don't actively use. The cost of a few cents in gas is negligible compared to the risk.

**Be suspicious of approval requests from unknown sites.** If a DApp you haven't used before asks for a large or unlimited approval, scrutinize the spender contract address. Phishing sites often mimic legitimate DApps and ask for approvals to attacker-controlled contracts.

**Use separate wallets for high-risk activities.** Consider a "hot wallet" with limited funds for new DeFi protocols, keeping the bulk of your assets in your ArcSign cold wallet with minimal approvals. For broader wallet security, read our guide on [private key security beyond approvals](/blog/private-key-management-best-practices).

## Frequently Asked Questions

### Q: What is a token approval in crypto?

A token approval (also called ERC-20 allowance) is a permission you grant to a smart contract allowing it to spend your tokens on your behalf. This is required for every DeFi interaction — swapping, lending, staking. The problem is these approvals remain active indefinitely unless you explicitly revoke them.

### Q: Are token approvals dangerous?

They can be. If a DeFi protocol you approved previously gets hacked or has a malicious upgrade, the attacker can use your standing approval to drain your tokens — without needing your private key or any further action from you. The Bybit hack in February 2025 was partly enabled by approval-based exploits. Hundreds of millions of dollars have been lost this way.

### Q: How do I revoke token approvals for free?

You can use ArcSign's built-in Token Approvals page (free, no third-party tool needed, covers 6 EVM chains: Ethereum, BSC, Polygon, Arbitrum, Optimism, Base). Alternatively, you can use Revoke.cash (free for individual revocations, third-party service). Each revocation is an on-chain transaction and requires a small amount of native gas (ETH, BNB, MATIC, etc.).

### Q: What is the difference between ArcSign Token Approvals and Revoke.cash?

ArcSign Token Approvals is built directly into the wallet — no separate site visit, no connecting your wallet to a third party. It covers 6 EVM chains natively. ArcSign Pro users can batch-revoke multiple approvals in a single transaction. Revoke.cash is a free third-party site that requires you to connect your wallet externally, and free-tier users can only revoke one approval at a time.

### Q: Do I need to revoke approvals even if I still use the DeFi protocol?

For actively used protocols, unlimited approvals are a risk even while you're still using them. Best practice: revoke unlimited approvals and re-approve with a specific amount each time you transact, or keep only the minimum necessary approval. For protocols you no longer use at all, revoke immediately.
