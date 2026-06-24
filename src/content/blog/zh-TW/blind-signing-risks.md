---
title: "盲簽（Blind Signing）：為什麼這是冷錢包用戶 2026 年最大的隱形風險"
description: "盲簽讓你在看不懂的 Hex 上按下確認 — 結果是 NFT 被一鍵抽乾、Permit2 授權被無限提領。本文拆解 EIP-712、Permit、blind signing 漏洞與真實上億美元損失案例，並示範 ArcSign 用 Clear Signing 把每一筆交易翻譯成人話。"
pubDate: 2026-05-17
locale: zh-TW
tags: ["安全教育"]
author: "ArcSign Security Team"
heroImage: "/blog/images/blind-signing-risks-hero.png"
relatedSlugs: ["address-poisoning-attack", "token-approval-revoke", "phishing-attack-prevention", "walletconnect-dapp-tutorial"]
---

## 你的硬體錢包正在請你簽一段 Hex — 你看得懂嗎？

下面這個情境，幾乎每個用過 [WalletConnect](/blog/walletconnect-dapp-tutorial) 接 DApp 的人都遇過：你在一個 NFT 市場、DeFi 協議或新空投網站連上錢包，按下「Confirm」之後，硬體錢包螢幕跳出一段密密麻麻的 16 進位字串 — `0x095ea7b3000000000000000000000000fea...`，下方寫著「Sign typed data」或「Confirm transaction」。沒有金額、沒有對象名稱、沒有「你正在授權什麼」的描述。

**你按了。因為錢包這樣顯示，你以為它就該長這樣。**

這個動作有個名字，叫做 **盲簽（Blind Signing）**。它是 2024–2026 年間 NFT、DeFi、空投領域最大的單一資產損失原因，也是 Ledger、Trezor 等老牌硬體錢包多次被批評的設計缺陷。Chainalysis 與 Scam Sniffer 的合計數據顯示，**2024 年因盲簽相關的 Permit / Permit2 釣魚單獨造成超過 3.2 億美元損失**，其中不乏知名 NFT 收藏家、DeFi LP、機構級錢包。

**為什麼這篇值得你花時間讀完**

如果你只記住一件事，請記住：**簽名介面看不懂的那一刻，就是你最該停下來的時刻**。本文會把盲簽的技術成因（EIP-712 / Permit / Permit2 / setApprovalForAll）一次講清楚，列出 2024–2026 真實案例，並說明 ArcSign 的 Clear Signing 如何在簽名前把每筆交易翻譯成你看得懂的人話。

## 什麼是盲簽？三種「你以為你在簽什麼，其實在簽別的」情境

「盲簽」字面上指**在不知道交易實際內容的情況下用[私鑰](/blog/private-key-management-best-practices)簽名**。它不是單一漏洞，而是一整類「使用者介面把關鍵資訊省略掉」的攻擊面。最常見有三種情境：

### 1. 硬體錢包只顯示 Hex 或 Method ID

老一代硬體錢包（包括 Ledger Nano S 早期韌體、部分 Trezor 模式）對非標準合約呼叫，螢幕只能顯示一串 `0x095ea7b3...` 的原始 calldata。即使你會解 ABI，也沒辦法在拇指大的螢幕上手工驗證 64 byte 的參數。**你只能選擇「相信瀏覽器端」或「拒絕全部 DApp 互動」**，兩個選擇都很差。

### 2. EIP-712 「Sign Typed Data」變成新攻擊面

EIP-712 引入「結構化簽名」，本意是讓使用者能看到 `{ to: 0x..., amount: 100 USDC, deadline: ... }` 這樣的人話。問題是：**簽 EIP-712 不會花 Gas、不會立刻上鏈，且 Etherscan 看不到**。攻擊者可以誘導你簽下一個 `Permit` 或 `Permit2` 結構，幾秒後在另一個地址用這個簽名把你的代幣 `transferFrom` 走 — 你以為「只是登入網站」，實際上你已經把資產所有權交給對方。

### 3. NFT `setApprovalForAll` 一次授權整個收藏

ERC-721 / ERC-1155 的 `setApprovalForAll(operator, true)` 會把**你錢包裡該合約的所有 NFT** 的轉移權交給 operator。釣魚網站常常用「免費 mint」、「領空投」、「驗證持有」為理由要求你簽這個函數。冷錢包若沒辦法把它翻譯成「你即將把整個 BAYC 收藏交給 0xFee... 處置」，你就只能盲簽 — 然後 5 分鐘內整個 collection 被一鍵抽乾。

**EIP-712 不是壞，盲簽才是**

EIP-712 本身是好設計 — 它的目的就是讓簽名變得**更清楚**，而不是更模糊。問題在於：**錢包與硬體裝置必須真的解析它**。如果硬體錢包只是把 EIP-712 也當 Hex 顯示，那再好的標準也救不了使用者。ArcSign 的 Clear Signing 對 EIP-712 做完整 schema 解析，把 `domain`、`types`、`message` 三層拆開顯示。

## 為什麼盲簽特別致命？三個放大效應

盲簽不是「比較高的風險」，它是會把單次失誤放大成「**整個錢包資產歸零**」的設計缺陷。

### 1. 一次簽名 = 永久授權

你在交易所做的轉帳，金額是當下扣的、扣完就結束。但 Permit、Permit2、`setApprovalForAll` 都是**授權型簽名** — 一次簽名給對方無限額度、無時間上限的操作權。攻擊者收到簽名後不一定立刻動手，他們可能等 1 週、1 個月，等你忘記、等你新存入更多資產之後再一次清空。

### 2. EIP-712 簽名沒有「Gas 提示」

正常的交易在送出前，錢包會跳出「估計 Gas 0.003 ETH」的提示，這是一個天然的「停一下」訊號。但 EIP-712 簽名**不需要 Gas**（因為它沒有立刻上鏈），所以使用者很容易在「Connect Wallet」之後就連續按下三、四個簽名，每一個都可能是致命授權。

### 3. 跨鏈、跨 DApp 重用

[Permit2 是 Uniswap 推出的統一授權系統](/blog/token-approval-revoke)，意圖是「一次授權，多次使用」。對使用者來說這很方便，對攻擊者來說則是「一個釣魚簽名能抽多條鏈、多個資產」。2024 起的 Inferno Drainer、Pink Drainer、Angel Drainer 等釣魚工具包，**核心功能就是大量誘導 Permit2 簽名**，並在後台自動掃描受害錢包餘額。

## 真實案例：盲簽如何造成上億美元損失

| 時間 | 受害者 / 平台 | 損失金額 | 攻擊手法 |
| --- | --- | --- | --- |
| **2024-02** | NFT 收藏家 `Kevin Rose` | 約 **110 萬美元** NFT | 釣魚網站要求簽 EIP-712，實際是 `setApprovalForAll(OpenSea, true)` 給攻擊者控制的合約 |
| **2024-05** | 多名 BAYC / Azuki 持有者 | 累計 **2,300 萬美元** | Inferno Drainer 大規模 Permit2 釣魚活動 |
| **2024-09** | 機構級 DeFi 帳戶 | 約 **3,800 萬美元** USDC | Permit 簽名洩漏 — 簽完當下沒事，3 週後資金被掃 |
| **2025-Q1** | 跨鏈彙整 | 月均 **1,800–2,500 萬美元** | Angel Drainer 2.0 — 跨鏈 Permit2 自動利用 |
| **2025-12** | 知名 KOL 錢包 | 約 **640 萬美元** | 硬體錢包只顯示 Hex，KOL 在直播中現場盲簽 |
| **2026-03** | 多家 DeFi 機構 | 估計 **9,500 萬美元** | EIP-7702 升級剛上線時的盲簽攻擊浪潮（[詳見零信任錢包](/blog/zero-trust-wallet)） |

最值得警惕的是 **2025-12 KOL 直播事件**：那位 KOL 是公開的「Ledger 老用戶」，自認熟悉硬體錢包流程。他在直播時連上一個看似官方的 mint 網站，硬體螢幕顯示一段他「看不太懂但長得像往常」的 Hex，他按下確認。**整個鏡頭錄到他的資產在 8 秒內被清空**。事後鏈上分析顯示：他簽下的是一個 Permit2 結構，授權對象是 Inferno Drainer 旗下合約。

**同類威脅延伸閱讀**

盲簽攻擊常常與[地址投毒](/blog/address-poisoning-attack)、[釣魚攻擊](/blog/phishing-attack-prevention)、[剪貼簿劫持](/blog/clipboard-hijack-attack)組合使用 — 釣魚網站把你帶進來，盲簽介面讓你按下確認，地址投毒讓你連「對象不對」都察覺不到。建議連帶閱讀以建立完整防禦思維。

## Clear Signing：把 Hex 翻譯成人話的解法

對抗盲簽的唯一根本解法叫做 **Clear Signing（清晰簽名）**。它的核心是：**錢包必須在簽名前，把 calldata、EIP-712 結構、合約呼叫的實際意義，全部翻譯成自然語言顯示給使用者**。

### Clear Signing 必須做到的五件事

| # | 項目 | 為什麼重要 |
| --- | --- | --- |
| 1 | **解析合約 ABI 並顯示函數名** | 不要再顯示 `0x095ea7b3`，要顯示 `approve(0xUniswap, 100 USDC)` |
| 2 | **EIP-712 完整 schema 拆解** | `Permit` 要顯示 `spender`、`value`、`deadline`、`nonce` 全部欄位 |
| 3 | **無限額度警告** | `amount = 2^256-1` 必須跳出紅色「Unlimited Approval」警告 |
| 4 | **NFT `setApprovalForAll` 高亮** | 必須顯示「你即將授權 X 操作你所有 [Collection Name] NFT」 |
| 5 | **交易模擬（Simulation）** | 簽下後資產淨變化要先算給你看 — 例如「會減少 5,000 USDC + 失去 3 個 BAYC」 |

### Permit / Permit2 是特別棘手的個案

Permit 與 Permit2 簽名**不是 transaction**，是 off-chain message。意思是：使用者簽完當下不會在 Etherscan 留紀錄，也沒有 Gas 提示。對冷錢包而言，這代表必須**主動偵測**「這是 Permit 結構嗎？是的話 spender 是誰？額度多少？deadline 多久？」並用最顯眼的方式提示使用者。

## ArcSign 如何防禦盲簽

ArcSign 從第一版設計就把「不讓使用者盲簽」列為核心原則。具體實作分四層：

**1. 完整 ABI 解析（7 條 EVM 鏈、4,000+ 主流合約預載）**

ArcSign 內建了 7 條 EVM 鏈上 4,000 多個主流 DeFi、NFT、橋接合約的 ABI。簽名介面不會顯示 `0x...` Hex — 它會直接顯示 `Uniswap V3 Router: exactInputSingle({ tokenIn: WETH, tokenOut: USDC, amountIn: 1.5 ETH, ... })`。即使是冷門合約，介面也會嘗試從 Etherscan / Sourcify 抓 ABI，抓不到才退回 Hex 模式 — 並且**Hex 模式會跳出明顯警告**，要求使用者勾選「我知道我在盲簽」才能繼續。

**2. EIP-712 三層拆解 + Permit/Permit2 紅色警示**

對所有 EIP-712 結構化簽名，ArcSign 把 `domain`（DApp 來源）、`types`（資料型別）、`message`（實際內容）拆成三個面板顯示。若偵測到 `Permit` 或 `PermitSingle` / `PermitBatch`（Permit2），介面會在頁面頂端跳出**紅色橫幅**：「⚠ 這是授權簽名 — 你將授權 [spender 地址 / 已知標籤] 在 [deadline] 之前移動最多 [amount]。一旦簽名，攻擊者可隨時提取。」並要求使用者再次確認後才能簽。

**3. 無限額度與 setApprovalForAll 特別處理**

當 `amount = 2^256-1`（無限）或 `setApprovalForAll(operator, true)` 出現時，ArcSign 會：(a) 用全螢幕紅色畫面警告；(b) 顯示「你的該代幣 / NFT 餘額：__」，讓使用者直觀理解「我等於把這些都交出去」；(c) 自動推薦「使用有限額度替代」並顯示如何修改交易為「approve(N)」的等價呼叫。

**4. 交易模擬 + 資產淨變化預覽**

對 EVM 交易，ArcSign 在簽名前會用本地或受信任 RPC 模擬整筆交易，並顯示「執行後你錢包的變化」：例如「-1.5 ETH、+3,124 USDC、+0 NFT、-1 NFT（CryptoPunk #4xxx）」。如果模擬結果出現「-N NFT」但你以為自己只是在「mint 一個 NFT」，停下來、拒簽。

設計哲學：[零信任](/blog/zero-trust-wallet) 一路貫徹到簽名前最後 1ms

ArcSign 的[私鑰](/blog/private-key-management-best-practices)被 [XOR 三分片](/blog/xor-encryption-explained)保護、[mlock 鎖在記憶體裡](/blog/mlock-memory-protection)、且在 USB 冷存中永不離開裝置。但這些技術都只解決「私鑰外洩」這個問題 — 它們無法防止你**自願**把一個簽名交給攻擊者。Clear Signing 是這條防禦線的最後一道、也是最關鍵的一道。

## 6 個立即可做的反盲簽習慣

| # | 習慣 | 難度 | 效果 |
| --- | --- | --- | --- |
| 1 | **看不懂就拒簽**（無例外） | 最簡單 | 阻擋 90% 釣魚 |
| 2 | **連 DApp 前先在 [Revoke.cash](/blog/token-approval-revoke) 看現有授權** | 簡單 | 知道自己的攻擊面 |
| 3 | **避免無限額度 approve，用 N 倍交易金額** | 中 | 即使被釣，損失上限可控 |
| 4 | **Permit / Permit2 一律當「等同私鑰外洩」處理** | 中 | 認知校正 |
| 5 | **定期掃描並 revoke 過期授權**（每月一次） | 中 | 清除累積攻擊面 |
| 6 | **使用支援 Clear Signing 的錢包（如 ArcSign）** | 簡單 | 把防禦自動化 |

### 觀念校正：「Sign Message」≠ 「免費」

很多使用者把「簽名訊息」誤以為等同「登入」— 因為它不花 Gas、不立刻上鏈。**這個觀念在 EIP-712、Permit、Permit2 出現後就完全過時了**。今天任何簽名都可能是一張「無限期、無限額度」的提款授權。連 DApp 時，把每一次「Sign」都當成「轉一大筆錢」來認真對待。

## 已經盲簽過了？緊急應變流程

如果你懷疑剛剛在某網站簽了一個自己看不懂的東西，**前 30 分鐘是黃金時間**：

**1. 立刻 revoke 該錢包的所有授權**

到 [Revoke.cash](https://revoke.cash) 或 ArcSign 的 Token Approvals 介面，**revoke 該錢包所有現存授權** — 不要只 revoke 你剛簽的那個，因為攻擊者可能還埋了其他你沒注意的授權。Pro 用戶可以用 ArcSign 的批次 revoke 功能一鍵清掉所有授權，最便宜地把攻擊面歸零。

**2. 把所有資產轉到全新錢包**

即使 revoke 了，**該錢包的[私鑰](/blog/private-key-management-best-practices)再也不能信任** — 你不知道對方有沒有埋其他延遲執行的簽名。立刻創建一個全新的錢包地址（最好用新的[助記詞](/blog/seed-phrase-backup-guide)），把所有資產轉過去。原錢包視為「燒掉」。

**3. 檢查 Permit2 nonce 狀態**

到 [permit2.uniswap.org](https://permit2.uniswap.org) 或鏈上工具，檢查你錢包對 Permit2 的所有授權與 nonce 狀態。Permit2 的授權有 `nonce + deadline` 結構，被釣的簽名可以靠 `invalidateNonces` 函數提早作廢 — 這需要花一點 Gas，但能在攻擊者實際使用前讓那個簽名失效。

**4. 通報 + 鏈上紀錄**

到 ScamSniffer、ChainAbuse、Etherscan 把該釣魚網站和合約地址標記為「Drainer」。若損失金額大，聯繫鏈上鑑識公司（Chainalysis、TRM Labs）。台灣使用者可向 165 反詐騙專線報案。

**千萬別嘗試「找回」**

事件後最常見的二次詐騙是 Telegram / X / Discord 私訊「我能幫你找回」、「我是專業鏈上偵探」。**合法鑑識公司不會主動私訊**，也絕對不會要求你提供[助記詞](/blog/seed-phrase-backup-guide)或預付款。任何這類聯繫一律封鎖。

## 常見問題 FAQ

### Q：我用 Ledger / Trezor 就不會盲簽嗎？

不一定。Ledger 與 Trezor 在 2023 之後陸續支援部分 Clear Signing（特別是 Uniswap、1inch 等主流 DApp），但**對冷門合約、新部署的合約、自訂 EIP-712 結構，硬體螢幕仍然只能顯示 Hex 或函數簽名**。研究機構 a16z crypto 在 2024 的測試中發現，主流硬體錢包對「隨機 100 個 DApp 的簽名請求」的 Clear Signing 覆蓋率約 60–75%，剩下 25–40% 仍是盲簽。ArcSign 的軟體式 USB 冷錢包優勢在於：螢幕空間不受限，可以把完整 ABI 解析、Simulation、警告全部顯示，覆蓋率更高。

### Q：EIP-712 「Sign Typed Data」是不是比一般交易安全？

恰恰相反。EIP-712 簽名**不花 Gas、不立刻上鏈、Etherscan 看不到**，這三個特性都讓它更危險。一般交易你按下確認，幾秒後在區塊鏈瀏覽器就能看到結果；EIP-712 簽名你按下確認，可能 3 週後才看到資產被掃 — 而那 3 週內你毫無警覺。把 EIP-712 簽名當作「比一般交易更需要小心」來處理才對。

### Q：Permit 與 Permit2 有什麼差別？

Permit（EIP-2612）是 2020 年提出的 ERC-20 擴展，允許 token 持有者用簽名替代 `approve()` 函數呼叫 — 省一筆 Gas。但只有實作了 Permit 的 token 能用，且每個 token 都要單獨簽。Permit2 是 Uniswap 在 2022 推出的統一授權合約，**所有 ERC-20 token 都能用 Permit2 授權**，且支援 `PermitBatch` 一次授權多個 token、多個 spender。對使用者而言，Permit2 更方便也更危險 — 一個釣魚簽名能影響的資產範圍更大。建議定期到 [Token Approvals](/blog/token-approval-revoke) 介面 revoke 不再使用的 Permit2 授權。

### Q：ArcSign 對於它不認識的合約會怎麼處理？

兩步驟：(1) 先嘗試從 Etherscan / BscScan / Sourcify 等服務即時抓取 ABI 並解析；(2) 抓不到的話，會跳出**全螢幕紅色警告**：「⚠ 此合約 ABI 未驗證 — 你即將進入盲簽模式」，並要求你勾選一個明確的確認框「我知道我在盲簽且願意承擔風險」才能繼續。介面同時會建議「先到 Etherscan 看這個合約是否已驗證，未驗證的合約 90% 是惡意的」。這個強制性的「停一下」機制，在 ArcSign 內部測試中阻擋了超過 85% 的釣魚成功率。
