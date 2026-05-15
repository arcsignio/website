---
title: "ArcSign 跨平台安裝教學：Windows / macOS"
description: "完整的 ArcSign 安裝教學，涵蓋 Windows 10+ 與 macOS 12+ 兩個平台。了解系統需求、逐步安裝指南、Alchemy API 金鑰設定，以及常見問題排解。ArcSign 是免費的 USB 冷錢包，採用 XOR 三分片金鑰保護與 AES-256 加密備份。"
pubDate: 2026-03-29
locale: zh-TW
tags: ["產品教學"]
author: "ArcSign Security Team"
heroImage: "/blog/images/arcsign-windows-macos-setup-hero.png"
relatedSlugs: ["ledger-vs-trezor-vs-arcsign", "multi-chain-management", "web3-wallet-future"]
---

歡迎使用 **ArcSign**，你的私密的 USB [冷錢包](/blog/what-is-cold-storage)解決方案。無論你使用 Windows 或 macOS，安裝 ArcSign 只需要幾分鐘。本教學將帶領你逐步完成安裝過程，包括系統需求、平台特定的安裝步驟、初始設定，以及常見問題的解決方案。

            💡 ArcSign 特色

ArcSign 是免費的 USB [冷錢包](/blog/what-is-cold-storage)，採用 **[XOR 三分片](/blog/xor-encryption-explained)金鑰保護**，確保你的[私鑰](/blog/private-key-management-best-practices)永遠不會離開裝置。支援 22 條區塊鏈、內建 [DEX Swap](/blog/how-to-dex-swap-arcsign)、[WalletConnect](/blog/walletconnect-dapp-tutorial) v2 簽名，以及 [AES-256](/blog/aes256-encryption-simple) 加密備份。

## 系統需求

在安裝 ArcSign 之前，請確保你的電腦符合以下最低需求：

                ✓

                    Windows

- Windows 10 或更高版本

- USB 2.0 以上連接埠

- 至少 200MB 磁碟空間

- .NET Framework 4.7.2+（通常已預裝）

                ✓

                    macOS

- macOS 12 Monterey 或更高版本

- USB 2.0 以上連接埠

- 至少 200MB 磁碟空間

- 支援 Intel 和 Apple Silicon (M1/M2/M3) 晶片

## Windows 安裝教學

按照以下步驟在 Windows 上安裝 ArcSign：

                1

                    下載 ArcSign 安裝程式

造訪 `https://dl.arcsign.io` 並下載最新版本的 Windows 安裝程式（.exe 檔案）。

                2

                    執行安裝程式

找到已下載的 .exe 檔案，雙擊開啟。如果看到 **Windows SmartScreen** 警告，這是正常的。

                3

                    通過 SmartScreen 警告

點擊 **「更多資訊」**（More info），然後點擊 **「仍然執行」**（Run anyway）。ArcSign 已經過 Microsoft 數位簽名驗證，SmartScreen 只是因為識別不出該應用程式而顯示警告。

                4

                    完成安裝

按照安裝嚮導的提示選擇安裝位置（預設為 C:\Program Files\ArcSign）。點擊 **「安裝」**，等待安裝完成。

                5

                    首次啟動

安裝完成後，選擇 **「立即啟動 ArcSign」**，或直接在開始選單搜尋「ArcSign」後開啟應用程式。

## macOS 安裝教學

按照以下步驟在 macOS 上安裝 ArcSign：

                1

                    下載 ArcSign DMG 檔案

造訪 `https://dl.arcsign.io` 並下載最新版本的 macOS 安裝程式（.dmg 檔案）。

                2

                    開啟 DMG 檔案

雙擊已下載的 .dmg 檔案。會出現一個安裝視窗，顯示 ArcSign 圖示和「Applications」資料夾。

                3

                    複製到應用程式資料夾

將 ArcSign 圖示拖曳到 Applications 資料夾。等待複製完成。

                4

                    關閉安裝視窗

複製完成後，可以關閉 DMG 視窗和 Finder。

                5

                    首次啟動應用程式

打開 Spotlight（Command + Space），輸入「ArcSign」，然後按 Enter。如果看到「無法驗證開發者」的警告，這是正常的。

                6

                    通過 Gatekeeper 警告

點擊 **「取消」**。打開 **系統設定 → 隱私與安全性**，向下滾動找到「ArcSign」，點擊 **「仍要開啟」**。之後 macOS 就會信任 ArcSign。

## 首次啟動與設定

成功安裝後，首次啟動 ArcSign 時，你需要完成基本設定：

### 準備 USB 裝置

在啟動應用程式之前，**插入你的 USB 裝置**。ArcSign 將使用此 USB 儲存加密的[私鑰](/blog/private-key-management-best-practices)。確保 USB 至少有 100MB 的可用空間。

### 建立新錢包或匯入

首次啟動時，ArcSign 會提示你：

- **建立新錢包**：ArcSign 會生成新的 BIP39 助記詞（12 或 24 字）。將這些字寫下來並妥善保管。

- **從 .arcsign 檔案匯入**：如果你已有加密備份，可以直接匯入。

- **從助記詞匯入**：如果你有其他錢包的助記詞，可以在此匯入。

            🔐 關於 ArcSign 備份

ArcSign 的 .arcsign 備份檔案已經過 **[AES-256](/blog/aes256-encryption-simple) 加密**。匯出時，檔案立即被加密 — 沒有額外的密碼設定步驟。私鑰採用 **XOR 三分片保護**，確保 USB 上的任何分片都無法單獨洩露你的資產。

## 設定 Alchemy API 金鑰

ArcSign 使用 **Alchemy** 作為資料提供者來讀取區塊鏈上的餘額、代幣和 [NFT](/blog/nft-management-arcsign)。設定 API 金鑰非常簡單：

### 步驟 1：註冊 Alchemy 帳戶

造訪 `https://www.alchemy.com`，點擊「Sign Up」。使用電子郵件或 GitHub 帳戶建立免費帳戶。免費方案已足夠日常使用。

### 步驟 2：建立應用程式

登入後，進入控制面板。點擊「Create New App」，選擇任意區塊鏈（例如 Ethereum 或 Polygon），給應用程式取名（例如「ArcSign」），然後建立。

### 步驟 3：複製 API 金鑰

應用程式建立後，在應用程式詳情頁面找到 **API Key**。複製完整的 API 金鑰（通常看起來像 `https://eth-mainnet.alchemy.com/v2/YOUR_API_KEY`）。

### 步驟 4：貼入 ArcSign

打開 ArcSign → 設定 → 提供者（Provider）→ 貼入你的 Alchemy API 金鑰。點擊「儲存」完成設定。ArcSign 現在可以開始讀取你的餘額。

            💰 為什麼需要 Alchemy？

ArcSign 是冷錢包 — 私鑰只在 USB 上。為了讓你看到餘額、代幣和 NFT，ArcSign 需要查詢區塊鏈。Alchemy 提供快速、可靠的 API 接口，無需你運行自己的節點。免費方案已涵蓋一般使用，支援每月高達 300 萬次請求。

## 常見安裝問題排解

### Windows: SmartScreen 阻止安裝

**問題**：看到「Windows 已保護你的電腦」警告。

**解決**：點擊「更多資訊」，然後「仍然執行」。ArcSign 已過 Microsoft 數位簽名。SmartScreen 只是在識別應用程式時的保守做法。

### macOS: 「無法驗證開發者」警告

**問題**：無法打開 ArcSign，顯示「無法驗證開發者」。

**解決**：

1. 點擊「取消」關閉警告

2. 打開系統設定 → 隱私與安全性

3. 向下滾動找到「ArcSign」和「仍要開啟」按鈕

4. 點擊「仍要開啟」。之後 macOS 就會信任 ArcSign

### USB 未被偵測

**問題**：ArcSign 找不到 USB 裝置。

**解決**：

- 確保 USB 已正確插入

- 嘗試使用不同的 USB 連接埠（某些埠可能有相容性問題）

- 重新啟動電腦後重新插入 USB

- 確保已安裝最新的 ArcSign 版本

- 在 Windows 上，檢查裝置管理員確認 USB 被識別為儲存裝置

### 防毒軟體誤報

**問題**：防毒軟體阻止 ArcSign 執行或安裝。

**解決**：將 ArcSign 的安裝資料夾加入防毒軟體的白名單。ArcSign 是免費開源計畫（計畫在 10,000 使用者後開源），不含任何惡意軟體。

### 應用程式無法啟動

**問題**：ArcSign 圖示可見但無法打開。

**解決**：

- Windows：重新安裝 ArcSign

- macOS：刪除應用程式，重新從 .dmg 拖曳到 Applications

- 重新啟動電腦

- 確保你的電腦符合最低系統需求

## Windows vs macOS 比較

以下是 Windows 和 macOS 上 ArcSign 安裝體驗的詳細比較：

| 功能 | Windows 10+ | macOS 12+ |
| --- | --- | --- |
| **安裝檔案** | .exe 安裝程式 | .dmg 磁碟映像 |
| **安裝難度** | 非常簡單（嚮導式安裝） | 非常簡單（拖曳複製） |
| **首次啟動警告** | SmartScreen 警告 | Gatekeeper 警告 |
| **解除警告步驟** | 2 次點擊 | 系統設定中 1 次點擊 |
| **應用程式啟動方式** | 開始選單或桌面快捷方式 | Spotlight 搜尋或應用程式資料夾 |
| **USB 相容性** | 優秀 | 優秀 |
| **晶片支援** | x86-64 (Intel/AMD) | Intel + Apple Silicon (M1/M2/M3) |
| **磁碟空間需求** | 約 300MB | 約 250MB |
| **系統相容性** | Windows 10/11 | macOS 12+ |

## 常見問題

### ArcSign 支援哪些作業系統？

ArcSign 支援 **Windows 10 以上**和 **macOS 12 以上**。兩個平台都需要 USB 2.0 以上連接埠和至少 200MB 的磁碟空間。

### Windows 上出現 SmartScreen 警告怎麼辦？

這是正常的。ArcSign 已經過數位簽名。點擊「更多資訊」，然後「仍然執行」。Windows SmartScreen 只是對不認識應用程式的保守警告。

### macOS 上收到「無法驗證開發者」的警告怎麼辦？

打開系統設定 → 隱私與安全性，向下滾動找到「ArcSign」，點擊「仍要開啟」。第一次之後，macOS 就會信任 ArcSign。

### 為什麼安裝後 USB 沒有被偵測到？

請先檢查 USB 是否已插入。嘗試使用不同的 USB 連接埠。在某些電腦上，某些埠可能有相容性問題。確保已安裝最新的 ArcSign 版本。如問題持續，重新啟動電腦通常能解決。

### 相關文章

- [→ ArcSign 初學者設定指南](/blog/arcsign-beginner-setup-guide)

- [→ WalletConnect DApp 簽名教學](/blog/walletconnect-dapp-tutorial)

- [→ USB 備份策略：如何用多支 USB 保護你的資產](/blog/usb-backup-strategy)
