---
title: "ArcSign v1.5.0：餘額免 API key、所見即所簽、免費黑名單檢查"
description: "ArcSign v1.5.0 三大升級：所有鏈的代幣餘額不再需要 Alchemy API key（公共 RPC + Multicall3）、WalletConnect 簽章本地解碼成人類可讀意圖（clear-signing）、OFAC 黑名單檢查脫離 Pro 對所有人免費。新增 Avalanche 成為第 7 條 EVM 鏈。"
pubDate: 2026-06-23
locale: zh-TW
tags: ["產品更新"]
author: "ArcSign Security Team"
heroImage: "/blog/images/arcsign-v1-5-0-release-hero.png"
relatedSlugs: ["arcsign-cross-chain-guide", "walletconnect-dapp-tutorial", "token-approval-revoke"]
---

ArcSign v1.5.0 是開源後的第一個功能更新版本。這一版的主軸是兩件事：**不需要 API key 就能用完整功能**，以及**在簽章的當下看懂你在授權什麼**。底層做了不少工程，但對你的影響可以濃縮成三句話——看餘額不用再申請 key、簽交易不再是盲簽、危險地址所有人都擋得住。

本文先做一個總覽，每個大功能後面都有獨立的深度文章可以深入。

> **v1.5.0 一句話總結**
>
> 代幣餘額在全部 7 條鏈上都不再需要 Alchemy API key；WalletConnect 與 mint 簽章會把 calldata 解碼成人類可讀的意圖；OFAC 與惡意地址黑名單檢查對所有使用者免費，並在後端強制把關。

## 1. 代幣餘額不再需要 API key

這是這一版最直接有感的改變。

在 v1.4.0 以前，ArcSign 顯示你的代幣餘額需要你先去 [Alchemy](/blog/arcsign-troubleshooting) 申請一把免費 API key 並貼進設定。對熟悉開發的人這是小事，但對一般使用者來說，「為什麼一個冷錢包要我去第三方註冊帳號才能看到自己有多少錢」是個合理的疑問。

v1.5.0 把**餘額讀取**整個改走公開 RPC + Multicall3 路徑：

- **公共 RPC 節點池**——每條鏈內建多個免金鑰的公開端點，壞掉會自動切換。
- **Multicall3**——把一個地址在一條鏈上所有代幣的 `balanceOf` 查詢打包成**一個** `eth_call`，速度快、請求少。
- **DefiLlama 價格**——美元估值由 DefiLlama 免費提供，同樣不需 key。

結果是：native 幣（ETH/BNB/AVAX…）、常見代幣（USDC/USDT…）、還有你自己 swap 換來或手動匯入的代幣，**全 7 條鏈的餘額都不需要任何 API key**，開箱即用，而且查詢不會把你的地址送到任何中央索引服務。

API key 現在只剩下 **NFT 與交易歷史**需要——那兩個功能需要第三方索引器做全鏈掃描，公共 RPC 做不到。缺 key 時介面會明確告訴你「這個功能需要 key」，而不是默默顯示空白。

深入細節見：**[免 key 餘額是怎麼做到的：公共 RPC + Multicall3 拆解](/blog/keyless-balance-multicall)**。

## 2. Clear-signing——看懂你在簽什麼

冷錢包的核心賣點是「安全簽章」，但如果你在簽章的當下只看到一串截斷的 hex，那其實是**盲簽**——你不知道自己在授權什麼。

v1.5.0 把 WalletConnect 與 Pro NFT mint 的簽章畫面從「截斷 hex」換成**本地解碼的人類可讀摘要**。calldata 與 EIP-712 typed data 都在你的機器上解碼（零外部 API、不洩漏），告訴你這筆到底在做什麼：

- 一筆單純的代幣轉帳，轉多少、轉給誰
- 一個 `approve` 授權——而且如果是**無上限授權**會標紅
- 一個 `setApprovalForAll`（把整批 NFT 的控制權交出去）
- 一個 DEX swap——Uniswap / Pancake V2 & V3、1inch、KyberSwap、OpenOcean 的 swap 都會解成「A 換 B、最少收到多少」

如果一筆交易**解不出來**，畫面會老實說「無法解讀此交易」並仍然顯示原始 hex——不給你假的安全感。誠實地承認「我看不懂這個」，比硬掰一個可能錯的解讀更安全。

深入細節見：**[Clear-signing：calldata 與 EIP-712 在本地解碼的架構](/blog/clear-signing-explained)**。

## 3. 黑名單檢查對所有人免費，而且安全門在後端

v1.5.0 把惡意地址 / OFAC 制裁地址的黑名單檢查**從 Pro 功能釋出給所有人**。

理由很簡單：黑名單檢查是純記憶體查表，零成本，不需要 API key、不需要連網——它沒有理由是付費功能。所以這一版把一份離線種子（OFAC 公領域清單 + MIT 授權的 MEW/Revoke 惡意地址清單）**直接嵌進 app**（`go:embed`），所以這個檢查在你**第一次開啟、完全離線**的狀態下就能用。

更重要的是**安全門的位置**。當你要簽一筆送往黑名單地址的交易時，是**後端（動私鑰的地方）拒絕簽章**，除非你明確勾選「我了解風險」。這道安全門不在前端 UI——前端的 checkbox 只是知情同意的呈現，真正「架構上無法繞過」的把關在 Go 後端、在私鑰被使用之前。

值得說清楚的是 ArcSign 的立場：**我們通知，但最終決定權在你手上**。黑名單命中時我們把資訊攤給你看、預設擋下，但你可以明確知情後繞過——這是一個尊重使用者主權的冷錢包，不是替任何機構執行封鎖。（交易**模擬**仍是 Pro 功能；黑名單檢查不是。）

深入細節見：**[簽章安全門：離線黑名單種子與後端強制把關](/blog/signing-security-gate)**。

## 還有什麼

- **第 7 條 EVM 鏈：Avalanche。** Ethereum、BSC、Polygon、Arbitrum、Optimism、Base，現在加上 Avalanche C-Chain。
- **手動匯入代幣 + swap 自動記錄。** 一個「匯入代幣」對話框，加上 swap 輸出的自動記錄，加密儲存在 USB 上——所以你接觸過的代幣不用 key 就能顯示餘額，而且這份清單永遠不離開你的裝置。
- **線上 ABI fallback（Sourcify）。** 本地清單沒涵蓋的已驗證合約，可以選擇性地從 Sourcify 抓 ABI 來解碼，附一次性隱私說明與加密的 USB 快取。運作細節與隱私權衡見 [Clear-signing 那篇的線上 ABI fallback 小節](/blog/clear-signing-explained)。
- **所有訊息簽章路徑統一走 XOR 分片簽章器**（EIP-191 / EIP-712）——沒有任何路徑會以明文形式碰私鑰。
- 缺 key 時 NFT / 交易歷史的提示更清楚，不再默默顯示空白。

## 升級與下載

`.arcsign` [備份格式](/blog/crypto-wallet-backup-guide)沒有改變——既有錢包與備份檔完全相容。桌面 app 的自動更新器會自動提供這個版本，你也可以從 [GitHub Releases](https://github.com/arcsignio/arcsign/releases/latest) 手動下載。每個版本都附 `SHA256SUMS`（涵蓋安裝檔與 Go 共享函式庫），可以驗證下載完整性，也可以從原始碼重現建置。

ArcSign 採 Apache 2.0 開源，原始碼在 [github.com/arcsignio/arcsign](https://github.com/arcsignio/arcsign)。

這一版的工程細節我們拆成幾篇深度文章，從免 key 餘額開始——如果你想知道「一個冷錢包怎麼在不犧牲隱私的前提下做到零設定看餘額」，那篇值得一讀。
