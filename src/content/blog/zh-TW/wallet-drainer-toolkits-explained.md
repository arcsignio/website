---
title: "Wallet Drainer 全解析：Inferno、Pink、Angel 三大釣魚工具包如何偷走 5 億美元"
description: "Wallet Drainer 是 2024–2026 最系統化的加密貨幣盜竊工具包 — Inferno、Pink、Angel Drainer 累計造成 5 億美元損失。本文拆解 Drainer 的攻擊流程、SaaS 商業模式、技術指紋與防禦方法，並示範 ArcSign 如何在簽名前攔截 Drainer 的 Permit2 與 setApprovalForAll 釣魚。"
pubDate: 2026-05-18
updatedDate: 2026-06-25
locale: zh-TW
tags: ["安全教育"]
author: "ArcSign Security Team"
heroImage: "/blog/images/wallet-drainer-toolkits-explained-hero.png"
relatedSlugs: ["blind-signing-risks", "address-poisoning-attack", "phishing-attack-prevention", "token-approval-revoke"]
---

## 為什麼 2026 年的加密釣魚比過去任何時候都更難防

過去談「加密貨幣詐騙」時，大部分人想到的是私人聊天室裡的「客服」、Telegram 上的「投資導師」，或是要你輸入助記詞的假錢包頁面。這類攻擊靠的是「**單一壞人花時間騙單一受害者**」，總量再多也是線性的。

2024 年起，事情變了。一群匿名開發者把整個釣魚流程**產品化**，做成可訂閱、可分潤、有客服支援的 SaaS 工具 — Wallet Drainer。任何人付一點月費或交一成贓款抽成，就能拿到「整套釣魚網站、Permit2 自動掃描、跨鏈資產搬運、洗幣管道」。原本需要一個會寫 Solidity 又會做網站的駭客才能完成的攻擊，現在初中生靠模板就能做。

根據 [Scam Sniffer](https://scamsniffer.io) 與 Chainalysis 2025 年的年度報告，**Inferno、Pink、Angel 三大 Drainer 工具包在 2024–2026 累計造成超過 5 億美元的加密資產損失**，受害錢包數量超過 27 萬。本文把這三套工具包的技術內幕、商業模式、共同弱點拆給你看，並說明 ArcSign 在 Drainer 攻擊鏈的哪一環可以剎車。

**為什麼這篇值得一讀**

Drainer 工具包讓「會釣魚」這件事的門檻從「需要技術」降到「需要錢」。理解它的運作，你才會明白為什麼[盲簽](/blog/blind-signing-risks)、[地址投毒](/blog/address-poisoning-attack)、[剪貼簿劫持](/blog/clipboard-hijack-attack)在 2024 後突然集中爆發 — 因為背後都是同一群人在賣同一套工具。

## 什麼是 Wallet Drainer？SaaS 化的加密釣魚機器

Wallet Drainer 不是單一惡意軟體，它是**一整套「釣魚即服務」（Phishing-as-a-Service）平台**。典型的 Drainer 工具包包含五個模組：

### 模組 1：偽造前端網站模板

提供仿冒 Uniswap、OpenSea、Blur、LayerZero、Optimism、Arbitrum、Base 等知名協議的網站模板。買家只要改一個 logo、換一個網域，就能拿到一個和真網站視覺幾乎一致的釣魚頁。Drainer 的「客服」甚至會幫你選關鍵字、買 Google Ads 排到官方網站之前。

### 模組 2：錢包連線層（WalletConnect / EIP-1193 注入）

當受害者按下 "Connect Wallet"，Drainer 會用標準 [WalletConnect v2](/blog/walletconnect-dapp-tutorial) 流程連上錢包，**順便讀取錢包餘額、所有代幣、所有 NFT、跨鏈分布**。這個讀取在所有 RPC 介面上看起來都是合法請求 — 沒有任何 EVM 介面會警告你。

### 模組 3：資產評估與簽名生成引擎

這是 Drainer 真正的「核心智能」。在受害者連上後 1–2 秒內，後端會根據資產分布**動態生成最划算的簽名請求**：

| 受害者錢包特徵 | Drainer 生成的釣魚簽名 |
| --- | --- |
| 大量 USDC / USDT / DAI | `Permit2.PermitBatch` 一次抓所有穩定幣 |
| 持有藍籌 NFT（BAYC、Azuki、Pudgy） | `setApprovalForAll(operator, true)` |
| 持有 stETH、rETH、cbETH 等 LST | `Permit` + `transferFrom` 組合 |
| 有 ETH 但 token 不多 | 假 "claim airdrop" 函數，實際是 `transfer(operator, balance - gasReserve)` |
| 跨多條 EVM 鏈 | 多條鏈並行生成不同簽名 |

這個動態生成意味著：**Drainer 不會浪費「一張 Permit2 簽名」在只有 100 美元的錢包上**，它會等到鯨魚連上才生成大簽名。所以你不能假設「我錢包小不會被盯上」。

### 模組 4：自動清算與跨鏈搬運

受害者簽下後，後端會在毫秒級內：(1) 用 `transferFrom` 把代幣搬到中繼地址；(2) 用 Across、Stargate、cBridge 跨鏈到難追蹤的鏈（最常見是 Linea、Scroll、zkSync）；(3) 進 Tornado Cash 替代物（Railgun、Privacy Pools）或透過 OKX、HTX 的「廉價地址」洗出。

### 模組 5：分潤與洗幣管道

Drainer 抽成通常是「20–30%」直接扣下，剩下的轉到操作者的地址。買家拿到的是被洗過一次的資產，平台拿到的是穩定的「平台分潤」。這個分潤模式有公開的鏈上紀錄 — 研究員 ZachXBT 在 2024 多次公開 Inferno Drainer 的分潤地址。

**Drainer 跟一般病毒不同：它在你電腦上完全不留痕跡**

傳統殭屍網路 / 木馬會在你電腦留檔案、留 registry、留排程任務。Drainer **完全在瀏覽器內運作** — 它不需要在你電腦上安裝任何東西，只需要你「連上錢包並按下簽名」。所以防毒軟體完全偵測不到，重灌系統也沒用 — 因為它從來沒進你的系統。

## 三大 Drainer：Inferno、Pink、Angel 技術指紋對比

### Inferno Drainer（2023-11 出道 → 2024-08 「解散」 → 2024-11 重啟為 Inferno 2.0）

最早把 Drainer 工具包**完整 SaaS 化**的玩家。2024-08 ZachXBT 把它的核心開發者地址公開後，平台高調宣布「我們退役了」，並把工具開源 — 結果三個月後同一批人換名字重啟成 Inferno 2.0，使用幾乎一樣的後端架構。**Inferno 系列累計造成超過 2.2 億美元損失**。

技術指紋：
- 受害者連上後會跳一個假的 `Sign In` 對話框，實際上是 EIP-712 的 Permit2 結構
- 中繼地址通常是 `0x0000...` 開頭的「虛榮地址」（vanity address），製造「官方」錯覺
- 跨鏈洗幣偏好走 LayerZero 到 Linea

### Pink Drainer（2024-03 出道）

走「**精緻路線**」— Pink 不做大量低品質釣魚網站，而是專攻**高價值目標**：DeFi 創辦人、NFT 收藏家、Twitter 大 V。已知案例包括兩起以太坊核心開發者的個人錢包遭竊（合計 1,100 萬美元）。

技術指紋：
- 釣魚網站通常做得**極為精緻** — 字體、動畫、響應式都到位
- 偏好用 X / Telegram 私訊「合作邀請」「採訪邀請」當釣魚入口
- 偏好使用 `permit2.PermitBatch` 一次抓 5–8 個代幣
- 累計損失估計 **1.4 億美元**

### Angel Drainer（2024-01 出道 → 2025-Q1 升級為 Angel 2.0）

最技術導向的一支。Angel 的特色是**主動 DNS hijack** — 它會買被遺忘的 DeFi 協議網域（例如已停運的協議），或對運作中協議做 SubDNS 釣魚（例如 `app-uniswap.org` 仿冒 `app.uniswap.org`）。Angel 2.0 在 2025 加上**跨鏈 Permit2 自動利用** — 一個簽名能抽多條鏈。

技術指紋：
- 多次出現「合法 DNS 紀錄被改」的事件，包括 Squarespace 被駭時受影響的多個 DeFi 協議
- 中繼地址常用「混淆地址」（混合大量 EOA + 小型合約）
- 累計損失估計 **1.6 億美元**

| Drainer | 起源 | 主要手法 | 估算損失（2024–2026） | 主要受害者 |
| --- | --- | --- | --- | --- |
| **Inferno** | 2023-11 | 大量釣魚網站 + Permit2 | 2.2 億美元 | NFT 散戶、空投獵人 |
| **Pink** | 2024-03 | 精準鯨魚釣魚 + 社交工程 | 1.4 億美元 | DeFi 創辦人、KOL |
| **Angel** | 2024-01 | DNS 劫持 + 跨鏈自動利用 | 1.6 億美元 | DeFi 用戶 / 機構 |
| **合計** | — | — | **約 5.2 億美元** | **27 萬+ 錢包** |

## Drainer 的攻擊流程：5 個你能介入的時點

把 Drainer 從「你看到網站」到「你資產歸零」拆成 5 個階段，並標記哪一個階段你還能逃：

**1. 導流（Traffic Acquisition）**

Drainer 透過 Google Ads、X / Twitter 廣告、Discord pinned message、Telegram bot、SEO 假網站、被駭協議的 Discord 把你引到釣魚頁面。**這個階段你的防禦是「永遠用書籤、不要點搜尋引擎結果」**。Google Ads 上的「Uniswap」「OpenSea」結果，2024 起有超過 40% 是 Drainer 投的。

**2. 連線（Wallet Connect）**

你按下 "Connect Wallet"，Drainer 透過 WalletConnect / 注入式 provider 拿到你的地址。**此時你還沒有損失** — 連線本身不會花錢、不會簽名。但 Drainer 後端已經開始評估你的資產。

**3. 簽名請求（The Drain Signature）**

Drainer 動態生成一個對你資產最有效率的釣魚簽名 — 通常是 `Permit2.PermitBatch` 或 `setApprovalForAll`。**這是你最後的逃生點** — 只要你看得懂簽名內容並拒絕，全盤皆贏；按下確認，全盤皆輸。

**4. 執行（Asset Movement）**

簽名後 200 毫秒內，Drainer 的執行器把資產 `transferFrom` 到中繼地址。**這個階段你已經救不回來** — 沒有「取消交易」按鈕，沒有區塊鏈客服。

**5. 洗幣（Laundering）**

中繼地址把資產跨鏈、混合、出金。1 小時內資產通常已經分散到 20+ 地址、3+ 鏈。**這個階段你能做的只剩通報與標記**，希望能對未來的鏈上鑑識留下線索。

### 為什麼「Connect Wallet」不是攻擊起點？

很多新手以為「不要連任何錢包」就安全 — 這個直覺是錯的。連線本身對冷錢包來說完全沒風險。**真正的攻擊起點永遠在「按下 Sign」那個時刻**。把所有警戒火力集中在簽名介面上，比恐懼連線更有效。

## Drainer 簽名的五個明顯紅旗

不管哪個 Drainer，它們要在你錢包上達成「一次簽完抽乾」這個目標，都會留下技術上的指紋。學會在簽名介面認出這五個紅旗，能擋下 95% 的 Drainer：

| # | 紅旗 | 為什麼是紅旗 |
| --- | --- | --- |
| 1 | **簽名類型是 `PermitBatch` 或 `PermitSingle`** | 正常 DApp 互動 99% 不需要 Permit2 批次授權 |
| 2 | **`spender` 是不認識的合約地址** | 應該是 Uniswap Router、Aave Pool 等已知地址 — 不是某個沒人聽過的 `0xFee...` |
| 3 | **`amount` 是 `2^256 - 1`（無限額度）** | 連 Uniswap 也不會要求無限授權 |
| 4 | **`deadline` 是極遠的未來** | 正常授權 deadline 通常是當下 +10–30 分鐘，不是 +10 年 |
| 5 | **`setApprovalForAll(operator, true)`** | 永遠停下來想：你真的要把整個 NFT 收藏交出去嗎？ |

**Drainer 也會故意製造「正常感」**

更成熟的 Drainer 會先請你簽一個「無害的 sign-in message」（純字串），讓你習慣按「確認」，**然後第二個簽名才下重手**。這個技巧叫「**Trust Priming**」。對抗它的唯一方法是：**每一個簽名都當作獨立事件，從頭看一次**，不要因為前一個是安全的就放下警戒。

## ArcSign 如何幫你在簽名前看穿 Drainer

這篇文章前面講得很準的一句話：**Drainer 從來不偷你的金鑰，它偷的是你的簽名。** 所以冷錢包對 Drainer 的防禦力，取決於它能不能讓你「看懂、看穿」你正要簽的東西。ArcSign 實際做的是：

**1. Clear-signing：看清楚你真正在簽什麼**

ArcSign 在本地把 WalletConnect / mint 的 calldata 與 EIP-712 typed data（Permit、Permit2、ERC-20 `approve`、ERC-721 `setApprovalForAll`）解碼成可讀的意圖。它用一組精選的 ABI 片段、以 4-byte selector 比對常見呼叫；遇到 Permit2 訊息會把 spender 與 token 攤出來，而不是顯示一堆原始 hex。關鍵在於：無上限 `approve`（amount = max uint）與 `setApprovalForAll(..., true)` 各會標上一個**行內紅旗** — 這正是多數 Drainer 簽名最依賴的兩種型態。詳見 [Clear Signing 拆解](/blog/blind-signing-risks)。

**2. 目的地黑名單檢查（所有人免費）**

ArcSign 在放行簽名前，會把簽名目的地地址比對離線黑名單（OFAC + ScamSniffer + MetaMask 釣魚清單）。如果 spender / 目的地是已知惡意地址，後端會拒簽，除非你明確知情同意。這個檢查離線可用、對所有使用者免費 — 不是 Pro 才有的功能。

**3. 交易模擬（Pro）：簽前看見資產淨變化**

對 EVM 交易，ArcSign Pro 會模擬整筆交易，在簽名前預覽「執行後你錢包的變化」：例如「-5,000 USDC, -3,000 USDT, -1 NFT (BAYC #4xxx)」。如果模擬結果跟你的預期不符（例如你以為只是 mint 一個 NFT，但模擬顯示你會損失多個既有 NFT），立刻拒簽。模擬會跳出警告供你判斷，涵蓋 5 條主要 EVM 鏈，是 Pro 功能。

**4. 私鑰永不離開 USB**

即使你不小心被 Drainer 釣到、即使簽下了授權，[ArcSign 的 XOR 三分片金鑰](/blog/xor-encryption-explained)與 [mlock 記憶體保護](/blog/mlock-memory-protection)確保私鑰本體永遠不會被外洩。攻擊面被嚴格限制在「該次授權能影響的資產」 — 而不是「整個錢包未來所有資產」。但這只是最後一道防線，最有效的還是不要簽你看不懂的東西。

設計哲學：把 [零信任](/blog/zero-trust-wallet) 從金鑰存儲延伸到簽名介面

很多冷錢包把「安全」限縮在「金鑰不外洩」 — 但 Drainer 從來不偷你的金鑰，它只偷你的簽名。ArcSign 把「零信任」的範圍擴展到整個簽名互動流程：用 clear-signing 讓你看懂你在授權什麼、用免費的目的地黑名單檢查擋下已知惡意地址、用 Pro 模擬讓你在確認前先看見結果。

## 8 個對抗 Drainer 的具體習慣

| # | 習慣 | 難度 | 阻擋的 Drainer 階段 |
| --- | --- | --- | --- |
| 1 | **永遠用書籤連 DApp**（不點搜尋引擎結果 / 廣告） | 低 | 階段 1（導流） |
| 2 | **看不懂簽名一律拒絕** | 低 | 階段 3（簽名） |
| 3 | **不簽無限額度授權**（用 N 倍交易金額替代） | 中 | 階段 3 損失上限 |
| 4 | **每月到 [Token Approvals](/blog/token-approval-revoke) revoke 舊授權** | 中 | 階段 3 攻擊面收斂 |
| 5 | **用支援 Clear Signing 的冷錢包（如 ArcSign）** | 低 | 階段 3 |
| 6 | **大額資產用獨立錢包，與 DApp 互動錢包分離** | 中 | 階段 4 損失上限 |
| 7 | **任何「Connect 後立刻要簽 Permit2」一律當釣魚** | 低 | 階段 3 |
| 8 | **追蹤 ScamSniffer 黑名單與 ZachXBT 通報** | 中 | 提前識別 |

### 進階：把錢包分層

對中大型資產持有者，建議建立三層錢包：(1) **冷儲蓄層**（如 ArcSign USB 冷錢包）— 99% 資產存這裡，永不連 DApp；(2) **熱互動層**（小額 EVM 錢包）— 連 DApp、做測試、領空投，被釣最多損失也有限；(3) **網關層**（多簽或備援）— 介於兩者之間，做大筆轉帳前的最後檢查。這個三層架構在多次 Drainer 攻擊中救過大鯨魚 — 因為 Drainer 釣到的永遠只是熱互動層。

## 已經被 Drainer 釣中？60 分鐘自救流程

如果你懷疑剛剛簽下的是 Drainer 簽名，**前 60 分鐘是黃金時間**：

**1. 立刻 revoke 全部授權**

到 [Revoke.cash](https://revoke.cash) 或 ArcSign Token Approvals，**revoke 該錢包的所有授權** — 不要只 revoke 你剛簽的那個，因為 Drainer 可能藏了多個 Permit。Pro 用戶可用 ArcSign 的批次 revoke 一鍵清掉。

**2. invalidateNonces（Permit2 專用）**

到 [permit2.uniswap.org](https://permit2.uniswap.org) 用 `invalidateNonces` 函數作廢你錢包對 Permit2 的所有未使用 nonce — 這能讓 Drainer 手上拿到的 Permit2 簽名失效，即使他還沒執行。需要花一點 Gas，但通常比讓他清掉資產便宜得多。

**3. 把剩餘資產轉到全新錢包**

即使 revoke 了，**該錢包不能再相信** — Drainer 可能埋了延遲執行的簽名。立刻創建一個全新地址（最好用新的[助記詞](/blog/seed-phrase-backup-guide)），把所有剩餘資產轉過去。原錢包視為「被燒掉」。

**4. 通報與鏈上紀錄**

到 ScamSniffer、ChainAbuse、Etherscan 把釣魚網站與合約標為 "Drainer"。對大額損失，聯繫鏈上鑑識公司（Chainalysis、TRM Labs）。台灣使用者可向 165 反詐騙專線報案。

**千萬別找「鏈上偵探」**

事件後最常見的二次詐騙是 Telegram / X / Discord 私訊「我能幫你找回」、「我是專業鏈上偵探」、「我可以解凍你的資產」。**這些 100% 是詐騙**。合法鑑識公司不會主動私訊，也絕對不會收預付款。

## 常見問題 FAQ

### Q：我從來不用 Telegram、不點私訊連結，還會被 Drainer 釣到嗎？

會。Drainer 在 2024–2026 的主要導流管道**不是 Telegram**，而是 **Google Ads + Twitter Ads + SEO + Discord pinned message**。一個你查「Uniswap」在 Google 看到的排第一名贊助結果，有 30–40% 機率是 Drainer 投的。把書籤當成唯一進入 DApp 的方式，是當代加密用戶必備習慣。

### Q：Drainer 跟一般病毒、Trojan 有什麼不同？

最大差別是：**Drainer 不在你電腦上留任何痕跡**。它完全在瀏覽器內運作，靠的是你「主動連錢包並簽名」。所以防毒軟體看不到、重灌系統沒用、換新電腦也沒用 — 如果你拿著同一個被授權過的[私鑰](/blog/private-key-management-best-practices)連去同樣的網站，結果一樣。一般病毒攻擊「電腦」，Drainer 攻擊「簽名行為」 — 防禦點完全不同。

### Q：硬體錢包（Ledger、Trezor）能擋住 Drainer 嗎？

部分能。Ledger 與 Trezor 在 2023 之後陸續支援部分 Clear Signing，能把主流 DApp 的簽名解析出來。但對 Drainer 動態生成的 Permit2 PermitBatch、setApprovalForAll、或 obscure 合約呼叫，**硬體螢幕仍然常常只能顯示 Hex** — 這就是[盲簽](/blog/blind-signing-risks)。Drainer 也會專門挑硬體錢包顯示不出來的合約呼叫方式來做釣魚簽名。所以「我用硬體錢包就安全」這個假設在 2026 不成立。ArcSign 是桌面應用程式，簽名介面不受硬體小螢幕限制 — 對常見簽名類型能做可讀的 clear-signing，對無上限 `approve` / `setApprovalForAll` 標行內紅旗，並提供 Pro 模擬。

### Q：Drainer 可以從 USB 冷錢包偷走資產嗎？

只有當你**主動簽下釣魚簽名**才可以。USB 冷錢包的設計（[私鑰永不離開裝置](/blog/usb-cold-wallet-benefits)、[mlock 記憶體保護](/blog/mlock-memory-protection)、XOR 三分片）能擋住 99% 的私鑰外洩攻擊 — Drainer 從來不偷私鑰，它只引誘你簽授權。所以冷錢包對 Drainer 的防禦力，**完全取決於它的簽名介面能不能讓你看懂你在簽什麼**。這也是為什麼 ArcSign 把 Clear Signing 跟金鑰存儲一樣優先：兩者缺一不可。
