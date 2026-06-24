---
title: "WalletConnect 連接 DApp 完整教學"
description: "完整教學：如何使用 ArcSign USB 冷錢包通過 WalletConnect v2 連接 Uniswap、OpenSea 等各大 DApp 應用程式。涵蓋完整連接步驟、安全注意事項、支援鏈種列表與常見問題排解說明指南。"
pubDate: 2026-03-13
locale: zh-TW
tags: ["產品教學"]
author: "ArcSign Security Team"
heroImage: "/blog/images/walletconnect-tutorial-hero.png"
relatedSlugs: ["arcsign-beginner-setup-guide", "arcsign-cross-chain-guide", "clipboard-hijack-attack"]
---

## 什麼是 WalletConnect 與為什麼冷錢包用戶需要它？

假設你用 ArcSign 設定了一個 USB [冷錢包](/blog/what-is-cold-storage)。你的[私鑰](/blog/private-key-management-best-practices)安全地存在 USB 上，不會被任何人或程式碼竊取 — 這很好。但有個新問題出現了：**你怎樣在不暴露私鑰的情況下與 DApp 交互？**

傳統的熱錢包（如 MetaMask）直接把私鑰存在瀏覽器中，瀏覽器外掛能隨時存取並簽署交易。但這樣很危險 — 如果瀏覽器被駭或網站是惡意的，你的資產就完蛋了。

WalletConnect 提供了第三種方式：**遠端簽署協議**。核心概念是這樣的：DApp 不需要你的私鑰。它只需要傳送簽署請求到你的錢包應用程式（ArcSign），你在本機驗證交易細節後同意簽署，ArcSign 生成簽名並回傳給 DApp。整個過程中，DApp 永遠看不到你的私鑰。

> **WalletConnect v2 vs v1**
>
> ArcSign 支援的是最新的 **WalletConnect v2 協議**。比起舊版本，v2 提供了更好的安全性、更低的延遲、更清晰的交易簽署審批流程。如果你看到某個 DApp 只支援 v1，建議聯絡他們升級。

## ArcSign 如何實現 WalletConnect v2 支援

ArcSign 的 WalletConnect 實現分為幾個層級：

### 第一層：連接層

當你在 DApp 上選擇「連接錢包」並掃描 WalletConnect QR Code，ArcSign 會與 DApp 建立一條加密通道。這條通道通過 WalletConnect 的中繼伺服器進行，但中繼伺服器本身**無法解密任何通訊內容**，因為連接雙方都使用了公鑰密碼學進行端對端加密。

### 第二層：交易簽署層

當 DApp 需要你簽署交易時，它會發送簽署請求到 ArcSign。ArcSign 會：

1. 驗證請求來自已批准的 DApp

2. 解析交易詳細資訊（發送到哪個地址、轉移多少幣、Gas 費用等），顯示給你看

3. 要求你輸入錢包密碼確認

4. 使用你的私鑰簽署交易（簽署在本機進行，私鑰不離開 USB）

5. 將簽名回傳給 DApp，DApp 然後廣播這個已簽署的交易到區塊鏈

### 第三層：安全隔離層

即使 DApp 網站被駭或有惡意程式碼，它也無法：

- 竊取你的私鑰（私鑰在 USB 上，不在瀏覽器中）

- 簽署你未批准的交易（簽署必須在 ArcSign 中手動確認）

- 修改交易細節（你會在 ArcSign 中看到實際交易內容）

## 分步教學：連接 DApp

讓我們以連接 Uniswap（DEX）為例，完整走一遍整個流程。

**1. 準備：開啟 ArcSign 並確認 USB 連接**

首先，在你的電腦上啟動 ArcSign 應用程式，確認 USB 隨身碟已插入。ArcSign 應該會顯示「USB 已連接」的狀態提示。如果沒有看到，嘗試拔出並重新插入 USB。

確認 USB 連接後，ArcSign 會進入主儀表板。你應該能看到你的錢包餘額（如果 Provider 設定正確的話）。這確認了 ArcSign 已經準備好簽署交易。

**2. 在瀏覽器中打開 DApp，選擇 WalletConnect**

打開你的瀏覽器，導航到 Uniswap.org（或任何其他支援 WalletConnect 的 DApp）。點擊「連接錢包」或「Connect Wallet」按鈕。你會看到一個錢包選擇列表，包括 MetaMask、WalletConnect 等。

選擇 **WalletConnect**。不要選 MetaMask，因為那是給熱錢包用的。

**3. 掃描 QR Code 或貼上連接 URI**

Uniswap 會顯示一個 QR Code。這個 QR Code 包含了一個特殊的 URI（統一資源識別符），用來建立 WalletConnect 連接。你有兩種方式：

**方式 A：掃描 QR Code（推薦）**

> **在 ArcSign 中找到 WalletConnect 的掃描選項，用 ArcSign 的相機掃描 Uniswap 頁面上的 QR Code。這是最方便也最安全的方式，因為你直接控制要掃描的 QR Code。**
>
> **方式 B：手動貼上 URI**

如果 ArcSign 的掃描不起作用，你也可以在 Uniswap 上點擊 QR Code 下方的「複製到剪貼簿」按鈕，然後在 ArcSign 的 WalletConnect 頁面中找到「貼上 URI」的選項，將連接碼貼上。

**4. 在 ArcSign 上批准連接請求**

掃描或貼上 URI 後，ArcSign 會顯示一個連接請求對話框，告訴你「Uniswap 想要連接到你的錢包」。對話框會顯示：

- DApp 的名稱與圖示（Uniswap）

- 要求的權限（通常是「查看地址」和「簽署交易」）

- 連接的網路（Ethereum、Polygon 等）

**仔細檢查這些資訊。**確認你確實想連接到這個 DApp 和這個網路後，點擊「批准」或「連接」按鈕。

> **安全提醒：檢查域名**
>
> 惡意網站可能會偽造 DApp 的名稱與圖示。在批准連接之前，**檢查瀏覽器位址列中的 URL 是否正確**。Uniswap 官方網址應該是 `https://app.uniswap.org`，不是 `uniswap.fake.site` 或類似的東西。

**5. 連接成功，DApp 現在可以顯示你的錢包地址**

連接批准後，Uniswap 將顯示「Wallet connected」，並展示你的錢包地址和餘額。你可以在 ArcSign 中看到「WalletConnect：已連接」的狀態指示。

此時，Uniswap 知道你的錢包地址，但仍然沒有看到你的私鑰。這正是 WalletConnect 的美妙之處。

**6. 執行交易：在 Uniswap 上選擇代幣和數量**

現在你已經連接，可以在 Uniswap 上執行交易了。比如說，你想用 ETH 換 USDC。在 Uniswap 中：

1. 在「From」選擇 ETH，輸入數量（如 1 ETH）

2. 在「To」選擇 USDC

3. 檢查匯率和預期的 USDC 數量

4. 點擊「Swap」或「交換」按鈕

Uniswap 會計算需要的 Gas 費用，並顯示最終交易細節。

**7. 簽署交易：在 ArcSign 中確認細節**

當你點擊「Swap」後，Uniswap 會通過 WalletConnect 發送一個簽署請求到 ArcSign。ArcSign 會立即彈出一個對話框，顯示交易的完整細節：

- 發送方地址（你的地址）

- 接收方地址（Uniswap 的智能合約）

- 轉移金額和代幣（1 ETH）

- Gas 限制和 Gas 價格

- 總交易費用（Gas 費用的 USD 估算）

**這是你最後檢查交易的機會。**確認所有細節都正確 — 尤其是接收方地址和轉移金額。

**8. 輸入密碼並簽署**

確認交易細節後，ArcSign 會要求你輸入你的錢包密碼。這個密碼是你在最初建立 ArcSign 錢包時設定的。輸入密碼是為了確保只有你能簽署交易。

密碼正確後，ArcSign 會使用你存在 USB 上的私鑰簽署交易。整個簽署過程在你的電腦本機完成，耗時不到 1 秒。**簽署完成後，私鑰立即被清零銷毀。**

**9. 驗證區塊鏈上的交易**

簽署完成後，ArcSign 會將已簽署的交易回傳給 Uniswap。Uniswap 隨後將交易廣播到 Ethereum 區塊鏈。你會在 Uniswap 上看到交易狀態從「Processing」轉變為「Completed」（或失敗，如果有問題的話）。

如果交易成功，過幾秒鐘後，你在 ArcSign 儀表板上的餘額會更新 — ETH 減少，USDC 增加。你也可以在 Etherscan（區塊鏈瀏覽器）上搜索你的交易雜湊，查看詳細的鏈上記錄。

## 支援的 DApp 與區塊鏈

任何實現 WalletConnect v2 的 DApp 都可以與 ArcSign 搭配使用。以下是一些熱門的例子：

| DApp 類別 | 例子 | 用途 |
| --- | --- | --- |
| **DEX（去中心化交易所）** | Uniswap v3, SushiSwap, Curve | 交換代幣、流動性挖礦 |
| **NFT 市場** | OpenSea, Blur, LooksRare | 購買、出售、交易 NFT |
| **DeFi 協議** | Aave, Compound, MakerDAO | 借貸、存款、衍生品 |
| **Staking & 流動性挖礦** | Lido, Curve, Convex | 獲取收益 |
| **跨鏈橋接** | Stargate, Across, Relay | 不同區塊鏈間轉移資產 |

### 支援的區塊鏈

ArcSign 支援 7 條主流 EVM 鏈，包括：

- **EVM 鏈：**Ethereum、BNB Chain、Polygon、Arbitrum、Optimism、Base、Avalanche

- **支援方式：**所有 EVM 相容鏈都通過 WalletConnect v2 連接到各種 DApp

> **鏈的選擇很重要**
>
> 當你連接 DApp 時，**確認 ArcSign 和 DApp 使用同一條區塊鏈。**如果 ArcSign 設定在 Ethereum 上但 Uniswap 切換到 Polygon，你的交易可能會失敗或發生意外。DApp 通常在右上角顯示目前使用的網路，ArcSign 也會在連接請求中清楚標示。

## 安全考量：為什麼冷儲存簽署更安全

你現在可能想知道：既然要在 ArcSign 中輸入密碼簽署，為什麼不直接用 MetaMask？答案是安全性。讓我們比較一下：

### MetaMask（熱錢包）流程

1. 你的私鑰存在瀏覽器中

2. DApp 網站載入時，MetaMask 自動可以存取你的私鑰

3. 如果網站有惡意程式碼（或被駭），程式碼可以竊取私鑰或簽署任意交易

4. MetaMask 確實有安全檢查，但它們無法防止所有攻擊

### ArcSign + WalletConnect（冷儲存）流程

1. 你的私鑰存在離線 USB 上，不在瀏覽器中

2. DApp 網站無法存取 USB 或 ArcSign 的私鑰

3. 即使網站被駭，惡意程式碼也無法簽署交易 — 簽署需要在 ArcSign 中手動確認密碼

4. 你總是能在 ArcSign 的確認對話框中看到確切的交易細節，防止被欺騙

### 實際攻擊場景

**場景：惡意 Uniswap 克隆網站**

攻擊者製作了一個假的 Uniswap 網站，外觀完全相同。你不小心訪問了它，想要交換 1 ETH。

如果你用 MetaMask：假網站直接從瀏覽器竊取私鑰，或偽造簽署請求讓 MetaMask 同意轉移你的全部資產到攻擊者的地址。你沒有機會檢查實際地址。

如果你用 ArcSign + WalletConnect：假網站試圖建立 WalletConnect 連接。假設連接成功了，攻擊者要求簽署一個將 1 ETH 發送到攻擊者地址的交易。但在 ArcSign 的簽署確認對話框中，你會清楚看到「發送到 `0xattacker...`」，而不是 Uniswap 的合約。你會意識到這是攻擊，並拒絕簽署。你的資產安全。

> **冷儲存不能防止人為錯誤**
>
> 然而，[冷儲存](/blog/what-is-cold-storage)無法保護你免受自己的粗心。如果你**主動批准了一個惡意交易**（比如不小心在簽署對話框中點擊了「同意」），即使是冷儲存也無法幫你。所以，**總是在簽署前仔細檢查交易細節。**

## 常見問題排解

### 問題 1：QR Code 掃描無效

如果 ArcSign 無法掃描 Uniswap 的 QR Code，嘗試：

- 確認你的電腦攝像頭權限已開放給 ArcSign

- 嘗試使用「貼上 URI」方式而不是掃描

- 確認 QR Code 清晰可見，沒有被遮擋

- 重新整理 Uniswap 頁面，重新生成 QR Code

### 問題 2：連接請求超時

如果 ArcSign 顯示「連接超時」：

- 確認你的網路連接穩定

- 檢查 WalletConnect 中繼伺服器是否正常（訪問 `https://status.walletconnect.org`）

- 嘗試使用不同的瀏覽器或清除瀏覽器快取

- 重啟 ArcSign 應用程式

### 問題 3：簽署交易失敗

如果簽署時收到錯誤訊息：

- 確認你輸入的密碼正確

- 檢查你的 USB 連接是否穩定（可以嘗試重新插拔）

- 確認 ArcSign 中的鏈選擇與 DApp 匹配

- 檢查你的帳戶是否有足夠的餘額支付 Gas 費

### 問題 4：DApp 顯示「簽署被拒絕」

如果 DApp 說你拒絕了簽署請求：

- 檢查 ArcSign 中是否有待處理的簽署對話框被你不小心關閉

- 在 ArcSign 中重新嘗試交易

- 某些 DApp 在簽署請求過期後需要重新發起（通常是 30 秒內）

## FAQ

#### 我可以同時連接多個 DApp 嗎？

可以。ArcSign 支援多個 WalletConnect 工作階段（Session）。你可以同時連接到 Uniswap 和 OpenSea，在它們之間切換而不需要斷開再重新連接。

#### WalletConnect 連接會永遠保持嗎？

不會。WalletConnect 工作階段有有效期（通常是 7 天）。過期後需要重新掃描 QR Code 或貼上 URI 重新連接。你也可以手動在 ArcSign 中斷開連接。

#### DApp 能看到我的 USB 或密碼嗎？

完全不能。DApp 只知道你的錢包地址。它無法看到 USB、無法知道你的密碼、無法知道你的私鑰。WalletConnect 是一個簽署通訊協議，不是數據訪問協議。

#### 如果我的電腦被駭會怎樣？

即使你的電腦被駭，攻擊者也無法竊取你的私鑰（它在 USB 上）。他們可能能看到你在 DApp 上的交互，但無法簽署交易 — 因為那需要你輸入密碼到 ArcSign。只要你的 USB 和密碼安全，你的資產就安全。

#### WalletConnect 比直接輸入私鑰到網站安全嗎？

絕對安全得多。**永遠不要**直接輸入私鑰或種子短語到任何網站，即使是看起來很合法的 DApp。WalletConnect 讓你簽署交易而不暴露私鑰，這是正確的方式。
