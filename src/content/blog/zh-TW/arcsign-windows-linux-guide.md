---
title: "ArcSign 安裝全攻略：Windows / macOS / Linux"
description: "完整的 ArcSign USB 冷錢包跨平台安裝教學：Windows 10+、macOS 12+、Linux（AppImage / deb / rpm）。包含系統需求、SmartScreen 與 Gatekeeper 處理、Alchemy API 設定、常見問題排解。免費下載。"
pubDate: 2026-04-20
locale: zh-TW
tags: ["產品教學"]
author: "ArcSign Security Team"
heroImage: "/blog/images/arcsign-windows-linux-guide-hero.png"
relatedSlugs: ["arcsign-windows-macos-setup", "arcsign-troubleshooting", "defi-beginner-guide-2026"]
---

## 為什麼「跨平台」對冷錢包特別重要？

一般熱錢包可以在任何裝置上從雲端還原，但[冷錢包](/blog/what-is-cold-storage)不一樣——它的核心安全承諾是**「[私鑰](/blog/private-key-management-best-practices)永不離開 USB」**。這意味著你未來每次要簽名交易、匯出報稅紀錄、或升級硬體時，都必須在一台能執行 ArcSign 的電腦上完成。如果 ArcSign 只支援某一個作業系統，你就變相被綁死在那個生態；當你換筆電、公司電腦用 Linux、或家裡的桌機是 Windows 時，就會卡住。

這也是為什麼 ArcSign 從 v1.2 開始正式把 **Windows、macOS、Linux** 三個平台都納入一級支援。三個版本使用同一份 Go 核心函式庫與 Tauri 桌面框架，所以不管你用哪個系統，[XOR 三分片](/blog/xor-encryption-explained)、[AES-256](/blog/aes256-encryption-simple) 加密備份、[mlock](/blog/mlock-memory-protection) 記憶體保護這些安全機制都完全一致。本文會帶你把三個平台的安裝流程從下載到第一次簽名一次走完。

> **三平台共用事實**
>
> ArcSign 是**免費軟體**（已採 Apache 2.0 全開源），不收取任何訂閱費。`.arcsign` 備份檔**匯出即為 [AES-256](/blog/aes256-encryption-simple) 加密**，無需額外設定密碼步驟。[私鑰](/blog/private-key-management-best-practices)從不以完整形式存在於任何單一位置，簽名時的曝露窗口控制在 **1–5 毫秒**。

## 系統需求總覽：三平台一次看完

ArcSign 的硬體需求很低，幾乎所有近年的筆電與桌機都能跑。以下是三個作業系統的官方最低需求：

| 需求項目 | Windows | macOS | Linux |
| --- | --- | --- | --- |
| **作業系統版本** | Windows 10 x64 或更新 | macOS 12 Monterey 或更新 | Ubuntu 20.04+ / Debian 11+ / Fedora 37+ 或支援 AppImage 的發行版 |
| **CPU** | Intel / AMD x64 | Intel x64 + Apple Silicon (arm64) | x86_64 |
| **記憶體** | 至少 4 GB | 至少 4 GB | 至少 2 GB（純桌面環境） |
| **磁碟空間** | ~ 200 MB | ~ 200 MB | ~ 180 MB |
| **USB 連接埠** | USB 2.0 以上 | USB 2.0 以上（Type-C 機型請自備轉接） | USB 2.0 以上 |
| **網路** | Provider 查詢用（可離線簽名） | 同左 | 同左 |

整個 ArcSign 應用本體 **不超過 200 MB**，比大多數硬體錢包配套軟體輕量。因為所有敏感資料都只保存在你插入的 USB 隨身碟，本機硬碟不會留下任何私鑰檔案。

## 下載與雜湊驗證：安裝前的安全守則

[冷錢包](/blog/what-is-cold-storage)的最大敵人是**假安裝包**。你如果從假網站下載了被植入木馬的 ArcSign，再好的加密機制都救不了你。所以安裝前請做兩件事：

**1. 只從 arcsign.io 下載**

打開瀏覽器，手動輸入 arcsign.io，不要點搜尋結果中的廣告連結。下載頁面會根據你的作業系統自動顯示對應檔案：Windows 是 ArcSign-Setup-x.y.z.exe，macOS 是 ArcSign-x.y.z.dmg，Linux 是 ArcSign-x.y.z.AppImage（另有 deb/rpm 供進階用戶）。所有檔案都託管在 Cloudflare R2（github.com/arcsignio/arcsign/releases），且強制 HTTPS。

**2. 驗證 SHA-256 雜湊值**

下載頁面每個檔案旁都會顯示 SHA-256 雜湊。下載完成後在終端機/PowerShell 裡跑一次雜湊比對：

```
# Windows PowerShell
Get-FileHash .\ArcSign-Setup-1.2.3.exe -Algorithm SHA256

# macOS / Linux
shasum -a 256 ArcSign-1.2.3.dmg
sha256sum ArcSign-1.2.3.AppImage
```

輸出的字串必須和網站上顯示的完全一致。不一致代表檔案損壞或被竄改，立刻刪除重下。

> **⚠️ 常見釣魚手法**
>
> 攻擊者會註冊 arc-sign.io、arcsign.download、arcsign-wallet.io 之類的相似域名。請把官方網址加入書籤，未來都只從書籤進入。更多辨識技巧請見 [釣魚攻擊防範指南](/blog/phishing-attack-prevention)。

## Windows 安裝：處理 SmartScreen 與防毒誤報

Windows 安裝流程最簡單，但因為 ArcSign 屬於新發行者，第一次執行會遇到 SmartScreen 警告。這是正常的，並不代表有惡意軟體。

**1. 執行 Setup 安裝檔**

雙擊 ArcSign-Setup-x.y.z.exe。如果 Windows Defender SmartScreen 跳出「Windows 已保護您的電腦」藍色視窗，點擊「更多資訊」（More info），再點「仍要執行」（Run anyway）。ArcSign 的 Windows 版使用 EV 程式碼簽章，下載次數累積後 SmartScreen 信任分數會自動提升，警告就會消失。

**2. 選擇安裝位置**

建議使用預設的 C:\Program Files\ArcSign\。安裝器會自動建立桌面捷徑與開始功能表項目。整個安裝過程約 30 秒，不需要重開機。

**3. 處理防毒軟體誤報**

部分第三方防毒（如 Avast、Kaspersky、Bitdefender）可能把 ArcSign 標記為「未知應用」並隔離。這是因為 ArcSign 會呼叫 USB 裝置與 [mlock](/blog/mlock-memory-protection) 記憶體保護——這些行為對防毒軟體來說看起來像「可疑」。請手動把 ArcSign 安裝目錄加入白名單。

安裝完成後從開始功能表啟動 ArcSign。首次執行時作業系統可能會要求授權存取 USB 裝置，請允許。接下來就可以進入首次啟動設定（見後文）。

## macOS 安裝：Intel、Apple Silicon 與 Gatekeeper

ArcSign 的 macOS 版是一個**通用（Universal Binary）**，同時包含 Intel x64 與 Apple Silicon (arm64) 原生指令，不用擔心選錯版本。M1/M2/M3/M4 Mac 會自動跑 arm64，舊 Intel Mac 則跑 x64，效能都是原生級。

**1. 掛載 DMG 並拖進 Applications**

雙擊下載的 ArcSign-x.y.z.dmg，會看到一個掛載視窗，裡面有 ArcSign 圖示與「Applications」資料夾捷徑。把 ArcSign 拖到 Applications 資料夾即可完成複製。

**2. 處理 Gatekeeper 警告**

第一次啟動時 macOS 可能顯示「無法開啟 ArcSign，因為它來自未識別的開發者」。請打開**系統設定 → 隱私與安全性**，向下滾動到「安全性」區塊，會看到「已封鎖 ArcSign」訊息，點擊旁邊的**「仍要打開」**按鈕。之後所有啟動都會直接執行，不會再被擋。

**3. 授權 USB 與輸入監控**

macOS 12 以上對 USB 存取有嚴格控管。第一次插入 USB 並執行 ArcSign 時，系統會跳出權限詢問視窗，請點「允許」。若不慎按了「拒絕」，可到**系統設定 → 隱私與安全性 → 可卸除式磁碟區**手動開啟 ArcSign 權限。

> **Apple Silicon 用戶的小提示**
>
> M 系列 Mac 沒有傳統 USB-A 連接埠，請準備 USB-A 轉 USB-C 轉接頭或支援 USB-C 的隨身碟。ArcSign 對 USB 介面沒有特殊要求，只要作業系統能識別即可。

## Linux 安裝：AppImage、deb 與 rpm 三選一

Linux 版提供三種包裝格式，給不同發行版與使用習慣的用戶。最推薦新手使用 **AppImage**——單一檔案、不需要 root 權限、可攜、不會污染系統。

### 選項 A：AppImage（推薦大多數人）

**1. 下載與賦予執行權限**

下載 ArcSign-x.y.z.AppImage。在檔案管理器右鍵「屬性 → 權限 → 允許以程式執行」，或在終端機執行：

```
chmod +x ArcSign-1.2.3.AppImage
./ArcSign-1.2.3.AppImage
```

**2. 整合到應用程式選單（可選）**

第一次執行時 AppImage 會詢問是否要註冊到系統。選「Yes」會自動建立 .desktop 檔，日後可從啟動器搜尋「ArcSign」開啟。若要手動整合，使用 AppImageLauncher 工具更方便。

### 選項 B：Debian / Ubuntu（.deb）

```
sudo dpkg -i arcsign_1.2.3_amd64.deb
# 若缺套件：
sudo apt --fix-broken install
```

安裝完成後可用 arcsign 指令啟動，或從應用程式選單開啟。.deb 版會自動建立 udev 規則，讓 ArcSign 不需 sudo 就能存取 USB 裝置。

### 選項 C：Fedora / RHEL / openSUSE（.rpm）

```
sudo rpm -ivh arcsign-1.2.3-1.x86_64.rpm
# 或使用 dnf
sudo dnf install ./arcsign-1.2.3-1.x86_64.rpm
```

> **USB 權限提醒**
>
> 如果使用 AppImage 且系統無 udev 規則，可能需要把自己加到 plugdev 群組：sudo usermod -aG plugdev $USER，登出重登後即可免 sudo 存取 USB。deb 與 rpm 版會在安裝時自動處理這一步。
>
> 三種方式安裝後的 ArcSign 行為完全相同。效能差異來自系統本身，而不是包裝格式。

## 首次啟動：建立錢包，餘額開箱即用

從 v1.5.0 起，**代幣餘額不需要任何 API key**。ArcSign 走內建的公共 RPC + Multicall3 路徑讀取全部 7 條 EVM 鏈的餘額，搭配 DefiLlama 的免費價格——開箱即用、零設定。你只需要插上 USB、建立或匯入錢包，餘額就會顯示。

**1. 建立或匯入錢包**

插入你的 USB 隨身碟，選擇「建立新錢包」（會生成 12 字[助記詞](/blog/seed-phrase-backup-guide)）或「匯入 .arcsign 備份檔」。新手完整設定流程請見 [10 分鐘新手入門教學](/blog/arcsign-beginner-setup-guide)。

**2. （選用）為 NFT 與交易歷史設定 API key**

餘額免 key，但 **NFT 圖庫與交易歷史**仍需要第三方索引器（那是「列出你持有哪些東西」的全鏈掃描，公共 RPC 做不到）。需要這兩個功能時，到設定 → Providers 填入免費的 Alchemy key（Ethereum、Polygon、Arbitrum、Optimism、Base）與 NodeReal key（BSC）。Avalanche 的 NFT 與交易歷史走 Glacier，**不需要 key**。缺 key 時介面會明確標示「此功能需要 key」，而不是默默顯示空白。

## 跨平台疑難排解速查表

不同作業系統遇到的坑不太一樣，這是最常見的六類問題對應解法：

| 問題 | 可能原因 | 解法 |
| --- | --- | --- |
| USB 插了沒反應 | 權限、USB 埠故障、裝置未格式化 | 換 USB 埠；Linux 加入 plugdev 群組；macOS 到「隱私與安全性 → 可卸除式磁碟區」授權 |
| Windows 無法啟動（跳錯誤碼） | 防毒隔離、缺 VC++ Runtime | 把 ArcSign 加入防毒白名單；從 Microsoft 下載 VC++ 2019 Redistributable |
| macOS「檔案損毀」警告 | Gatekeeper 隔離屬性 | xattr -d com.apple.quarantine /Applications/ArcSign.app |
| Linux AppImage 無法執行 | 缺 libfuse2（Ubuntu 22+） | sudo apt install libfuse2 或改用 AppImageLauncher |
| 餘額顯示為 0 或載入失敗 | 公共 RPC 端點暫時失效；或代幣不在內建清單也沒被手動匯入 | 稍候重試（節點池會自動切換備援）；用「匯入代幣」加入合約地址 |
| NFT 或交易歷史空白 | 該功能需要的 API key 未設定 | 到 Settings → Providers 填入 Alchemy（5 條鏈）/ NodeReal（BSC）key；Avalanche 走 Glacier 免 key |
| WalletConnect 連不上 | 防火牆阻擋或 DApp 使用 v1 協議 | 檢查防火牆是否阻擋 443；確認 DApp 支援 WalletConnect v2 |

如果上述方法都無法解決，請看[完整疑難排解指南](/blog/arcsign-troubleshooting)，或在 Discord 社區發問，團隊通常在 24 小時內回覆。

## 三平台體驗比較

所有安全機制三平台一致，體驗差異主要來自作業系統本身：

| 比較項目 | Windows | macOS | Linux |
| --- | --- | --- | --- |
| 安裝難度 | ★☆☆（最容易） | ★☆☆（最容易） | ★★☆（AppImage 簡單，deb/rpm 進階） |
| 初次啟動障礙 | SmartScreen 警告 | Gatekeeper + 隱私授權 | 執行權限、udev 規則 |
| USB 熱插拔 | 即時 | 即時 | 即時（需 udev） |
| mlock 記憶體保護 | 原生支援 | 原生支援 | 原生支援（最嚴格） |
| 自動更新（OTA） | 支援 | 支援 | 需手動重下（AppImage 可用 AppImageUpdate） |
| 程式碼簽章 | EV Code Signing | Apple Notarized | GPG 簽章 + SHA-256 |
| 系統整合度 | 優 | 優 | 良（依桌面環境） |
| 隱私與可審查性 | 中等 | 中等 | 最高（可執行於完全離線主機） |

對一般用戶來說，**Windows 或 macOS** 是最省事的選擇。對隱私極客或 DeFi 重度用戶來說，**Linux** 可以搭配一台完全離線的副機變成真正的「冷簽名主機」—把網路孔拔掉，只用這台機器簽交易，連潛在的作業系統層級攻擊面都消除。

## 常見問題 FAQ

### Q：我原本在 Windows 用 ArcSign，換到 Mac 或 Linux，資料會不見嗎？

不會。ArcSign 的所有錢包資料、歷史紀錄、設定都存在你的 USB 隨身碟裡（以 XOR 三分片 + AES-256 加密保存），跟作業系統無關。只要把同一支 USB 插到新電腦上，ArcSign 就會自動辨識並顯示你的所有錢包。若換裝置時遺失 USB，也可用 12 字助記詞或 .arcsign 備份檔還原。

### Q：我同時在兩台電腦（Windows + Mac）安裝，可以共用同一支 USB 嗎？

可以，而且完全推薦。同一支 USB 在三個作業系統上都能用。許多用戶會在家用 Mac、公司用 Windows、旅行時帶 Linux 筆電，始終只用同一支 ArcSign USB。資料一致性由裝置本身保證，不需要雲端同步。

### Q：Linux 版真的跟 Windows / macOS 一樣安全嗎？

是的，甚至略有優勢。三個平台共用同一份 Go 核心函式庫，所以 XOR 三分片、AES-256 備份、mlock 保護的實作完全相同。Linux 額外的優勢是 mlock 行為最嚴格、較少閉源背景服務，且可以輕易設定成完全離線的簽名主機。缺點是缺乏 GUI 安裝器、OTA 自動更新需要額外工具。

### Q：看餘額需要 Alchemy API Key 嗎？

不需要。從 v1.5.0 起，**全部 7 條 EVM 鏈的代幣餘額都不需要任何 API key**——ArcSign 走內建的公共 RPC + Multicall3 讀取餘額，價格由 DefiLlama 免費提供。技術拆解見 [免 key 餘額是怎麼做到的](/blog/keyless-balance-multicall)。

API key 現在只剩 **NFT 圖庫與交易歷史**需要，因為那兩個功能要做全鏈索引（「列出你持有哪些東西」），公共 RPC 做不到。Ethereum / Polygon / Arbitrum / Optimism / Base 用 Alchemy、BSC 用 NodeReal；Avalanche 走 Glacier 免 key。這些 key 只在本機使用，不會回傳給我們。
