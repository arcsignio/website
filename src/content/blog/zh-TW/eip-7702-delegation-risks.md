---
title: "EIP-7702 委派攻擊全解析：Pectra 升級後 EOA 變成「智能帳戶」的新風險"
description: "Pectra 升級啟用了 EIP-7702，讓 EOA 能委派代碼給合約 — 等同把錢包權限暫時交給智能帳戶。本文拆解 SetCode 委派的攻擊向量、跨鏈重放風險、實際發生的釣魚案例，以及 ArcSign 如何在簽名前識別 0x04 委派交易並阻擋濫用。"
pubDate: 2026-05-19
locale: zh-TW
tags: ["安全教育"]
author: "ArcSign Security Team"
heroImage: "/blog/images/eip-7702-delegation-risks-hero.png"
relatedSlugs: ["wallet-drainer-toolkits-explained", "blind-signing-risks", "token-approval-revoke", "mpc-vs-hd-wallet"]
---

## Pectra 之後：你的錢包多了一個你沒注意過的新能力

2025 年 5 月 7 日，Ethereum 完成了 **Pectra 升級**，把 11 個 EIP 一次性合併進主網。對絕大多數使用者而言，這次升級「沒什麼感覺」 — 沒漲手續費、也沒打斷既有 DApp。但其中一項變動，悄悄改寫了「EOA」與「智能合約」之間延續十年的界線：**EIP-7702 — Set EOA Account Code**。

EIP-7702 讓任何一個普通錢包地址（EOA），都能透過一張**授權簽名**，把自己「暫時或長期」委派給一份智能合約代碼。從那一刻起，這個 EOA 在以太坊上不再只是「一個公鑰雜湊」，它**同時也是那份合約**。每一筆送來的交易，都會走那份合約的邏輯。

這個能力本來是設計給「帳戶抽象（Account Abstraction）」的入門體驗 — 讓你不用換新地址就能享有自動 Gas、Batch 交易、Session Key 等智能帳戶優勢。但只要稍微把鏡頭轉個角度，它也是 **2026 年最危險的釣魚原語**：**一張簽名，就能把整個 EOA 永久變成攻擊者的代理。**

**為什麼這篇值得一讀**

如果你還在用 EOA 連 DApp、用瀏覽器錢包簽 EIP-712 — 你已經在 EIP-7702 的攻擊面上了。本文從技術原理講到實戰案例，並說明 ArcSign 如何在簽名介面把 `0x04` 委派交易與 `SET_CODE` 授權清楚標示出來，避免[盲簽](/blog/blind-signing-risks)落入委派陷阱。

## EIP-7702 是什麼：給 EOA 一身合約皮

要理解攻擊面，先得理解這個 EIP 在以太坊狀態機裡實際做了什麼。

### 新交易類型：`SET_CODE_TX_TYPE`（0x04）

EIP-7702 引入第四種交易類型（在 EIP-1559 type-2、EIP-4844 blob type-3 之後）。一筆 `0x04` 交易在原本欄位之外，多了一個 **`authorization_list`** 陣列。每個 authorization 是一個結構：

```
(chain_id, address, nonce, y_parity, r, s)
```

簽下這個 authorization 的，不是發起交易的 `tx.origin`，而是 **被授權的 EOA 本人**。換句話說：**任何 EOA 都可以簽授權給「任何合約地址」，並由「任何其他帳戶」打包進交易發出來。**

當交易被執行時，EVM 會對 authorization_list 裡的每一筆做：

1. 驗證簽名 → 取回授權者 EOA 地址；
2. 把該 EOA 的 `code` 設為 `0xef0100 || address`（23 bytes 的 **delegation designator**）；
3. 從此每一筆送到那個 EOA 的呼叫，都會 `DELEGATECALL` 到 `address` 指向的合約。

最後一句是關鍵：「**每一筆**送到那個 EOA 的呼叫，都會走那份合約。」這個委派不是一次性的 — 它寫進了 EOA 的 state，**直到 EOA 自己再簽一張覆蓋授權（指向 `0x000...000`）為止**。

### `0xef0100` 字首：唯一識別委派 EOA 的方法

被委派的 EOA，它的 `code` 不是「真的合約 bytecode」，而是固定的 23 byte 前綴：

```
0xef0100 || <delegated_contract_address>
```

`0xef` 是 EIP-3541 預留的「不可部署」字首，所以這個前綴**保證不可能是普通合約**。EVM 看到 `code` 以 `0xef0100` 開頭，就知道這是一個 EIP-7702 委派 EOA，把後 20 byte 當成代理目標。

這意味著：**從外部觀察一個地址，你只能透過 `eth_getCode` 才能知道它有沒有被委派**。如果你拿到一筆「送 ETH 到 0xAlice」的交易，光看地址沒辦法判斷這個 ETH 進去之後會被誰處理。

**為什麼 EIP-7702 是「攻擊面擴張」而不只是新功能**

過去十年，以太坊的安全心智模型是「**EOA 只能用私鑰簽，合約只能用代碼動**」。EIP-7702 第一次模糊了這條線：EOA 可以「**事先簽一張授權**」，讓未來所有送到它的交易都走合約邏輯。攻擊者只要拿到一張 EIP-7702 簽名，就拿到了「**這個錢包的程式化控制權**」 — 即使沒拿到私鑰、沒拿到任何 token approval。

## 三種 EIP-7702 攻擊向量

過去一年（2025 Q3 至 2026 Q2）已經出現多起 EIP-7702 釣魚案例。把它們拆出來，主要落在三種攻擊向量：

### 向量 1：Sweeper 委派 — 一張簽名等於整個錢包外包

最直接的攻擊。攻擊者在釣魚網站上請受害者簽一份「升級你的錢包為智能帳戶」的 EIP-7702 授權，目標地址是**攻擊者部署的 Sweeper 合約**。受害者按下後，他的 EOA 從此每一筆呼叫都會走 Sweeper 邏輯 — 任何時候只要 EOA 收到 ETH 或 token，Sweeper 都能在同一筆交易裡 `transfer` 到攻擊者地址。

最毒的部分：**這個授權不會立刻清空現有資產**。攻擊者會等 — 等你下次有人空投、有人轉錢給你、有交易所匯回來。等的時候你完全沒感覺，因為你的錢包**靜止狀態**看起來完全正常。直到下一筆轉入發生，0.2 秒內就被搬空。

| 階段 | 表面行為 | 實際發生的事 |
| --- | --- | --- |
| 受害者簽名 | 「升級錢包為智能帳戶」 | EOA 委派 → Sweeper 合約 |
| 受害者錢包 | 餘額不變、交易紀錄不變 | `code` 從 `0x` 變成 `0xef0100...` |
| 三週後有人轉 1 ETH 進來 | 看似一筆正常入帳 | 觸發 Sweeper 的 `fallback`，1 ETH 立刻轉出 |

### 向量 2：跨鏈重放 — chain_id = 0 的死亡之握

EIP-7702 規範允許 authorization 的 `chain_id` 設為 0，意思是「**這張授權對任何 EVM 鏈都有效**」。這個設計初衷是讓使用者能一次升級在 Ethereum / Optimism / Arbitrum / Base / BSC / Polygon / Avalanche 上的所有同地址 EOA。但對攻擊者來說，這是免費的橫向擴張：**一張簽名洗 7 條鏈。**

更狠的攻擊變體：**Sweeper 合約只在某些鏈上有部署**。攻擊者把同一個合約地址在 Ethereum 部署成「無害的 demo」，在 Linea / Scroll / zkSync 部署成 Sweeper。受害者用區塊瀏覽器查 Ethereum 上那個地址，看到「沒問題的測試合約」 — 但他真正被授權的，是**所有 EVM 鏈上的同地址合約**，含他完全沒查的那六條鏈。

### 向量 3：升級陷阱 — 用「合法的」帳戶抽象包裝惡意邏輯

最隱蔽的一支。攻擊者部署一個**看起來像是正規 ERC-4337 / Safe 智能帳戶**的合約 — 有 `execute`、有 `validateUserOp`、有 owner 機制、開源、可在 Etherscan verify。表面上是正規的智能帳戶。但合約裡藏了一個 **upgrade hook**：

```solidity
function setOwner(address newOwner) external {
    if (msg.sender == 0xAttacker || tx.origin == 0xAttacker) {
        owner = newOwner;
    }
}
```

受害者簽下 EIP-7702 授權後，他的 EOA 變成「這個看起來像 Safe 的智能帳戶」。一切都正常運作 — 直到某天攻擊者用一張普通交易呼叫 `setOwner(0xAttacker)`，整個錢包改主。受害者的私鑰仍然有效，但他現在已經**不再是這個地址的 owner** — 任何想動資產都要透過 owner（攻擊者）簽。

這種攻擊在 2026 已經出現過，受害者通常是「**想試試帳戶抽象**」的早期使用者 — 他們以為自己升級到了智能錢包，事實上把自己升級進了攻擊者的牢籠。

**EIP-7702 撤銷不像撤銷 Approval 一樣便宜**

撤銷 ERC-20 approval 只需要一張 `approve(spender, 0)` 交易（幾美元 gas）。但**撤銷 EIP-7702 委派需要簽一張新的 type-4 交易**，把目標改成 `0x0000...0000`。如果你的 EOA 已經被 Sweeper 委派，**轉任何 gas 進去都會被 Sweeper 攔截** — 你連簽新授權的能力都沒有。這就是為什麼 EIP-7702 釣魚比 Permit2 釣魚更難救：救援本身需要 gas，而 gas 一進來就被搬走。

## 簽名介面上：怎麼分辨「升級錢包」是不是釣魚

EIP-7702 attempt 在錢包端會展現為一個 **type-4 交易簽名請求** 或一張單獨的 **EIP-7702 authorization**。傳統錢包（不少瀏覽器擴充功能在 2025 年中才補完支援）會把它顯示成這樣：

```
Transaction Type: 0x04 (SET_CODE)
Authorization List:
  [0] chain_id: 0
      address: 0x73...AB  ← 「升級目標合約」
      nonce: 5
```

99% 的使用者看到 `0x04` + 一串 hex 地址，根本不知道發生什麼事。所以攻擊者只要把網頁顯示成「**Click to upgrade your wallet to a smart account**」、底下放一個漂亮按鈕，受害者按下後直接簽名 — 然後就完成了 outsourcing。

### 在簽 EIP-7702 之前必檢的 5 件事

| # | 檢查項目 | 為什麼重要 |
| --- | --- | --- |
| 1 | **`chain_id` 不可以是 0** | 0 = 跨鏈重放；正常智能帳戶升級應該綁定單一鏈 |
| 2 | **目標地址必須是已驗證、可信、開源的合約** | 不認識的合約 = 立刻拒簽 |
| 3 | **合約必須沒有「動態升級主」邏輯** | 如果合約允許某個外部地址改 owner，就是後門 |
| 4 | **目標地址在 Etherscan 必須有實際使用紀錄、長時間穩定** | 一個剛部署的合約 = 高機率是 Sweeper |
| 5 | **簽名請求的 nonce 應該等於你 EOA 當前 nonce** | nonce 不一致 = 攻擊者拿你舊狀態做重放 |

### 一個合法的 EIP-7702 升級長什麼樣

如果是合法的智能帳戶升級（例如 Coinbase Smart Wallet、Safe、Biconomy 把 EOA 變成自家帳戶），它通常會：

1. 在 UI 顯示「**Upgrade to [明確的智能帳戶品牌]**」 — 而不是「click to upgrade」
2. 目標合約是該品牌**官方文件公開、Etherscan verified、社群數百萬美元 TVL** 的實作
3. `chain_id` 綁定當前你連上的鏈，不是 0
4. 合約**不能**含任何可被外部呼叫的 owner 變更函數
5. 提供「**回退到原始 EOA**」的明確指引（重新簽授權指向 `0x0` 就行）

只要五點任何一點不符合，停下來。**你不會因為錯過一次「升級」就被排除在 DeFi 之外**，但你可能會因為簽錯一張授權就被清空。

## ArcSign 如何在 EIP-7702 上設防

ArcSign 把 EIP-7702 視為與 Permit2、`setApprovalForAll` 同等級的高風險簽名類型。在我們的 Clear Signing 引擎裡，type-4 交易與裸 EIP-7702 authorization 都走同一條告警管線：

**1. Type-4 交易完整 ABI 解析**

簽名介面不會顯示 `0x04` + hex。ArcSign 會把整個 `authorization_list` 解析成人話：「你即將授權 EOA `0xYou` 在 [鏈名 / 「所有 EVM 鏈」] 上委派代碼到 [目標合約地址 + Etherscan label + 部署日期 + verified 狀態]」。這跟[盲簽](/blog/blind-signing-risks)的設計哲學一致 — 看不懂的簽名永遠不該被按下。

**2. chain_id = 0 強制紅色警告**

只要 authorization 的 `chain_id` 是 0，ArcSign 會在簽名介面跳出**全螢幕紅色警告**，必須額外勾選「我了解這張簽名會在所有 EVM 鏈生效」才能繼續。對絕大多數使用者，這個欄位應該被綁定到當前鏈 — 不應該是 0。

**3. 目標合約靜態分析**

ArcSign 的本地引擎會對目標合約做即時靜態分析：(a) 是否有 `setOwner` / `upgrade` / `migrateAdmin` 等可疑函數；(b) 部署時間是否在 30 天以內；(c) 是否在已知 Sweeper 黑名單中；(d) 是否與已知 [Drainer 工具包](/blog/wallet-drainer-toolkits-explained)中繼地址有資金往來。任一項異常 → 全螢幕警告。

**4. 模擬執行：升級後第一筆會發生什麼**

ArcSign 會在你按下「Confirm」前，模擬「**EOA 委派之後，下一筆送進來的 ETH / token 會發生什麼**」。如果模擬顯示「資金會立刻被 `transfer` 到非你的地址」 — 直接攔截，不允許簽名。

**5. 私鑰永不離開 USB，授權路徑全程冷端確認**

EIP-7702 的攻擊核心是「**簽錯一張授權**」，所以光是把私鑰鎖在 USB 還不夠 — 簽名介面本身也得在冷端顯示。ArcSign 把整個 type-4 解析、合約靜態分析、跨鏈警告都搬到 USB 裝置螢幕，與[XOR 三分片金鑰](/blog/xor-encryption-explained)、[mlock 記憶體保護](/blog/mlock-memory-protection)整合成完整零信任簽名鏈。

**設計哲學：把帳戶抽象當成「需要被審查的合約呼叫」**

EIP-7702 把 EOA 變成「可程式化」的瞬間，整個錢包安全模型就需要重寫。ArcSign 的選擇是：**不允許「點一下就升級」的快捷簽名**。每一張 EIP-7702 授權都被當成「**部署合約等級**」的決定來對待，因為它的後果就是部署合約等級的。看[零信任錢包](/blog/zero-trust-wallet)一文了解 ArcSign 的完整零信任設計。

## 7 個讓你遠離 EIP-7702 釣魚的習慣

| # | 習慣 | 阻擋的攻擊向量 |
| --- | --- | --- |
| 1 | **不點 DApp 自稱的「升級為智能帳戶」按鈕**，除非確認是 Safe / Coinbase Smart Wallet / Biconomy 官方流程 | Sweeper 委派 |
| 2 | **永遠拒絕 chain_id = 0 的授權** | 跨鏈重放 |
| 3 | **升級前先看目標合約**：Etherscan verified、部署 ≥ 90 天、TVL 公開 | 升級陷阱 |
| 4 | **大額資產用全新、未連任何 DApp 的[冷錢包](/blog/usb-cold-wallet-benefits)** | 所有向量 |
| 5 | **熱錢包月度檢查**：`eth_getCode(yourEOA)` 是否回傳 `0x`（未委派） | Sweeper 委派 |
| 6 | **使用支援 type-4 完整解析的[冷錢包](/blog/best-crypto-wallet-2026)** | 盲簽委派 |
| 7 | **追蹤 Pectra 後的安全研究**：blog.openzeppelin、Trail of Bits、Slowmist | 早期識別 |

### 進階：把 EIP-7702 升級當作一次性事件

如果你真的需要把某個 EOA 升級到智能帳戶，把它當成「**搬家**」處理：(1) 先把資產搬到新的 EOA；(2) 在乾淨的新 EOA 上簽 EIP-7702 升級；(3) 觀察 1-2 週確認運作正常；(4) 再把資產搬回來。過程中如果發現任何異常，舊 EOA 還在你手上、資產也安全。**不要把「升級」與「資產還在錢包裡」這兩件事同時做。**

## 已經簽過可疑的 EIP-7702 授權？緊急處理流程

如果你懷疑剛剛在某個來路不明的網站簽下了 EIP-7702，**速度比什麼都重要**：

**1. 檢查你的 EOA 是否已被委派**

到 Etherscan 你的地址頁面，看 "Code" 欄位。如果顯示 `0x` 或空白 → 你沒事，授權沒被打包進交易（或被 frontrun 了）。如果顯示 `0xef0100...` → 你已經被委派，立刻進入下一步。

**2. 立刻撤銷委派 — 簽一張指向 0x0 的新 authorization**

從另一台**乾淨裝置**（不要用剛剛被釣魚的瀏覽器）打開錢包，簽一張新的 type-4 交易，`authorization_list[0]` 指向 `0x0000000000000000000000000000000000000000`。這會清空你 EOA 的 `code`，恢復成普通 EOA。**注意**：你需要 gas 來發這筆交易，而如果目標 Sweeper 會搬走入帳 gas，你可能需要**用 Flashbots / Private mempool** 把這筆 type-4 與 gas 入帳綁在同一個 bundle 裡。

**3. 把所有 token approvals 也清掉**

委派授權清掉後，舊的 ERC-20 approval 與 Permit2 額度仍然有效 — 到 [Revoke.cash](https://revoke.cash) 或 ArcSign [Token Approvals](/blog/token-approval-revoke) 把全部都撤銷。

**4. 假設舊錢包已燒掉，搬到新 EOA**

即使你已經撤銷委派，這個錢包的[私鑰仍然不應該再被信任](/blog/private-key-management-best-practices) — 因為你不知道攻擊者是不是還有其他延遲執行的東西。建立一個全新地址（最好用新的[助記詞](/blog/seed-phrase-backup-guide)），把剩餘資產轉過去，原錢包視為焦土。

**千萬別找「鏈上偵探」幫你恢復**

跟 Drainer 受害者一樣，[EIP-7702 受害者也會被二次詐騙](/blog/wallet-drainer-toolkits-explained)鎖定。Telegram / X / Discord 上自稱「能幫你救回的鏈上偵探」**100% 都是詐騙**。合法鑑識公司不會主動私訊也不收預付款。

## 常見問題 FAQ

### Q：我從來不用 EIP-7702，為什麼還要學這個？

因為**攻擊者會幫你用**。EIP-7702 的危險之處在於它是「**單一簽名生效**」的攻擊。你不需要主動研究 EIP-7702，攻擊者也會包裝成「升級到智能錢包」「啟用 Gasless 交易」「免費領空投升級」等誘餌讓你簽。理解它的運作，才能在簽名介面認出它。

### Q：硬體錢包（Ledger、Trezor）能看出 EIP-7702 嗎？

部分能。Ledger 在 2025-Q3 加入了 type-4 交易解析，但很多舊韌體還沒更新；Trezor 在 2026-Q1 才補上完整支援。即使在最新韌體上，**多數硬體錢包仍然只把 authorization_list 顯示成 hex** — 你看到的還是 `chain_id: 0`、`address: 0x73...AB` 這種螢幕資訊，沒有合約靜態分析、沒有黑名單比對、也沒有模擬。ArcSign 在 USB 裝置螢幕上做完整 ABI 解析 + 合約靜態檢查 + 跨鏈警告，是因為冷錢包介面的螢幕空間沒有硬體錢包那種限制。

### Q：USB 冷錢包真的能完全擋住 EIP-7702 釣魚嗎？

「**完全**」是太強的詞。USB 冷錢包擋住「[私鑰外洩攻擊](/blog/private-key-management-best-practices)」是完全的 — 私鑰永遠不離開裝置。但 EIP-7702 攻擊的本質是「**讓你主動簽下授權**」，所以冷錢包能擋住的是「讓你看清楚你在簽什麼」這一層。如果使用者在 ArcSign 跳全螢幕紅色警告時還是手動勾選「我了解風險」、然後按下確認，**沒有任何冷錢包能擋下**。冷錢包的設計目標不是奪走使用者的判斷權，而是把所有資訊以人類可讀的形式攤在你面前，讓你能做出有依據的決定。

### Q：EIP-7702 跟 ERC-4337（帳戶抽象）有什麼差別？

ERC-4337 是「**建立一個全新的智能合約錢包**」 — 你的資金住在合約裡，私鑰只是合約的一個 owner。EIP-7702 是「**讓你既有的 EOA 暫時／長期變成智能帳戶**」 — 你的資金還住在原本的 EOA 地址，但每筆交易都會走委派合約。這兩條路線的安全模型不同：ERC-4337 的攻擊面在合約本身的 owner / module 設計；EIP-7702 的攻擊面在「**那張授權簽名**」。對使用者來說，EIP-7702 風險更高，因為**它不需要你建立新地址、不需要你搬資產 — 一張簽名就生效**。這也是為什麼 ArcSign 把它列為與 Permit2、`setApprovalForAll` 同等級的高風險簽名類型。
