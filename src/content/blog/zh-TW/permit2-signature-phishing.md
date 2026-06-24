---
title: "Permit2 釣魚簽名全解析：一張 EIP-712 簽名為什麼能在三秒內清空整個錢包"
description: "Permit2 把 ERC-20 授權搬離鏈上、改用 EIP-712 簽名 — 也讓釣魚成本從一筆鏈上交易降到一張看不懂的訊息。本文拆解 PermitSingle / PermitBatch / PermitTransferFrom 三種攻擊變體、為什麼錢包顯示常常騙過使用者，以及 ArcSign 如何在簽名前解析 Permit2 訊息阻擋濫用。"
pubDate: 2026-05-20
locale: zh-TW
tags: ["安全教育"]
author: "ArcSign Security Team"
heroImage: "/blog/images/permit2-signature-phishing-hero.png"
relatedSlugs: ["wallet-drainer-toolkits-explained", "blind-signing-risks", "eip-7702-delegation-risks", "token-approval-revoke"]
---

## 為什麼「沒按交易、只簽名」會被清空錢包

過去五年，加密世界的安全直覺一直是：「**只要我沒按 Confirm 交易，錢就動不了**」。簽訊息（off-chain signature）感覺是「免費的、不上鏈的、安全的」 — 你又沒花 gas、又沒讓任何狀態變動，怎麼會被搬空？

Uniswap 在 2022 年部署的 **Permit2** 改寫了這條直覺。Permit2 讓 ERC-20 授權從「一筆 `approve()` 鏈上交易」變成「**一張 EIP-712 簽名**」 — 同樣的授權效果，但不需要 gas、不上鏈、也不會在 Etherscan 留下任何痕跡。對使用者來說：點 swap 不用先按 Approve 了；對 DApp 開發者來說：可以做 gasless 體驗；對攻擊者來說：**釣魚成本從幾美元 gas + 一筆鏈上紀錄，降到零成本 + 完全靜默**。

2023–2026 年間，**幾乎每一個成功偷走超過 100 萬美元的[錢包 Drainer 工具包](/blog/wallet-drainer-toolkits-explained)，主力武器都是 Permit2 釣魚**。光是 2024 年公開資料中，因 Permit / Permit2 釣魚單筆損失超過 50 萬美元的案例就有 20 起以上，總金額破 2 億美元。

**為什麼這篇值得一讀**

如果你最近一年用過 Uniswap、1inch、CoW Swap、Matcha、OpenSea Seaport — 你已經對 Permit2 簽過授權了。本文拆解 Permit2 的三種訊息結構、攻擊者如何把它包裝成「Sign in to claim」「Verify ownership」這類無害文字，以及 ArcSign 為什麼把每張 EIP-712 訊息都當成「**鏈上交易等級的決策**」處理。

## Permit2 是什麼：把 ERC-20 授權「搬離鏈上」

要理解 Permit2 攻擊面，得先理解它在 2022 年解決了什麼問題。

### Permit2 之前：ERC-20 授權的兩個老問題

傳統 ERC-20 流程需要兩筆交易：(1) `approve(spender, amount)` 給 DEX 路由器，(2) 才能 `swap()`。這帶來兩個結構性問題：

1. **使用者體驗破裂**：第一次 swap 任何代幣都要連按兩次 Confirm，每次都收 gas。
2. **每個合約都要自己拿授權**：你給了 Uniswap V3 router 授權，下一次想用 1inch 或 Matcha，得重新 approve。

Uniswap 的解法是：部署一個**共用授權層** — `Permit2` 合約，部署在 [0x000000000022D473030F116dDEE9F6B43aC78BA3](https://etherscan.io/address/0x000000000022D473030F116dDEE9F6B43aC78BA3)，同地址橫跨 Ethereum / Optimism / Arbitrum / Base / Polygon / BSC / Avalanche / zkSync 等多條 EVM 鏈。

### Permit2 之後：一次鏈上 approve + N 張簽名

新流程是：

1. **一次性鏈上**：使用者對某個 ERC-20 簽 `approve(Permit2, max_uint256)` — 把無限額度給 Permit2 合約。
2. **後續每次 swap**：使用者**只簽一張 EIP-712 訊息**，把「能轉多少給誰、直到什麼時間」這些資訊放在訊息裡。Permit2 在執行時驗證簽名，然後把 token 從使用者錢包搬到指定 spender。

```
傳統流程：           [鏈上 approve] → [鏈上 swap]
Permit2 流程：       [鏈上 approve Permit2] → [簽 EIP-712] → [DApp 代你打包 swap]
```

UX 上這是革命性升級。安全上這是**全新的攻擊面**：使用者習慣「只是簽訊息，沒事」 — 但這張訊息授予的是與鏈上 `approve()` **完全等效**的權限。

### 三種 Permit2 訊息：每一種都可以被武器化

Permit2 合約對外暴露三類授權訊息結構：

| 類型 | 簽名類型 | 攻擊者怎麼用 |
| --- | --- | --- |
| **PermitSingle** | 對單一 token 授權 `spender` 一段期間 + 上限 | 釣魚：要求超大上限、超長 deadline，等資產進來再搬 |
| **PermitBatch** | 一次授權多個 token 給同一 `spender` | 釣魚：一張簽名把 USDC、USDT、WETH、WBTC 全部授權給 sweeper |
| **PermitTransferFrom / Witness** | 一次性轉帳簽名，立即執行不留 allowance | 釣魚：立刻清空目標 token，零鏈上痕跡 |

最毒的是 **PermitBatch** — 一張簽名 = 多種代幣的後門。一個典型的攻擊者要求的 PermitBatch 內容會是：

```
PermitBatch:
  details: [
    { token: USDC,  amount: 2^160-1, expiration: 2^48-1, nonce: 0 },
    { token: USDT,  amount: 2^160-1, expiration: 2^48-1, nonce: 0 },
    { token: WETH,  amount: 2^160-1, expiration: 2^48-1, nonce: 0 },
    { token: WBTC,  amount: 2^160-1, expiration: 2^48-1, nonce: 0 },
    ... ← 攻擊者塞進你錢包裡所有有價值的 token
  ]
  spender:   0xAttackerSweeper
  sigDeadline: 2^256-1
```

「2^160-1」是 Permit2 數字欄位的最大值 — 約 1.46 × 10^48，遠遠超過任何代幣的總供應量。「2^48-1」對應的 expiration 是公元 8.9 萬年。換句話說：**這張簽名授權攻擊者在地球毀滅前都可以從你錢包搬走任何數量的這些代幣**。

**為什麼 Permit2 比舊式 ERC-20 approve 更危險**

舊式 `approve()` 是一筆鏈上交易：你會在錢包看到「Confirm transaction」、看到 gas 費、Etherscan 上看得到痕跡、出問題時還能用 `approve(spender, 0)` 撤銷。Permit2 是一張**訊息簽名**：沒有 gas、不上鏈、Etherscan 完全看不到，**而且要撤銷你還得花 gas 發一筆 `lockdown()` 鏈上交易**。整個風險模型從「主動付錢確認」變成「靜默授權」。

## 三種 Permit2 攻擊變體（含真實案例）

### 變體 1：「Sign in to verify」釣魚 — 一張無害訊息直接清倉

最常見的版本。攻擊者把 DApp 設計成「**Sign this message to verify wallet ownership**」 — 看起來像很多 DApp 都會做的登入流程（事實上 [Sign-In with Ethereum / EIP-4361](https://eips.ethereum.org/EIPS/eip-4361) 就是純訊息簽名）。但被簽下的不是 SIWE 訊息，**而是一張 PermitBatch / PermitTransferFrom**。

差別在錢包介面顯示 — 而**多數錢包在 2024 年之前對 Permit2 結構顯示得極差**：

```
MetaMask 2024 對 PermitBatch 的典型顯示：

Sign Message
You are signing:
PermitBatch
details (length: 4): {...}
spender: 0x7a2...e91
sigDeadline: 1893456000
```

使用者只看到「sign message」+ 一些 hex — 沒有「你即將授權 4 個 token 給 0x7a2... 在未來 75 年內全部轉走」這種人話。所以「verify ownership」按一下，整個錢包就完成了 outsourcing。

實際案例：2024 年 5 月，一名以太坊主錢包持有 USDC、USDT、stETH 共約 480 萬美元的使用者，在某個自稱「OG NFT holder claim」的網站上簽了「signature to verify holder status」，三秒內 PermitTransferFrom 把 480 萬全部搬走。鏈上紀錄只看到一筆從受害者地址出的 Permit2 transferFrom — Etherscan 上**完全看不到任何受害者主動發起的授權**，因為授權是 off-chain 完成的。

### 變體 2：「Approve in advance, drain on demand」— 等待型 Sweeper

PermitSingle 與 PermitBatch 不會立刻轉錢 — 它們建立的是 **allowance**。攻擊者拿到這張簽名後，會把它存著等：等你下次有大筆轉入、等你 unstake、等你從交易所提幣。

這個變體跟[EIP-7702 Sweeper 委派](/blog/eip-7702-delegation-risks)同樣可怕：簽完當下你錢包毫無變化、餘額沒減、Etherscan 沒新增交易。你以為自己沒事。直到三週後你從 Coinbase 把 50,000 USDC 提回自家錢包，PermitTransferFrom 在 200ms 內把 50,000 USDC 從你錢包搬走。

| 階段 | 表面行為 | 實際發生的事 |
| --- | --- | --- |
| 受害者簽 PermitBatch | 「點此驗證身份」 | 攻擊者拿到 4 種 token 的無限授權 |
| 受害者錢包 | 餘額不變、Etherscan 沒新交易 | 簽名儲存在攻擊者後端，等待觸發 |
| 三週後 50K USDC 提幣到錢包 | 看似正常入帳 | Permit2.transferFrom 立刻被觸發，50K 飛走 |

### 變體 3：Cross-chain 同地址重放 — 一張簽名清空 7 條鏈

Permit2 部署在多條 EVM 鏈上**同一個地址** — 設計上是為了讓 DApp 開發體驗一致。但這意味著：**一張對 Ethereum 上 Permit2 的 PermitBatch 簽名，技術上對 Optimism / Arbitrum / Base 上的同地址 Permit2 也有效** — 只要 token 名稱與 nonce 對得上。

某些 Drainer 工具包（包含[Inferno、Pink、Angel](/blog/wallet-drainer-toolkits-explained)系列的後期版本）已經把這個特性自動化：受害者在 Ethereum 簽下一張 PermitBatch，後端機器人會立刻在 7 條鏈上嘗試重放。如果受害者在某條 L2 上持有同樣代幣（很常見），那條鏈上的資產同時被清空。

**Permit2 跟舊式 EIP-2612 Permit 差在哪？**

EIP-2612 Permit 是 ERC-20 token 自己內建的 permit 函數 — 只有 DAI、USDC、UNI 等少數代幣支援。Permit2 則是**一個獨立合約**，**支援所有 ERC-20**（只要你先給 Permit2 那個合約一次 `approve(max)`）。換句話說：EIP-2612 的攻擊面只覆蓋少數代幣，Permit2 的攻擊面覆蓋**所有你曾經在任何 DEX 上 swap 過的代幣**。這就是為什麼 Permit2 一上線後，Permit 釣魚的損失金額立刻翻了 5 倍。

## 為什麼錢包顯示常常騙過使用者

EIP-712 的設計初衷是「人類可讀的訊息簽名」 — 但「可讀」與「可理解」之間有巨大鴻溝。錢包要把一個 PermitBatch 翻譯成使用者真正看得懂的話，需要：

1. 識別目標合約是不是 Permit2（用合約地址比對 [0x000000000022D473030F116dDEE9F6B43aC78BA3](https://etherscan.io/address/0x000000000022D473030F116dDEE9F6B43aC78BA3)）；
2. 解析 EIP-712 的 typed data，把 token address 對應到代幣名稱與小數位；
3. 把 `2^160-1` 翻譯成「無限額度」、把 `2^48-1` 翻譯成「永不過期」；
4. 把 spender 對應到已知的 DEX router，或標記成「未知地址」；
5. 模擬「**如果這張簽名被執行，會發生什麼**」 — 哪些代幣會從你帳戶搬到哪裡。

絕大多數瀏覽器錢包在 2024 年之前對這些只做到第 1 步。即使 MetaMask 在 2024 Q4 推出 [Permit2 透明簽名](https://docs.metamask.io/wallet/concepts/transactions/scams-attacks/)、Rabby Wallet 在 2024 Q2 早一步提供解析，**多數冷錢包硬體裝置（Ledger / Trezor）的小螢幕仍然顯示成原始 hex** — 你看到的還是一串看不懂的 0x。

更糟的是：[盲簽](/blog/blind-signing-risks)成為「我懂風險、按確認」的習慣 — 很多進階使用者每天在 DeFi 簽幾十張 EIP-712，幾乎不會逐張檢查內容，直到簽到一張惡意的。

### 一個合法的 Permit2 簽名長什麼樣

合法 DApp（Uniswap / 1inch / CoW Swap / Matcha）發起的 Permit2 訊息會：

1. **`spender` 指向該 DApp 的官方 router 合約**（可在 Etherscan 上看到大量交易紀錄與 verified label）；
2. **`amount` 等於或略大於你輸入的 swap 數量**，**不是** `2^160-1`；
3. **`expiration` 通常是當前時間 + 30 天**，**不是** `2^48-1` 或更大；
4. **PermitSingle 而非 PermitBatch**（你只在 swap 一種 token，沒理由一次授權四種）；
5. **`sigDeadline` 一般是當前時間 + 30 分鐘**，給訊息一個合理短的有效窗口。

只要五點裡有一點異常，停下來。**合法 swap 不需要無限額度、不需要打包四種代幣、不需要 75 年的 expiration**。

## ArcSign 怎麼在 Permit2 上設防

ArcSign 對 EIP-712 訊息簽名的處理跟[盲簽](/blog/blind-signing-risks)、[EIP-7702 委派](/blog/eip-7702-delegation-risks)走同一條告警管線 — 一旦識別出是 Permit2 訊息，就進入「**鏈上交易等級**」的審查流程：

**1. Permit2 訊息完整解析，不顯示原始 hex**

簽名介面不會顯示 `PermitBatch` + 一堆 typed data hex。ArcSign 會把訊息解析成人話：「你即將授權 spender `0x7a2...e91`，在未來 [27,394 天 / 永不過期] 內，從你錢包搬走 [USDC: 無限 / USDT: 無限 / WETH: 無限 / WBTC: 無限] 等 4 種代幣」。看不懂的訊息永遠不該被按下。

**2. 自動偵測「異常授權參數」並全螢幕警告**

任一條件成立 → 全螢幕紅色警告，必須額外勾選確認才能繼續：(a) `amount` 等於或接近 `2^160-1`；(b) `expiration` 超過當前時間 + 1 年；(c) `sigDeadline` 超過當前時間 + 7 天；(d) PermitBatch 含 3 種以上代幣；(e) spender 是部署 < 30 天的合約。

**3. Spender 合約靜態分析與黑名單比對**

ArcSign 本地引擎對 spender 地址做即時檢查：(a) 是否在已知 [Drainer 工具包](/blog/wallet-drainer-toolkits-explained)中繼地址黑名單；(b) 部署時間；(c) 是否有大量重複的 transferFrom 紀錄（典型 sweeper 行為）；(d) 是否與已知釣魚資金流向有關。任一異常 → 全螢幕警告。

**4. 模擬執行：簽下這張會發生什麼**

ArcSign 在你按下「Confirm」前，模擬「**如果這張 Permit2 被攻擊者立即提交會發生什麼**」 — 從你錢包搬走的代幣與金額在簽名介面以紅字顯示。如果模擬顯示「資金會立刻被搬空」 — 直接攔截，不允許簽名。

**5. 私鑰永不離開 USB，完整訊息在冷端螢幕**

Permit2 攻擊的核心是「**簽錯一張訊息**」 — 光把私鑰鎖在 USB 不夠，簽名介面本身也得在冷端顯示。ArcSign 把整個 Permit2 解析、靜態分析、模擬結果都搬到 USB 裝置螢幕上，與[XOR 三分片金鑰保護](/blog/xor-encryption-explained)、[mlock 記憶體保護](/blog/mlock-memory-protection)整合成完整的零信任簽名鏈。

**設計哲學：每一張 EIP-712 都是潛在的鏈上動作**

ArcSign 不把 EIP-712 訊息當成「比較便宜的簽名」 — 它是與鏈上交易**完全等效的權限授予**。所以我們的設計選擇是：**Permit2 訊息與 ERC-20 approve 交易走完全相同的審查管線**。看[零信任錢包](/blog/zero-trust-wallet)一文了解 ArcSign 的完整零信任設計。

## 7 個讓你遠離 Permit2 釣魚的習慣

| # | 習慣 | 阻擋的攻擊向量 |
| --- | --- | --- |
| 1 | **任何 spender 為「未知合約」的 Permit2 簽名 → 一律拒簽** | Sign-in 偽裝、Sweeper |
| 2 | **任何 `amount = 2^160-1` 或 `expiration = 2^48-1` → 一律拒簽** | 無限授權 |
| 3 | **任何 PermitBatch 含 ≥ 3 種代幣 → 高度懷疑** | 整包搬空 |
| 4 | **不認的「sign in to verify」訊息一律拒絕** | EIP-712 釣魚偽裝 |
| 5 | **大額資產用全新、未連任何 DApp 的[冷錢包](/blog/usb-cold-wallet-benefits)** | 所有變體 |
| 6 | **使用支援 Permit2 完整解析的[冷錢包](/blog/best-crypto-wallet-2026)** | 盲簽 Permit2 |
| 7 | **月度檢查 Permit2 allowance**：到 [Revoke.cash](https://revoke.cash) 看 Permit2 視圖，撤銷異常授權 | 等待型 Sweeper |

### 進階：把 Permit2 授權拆解到「最小範圍」

如果你必須用 Permit2 swap：(1) 簽完立刻在 [Revoke.cash](https://revoke.cash) 撤銷該 token 對 Permit2 的鏈上 approval；(2) 下次 swap 再重新 approve — 雖然多花 gas，但每筆 swap 之間 Permit2 的權限是「乾淨」的；(3) 大額資產一律用獨立[冷錢包](/blog/cold-vs-hot-wallet)持有，不直接拿熱錢包 swap。

## 已經簽過可疑的 Permit2 訊息？緊急處理流程

如果你懷疑剛剛在某個來路不明的網站簽下 Permit2 — **速度比什麼都重要**。Permit2 的危險在於攻擊者可能還沒提交簽名（等待型攻擊），所以越快撤銷，越有機會在簽名被使用前讓它失效。

**1. 到 Revoke.cash 檢查 Permit2 allowance**

打開 [Revoke.cash](https://revoke.cash)，切到「Permit2」分頁。檢查是否有不認識的 spender 對你某個 token 有非零 allowance。如果有 → 進入下一步。

**2. 鏈上撤銷 Permit2 allowance（gas 必須花）**

對每一個異常的 (token, spender) 組合，用 Revoke.cash 點「Revoke」 — 這會發一筆 `Permit2.lockdown()` 或 `Permit2.approve(token, spender, 0, 0)` 鏈上交易，把 Permit2 allowance 歸零。**注意**：你不能用「等待」省 gas — 簽下的訊息一旦在 sigDeadline 之內被攻擊者提交，allowance 就會被啟用，搬錢的也是 allowance 啟用後立刻發生。所以發現異常那一刻就要花 gas 撤銷。

**3. 把 token 對 Permit2 的鏈上 approval 也歸零**

進階防護：除了撤銷 Permit2 allowance，也撤銷你 token 對 Permit2 合約本身的 `approve()` — 這會切斷 Permit2 動你錢包代幣的能力。下次需要 swap 再重新 approve。

**4. 假設錢包已經洩露，搬到新地址**

即使你撤銷了，攻擊者可能還拿到了其他你沒注意到的東西 — 例如 [ERC-20 approval](/blog/token-approval-revoke)、[EIP-7702 委派](/blog/eip-7702-delegation-risks)或 setApprovalForAll。穩妥做法是建立新地址（最好用新的[助記詞](/blog/seed-phrase-backup-guide)），把資產轉過去，原錢包視為焦土。

**千萬別找「鏈上偵探」幫你恢復**

跟其他[釣魚受害者](/blog/wallet-drainer-toolkits-explained)一樣，Permit2 受害者也會被二次詐騙鎖定。Telegram / X / Discord 上自稱「能幫你救回的鏈上偵探」**100% 都是詐騙**。合法鑑識公司不會主動私訊也不收預付款。

## 常見問題 FAQ

### Q：我從來不用 Uniswap，是不是就不用怕 Permit2？

不是。Permit2 的設計是「**任何 DApp 都可以重用**」 — 1inch、CoW Swap、Matcha、OpenSea Seaport、許多 NFT 市場與聚合器都集成 Permit2。即使你從沒用過 Uniswap，只要你用過任何主流 DEX 聚合器或 NFT 市場，**你大概率早已對 Permit2 簽過 `approve(max)`**。攻擊者不在乎你用哪個 DApp — 他要的是你已經把無限額度給了 Permit2 這件事。

### Q：硬體錢包（Ledger、Trezor）能擋住 Permit2 釣魚嗎？

部分能。Ledger 在 2024 Q3 加入了 Permit2 Clear Signing 支援，Trezor 在 2025 Q1 跟上。但**只對 Ethereum 主網上的 Uniswap Permit2 instance** — 其他鏈、其他自定義 Permit2 部署、PermitBatch 多代幣解析、spender 黑名單比對，多數韌體仍不支援。即使在最新韌體上，**硬體錢包通常無法做 spender 合約靜態分析、模擬執行、跨鏈黑名單比對**。ArcSign 把這些都在 USB 裝置的較大螢幕上完整呈現。

### Q：用 USB 冷錢包簽 Permit2 還會被釣魚嗎？

「**會**」。USB 冷錢包擋的是「[私鑰外洩](/blog/private-key-management-best-practices)」 — 私鑰永不離開裝置。但 Permit2 釣魚的本質是「**讓你主動簽下一張授權**」，所以冷錢包能做的是「**讓你看清楚你在簽什麼**」這一層。如果使用者在 ArcSign 跳全螢幕紅色警告時還是手動勾選「我了解風險」、按下確認，沒有任何冷錢包能擋下。冷錢包的設計目標是把所有資訊以人類可讀的形式攤在你面前，讓你能做出有依據的決定 — 不是奪走你的判斷權。

### Q：撤銷 Permit2 為什麼這麼麻煩？要撤銷兩層？

因為 Permit2 是「**授權的授權**」。第一層：你對 token 簽 `approve(Permit2, max)` — 這是鏈上 ERC-20 標準的授權。第二層：Permit2 內部維護 `allowance(owner, token, spender)` 的記錄 — 這是 Permit2 自己的授權系統。攻擊者真正用的是第二層 allowance。撤銷只撤第二層（Permit2.lockdown）也能擋住已發出的釣魚，但只要你的 token 對 Permit2 那層 ERC-20 approval 還在，下次簽到惡意 PermitSingle 又能再被利用。穩妥的做法是兩層都撤、需要 swap 再臨時 approve 回去。
