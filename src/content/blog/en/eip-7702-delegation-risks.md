---
title: "EIP-7702 Delegation Attacks Explained: How Pectra Turned Every EOA Into a Programmable Account"
description: "Pectra activated EIP-7702 — any EOA can now delegate code to a contract with a single signature. That signature is also the most dangerous new phishing primitive of 2026. We break down SET_CODE attack vectors, cross-chain replay risks, real-world cases, and how ArcSign parses type-4 transactions to stop delegation phishing before you confirm."
pubDate: 2026-05-19
locale: en
tags: ["Security"]
author: "ArcSign Security Team"
heroImage: "/blog/images/eip-7702-delegation-risks-hero.png"
relatedSlugs: ["wallet-drainer-toolkits-explained", "blind-signing-risks", "token-approval-revoke", "mpc-vs-hd-wallet"]
---

## After Pectra: Your Wallet Has a New Power You Probably Didn't Notice

On May 7, 2025, Ethereum shipped the **Pectra upgrade** — eleven EIPs in one mainnet activation. For most users, Pectra "didn't feel like anything" — no gas spike, no breakage. But one of those EIPs quietly rewrote the boundary between EOAs and smart contracts that had held for ten years: **EIP-7702 — Set EOA Account Code**.

EIP-7702 lets any regular wallet address (EOA) sign an **authorization** that delegates its code execution to a smart contract. From that moment on, the EOA is no longer "just a hash of a public key" — it **is** that contract. Every call that lands at the EOA runs through the delegated contract's logic.

This capability was designed as a gentle on-ramp to account abstraction — you keep your address, but you get gasless transactions, batching, session keys, and other smart-account perks. But pivot the lens slightly and the same capability becomes **2026's most dangerous phishing primitive: one signature, and the entire EOA is permanently outsourced to the attacker.**

**Why Read This Carefully**

If you still use an EOA to connect to DApps and you sign EIP-712 messages from a browser wallet, you're already inside the EIP-7702 attack surface. This piece walks through the technical mechanics, the actual attack vectors that have appeared in 2025–2026, and how ArcSign surfaces `0x04` transactions and `SET_CODE` authorizations in the signing UI so they don't slip past as another [blind sign](/blog/blind-signing-risks).

## What EIP-7702 Actually Does: Putting Contract Skin on an EOA

To see the attack surface, you first have to see what the EIP changed in the Ethereum state machine.

### A New Transaction Type: `SET_CODE_TX_TYPE` (0x04)

EIP-7702 introduces a fourth transaction type (after EIP-1559 type-2 and EIP-4844 blob type-3). A `0x04` transaction adds one new field on top of the usual envelope: an **`authorization_list`** array. Each authorization is a tuple:

```
(chain_id, address, nonce, y_parity, r, s)
```

The signer of each authorization is **not** the `tx.origin` of the transaction — it's the **EOA being authorized**. In plain English: **any EOA can sign an authorization pointing at any contract address, and any other account can wrap that authorization into a transaction and broadcast it.**

When the transaction executes, for each authorization in the list, the EVM:

1. Verifies the signature → recovers the authorizing EOA address;
2. Sets that EOA's `code` to `0xef0100 || address` (a 23-byte **delegation designator**);
3. From now on, every call that hits the EOA `DELEGATECALL`s into the contract at `address`.

That last line is the punch: "every" call. The delegation is not one-shot — it lives in the EOA's state **until the EOA itself signs a new authorization pointing at `0x000...000` to clear it**.

### The `0xef0100` Prefix: The Only Way to Spot a Delegated EOA

A delegated EOA's `code` isn't actual contract bytecode — it's a fixed 23-byte prefix:

```
0xef0100 || <delegated_contract_address>
```

`0xef` is the reserved "undeployable" prefix from EIP-3541, which guarantees this prefix **cannot collide with a real contract**. Any client seeing code that begins with `0xef0100` knows it's looking at an EIP-7702 delegation, and reads the next 20 bytes as the proxy target.

What this means: **the only way to tell whether an address is delegated is to call `eth_getCode` on it**. If you receive a "send 1 ETH to 0xAlice" transaction, the address alone can't tell you who will actually process that ETH once it arrives.

Why EIP-7702 Is "Attack Surface Expansion," Not Just a New Feature

For ten years, the Ethereum security model has been "**EOAs can only sign with their key; contracts can only act through their code**." EIP-7702 is the first time that line is blurred: an EOA can **pre-sign an authorization** that routes every future call through a contract. An attacker who captures one EIP-7702 signature captures **programmatic control of the wallet** — without ever touching the private key, without any token approval.

## Three EIP-7702 Attack Vectors

Over the past year (2025-Q3 through 2026-Q2), several EIP-7702 phishing incidents have been documented. They cluster into three vectors:

### Vector 1: Sweeper Delegation — One Signature Outsources the Entire Wallet

The most direct attack. The phishing site asks the victim to sign an EIP-7702 authorization that "upgrades your wallet to a smart account." The target contract is the **attacker's sweeper contract**. The moment the victim confirms, every future call to their EOA runs the sweeper's logic — any time ETH or tokens land in the EOA, the sweeper transfers them out in the same transaction.

The nasty part: **this authorization does not immediately drain existing balances**. The attacker waits. Waits for the next airdrop, the next inbound transfer, the next exchange withdrawal. During the wait the victim feels nothing, because the wallet's **static state** looks completely normal. Then a single inbound transfer triggers the sweeper and is gone within 200 ms.

| Stage | What the Victim Sees | What Actually Happened |
| --- | --- | --- |
| Victim signs | "Upgrade wallet to smart account" | EOA delegated → Sweeper contract |
| Victim wallet | Balance unchanged, no new tx | `code` flipped from `0x` to `0xef0100...` |
| 3 weeks later, 1 ETH arrives | Looks like a normal inbound | Triggers sweeper `fallback`, 1 ETH leaves |

### Vector 2: Cross-Chain Replay — chain_id = 0 Is the Death Grip

The EIP-7702 spec allows the authorization's `chain_id` to be set to **0**, meaning "**this authorization is valid on every EVM chain**." The intended use case is letting a user upgrade their EOA at the same address on Ethereum, Optimism, Arbitrum, Base, BSC, Polygon, and Avalanche in one signature. For attackers, it's a free lateral expansion: **one signature drains seven chains.**

The cruel variant: **the sweeper contract is only deployed on some chains**. The attacker deploys the same address as a harmless "demo contract" on Ethereum and as a sweeper on Linea / Scroll / zkSync. A victim who checks the Ethereum address on a block explorer sees "a benign test contract" — but what they actually authorized is **every same-address contract on every EVM chain**, including the six chains they never looked at.

### Vector 3: The Upgrade Trap — Wrapping Malicious Logic in "Legitimate" Account Abstraction

The most subtle of the three. The attacker deploys a contract that **looks like a legitimate ERC-4337 / Safe smart account** — it has `execute`, `validateUserOp`, an owner pattern, it's open-source, it's verified on Etherscan. On the surface, it's a proper smart account. But somewhere in the contract sits an **upgrade hook**:

```solidity
function setOwner(address newOwner) external {
    if (msg.sender == 0xAttacker || tx.origin == 0xAttacker) {
        owner = newOwner;
    }
}
```

Once the victim signs the EIP-7702 authorization, their EOA becomes "this Safe-looking smart account." Everything operates normally — until one day the attacker sends a routine transaction calling `setOwner(0xAttacker)` and ownership flips. The victim's private key still works, but they are **no longer the owner of their own address** — any asset movement now requires the new owner (the attacker) to sign.

This pattern has been documented in 2026 incidents, and victims are typically "**I want to try account abstraction**" early adopters — they thought they were upgrading to a smart account, when in fact they upgraded into a jail cell built by the attacker.

EIP-7702 Revocation Is Not as Cheap as Revoking an Approval

Revoking an ERC-20 approval costs one `approve(spender, 0)` transaction (a few dollars of gas). But **revoking an EIP-7702 delegation requires signing a new type-4 transaction** that points the authorization at `0x0000...0000`. And if your EOA is already delegated to a sweeper, **every wei of gas you send in to pay for that revocation gets intercepted by the sweeper** — you can't even afford the signature that frees you. That's why EIP-7702 phishing is harder to recover from than Permit2 phishing: the rescue itself needs gas, and gas is exactly what the attacker is stealing.

## Reading the Signing UI: How to Spot a Phishy "Upgrade"

An EIP-7702 attempt arrives at the wallet as either a **type-4 transaction signing request** or a standalone **EIP-7702 authorization**. Traditional wallets (many browser extensions only added support in mid-2025) tend to display it like:

```
Transaction Type: 0x04 (SET_CODE)
Authorization List:
  [0] chain_id: 0
      address: 0x73...AB  ← "upgrade target contract"
      nonce: 5
```

99% of users see `0x04` plus a hex string and have no idea what's happening. So the attacker frames the webpage as "**Click to upgrade your wallet to a smart account**," puts a pretty button under it, and the victim signs — and just like that, the outsourcing is done.

### Five Checks Before You Sign Any EIP-7702 Authorization

| # | Check | Why It Matters |
| --- | --- | --- |
| 1 | **`chain_id` must NOT be 0** | 0 = cross-chain replay; a legitimate smart-account upgrade should bind to a single chain |
| 2 | **The target address must be a verified, well-known, open-source contract** | An unknown contract = reject immediately |
| 3 | **The contract must not contain dynamic owner-change logic** | If any external address can flip the owner, it's a backdoor |
| 4 | **The target must have real long-term activity on Etherscan** | A freshly deployed contract = high probability sweeper |
| 5 | **The authorization's `nonce` should equal your EOA's current nonce** | Mismatched nonce = attacker replaying old state |

### What a Legitimate EIP-7702 Upgrade Looks Like

When a legitimate smart-account team (Coinbase Smart Wallet, Safe, Biconomy) wants to upgrade your EOA to their account, the flow generally:

1. Shows "**Upgrade to [specific named smart account brand]**" in the UI — not just "click to upgrade"
2. Targets a contract that's **publicly documented, Etherscan-verified, and has substantial TVL**
3. Binds `chain_id` to the chain you're currently connected to, never 0
4. Contains **no externally callable owner-change function**
5. Provides a clear path to **roll back to the original EOA** (just sign a new authorization pointing at `0x0`)

If any of those five fail, stop. **You will not be excluded from DeFi for skipping an upgrade**, but you can absolutely be drained for signing the wrong one.

## How ArcSign Defends Against EIP-7702

ArcSign treats EIP-7702 with the same severity as Permit2 and `setApprovalForAll`. In our Clear Signing engine, type-4 transactions and bare EIP-7702 authorizations share the same alerting pipeline:

**1. Full ABI Decoding of Type-4 Transactions**

The signing UI never displays `0x04` and hex. ArcSign parses the entire `authorization_list` into English: "You are about to authorize EOA `0xYou` on [chain name / 'all EVM chains'] to delegate code to [target contract address + Etherscan label + deployment date + verified status]." This is the same design philosophy as the [blind-signing piece](/blog/blind-signing-risks) — a signature you can't read should never be signed.

**2. chain_id = 0 Triggers a Mandatory Red Warning**

If the authorization's `chain_id` is 0, ArcSign throws a **full-screen red warning** and requires the user to manually tick "I understand this signature is valid on every EVM chain" before continuing. For nearly every legitimate use case, that field should be bound to the current chain — it should not be 0.

**3. Static Analysis of the Target Contract**

ArcSign runs a local static analysis on the target contract: (a) does it contain `setOwner` / `upgrade` / `migrateAdmin` -style functions; (b) is the deployment timestamp newer than 30 days; (c) is it on a known sweeper blacklist; (d) does it share fund flows with known [drainer toolkit](/blog/wallet-drainer-toolkits-explained) relays. Any anomaly → full-screen warning.

**4. Simulation: What Happens to the Next Inbound Transfer**

Before you press "Confirm," ArcSign simulates: "**after this delegation, what happens to the next ETH / token that arrives at this EOA?**" If the simulation shows funds will immediately `transfer` to a different address — the signature is blocked, period.

**5. Private Key Never Leaves the USB, and the Authorization Is Confirmed Cold-Side**

The EIP-7702 attack hinges on "**signing one wrong authorization**," so locking the private key in a USB is not enough — the signing UI itself has to render on the cold side. ArcSign moves the entire type-4 parse, contract static analysis, and cross-chain warning onto the USB device's screen, integrated with [XOR three-shard key storage](/blog/xor-encryption-explained) and [mlock memory hardening](/blog/mlock-memory-protection) into a complete zero-trust signing chain.

Design Philosophy: Treat Account Abstraction Like a Contract Deployment

The moment EIP-7702 made EOAs programmable, the wallet security model needed rewriting. ArcSign's choice is: **no one-click "upgrade" shortcut**. Every EIP-7702 authorization is treated like a **contract-deployment-grade** decision, because the consequences are at contract-deployment grade. See [the zero-trust wallet piece](/blog/zero-trust-wallet) for the full design.

## Seven Habits That Keep You Out of EIP-7702 Phishing

| # | Habit | Vector Blocked |
| --- | --- | --- |
| 1 | **Don't click "upgrade to smart account" buttons** unless you've verified it's the official Safe / Coinbase Smart Wallet / Biconomy flow | Sweeper delegation |
| 2 | **Always reject `chain_id = 0` authorizations** | Cross-chain replay |
| 3 | **Inspect the target contract before upgrading**: Etherscan verified, deployed ≥ 90 days, public TVL | Upgrade trap |
| 4 | **Hold large assets in a fresh [cold wallet](/blog/usb-cold-wallet-benefits) that has never connected to a DApp** | All vectors |
| 5 | **Monthly hot-wallet check**: `eth_getCode(yourEOA)` should return `0x` (not delegated) | Sweeper delegation |
| 6 | **Use a [cold wallet](/blog/best-crypto-wallet-2026) with full type-4 parsing** | Blind delegation |
| 7 | **Follow post-Pectra security research**: blog.openzeppelin, Trail of Bits, SlowMist | Early identification |

### Advanced: Treat the Upgrade as a Discrete Event

If you genuinely need to upgrade an EOA to a smart account, treat it like **moving house**: (1) move assets out to a new EOA first; (2) sign the EIP-7702 upgrade on the now-empty source EOA; (3) observe for 1–2 weeks to confirm it behaves; (4) move assets back. If anything weird shows up during that window, the old EOA is still in your control and your assets are safe. **Do not bundle "upgrade" and "assets still in the wallet" into the same step.**

## Already Signed a Suspicious EIP-7702 Authorization? Emergency Flow

If you suspect you just signed an EIP-7702 on a sketchy site, **speed matters more than anything**:

**1. Check Whether Your EOA Is Already Delegated**

On Etherscan, open your address page and look at the "Code" field. If it shows `0x` or empty → you're fine, the authorization wasn't packed into a transaction (or was frontrun). If it shows `0xef0100...` → you're delegated. Continue to step 2.

**2. Revoke Immediately — Sign a New Authorization Pointing at `0x0`**

From a **clean device** (not the browser you got phished on), sign a new type-4 transaction with `authorization_list[0]` pointing at `0x0000000000000000000000000000000000000000`. This clears your EOA's `code` and restores it to a plain EOA. **Note**: you need gas to broadcast this transaction, and if the sweeper intercepts inbound gas, you may need to use **Flashbots / a private mempool** to bundle the type-4 transaction with its gas payment in the same atomic bundle.

**3. Clean Out All Token Approvals Too**

Once the delegation is cleared, lingering ERC-20 approvals and Permit2 allowances are still valid — go to [Revoke.cash](https://revoke.cash) or ArcSign's [Token Approvals](/blog/token-approval-revoke) and revoke everything.

**4. Treat the Old Wallet as Burned, Move to a New EOA**

Even after the delegation is cleared, you should [never trust that private key again](/blog/private-key-management-best-practices) — you don't know what else the attacker may have planted. Create a fresh address (ideally from a new [seed phrase](/blog/seed-phrase-backup-guide)), move remaining assets there, and consider the old wallet scorched earth.

**Never Hire "On-Chain Investigators"**

Just like [drainer victims](/blog/wallet-drainer-toolkits-explained), EIP-7702 victims get targeted by secondary scams. DMs on Telegram / X / Discord offering "I can recover your funds" or "I'm a professional on-chain investigator" are **100% scams**. Legitimate forensics firms don't cold-DM and never take upfront payment.

## FAQ

### Q: I never use EIP-7702. Why should I learn this?

Because **the attacker will use it on your behalf**. The danger of EIP-7702 is that it's a **single-signature attack**. You don't need to research EIP-7702 yourself — the attacker will wrap it in "upgrade to a smart wallet," "enable gasless transactions," or "claim your airdrop upgrade" and get you to sign. Understanding the mechanic is the only way to spot it in the signing UI.

### Q: Do hardware wallets (Ledger, Trezor) parse EIP-7702?

Partially. Ledger added type-4 parsing in 2025-Q3 but many older firmware versions still don't have it; Trezor only added full support in 2026-Q1. Even on the latest firmware, **most hardware wallets render the `authorization_list` as hex** — what you see on the screen is `chain_id: 0` and `address: 0x73...AB`, without any contract static analysis, blacklist lookup, or simulation. ArcSign performs full ABI parsing + contract static analysis + cross-chain warnings on the USB device screen, which is possible because USB cold wallets don't have the tiny-screen limitation of hardware wallets.

### Q: Can a USB cold wallet completely block EIP-7702 phishing?

"Completely" is too strong. A USB cold wallet completely blocks [private-key exfiltration](/blog/private-key-management-best-practices) — the key never leaves the device. But EIP-7702 attacks work by **getting the user to sign an authorization themselves**, so the cold wallet's job is to make sure you can **see clearly what you're signing**. If the user manually ticks "I understand the risk" on ArcSign's full-screen red warning and confirms anyway, **no cold wallet can stop that**. The design goal of a cold wallet is not to override the user's decision — it's to put every relevant piece of information in front of them, in human-readable form, so they can decide on real information.

### Q: How is EIP-7702 different from ERC-4337 (account abstraction)?

ERC-4337 is "**deploy a fresh smart contract wallet**" — your funds live inside the contract, and the private key is just one owner among many possible owners. EIP-7702 is "**make your existing EOA temporarily or permanently behave like a smart account**" — your funds still live at the original EOA address, but every transaction routes through the delegated contract. The security models differ: ERC-4337's attack surface is the contract's owner / module design; EIP-7702's attack surface is **the authorization signature itself**. For users, EIP-7702 carries higher risk because it **doesn't require creating a new address or moving funds — one signature does it all**. That's why ArcSign categorizes it alongside Permit2 and `setApprovalForAll` as a top-tier high-risk signature type.
