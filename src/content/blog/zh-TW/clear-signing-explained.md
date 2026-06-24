---
title: "Clear-signing：在簽章的當下看懂你在授權什麼"
description: "盲簽是冷錢包的定位硬傷。ArcSign v1.5.0 在本地解碼 calldata 與 EIP-712 typed data，把一串 hex 變成人類可讀的意圖——轉帳、授權、無上限 approve、DEX swap。本文拆解解碼架構、為什麼堅持零外部 API、以及「解不出來就老實說」的誠實原則。"
pubDate: 2026-06-23
locale: zh-TW
tags: ["技術解析"]
author: "ArcSign Security Team"
heroImage: "/blog/images/clear-signing-explained-hero.png"
relatedSlugs: ["arcsign-v1-5-0-release", "walletconnect-dapp-tutorial", "token-approval-revoke"]
---

冷錢包的核心承諾是「安全簽章」。但如果在你按下簽章的當下，畫面只顯示一串截斷的 hex——`0xa9059cbb000000...`——那這個承諾其實是空的。你不知道自己在授權什麼。這叫**盲簽**，而它對一個主打安全的[冷錢包](/blog/what-is-cold-storage)是個定位上的硬傷。

ArcSign v1.5.0 的 clear-signing 功能就是來解決這件事：把 raw hex 在你的機器上解碼成人類可讀的意圖。本文拆解它是怎麼做的，以及幾個刻意的設計取捨。

> **Clear-signing 一句話**
>
> WalletConnect 與 mint 簽章畫面不再顯示截斷 hex，而是本地解碼出「這筆在做什麼」——轉帳、授權、無上限 approve、setApprovalForAll、或一個解碼後的 DEX swap。解不出來時老實顯示「無法解讀」並附上原始 hex。

## 問題：一筆交易長什麼樣

當一個 dApp 透過 [WalletConnect](/blog/walletconnect-dapp-tutorial) 請你簽一筆交易時，它送來的核心是一個 `data` 欄位——一串 hex。這串 hex 的前 4 個 byte 是**函式選擇器**（function selector），後面是 ABI 編碼的參數。

舉例，一個 ERC-20 轉帳的 `data` 長這樣：

```
0xa9059cbb                                          ← transfer(address,uint256) 的選擇器
  000000000000000000000000<收款地址 20 bytes>      ← 參數 1：收款人
  0000000000000000000000000000000000000000000de0b6b3a7640000  ← 參數 2：金額
```

對人類來說這是天書。但只要你知道 `0xa9059cbb` 對應 `transfer(address,uint256)`，就能把它解回「轉 1 顆代幣給某地址」。這就是解碼在做的事。

## 本地解碼，零外部 API

ArcSign 用 [viem](https://viem.sh)（一個 well-maintained 的 TypeScript 以太坊函式庫）在**前端本地**解碼。這是一個刻意的隱私決定：

**解碼過程不發任何網路請求。** 不打 4byte.directory、不打 Etherscan 的 label API、不把你的交易內容送去任何第三方「幫你解讀」。因為那等於把「你正要簽什麼」洩漏給外部服務。解碼在你的機器上完成，用內建的 ABI 清單。

我們甚至為這點寫了測試——驗證解碼流程確實零 fetch，把「隱私」這件事釘成一個會被 CI 守住的不變量，而不是一句口號。

## 解碼涵蓋哪些東西

ArcSign 內建一組已知函式的 ABI（`KNOWN_ABIS`），涵蓋日常最常遇到、也最該看清楚的操作：

- **`transfer` / `transferFrom`** —— 代幣轉帳，解出金額與收款人
- **`approve`** —— 授權。如果是**無上限授權**（金額是 `uint256` 最大值），標紅警告——這是最常被釣魚利用的操作之一
- **`setApprovalForAll`** —— 把整批 NFT 的控制權交給某個 operator，設成 `true` 時標紅
- **Permit2 / Permit** —— EIP-712 授權簽名，標示為「授權簽名」
- **native 轉帳** —— 直接送 ETH/BNB 等

代幣的名稱用本地的[代幣清單](/blog/erc20-token-management)解析（同樣零外部 API）。

## DEX swap 的特別處理

swap 是 WalletConnect 上最常見的操作之一，但也是最難解的——每家 DEX 的 router 函式簽章都不同。v1.5.0 針對主流 DEX 做了結構式解碼：

- **Uniswap / PancakeSwap V2**（`swapExactTokensForTokens` 等）
- **V3**（`exactInputSingle` / `exactInput`，含 packed path 解析）
- **1inch / KyberSwap**（aggregator 的 swap description struct）
- **OpenOcean 與通用 aggregator**（`swapExactIn`）

解出來會顯示成「**A → B，最少收到 X**」——你一眼就知道在換什麼、滑點底線是多少。

swap 解碼走一個「固定 case 優先、通用偵測 fallback」的策略：先比對已知的 router 簽章，比不到才退到一個結構式的通用偵測（`detectSwap`），而且那個偵測**極度保守**——只要不確定就回 `null`，寧可顯示「無法解讀」也不亂猜一個可能錯的 swap。

把解碼的決策流程畫出來，會更清楚「誠實」是怎麼內建在分支裡的：

```
dApp 送來的 calldata（hex）
        │
        ▼
  取前 4 bytes = 函式選擇器
        │
        ▼
  在本地 KNOWN_ABIS 找得到？
        │
   ┌────┴─────┐
  是            否
   │             │
   ▼             ▼
 viem 本地解碼   是 swap 簽章嗎？（detectSwap，極保守）
   │             │
   │        ┌────┴────┐
   │       是           否
   │        │            │
   │        ▼            ▼
   │     解成 A→B    線上開關有開？→ Sourcify 抓 ABI
   │     最少收到 X      │
   │        │       ┌────┴────┐
   │        │      抓到        抓不到/解不出
   ▼        ▼       │            │
 ┌──────────────────┘            ▼
 │  可讀摘要                ⚠️ 無法解讀此交易
 │ （標紅：無上限 approve /     ＋ 可展開原始 hex
 │   setApprovalForAll）      （不給假的安全感）
 └──────────────────────────────┘
```

不確定就往「無法解讀」走，而不是猜——這個保守的分支設計，就是誠實原則的具體實作。

## 誠實原則：解不出來就說解不出來

這是整個功能最重要的設計哲學。

如果一筆交易**解不出來**——未知的選擇器、畸形的資料、沒見過的合約——ArcSign **不會**硬掰一個解讀。它會明確顯示「⚠️ 無法解讀此交易」，並提供一個可展開的區塊讓你看原始 hex。

為什麼這很重要？因為對一個安全工具來說，**一個自信但錯誤的解讀，比老實承認「我看不懂」更危險**。如果我們對一筆惡意交易顯示了一個看起來無害的假摘要，那比顯示一串 hex 還糟——使用者會基於錯誤資訊放心地簽下去。所以 ArcSign 的解碼器寧可保守地退回「無法解讀」，也不冒險給出可能誤導的解讀。

## 線上 ABI fallback（選擇性）

本地的 ABI 清單不可能涵蓋每個合約。所以 v1.5.0 加了一個**選擇性**的線上 fallback：當本地清單解不出某個合約時，可以從 [Sourcify](https://sourcify.dev)（一個去中心化的合約驗證服務）抓取已驗證的 ABI 來解碼。

這個功能：

- **預設可開，但附一次性隱私說明**——因為它會把合約地址送給 Sourcify，使用者該知情
- **有加密的 USB 快取**——抓過的 ABI 存在本機，下次不用再抓
- **仍守誠實原則**——就算抓到了 ABI 但解不出語意，照樣顯示「無法解讀」

抓到 ABI ≠ 看得懂意圖。Sourcify 給的是合約的函式介面，但如果那個函式做的事我們的呈現邏輯沒涵蓋，誠實的做法仍然是退回 unreadable。

## 前端解碼，但安全判斷在後端

有一個容易混淆的點值得釐清：clear-signing 的**解碼**是在前端做的（viem 本地解），但這不違反 ArcSign「安全判斷在後端」的原則。

差別在於：解碼是**輔助呈現資訊**——它幫你看懂交易，但它不是安全門。真正的安全把關（黑名單命中、危險判定、拒簽）是在 Go 後端、在私鑰被使用之前做的（這部分見 [簽章安全門那篇](/blog/signing-security-gate)）。clear-signing 讓你看懂，安全門決定擋不擋——兩件事，分層處理。

## 為什麼這個功能重要

「所見即所簽」（What You See Is What You Sign）是硬體錢包安全的核心概念之一。一個冷錢包如果讓你盲簽，就丟掉了它最重要的一道防線——因為釣魚攻擊的本質，就是讓你在不知情的狀況下簽一筆對你不利的交易（一個無上限的 approve、一個 `setApprovalForAll`）。

v1.5.0 的 clear-signing 把這道防線補了回來：在最關鍵的簽章當下，你看得懂你在授權什麼。

想看這一版的其他升級，回到 **[v1.5.0 版本總覽](/blog/arcsign-v1-5-0-release)**。
