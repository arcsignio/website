---
title: "ArcSign 常見問題排解：USB 偵測、連線、簽名完整指南"
description: "ArcSign 疑難排解完整指南：從 USB 偵測失敗、Alchemy Provider 連線錯誤到 WalletConnect 簽名卡住，一次解決 15+ 個常見問題，含 Windows、macOS、Linux 三平台專屬解決方案完整整理。"
pubDate: 2026-04-07
locale: zh-TW
tags: ["產品教學"]
author: "ArcSign Security Team"
heroImage: "/blog/images/arcsign-troubleshooting-hero.png"
relatedSlugs: ["how-to-revoke-token-approvals", "eth-staking-arcsign", "usb-cold-wallet-benefits"]
---

## 先搞懂：ArcSign 的三層架構與問題定位

ArcSign 是一個 USB [冷錢包](/blog/what-is-cold-storage)桌面應用，它的架構分成三層：**Tauri 前端（React UI）→ FFI → Go 共享程式庫（處理金鑰、簽名）**。每一層都有可能出問題，但幸運的是，問題類型幾乎可以從現象快速定位。

在開始排解之前，請先問自己三個問題：**(1)** 我的 USB 有被 ArcSign 偵測到嗎？ **(2)** 錢包頁面能顯示餘額嗎？ **(3)** 我能成功送出一筆交易嗎？這三個問題分別對應三條「故障線」，本文會一條一條帶你排解。

> **ArcSign 是免費軟體**
>
> 排解問題之前，請先確認你下載的是 **官方版本**。ArcSign 是完全免費的軟體，所有合法下載來源都是 `arcsign.io` 或 `github.com/arcsignio/arcsign/releases`。若你從其他網站下載到要求付費才能解鎖基本功能的版本，那幾乎可以確定是偽造的。

## 問題 1：USB 偵測失敗（最常見）

根據 ArcSign 社群回報，約有 **40% 的新用戶問題**來自 USB 偵測失敗。症狀通常是：開啟 ArcSign 後主畫面停在「請插入 USB 裝置」，即使 USB 明明已經插上了。原因通常是以下幾個，依發生機率排序。

### 原因 A：USB 格式不支援

ArcSign 目前支援 **FAT32** 和 **exFAT** 兩種格式。Windows 的預設 NTFS 格式目前暫未支援，這是為了確保跨平台（Windows / macOS / Linux）讀寫一致性。如果你的 USB 是 NTFS，需要先備份裡面資料再重新格式化為 exFAT（推薦 64GB 以下選 FAT32，以上選 exFAT）。

> **重要提醒**
>
> 格式化會清空 USB！請先把 USB 上的資料複製到其他位置。如果這支 USB 已經有 ArcSign 錢包資料，**不要格式化**，而是應該先匯出 `.arcsign` 備份檔到電腦，格式化後再匯入。

### 原因 B：USB 沒有插到底或線材問題

聽起來很基本，但這是最常被忽略的原因。USB-A 接頭有時要用點力才會到底，USB-C 線材有些是「充電專用」、不支援資料傳輸。解法：換一個 USB 孔，或換一條已知能傳輸檔案的線材。若你使用 USB Hub，請嘗試直接插到電腦主板上的 USB 孔。

### 原因 C：系統權限沒開

ArcSign 需要直接讀寫 USB 儲存區塊，這在不同作業系統上需要不同層級的權限：

**1. macOS：完整磁碟存取權**

打開「系統設定」→「隱私權與安全性」→「完整磁碟存取權」，點選左下角的「+」號，把 ArcSign.app 加入清單並開啟開關。加入後需要完全關閉 ArcSign 再重新開啟（不是只關視窗）。若是在 M 系列 Mac 上第一次執行，也要到「安全性」頁面點選「仍要打開」。

**2. Windows：以系統管理員身分執行**

對 ArcSign 的捷徑按右鍵 →「以系統管理員身分執行」。若你希望每次自動用管理員權限，可以到屬性 → 相容性 →「以系統管理員身分執行此程式」打勾。另外請確認 Windows Defender 或其他防毒軟體沒有把 ArcSign 判定為可疑程式並阻擋它讀取 USB。

**3. Linux：加入 plugdev / disk 群組**

在終端機執行 `sudo usermod -aG plugdev,disk $USER`，登出後重新登入即可。若你的發行版使用 systemd，也可以建立 udev rule 讓 ArcSign 獲得對應 USB 的存取權。Arch/Manjaro 用戶請額外確認 `udisks2` 已安裝。

### 原因 D：USB 分割表損壞

較少見但可能發生，尤其是在熱插拔頻繁的情況。症狀是 ArcSign 偵測到裝置但讀取失敗。解法：到設定 →「診斷」→「重新掃描 USB」；若仍無效，請把 `.arcsign` 備份檔匯入到另一支健康的 USB。

## 問題 2：餘額為 0、代幣讀不到

ArcSign 的 USB 本身只儲存金鑰，**餘額與代幣清單都是從公開區塊鏈即時讀取的**。從 v1.5.0 起，餘額讀取走內建的公共 RPC + Multicall3 路徑，**全部 7 條 EVM 鏈都不需要任何 API key**，價格由 DefiLlama 免費提供。所以餘額顯示 0 通常不是「沒設 key」，而是下面幾個原因。

### 解法 A：稍候重試（公共節點暫時失效）

公共 RPC 端點偶爾會限速或短暫下線。ArcSign 每條鏈內建一組「主要 + 備援」端點會自動切換，但若全部暫時不可用，餘額可能讀不到。下拉重新整理、或稍等幾秒再試通常就會恢復。

### 解法 B：手動匯入不在清單裡的代幣

ArcSign 內建一份各鏈常見代幣清單；你 swap 換來或手動匯入的代幣也會被記住。如果某個代幣餘額沒顯示——通常是新發行、冷門、或還沒被你接觸過的代幣——到錢包頁 → 代幣清單下方的「匯入代幣」→ 貼上合約地址。ArcSign 會直接用 RPC 呼叫 `balanceOf` 取得餘額，不依賴任何索引服務，也不需要 key。

### NFT 或交易歷史空白？這個才需要 key

要注意把**餘額**和 **NFT / 交易歷史**分清楚：餘額免 key，但 NFT 圖庫與交易歷史需要第三方索引器（那是「列出你持有哪些東西」的全鏈掃描，公共 RPC 做不到）。到設定 → Provider & Indexer，填入免費的 Alchemy key（Ethereum、Polygon、Arbitrum、Optimism、Base）與 NodeReal key（BSC）。**Avalanche 的 NFT 與交易歷史走 Glacier，不需要 key。** 缺 key 時介面會明確標示「此功能需要 key」，而不是默默顯示空白。

## 問題 3：WalletConnect 連不上、DApp 無反應

ArcSign 原生支援 **[WalletConnect](/blog/walletconnect-dapp-tutorial)-dapp-tutorial.html" style="color:var(--primary);">WalletConnect v2**，讓你在[冷儲存](/blog/what-is-cold-storage)的安全環境下仍能與 DEX、NFT 市場、DeFi 協議互動。但 WalletConnect 的連線流程涉及 QR code、WebSocket Relay 和 Session 管理，問題點很多。

### 症狀 A：掃了 QR code 但 DApp 沒反應

最常見原因是 **QR code 過期**。WalletConnect 的 pairing URI 通常只在 5 分鐘內有效。解法：到 DApp 點「Disconnect」後重新產生新的 QR code，在 ArcSign 的 WalletConnect 分頁清空暫存後重新掃描。

### 症狀 B：連上了但簽名按鈕沒反應

代表 Session 存在但訊息沒傳到。通常是以下其中之一：

| 可能原因 | 檢查方式 | 解法 |
| --- | --- | --- |
| Relay 被防火牆封鎖 | 瀏覽 `relay.walletconnect.com` | 切換網路或關閉 VPN |
| 多個 Session 衝突 | ArcSign 的「已連線 DApp」清單 | 移除所有舊 Session 重連 |
| DApp 使用舊版 WC v1 | DApp 的 WalletConnect 版本標示 | ArcSign 僅支援 v2，請聯繫 DApp |
| 鏈 ID 不匹配 | ArcSign 當前選中的鏈 | 切換到 DApp 要求的鏈 |

### 症狀 C：連線不久就自動斷開

通常與 Session 過期時間或網路不穩有關。ArcSign 的 WalletConnect Session 預設有效時間為 7 天，之後會自動要求重新認證。如果你頻繁遇到斷線，可到設定 → WalletConnect → 延長 Session 壽命，或固定每日重新配對一次。

## 問題 4：簽名卡住或交易送不出去

簽名是 ArcSign 最關鍵的流程。從你按下「確認」到交易廣播出去，背後會發生這些事：

**讀取 USB 上的三個 XOR 分片 → [mlock](/blog/mlock-memory-protection) 鎖定記憶體頁 → XOR 還原[私鑰](/blog/private-key-management-best-practices) → 簽名 → 覆寫記憶體並釋放 → 透過 RPC 廣播**。整個金鑰曝露窗口只有 1-5 毫秒。若卡住，八成是 USB I/O 或 RPC 連線出問題。

### 症狀 A：停在「正在簽名…」超過 10 秒

絕大多數是 USB 讀取變慢。可能原因：(1) USB 被其他程式掃描（防毒、Spotlight）；(2) USB 快壞了；(3) USB Hub 供電不足。解法：暫停背景掃描、換孔直插、若仍無效，從 `.arcsign` 備份檔恢復到另一支 USB。

### 症狀 B：簽名成功但交易一直 Pending

這不是 ArcSign 的問題，而是**鏈上 Gas 或 Nonce**問題。檢查：

**1. Gas 太低**

到區塊鏈瀏覽器（Etherscan、BscScan）看當前的 Gas 行情。若你送出的 Gas 明顯低於當前，交易會卡很久。解法：在 ArcSign 點「加速交易」，會用相同 nonce、更高 gas 重送；或乾脆取消並重送。

**2. Nonce 錯誤**

如果你在同一個地址同時從多個錢包送交易，可能會產生 nonce 衝突。ArcSign 預設會自動抓取鏈上最新 nonce，但你也可以在「進階」選項手動指定。若遇到 nonce 錯誤，先在區塊鏈瀏覽器確認地址的 pending 交易，再調整。

### 症狀 C：DEX Swap 一直失敗

ArcSign 內建 [DEX Swap](/blog/how-to-dex-swap-arcsign) 整合了 OpenOcean 和 KyberSwap 兩大聚合器。如果 Swap 一直失敗，通常是 Slippage（滑點容忍度）設太低。解法：到 Swap 頁面 → 設定 →「滑點容忍度」→ 調高至 1% 或 2%（低流動性代幣可能需要 3-5%）。另外也要確認你有足夠的原生代幣支付 Gas。

## 問題 5：.arcsign 備份匯入失敗

ArcSign 的招牌功能之一是 `.arcsign` 加密備份檔：匯出即為 [AES-256](/blog/aes256-encryption-simple)-GCM 加密，不需要額外設定密碼（你的錢包密碼就是備份密碼）。匯入失敗通常有三種情況：

### 情況 A：密碼錯誤

最常見。密碼是**大小寫敏感**的，且必須是你匯出備份時的「錢包主密碼」，不是系統登入密碼。ArcSign 使用 **Argon2id** 進行金鑰衍生，錯誤密碼不會漏任何資訊，你只會看到「解密失敗」訊息。重試時請特別留意鍵盤輸入法和 Caps Lock。

### 情況 B：檔案損毀

若備份檔在傳輸過程中被截斷或修改（例如透過不穩定的雲端同步），匯入會失敗。ArcSign 會驗證檔案的 GCM Tag，任何 1 bit 的變動都會被偵測到。解法：重新下載或複製原始備份檔；如果還有其他備份副本，優先使用離線存放的那份。

### 情況 C：版本不相容

舊版 ArcSign 匯出的備份檔在新版一定能匯入（向後相容），但反過來不行。如果你在 v1.2 匯出備份，要匯入到 v1.0，那會失敗。解法：把你當前 ArcSign 升級到最新版（`github.com/arcsignio/arcsign/releases` 下載），再匯入。

> **最佳備份實踐**
>
> 建議至少保留 **兩份**獨立備份：一份放在第二支 USB 離線保存，另一份可以放在加密雲端硬碟（由於 `.arcsign` 本身已是 AES-256 加密，雲端儲存並不會降低安全性）。同時也保留 12 字助記詞紙本備份作為最終救援手段。

## 平台專屬解法：Windows / macOS / Linux

### macOS 常見問題

**「ArcSign 無法開啟，因為無法驗證開發者」：**到「系統設定」→「隱私權與安全性」→ 找到 ArcSign 的警告訊息 → 點「仍要打開」。若你在 Apple Silicon Mac，可能還需要在終端機執行 `xattr -cr /Applications/ArcSign.app` 清除隔離屬性。

**Rosetta 問題：**ArcSign 提供 Universal Binary（同時支援 Intel 和 Apple Silicon），不需要 Rosetta。若你在活動監視器看到「Kind: Apple」代表原生執行，若顯示「Intel」請重新下載 Universal 版本。

### Windows 常見問題

**SmartScreen 警告：**ArcSign 尚未購買 Windows 程式碼簽章憑證（計畫用戶破萬後取得），首次執行時 SmartScreen 會顯示警告。點「更多資訊」→「仍要執行」即可。你也可以到「Windows 安全中心」→「App 與瀏覽器控制」暫時放寬設定。

**防毒軟體誤判：**某些防毒軟體（尤其是國產的）會把未簽章的執行檔誤判為威脅。解法：把 ArcSign 安裝目錄加入白名單。ArcSign 是開源專案（已 Apache 2.0 開源），日後會有完整的建置可重現性驗證，屆時誤判問題會大幅減少。

### Linux 常見問題

**缺少 AppImage 相依套件：**若你的發行版沒有 FUSE，AppImage 會無法執行。解法：`sudo apt install libfuse2`（Debian/Ubuntu）或 `sudo pacman -S fuse2`（Arch）。

**Wayland 下字型模糊：**部分 Wayland 合成器對 Tauri 的 HiDPI 偵測有問題。臨時解法：設定環境變數 `GDK_SCALE=2` 再啟動 ArcSign。

## 快速診斷對照表

收藏這張表格，遇到問題時可以快速對照症狀找到解法。

| 症狀 | 最可能原因 | 第一步嘗試 |
| --- | --- | --- |
| USB 完全沒被偵測 | 格式/權限 | 檢查是否 FAT32/exFAT |
| 偵測到但讀不到錢包 | 分割表或權限 | 重新掃描 USB |
| 餘額為 0 | 公共節點暫時失效，或代幣未匯入 | 重新整理；用「匯入代幣」加合約地址（免 key） |
| NFT / 交易歷史空白 | 該功能的 key 未設定 | 填入 Alchemy（5 鏈）/ NodeReal（BSC）key；Avalanche 免 key |
| WalletConnect 掃不到 | QR 過期 | DApp 重新生成 |
| WalletConnect 斷線 | Relay 被擋 | 切換網路/關 VPN |
| 簽名卡住 | USB I/O 慢 | 暫停防毒掃描 |
| 交易 Pending 太久 | Gas 太低 | 加速交易 |
| DEX Swap 失敗 | 滑點太低 | 調至 1-2% |
| 備份匯入失敗 | 密碼錯誤 | 檢查 Caps Lock |

> **仍然解決不了？**
>
> 如果你嘗試了以上所有方法仍然無法解決，請到 ArcSign 的設定 →「診斷」→「匯出日誌」產生一份包含系統資訊和最近錯誤的檔案（不含私鑰），然後到 `arcsign.io/support` 提交工單。附上日誌檔可大幅加快排查速度。

## 常見問題 FAQ

### Q：ArcSign 偵測不到我的 USB 裝置怎麼辦？

依序檢查：(1) USB 實際插到底、換一個孔或換一條線；(2) USB 必須是 FAT32 或 exFAT 格式（NTFS 目前不支援）；(3) macOS 到系統設定 → 隱私權與安全性 → 完整磁碟存取權，把 ArcSign 加入授權清單；(4) Windows 以系統管理員身分執行 ArcSign；(5) Linux 確認用戶在 plugdev 或 disk 群組。若仍無效，到設定 → 診斷，點選「重新掃描 USB」。

### Q：為什麼我的餘額一直顯示為 0 或讀不到代幣？

從 v1.5.0 起，餘額**不需要任何 API key**——全 7 條 EVM 鏈走公共 RPC + Multicall3 讀取，價格由 DefiLlama 免費提供。所以餘額為 0 通常是這幾個原因：(1) 公共節點暫時失效，下拉重新整理或稍候重試即可；(2) 該代幣不在內建常見清單、也還沒被你接觸過——到代幣清單下方的「匯入代幣」貼上合約地址即可（同樣免 key）。

如果是 **NFT 圖庫或交易歷史**空白，那才需要 key：到設定 → Provider & Indexer 填入 Alchemy（Ethereum、Polygon、Arbitrum、Optimism、Base）與 NodeReal（BSC）的免費 key。Avalanche 的 NFT 與交易歷史走 Glacier，不需要 key。

### Q：WalletConnect 掃了 QR code 之後 DApp 沒有反應？

多數 WalletConnect 問題來自過期的 Session。解法：(1) 在 DApp 端點「Disconnect」後重新產生新的 QR code；(2) 在 ArcSign 的「已連線 DApp」清單中移除該 DApp 的舊 session；(3) 確認你電腦的防火牆沒有封鎖 WalletConnect Relay（`relay.walletconnect.com`）；(4) 切換到手機熱點測試，排除企業內網或 VPN 造成的 WebSocket 連線干擾。

### Q：為什麼我的簽名一直卡在「正在簽名…」？

簽名流程需要讀取 USB 上的三個 XOR 分片、mlock 鎖定記憶體、執行 XOR 還原、再簽名。若卡住超過 10 秒，通常代表 USB I/O 出問題。解法：(1) 不要在簽名途中拔掉 USB；(2) 重新插上 USB 並重試；(3) 若 USB 有其他程式正在讀取（例如防毒軟體掃描），暫停該程式；(4) 檢查 USB 健康狀態（macOS：磁碟工具程式的急救；Windows：chkdsk）。若問題持續，請從 `.arcsign` 備份檔恢復到另一支 USB。
