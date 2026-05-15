---
title: "ERC-20 代幣管理：新增、隱藏、自訂代幣（2026 完整指南）"
description: "錢包看不到代幣怎麼辦？本文系統化拆解 ERC-20 標準、為什麼需要手動加代幣，並示範 ArcSign 上「新增 / 隱藏 / 自訂代幣」的完整流程，附假代幣詐騙辨識、跨 6 條 EVM 鏈的代幣治理 SOP 與隱私小技巧。免費功能，冷錢包離線簽名。"
pubDate: 2026-04-27
locale: zh-TW
tags: ["產品教學"]
author: "ArcSign Security Team"
heroImage: "/blog/images/erc20-token-management-hero.png"
relatedSlugs: ["arcsign-windows-linux-guide", "how-to-revoke-token-approvals", "clipboard-hijack-attack"]
---

## 一、為什麼錢包看不到我的代幣？

如果你曾經把一個小幣或新發行的代幣轉到自己的錢包，卻發現介面顯示餘額是「0」、甚至完全找不到那個代幣，請先深呼吸 — **你的代幣沒有不見**，它們只是還沒被錢包「認得」。要理解這個現象，我們得先回到 ERC-20 的設計本質。

一條 EVM 鏈上每天有上千個新合約被部署，光是以太坊主網就累計超過 **50 萬個 ERC-20 合約**。任何錢包都不可能把所有代幣預載進介面 — 那會讓 App 啟動時要拉幾百 MB 的 token list、白名單還會變得難以維護，假代幣也會混進來。所以絕大多數錢包採取的策略是：

**「預設只顯示一份精選代幣清單，其餘代幣由用戶自行透過合約地址新增。」**

這就是為什麼你需要學會「新增 / 隱藏 / 自訂代幣」這三個動作。它不是進階功能，而是 EVM 錢包的日常基本功。掌握之後，你會發現：你的資產永遠都在，只是要把它「請進來」介面顯示。

            核心觀念

鏈上資產 = 真實餘額；錢包顯示 = UI 視窗。即使錢包介面顯示 0，只要 Etherscan 上看得到、合約地址正確，資產就在那裡。代幣管理的本質是「告訴錢包要去看哪些合約」。

## 二、ERC-20 標準與「代幣清單」運作機制

ERC-20 是以太坊上最重要的代幣標準，定義了所有代幣合約必須提供的最小函數集。錢包要正確顯示一個代幣，需要從合約讀取以下幾個基本資訊：

// ERC-20 必備函數（節錄）
function name() external view returns (string memory);
function symbol() external view returns (string memory);
function decimals() external view returns (uint8);
function balanceOf(address account) external view returns (uint256);
function transfer(address to, uint256 amount) external returns (bool);

`name`、`symbol`、`decimals` 是「靜態元資料」 — 通常從合約讀一次後可以快取；`balanceOf` 則是錢包每次刷新都會查詢的動態資料。問題是：**錢包必須先知道合約地址，才能呼叫 `balanceOf`**。沒有地址 = 沒有查詢 = 介面看不到。

### Token List：白名單 + 自訂清單的雙層架構

ArcSign 跟絕大多數成熟錢包一樣，採用「雙層 token list」架構：

| 層級 | 來源 | 內容 | 更新頻率 |
| --- | --- | --- | --- |
| **L1 內建清單** | ArcSign 官方審核 + Uniswap Token Lists / CMC | 每條鏈前 200 大代幣（USDT、USDC、WBTC、ARB、OP、PEPE 等） | 隨應用版本更新 |
| **L2 自訂清單** | 使用者手動加入的合約地址 | 不在 L1 中、但你實際持有的小幣 / 新代幣 / 私募代幣 | 即時，存在 USB 本地 |

兩層加起來，幾乎可以涵蓋你會遇到的所有合法代幣。L1 確保體驗（一鍵看到主流幣），L2 確保彈性（任何鏈上代幣都能加進來）。重點是：**自訂清單只存在於你這支 USB 裡，不會上傳到任何雲端**，符合 ArcSign 的「資料不出 USB」原則。

## 三、ArcSign 新增自訂代幣的 4 步流程

假設你剛從某個 DEX 收到一個新代幣，但 ArcSign 介面上沒顯示。以下是把它「請」進來的標準流程，整個過程在 USB 內離線完成、無需任何鏈上交易：

            1
            在 Etherscan / BscScan 取得合約地址

絕對不要用 Google 搜尋。直接去 `etherscan.io`（或對應鏈：`bscscan.com`、`polygonscan.com`、`arbiscan.io`、`optimistic.etherscan.io`、`basescan.org`），搜尋你要的代幣名稱，找到「Contract」標籤頁顯示的 0x 地址，**確認左上角有「✓ Verified」勾選**，再複製。

            2
            在 ArcSign 中切換到正確的鏈

插入 USB → 解鎖 ArcSign → 上方鏈選單切到對應的網路（Ethereum / BSC / Polygon / Arbitrum / Optimism / Base）。代幣合約是**鏈專屬**的：BSC 上的 USDT 跟 Ethereum 上的 USDT 是兩個不同合約，地址不通用，務必對應正確。

            3
            「新增代幣」→ 貼上合約地址

在資產頁面點選「Add Token」（或「+」按鈕）→ 貼上剛剛複製的合約地址。ArcSign 會自動透過 Alchemy（BSC 為 NodeReal）唯讀 RPC 拉取 `name`、`symbol`、`decimals` 並顯示預覽。如果合約是已知假代幣或被多個來源標註為高風險，介面會跳出紅色警告。

            4
            確認後即生效（不需簽名）

檢查名稱與 Symbol 跟 Etherscan 顯示一致 → 點「確認」。代幣立即出現在你的資產列表，並顯示真實餘額。整個過程**沒有任何鏈上交易、不需要簽名、不消耗 Gas**，因為你只是修改 USB 內的本地 token list。

            小技巧：直接從交易紀錄一鍵加

如果你已經做過一筆轉帳收到該代幣，ArcSign 的「Activity」頁會列出該交易，並提供「Add this token」的快捷按鈕。一鍵就能把代幣加入清單，免去手動複製合約地址。

## 四、隱藏代幣：清理介面 & 防止假代幣詐騙

「隱藏」跟「移除」不同。鏈上的餘額永遠都在 — 隱藏只是把它從你的 ArcSign 介面拿掉，不再顯示。常見的使用情境有三種：

- **清理空投垃圾：**過去測試過 100 個 DApp，留下一堆價值 $0.001 的雜幣。隱藏後介面更乾淨。

- **移除假代幣：**仿冒主流幣的 dust attack 代幣，藏起來避免誤點。

- **已不再使用的代幣：**例如某條已停運的 L2 上的舊治理代幣。

### 隱藏代幣的步驟

在資產列表上長按（或右鍵）目標代幣 → 選擇「隱藏代幣」→ 確認。代幣立即從清單消失，但仍可透過「設定 → 隱藏的代幣」隨時恢復。隱藏不影響：(1) 你的鏈上餘額；(2) 你日後仍可用 [WalletConnect](/blog/walletconnect-dapp-tutorial) / 自訂代幣方式重新加入。

            關鍵原則：隱藏 ≠ 安全處置

如果你收到一個明顯的釣魚代幣，**絕對不要**嘗試 transfer 或 swap 它（即使想「丟出去」也不行）。正確做法是直接「隱藏」並忽略。任何主動互動都可能觸發惡意合約呼叫，而你只是想清掉它，不要因為這個動作反而把整個錢包賠進去。

## 五、假代幣 5 種常見手法與辨識清單

假代幣（fake token / scam airdrop）是 EVM 生態系的長期問題。Etherscan 2025 統計顯示，光是以太坊主網上每天就有超過 **3,000 個新部署的詐騙代幣合約**。以下是最常見的五種手法：

| 手法 | 外觀 | 真實意圖 |
| --- | --- | --- |
| **同名仿冒** | 名稱叫 "USDC"、"USDT"，logo 也一模一樣 | 你以為收到穩定幣，誤拿去 swap 換真錢 |
| **網址型代幣名** | 名稱寫 "Visit arcsign-airdrop.io" 或 "Claim 1000 USDT at xxx.com" | 引誘你進釣魚網站簽 approve |
| **假合約 + 真授權函數** | 看起來像 ERC-20，但 transfer / approve 內含後門 | 呼叫時暗中增加授權給攻擊者 |
| **地址相似度攻擊** | 合約地址前 4 碼、後 4 碼跟主流代幣一樣 | 你只看頭尾就誤信，整個地址其實不同 |
| **Honeypot（蜜罐）代幣** | 可以 buy 但不能 sell，價格只漲不跌 | 誘你買入，沒人能賣出，合約方獨享流動性池 |

### 辨識清單：5 個必檢查的指標

1. **Etherscan「✓ Verified」勾選 + 完整原始碼公開。**未驗證的合約 95% 是詐騙。

2. **合約年齡 ≥ 30 天，且持有人數 ≥ 1,000。**剛部署 5 分鐘的代幣可信度為零。

3. **CoinGecko / CoinMarketCap 上有正式收錄。**對照官方 token 頁的合約地址。

4. **合約地址與項目官方推特、官網一致。**三個來源交叉驗證才算可信。

5. **ArcSign 預覽介面沒有跳紅色警告。**內建假代幣列表會自動過濾已知詐騙。

            永遠的鐵律

不認識的代幣 → **不 approve、不 swap、不點任何附帶連結**。如果你不確定一個代幣是否合法，預設就是詐騙，等到三天後再回來看也不遲。同類話題請參考我們的 [釣魚攻擊防範指南](/blog/phishing-attack-prevention)與 [代幣授權管理](/blog/token-approval-revoke)。

## 六、跨 6 條 EVM 鏈的代幣治理 SOP

ArcSign 同時支援 **Ethereum / BSC / Polygon / Arbitrum / Optimism / Base**，每條鏈都有各自的 token list。如果你是多鏈用戶，建議建立一份「個人代幣治理 SOP」，每月固定執行一次：

            1
            每月對帳：把鏈上資產跟介面對齊

用 ArcSign 切換到每條鏈，對照 Etherscan / BscScan 的 ERC-20 Token tab，看是否有新出現但介面沒顯示的代幣。如果有合法的，按上述流程加入；若是垃圾代幣，直接隱藏。

            2
            分組管理：核心 / 投資 / 觀察 / 隱藏

ArcSign 支援自訂分類標籤。建議把代幣分四類：(1) 核心（USDT、ETH、BTC 等長期持有）；(2) 投資（中短期波段）；(3) 觀察（測試倉、小額試水）；(4) 隱藏（垃圾代幣）。配合每月對帳一目了然。

            3
            同步自訂代幣到第二支 USB（備援）

每次新增一批自訂代幣後，記得用 ArcSign 的「匯出 .arcsign 加密備份檔」功能匯出最新狀態，存到第二支備援 USB。.arcsign 檔已經是 [AES-256](/blog/aes256-encryption-simple) 加密的，即使被他人取得也無法破解。

            4
            與授權審計搭配進行

每季同時做「token 治理」與「approval 審計」：先檢查是否有遺忘的代幣需要清理，再檢查授權是否需要撤銷。這兩件事天然搭配 — 一個遺忘的代幣很可能對應一個遺忘的授權，整理起來事半功倍。

## 七、隱私與安全進階小技巧

### 1. 多帳戶分離：以隱私為導向的代幣分配

ArcSign 支援同一個[助記詞](/blog/seed-phrase-backup-guide)下衍生多個地址。建議把代幣分配到不同帳戶：例如「主帳戶」只放長期持有的核心資產（BTC / ETH / [穩定幣](/blog/stablecoin-storage-guide)），「DeFi 操作帳戶」用來與 DApp 互動，「空投接收帳戶」專門接收測試網或新項目空投。如此一來，鏈上分析公司也較難把你的所有活動連起來。

### 2. 使用自訂 RPC 節點降低 IP 關聯

預設情況下，餘額查詢會透過 Alchemy / NodeReal 的公開 RPC。如果你重視隱私，可在 ArcSign 設定中切換到自訂 RPC（例如 Infura、QuickNode、或自架節點）。多錢包使用同一個 Alchemy Key 容易被推論出關聯，自架或第三方分流可有效降低風險。詳情可參考 [自訂 RPC 節點教學](/blog/arcsign-custom-rpc)（即將上線）。

### 3. 對 dust attack 的零互動原則

收到突然的小額轉入（特別是新 token），**不要**嘗試把它們合併到主帳戶。鏈上分析會把同一筆 tx 的輸入地址視為「同一實體」 — 你只要動一下，多個地址的關聯立刻被建立。正確做法：直接隱藏、放著不動，未來這些 dust 既不影響你的資產也不會洩漏隱私。

### 4. 善用「觀察名單」測試新代幣

如果你想追蹤一個新代幣的價格與餘額，但又不想把錢實際放進去 — 可以先把合約地址加到自訂 token list，然後在另一個 watch-only 地址觀察。Watch-only 地址沒有對應[私鑰](/blog/private-key-management-best-practices)、純粹是「看版」，完美適合做 paper-trading 與市場觀察。

            ArcSign 的核心承諾

無論你管理 5 個還是 500 個 ERC-20 代幣，ArcSign 始終遵守三件事：**(1) token list 只存 USB；(2) 所有簽名離線完成、[私鑰](/blog/private-key-management-best-practices)永不離開裝置；(3) 代幣管理免費、無 Pro 限制**。把代幣治理當成日常習慣，而不是一次性動作。

## 常見問題 FAQ

### Q：為什麼我轉了代幣到錢包，但介面卻顯示「0」？

錢包預設的代幣清單只涵蓋幾十到幾百種主流代幣（如 USDT、USDC、WBTC 等）。一條 EVM 鏈上實際存在的 ERC-20 代幣超過數百萬種，不可能全部預載。如果你轉入的是非主流代幣，鏈上其實已經到帳，只是錢包介面還沒「認識」它。手動透過合約地址新增之後，餘額就會立即顯示。ArcSign 的「新增自訂代幣」功能可在 6 條 EVM 鏈上一鍵搞定。

### Q：突然出現的免費代幣可以接受嗎？是不是空投？

這通常不是真空投，而是 dust attack 或假代幣詐騙。攻擊者把仿冒主流代幣（例如 USDC、ETH 同名假合約）空投到大量地址，目的是引誘你連到釣魚網站、同意惡意 approve 或誤把它當資產進行 swap。原則：不認識的代幣絕對不要 approve、不要 swap、不要點任何附帶連結。ArcSign 的「隱藏代幣」功能可以一鍵把這類垃圾代幣從介面移除而不影響鏈上紀錄。

### Q：用 ArcSign 自訂代幣，需要連網路嗎？私鑰會曝露嗎？

新增 / 隱藏 / 自訂代幣本身只是修改 USB 內的本地 token list，不需要任何鏈上交易、不需要簽名、私鑰完全不會被觸碰。讀取餘額時會透過 Alchemy（或 NodeReal for BSC）的 RPC 唯讀查詢，只送出公開的錢包地址。所有寫入鏈上的動作（例如 transfer、swap、revoke）才會用到私鑰，並且永遠在 USB 內透過 [XOR 三分片](/blog/xor-encryption-explained)離線重組、簽名、立即清零，曝露窗口僅 1-5 毫秒。

### Q：ArcSign 代幣管理跟 MetaMask、Trust Wallet 的差別在哪裡？

三者都允許自訂代幣，但安全模型不同：MetaMask / Trust Wallet 是熱錢包，私鑰存在你常上網的裝置上，任何代幣管理只要 PC 被入侵都可能被連根拔起。ArcSign 是 USB [冷錢包](/blog/what-is-cold-storage)，代幣清單與私鑰都儲存在 USB 內、無網際網路時也能離線管理；簽名一律離線完成，私鑰永不離開裝置。此外 ArcSign 內建 6 條 EVM 鏈（含 BSC）的官方代幣清單，並對假合約自動標註警告 — 這是熱錢包通常缺乏的安全層。
