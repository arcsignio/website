---
title: "代幣授權管理：如何撤銷危險的智能合約權限（2026 完整指南）"
description: "Approve 一次、曝險一輩子？本文系統化拆解 ERC-20 授權機制、無限額度陷阱、歷史上億元級 approval exploit，並提供 ArcSign 的 4 步撤銷流程、風險分級矩陣與 Pro 批次撤銷功能。建立你的代幣授權長期治理計畫。"
pubDate: 2026-04-23
locale: zh-TW
tags: ["產品教學", "安全教育"]
author: "ArcSign Security Team"
heroImage: "/blog/images/token-approval-revoke-hero.png"
relatedSlugs: ["arcsign-pro-nft-membership", "ledger-vs-trezor-vs-arcsign", "defi-beginner-guide-2026"]
---

## 一、為什麼「過期授權」是 DeFi 最大的隱形炸彈

你還記得 2022 年 12 月的 Uniswap Permit2 釣魚、2023 年 3 月的 Euler Finance $197M 損失、以及 2024 年 Curve reentrancy 後續連鎖授權攻擊嗎？這些事件有一個共同點：**受害者早就不再使用這些合約，卻從未[撤銷授權](/blog/how-to-revoke-token-approvals)**。攻擊者只需要取得合約的漏洞或控制權，就能用被遺忘的 approval 一鍵清空所有受害者的錢包。

根據 Chainalysis 2025 年報，全年透過 approve / permit exploit 損失的金額達 **12 億美元**，其中超過 70% 的受害者是在交易後「忘了撤銷」的一般用戶，而不是特別粗心的新手。授權就像是你簽了一張無期限的提款單放在別人抽屜裡 — 你的錢包安全性，在 approve 的那一刻就不再由你完全控制。

            核心觀念

授權不是「暫時」的操作。[ERC-20](/blog/erc20-token-management) 的 approve 是**永久有效**的，除非你主動撤銷或把餘額耗盡。今天簽一個 MaxUint256，三年後被駭客觸發的可能性依然存在。

而[冷錢包](/blog/what-is-cold-storage)用戶有一個常見的錯覺：*「我的[私鑰](/blog/private-key-management-best-practices)在 USB 裡，approval 應該不是我的問題。」* 這是完全錯誤的。approval 不是授權給「你的熱錢包」而是授權給「你的錢包地址」。只要是這個地址名下的資產，合約都可以取走 — 不論資產儲存在冷錢包、熱錢包還是交易所充值地址。

## 二、ERC-20 Approval 機制：3 分鐘把原理搞懂

[ERC-20](/blog/erc20-token-management) 標準定義了兩個關鍵函數，構成整個授權機制：

// 你呼叫：授權某個合約可以動用多少代幣
function approve(address spender, uint256 amount) external returns (bool);

// 合約稍後呼叫：把你的代幣轉走（只要還有額度）
function transferFrom(address from, address to, uint256 amount) external returns (bool);

當你在 Uniswap 做第一筆 USDC 兌換時，你同意的交易其實不是「兌換」，而是**「允許 Uniswap Router 動用你帳戶中的 USDC」**。接下來的兌換邏輯，是合約自動呼叫 `transferFrom` 把代幣從你口袋搬出。這個設計讓 DEX / DeFi / [NFT](/blog/nft-management-arcsign) 市場的「代替用戶動用資產」成為可能 — 但這也是所有風險的源頭。

### 無限額度（Infinite Approval）：便利的代價

絕大多數 DApp 預設的 approve 金額是 `MaxUint256`（2^256 - 1，一個天文數字）。這麼設計的理由是「讓用戶只需簽一次，未來所有互動都免再次簽名」，確實方便。但代價是：

| 授權方式 | 使用者體驗 | Gas 成本 | 風險敞口 |
| --- | --- | --- | --- |
| **Exact（精確額度）** | 每次交易都要簽 approve | 高（每次 ~$2–5） | 最低 |
| **Partial（部分額度）** | 初次 approve 大額，之後用掉再補 | 中等 | 中等（視剩餘額度） |
| **Infinite（無限額度）** | 只簽一次，永久免擾 | 最低 | 最高（全部資產曝險） |
| **Permit (EIP-2612)** | Gas-less 離鏈簽名 | 零（若合約支援 meta-tx） | 視簽名範圍而定 |

大多數用戶習慣點 *「approve max」*，結果在某個深夜，該合約升級出現漏洞或[私鑰](/blog/private-key-management-best-practices)被盜，所有 USDC 就蒸發了。這正是我們在 [《如何撤銷代幣授權》](/blog/how-to-revoke-token-approvals) 裡示範過的真實情境。

## 三、四個真實案例：approval exploit 如何清空錢包

            1
            Uniswap V1 舊 LP Token（2024）

部分用戶 2018–2019 年在 Uniswap V1 提供流動性，approve 額度無限。2024 年一個舊版 Router 合約被發現整數溢位漏洞，攻擊者用「殭屍授權」從 900 多個錢包中提走價值約 **$3.2M** 的代幣。受害者大多以為「那個合約早就沒在用了」。

            2
            Multichain Bridge 多鏈授權（2023）

Multichain [跨鏈](/blog/arcsign-cross-chain-guide)橋被團隊私鑰洩漏後，攻擊者透過用戶曾經 approve 過的跨鏈合約，從 ETH / BSC / Arbitrum 多條鏈總共提走 **$125M**。最令人警惕的是：很多受害者早在 2022 年就不再用 Multichain，卻從未撤銷任何授權。

            3
            Inferno Drainer 系列（2023–2024）

一個專門針對 approve / permit 釣魚的犯罪服務平台。它透過偽造的 [NFT](/blog/nft-management-arcsign) mint 頁面、空投認領頁面、假錢包升級頁面等騙取用戶簽名。截至 2024 年 11 月被執法機構關閉為止，累計受害人數超過 **137,000 人**、總損失 **$87M**。絕大多數手法都是引導用戶簽下 `approve(攻擊者地址, MaxUint256)` 或 EIP-2612 permit。

            4
            Vyper 編譯器漏洞 → Curve 授權連鎖（2023）

Curve Finance 部分 pool 因 Vyper 編譯器 reentrancy 漏洞被攻擊後，許多聚合器（Yearn、Convex）面臨連鎖風險。即使主合約資金被搶救回來，**用戶 approve 給聚合器的額度並未自動失效**，後續幾週還有小規模清尾攻擊發生。

            共通教訓

「這個合約我早就不用了」≠「這個合約動不到我的錢」。只要你沒有主動 revoke，你的授權就一直生效 — 而攻擊者的耐心，通常比你想像的更長。

## 四、建立你的授權風險矩陣

光是列出「所有授權」並不實用，一個 DeFi 重度用戶的地址可能有上百筆 approval。重點是用**系統化方式排序**，先處理最危險的。ArcSign 內建的授權管理介面會用三色標註為你自動分級：

| 等級 | 判定條件（符合任一即觸發） | 處理建議 |
| --- | --- | --- |
| 🔴 高風險 | • 無限額度 `MaxUint256`
• 合約 90 天內無活動
• 合約未經審計 / TVL 
            1
            打開「代幣授權」頁面

插入 USB → 解鎖 ArcSign → 側邊欄點 `Token Approvals`。ArcSign 會讀取你當前選中的地址與鏈，自動掃描該地址所有未撤銷的 approve（含 ERC-20 與 ERC-721 setApprovalForAll）。掃描過程完全透過 Alchemy 免費 API 進行，所有簽名都留在 USB 內。

            2
            檢視風險分級

介面以三色標籤顯示每筆授權：紅色（高風險）、黃色（中風險）、綠色（低風險）。點開任一筆，會展開顯示：合約地址、合約名稱、剩餘額度、最後活躍時間、審計狀態、歷史事件標記。把視線集中在紅色與黃色，先別碰綠色。

            3
            單筆撤銷（Free 版）

在想撤銷的授權右側點 `Revoke`。ArcSign 會構建一筆 `approve(spender, 0)` 的交易 → USB 內離線簽名（私鑰從三分片 XOR 還原 1–5 毫秒後立即銷毀）→ 廣播上鏈。Gas 費由 ArcSign 自動建議 EIP-1559 最佳值，你只需確認。

            4
            驗證上鏈結果

交易確認後（通常 15–30 秒），ArcSign 會重新掃描該授權並標記為 **✓ 已撤銷**。你也可以從介面一鍵跳轉到 Etherscan 驗證 `allowance = 0`。至此，該合約對你資產的動用權已完全撤銷。

            冷錢包的獨特優勢

市面上的 revoke 工具（revoke.cash、Etherscan Token Approval Checker）本質上是 **要求你把熱錢包連上第三方前端**。ArcSign 把相同功能放進冷錢包本地介面，簽名過程完全離線、私鑰從未上網，連釣魚網站的偽造授權請求都沒機會出現。

## 六、進階：Pro 批次撤銷 & Gas 最佳化

如果你的清單上有 15–50 筆要撤銷，單筆單筆送 Gas 會非常痛。ArcSign Pro 會員（NFT 會員制）提供 **Batch Revoke** 功能，核心差異：

| 項目 | Free 版（單筆撤銷） | Pro 版（批次撤銷） |
| --- | --- | --- |
| 一次可處理授權數 | 1 筆 / 次 | 最多 30 筆 / 交易 |
| 平均 Gas 成本（30 筆） | ~$45–90 | ~$8–15（省 60–80%） |
| 需要簽的交易數 | 30 次 | 1 次 |
| 跨鏈整合 | 一次一條鏈 | 跨 6 條 EVM 鏈統一介面 |
| 授權審計報表匯出 | — | CSV / PDF 季度報表 |

Pro 會員透過 BNB 鏈上的 ArcSign NFT Membership 合約發行，一次購買、永久有效，詳情見 [《ArcSign Pro NFT 會員完整解析》](/blog/arcsign-pro-nft-membership)。

### Gas 最佳化小技巧

不論你是 Free 或 Pro，把握兩個原則可再省下 20–40%：

            時機 + 鏈選擇

**時機：**週末凌晨 2–6 AM UTC 的 Gas Price 通常最低。ArcSign 內建 Gas Tracker 會提示你「現在是不是好時機」。
**鏈選擇：**如果同一個授權可以在 L2（Arbitrum / Optimism / Base）完成撤銷，就優先用 L2（Gas 僅 L1 的 1/10 到 1/50）。L1 主網的舊授權可以排在 Gas 低谷期集中處理。

## 七、長期治理：每季授權審計 SOP

「撤銷」只是單次動作，但資產安全是持續性的實踐。建議把授權管理當成像是稅務申報一樣的例行工作，每季一次、每次 30 分鐘：

            Q1
            全量盤點（3 月底 / 6 月底 / 9 月底 / 12 月底）

開 ArcSign → 切換每個活躍鏈 → 匯出當時所有 approve 的快照（Pro 版可直接匯出 CSV）。記下當前總曝險（紅/黃/綠 各多少筆）。

            Q2
            紅色清零

所有紅色授權全數撤銷，無例外。如果你現在還需要用該合約，改用 Exact 額度重新 approve，不要留 Infinite。

            Q3
            黃色降級

針對黃色授權，把 Infinite 改成 Exact。如果近 90 天沒用該合約，直接降為紅色處理。

            Q4
            建立個人白名單

固定常用的 3–5 個協議（例如 Uniswap、Aave、Lido），在 ArcSign 裡加入白名單 + 設定使用提醒（連續 90 天未互動自動通知）。其他合約一律默認為「交易完即撤銷」政策。

            ArcSign 地址簿聯動

把常用協議加入 ArcSign 地址簿後，授權管理介面會自動用名稱取代合約地址，10 分鐘審查 50 筆授權完全不是問題。詳見即將推出的《ArcSign 地址簿管理》文章。

## 常見問題 FAQ

### Q：為什麼我只是「approve」卻可能損失全部代幣？

因為 ERC-20 的 approve 函數其實是一份「動用授權書」，而不是一次性的簽名。只要你授權了無限額度（`MaxUint256`），該智能合約日後任何時候都可以呼叫 `transferFrom` 把你的代幣全部搬走 — 即使該合約被駭、被升級為惡意版本、或開發團隊私鑰被盜，你的錢包都會一起陪葬。這就是為什麼沒用到的授權必須盡快撤銷。

### Q：撤銷授權要花 Gas，值得嗎？

每筆撤銷約 $0.5–$3 美元（L1 主網，L2 更便宜）。如果這筆錢能保護你錢包裡價值百倍甚至千倍的資產免於被未來駭客一鍵清空，絕對值得。ArcSign Pro 會員提供批次撤銷，多筆合併到單一交易，Gas 成本再降 60–80%。

### Q：ArcSign 的授權管理和 revoke.cash 有什麼不同？

revoke.cash 是網頁型工具，需要把你的熱錢包連上不熟悉的前端才能操作。ArcSign 把完整授權管理內建到冷錢包介面，所有 revoke 交易由 USB 內的私鑰離線簽名，避開 DApp 釣魚與 WalletConnect 中間人風險。此外，ArcSign 支援 6 條 EVM 鏈、自動標註無限額度授權、顯示合約最後活躍時間，完全免費使用。

### Q：哪些授權最該優先撤銷？

依照風險由高至低：(1) 無限額度授權給超過 90 天未互動的合約；(2) 授權給未經審計、TVL 極低或剛部署的合約；(3) 授權給已知發生過漏洞或駭客事件的協議；(4) 授權給跨鏈橋或流動性池，但你已提款完畢；(5) 任何對你無法辨認的合約地址的授權。ArcSign 的風險矩陣會以紅、黃、綠三色自動標註，幫你一眼識別。
