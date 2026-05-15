---
title: "XOR 祕密分享深度解析：ArcSign 如何用資訊理論保護你的金鑰"
description: "深入解析 XOR 祕密分享（Secret Sharing）的數學原理、One-Time Pad 證明、與 Shamir / MPC / Threshold ECDSA 比較。看 ArcSign 如何用 3-of-3 XOR 分片 + mlock 把私鑰保護做到資訊理論層級。"
pubDate: 2026-04-26
locale: zh-TW
tags: ["安全教育", "加密技術"]
author: "ArcSign Security Team"
heroImage: "/blog/images/xor-secret-sharing-deep-dive-hero.png"
relatedSlugs: ["aes256-encryption-simple", "mlock-memory-protection", "private-key-management-best-practices"]
---

## 為什麼私鑰保護需要「祕密分享」？

傳統錢包軟體用一組密碼把私鑰整把加密後存到硬碟上。這個設計有一個根本的脆弱點：**整把私鑰存在於一個地方，破解這個地方就等於破解一切**。攻擊者只需要拿到加密檔案 + 暴力破解密碼（或側錄你輸入密碼的瞬間），就可以拿到完整私鑰。

**祕密分享（Secret Sharing）**是一個徹底不同的思路：把祕密拆成 N 個分片，分散儲存。除非攻擊者同時取得足夠數量的分片，否則他得到的只是「看起來像隨機數據的東西」。這個概念由密碼學家 George Blakley 與 Adi Shamir 在 1979 年同年獨立提出，後來成為現代私鑰保護的基礎理論。

ArcSign 採用的是 **XOR 三分片祕密分享**（XOR Secret Sharing），這是最簡單、卻在資訊理論上最完美的祕密分享形式。本文將深入拆解它的數學原理、ArcSign 的工程實作，並對比 Shamir、MPC、Threshold ECDSA 等競爭方案，讓你理解為什麼一個看似「樸素」的位元運算，能撐起整個冷錢包的安全模型。

            兩個核心問題

本文要回答的兩個問題：(1) **數學上**，XOR 祕密分享為何不可破解？(2) **工程上**，ArcSign 如何把這個理論性質轉換成日常可用的冷錢包？延伸閱讀：[XOR 三分片加密圖解版](/blog/xor-encryption-explained)（適合初學者）。

## 祕密分享的演進史：Blakley、Shamir、XOR

要看懂 ArcSign 的設計選擇，先回顧祕密分享技術的演進。

### 1979：兩位密碼學家同時開創新領域

**George Blakley** 用幾何學的方法：把祕密當成 N 維空間中的一個點，每個分片是穿過這個點的一個超平面。需要 K 個超平面才能交出唯一解。直觀，但實作上效率較低。

**Adi Shamir**（後來的 RSA 之父之一）用代數的方法：把祕密當成多項式 P(x) 在 x=0 的值，每個分片是 P(x_i) 在不同 x_i 的值。需要 K 個分片才能用拉格朗日插值法還原多項式 — 這就是赫赫有名的 **Shamir Secret Sharing（SSS）**。

### XOR 祕密分享：最古老也最簡單的方案

其實 XOR 祕密分享比 Shamir、Blakley 更古老 — 它是 Vernam 1917 年發明的「**One-Time Pad**」（一次性密碼本）的直接延伸。在二戰時期，紅電話（Moscow-Washington Hotline）就是用 OTP 加密的，這也是史上唯一被嚴格證明「資訊理論安全」（information-theoretically secure）的對稱加密方式。

把 N 個 XOR 分片中的任意 N-1 片組合，從理論上得不到關於原始祕密的**任何**資訊。這個證明嚴謹度遠超過今天大多數密碼學演算法 — AES、ECDSA、SHA-256 都只是「計算性安全」（computationally secure，靠 P≠NP 假設），而 OTP/XOR 是**資訊理論安全**，意味著就算未來有量子電腦或外星人技術，分析 N-1 片仍然得不到任何位元的資訊。

| 祕密分享方案 | 提出者 / 年份 | 數學基礎 | 典型用途 |
| --- | --- | --- | --- |
| One-Time Pad / XOR | Vernam, 1917 | 位元異或 | 軍事通訊、ArcSign 冷錢包 |
| Blakley | Blakley, 1979 | 幾何超平面 | 學術研究居多 |
| Shamir Secret Sharing | Shamir, 1979 | 多項式插值（GF(2^k)） | SLIP-0039、企業金鑰備份 |
| Verifiable Secret Sharing | Chor 等, 1985 | SSS + 承諾方案 | 區塊鏈共識 |
| MPC / Threshold ECDSA | 1990s 起 | 橢圓曲線分散簽名 | 機構託管、Fireblocks |

## XOR 祕密分享的數學原理（含 One-Time Pad 證明）

### 形式化定義

設私鑰 `K` 為一個 256 位元的字串。XOR 三分片祕密分享如下：

                輸入
                K（256-bit 私鑰）

                隨機產生
                S1, S2 ∈ {0,1}256（CSPRNG）

                計算
                S3 = K ⊕ S1 ⊕ S2

                驗證還原
                K = S1 ⊕ S2 ⊕ S3 ✓

### 資訊理論安全性：為什麼任何 2 片洩漏 0 bits？

假設攻擊者拿到 `S1` 和 `S2`。他想推測 `K`。但他不知道 `S3`。我們可以證明：給定 `S1, S2`，任何 256-bit 的 K' 都是同樣可能的解（每一種 K' 都對應到同樣機率的 S3）。

形式化地說，條件熵 **H(K | S1, S2) = H(K)** — 攻擊者知道兩片之後，對 K 的不確定性**完全沒有減少**。這就是「資訊理論安全」的數學定義，也是 Shannon 在 1949 年〈Communication Theory of Secrecy Systems〉中對 OTP 的證明。

            關鍵洞察

2256 個可能的私鑰，攻擊者拿到 2 片後，仍然有 2256 個同等可能的解。**沒有任何演算法可以從不完整的分片推測出正確的私鑰，這是數學的事實，不是工程妥協。**

### 具體範例：把 6-bit 私鑰拆三片

為了直觀，假設我們有一個簡化的「6-bit 私鑰」，值為 **42**（二進位 `101010`）：

                私鑰 K
                1 0 1 0 1 0
                （= 42）

                分片 S₁
                1 1 0 1 0 1
                （= 53，CSPRNG）

                分片 S₂
                0 1 1 0 1 1
                （= 27，CSPRNG）

                分片 S₃ = K⊕S₁⊕S₂
                0 0 0 1 0 0
                （= 4）

檢視結果：`53 ⊕ 27 ⊕ 4 = 42` ✓。攻擊者拿到 53 + 27，他能推測 K 嗎？不能 — 因為 S₃ 完全隨機，任何值的 K 都對應到合法的 S₃。把這個情境放大到 256 bits，可能的 K 數量是 2256（一個天文數字），全宇宙的計算資源加總都不可能枚舉。

## ArcSign 設計選擇：為什麼是 3-of-3 而非門檻方案？

既然 Shamir Secret Sharing 支援 M-of-N 門檻方案（例如 3-of-5：任意 3 片就能恢復），看似更彈性，為什麼 ArcSign 選擇相對「死板」的 3-of-3 XOR？這是經過深思熟慮的工程權衡。

### 1. ArcSign 是單裝置冷錢包

ArcSign 的所有分片都儲存在同一支 USB 上，由軟體自動管理。使用者不需要手動管理多個分片 — 不會發生 Shamir 用戶常遇到的「我忘了第三片放在哪裡」、「兩個朋友手上的分片過期了」等問題。在這個情境下，門檻方案的「彈性」是無用的，反而擴大了攻擊面。

### 2. 3-of-3 提供最大資訊熵

如果改成 2-of-3 門檻方案，攻擊者拿到任意 2 片就能還原私鑰 — 這在數學上等同於降低了對手的工作量。3-of-3 嚴格要求「全部到齊」，攻擊者必須突破**所有**分片的儲存保護才有機會。

### 3. 攻擊面更小、更可審計

Shamir Secret Sharing 涉及 GF(2256) 的多項式運算與拉格朗日插值。歷史上多次因為實作 bug（例如係數溢位、隨機係數品質、時序攻擊）而引發漏洞。XOR 只是位元異或，**程式碼簡單到可以被逐行 audit、形式化驗證**，幾乎沒有實作出錯的空間。

### 4. 跨裝置冗餘交給 .arcsign 加密備份檔處理

擔心 USB 損毀？ArcSign 提供 **.arcsign 加密備份檔**，匯出時即用 AES-256-GCM + Argon2id 加密。一鍵匯出後可以複製到第二支 USB、保險箱、雲端 — 即使檔案外流，沒有你的密碼也無法破解。這個設計將「防遺失冗餘」與「分片祕密分享」徹底解耦，比 Shamir 把兩種需求混在一起更乾淨。

            設計哲學

ArcSign 採用「**分層解耦**」的安全架構：XOR 三分片解決**運行時的私鑰保護**（不被讀出記憶體 / 硬碟）；.arcsign 加密備份檔解決**長期的災難復原**（USB 壞掉怎麼辦）。兩者各司其職、互不干擾。

## 實作細節：CSPRNG、AES、HKDF、mlock 多層防禦

理論很美，但實作如果出錯，安全性會瞬間降為零。ArcSign 在工程實作上採取了多層防禦策略：

            1
            CSPRNG：分片必須真的隨機

使用作業系統的密碼學安全隨機數生成器（macOS 的 `SecRandomCopyBytes`、Linux 的 `getrandom(2)`、Windows 的 `BCryptGenRandom`）產生 S1, S2。如果隨機數不夠隨機，整個資訊理論安全性都會崩潰。

            2
            AES-256-GCM 二次加密

每個 XOR 分片在落盤前再用 AES-256-GCM 加密一次。即使攻擊者跳過 ArcSign 軟體、用 hex editor 直接讀 USB 上的位元組，看到的也是密文。這是「縱深防禦」（defense in depth）。

            3
            HKDF：每個分片獨立衍生 key

三個分片用三個不同的 AES key，每個 key 都從同一把 master secret 透過 HKDF（HMAC-based Key Derivation Function）+ 不同 salt 衍生。即使其中一把 key 因實作 bug 洩漏，另外兩個分片仍然安全。

            4
            mlock 鎖定還原時的記憶體

還原私鑰前先 `mlock(2)` 鎖定一塊記憶體頁，禁止換出到 swap 檔。XOR 計算 + 簽名 + memzero（用 `explicit_bzero` 或 `SecureZeroMemory`）整個過程控制在 1-5 ms 內，私鑰曝露窗口極短。

            5
            USB 離線保證

所有上述操作都在你本機執行，分片永遠不離開 USB 裝置。即使你的電腦中毒，攻擊者要竊取私鑰仍需在毫秒級時間窗口內精準截取記憶體 — 這在實務上極為困難。ArcSign 是**免費軟體**，私鑰永遠不離開你的裝置。

## XOR vs Shamir vs MPC vs Threshold ECDSA 全比較

| 方案 | 安全模型 | 實作複雜度 | 適用場景 | 需要網路 | 簽名延遲 |
| --- | --- | --- | --- | --- | --- |
| **XOR Secret Sharing** | 資訊理論安全 | 極低（
            威脅模型總結

XOR 三分片把「私鑰被竊取」的攻擊條件，從「破解一組密碼」拉高到「同時取得三個獨立 AES key + 物理控制 USB + 突破 mlock 記憶體保護」。這是**數量級提升**，不是邊際改善。延伸閱讀：[mlock 記憶體保護是什麼？](/blog/mlock-memory-protection)、[AES-256-GCM + Argon2id 簡單說](/blog/aes256-encryption-simple)。

## 常見問題 FAQ

### Q：XOR 祕密分享和 Shamir Secret Sharing 哪個比較安全？

兩者在資訊理論上都是 perfect secret sharing — 攻擊者拿到不足門檻的分片時，獲得的資訊量為零。差別在於攻擊面：Shamir 需要在有限體 GF(2256) 上做多項式插值，實作上有更多潛在漏洞（係數溢位、隨機數品質、時序攻擊）。XOR 三分片只用單純的位元異或運算，邏輯極簡，更容易做形式化驗證。對單裝置冷儲存場景，XOR 的攻擊面更小、更可審計。

### Q：為什麼 ArcSign 選擇 3-of-3，而不是 2-of-3 或 3-of-5 門檻方案？

因為 ArcSign 是單裝置冷錢包：所有分片都在同一支 USB，由軟體自動管理。3-of-3 提供最高安全保證 — 任何 2 個分片的組合所洩漏的私鑰資訊量為零（資訊熵 = 完整 256 bits）。改成 2-of-3 反而會降低安全性，因為攻擊者只要拿到 2 片就能還原。.arcsign 加密備份檔處理跨裝置冗餘需求，避免 USB 損毀風險。

### Q：XOR 祕密分享比 MPC 多方計算差嗎？

兩者解決的是不同問題。MPC 適合多方協作場景（多人共管金庫、機構託管），私鑰永遠不會在單一節點完整出現，但需要多節點在線+網路通訊。XOR 三分片適合個人冷儲存，私鑰只在簽名瞬間（1-5 ms）以 mlock 鎖定的記憶體存在。對個人用戶，XOR 三分片不需要網路、不需要多節點在線、不會有通訊延遲，反而是更實用的選擇。

### Q：為什麼三個分片放在同一支 USB 還是安全的？

因為每個分片本身都被 AES-256-GCM 加密，且每個 AES key 都是獨立衍生（HKDF + 不同 salt）。攻擊者要竊取私鑰需要：(1) 物理取得 USB；(2) 攻破 ArcSign 軟體 mlock 的記憶體保護；(3) 在 1-5 ms 簽名窗口內截取。同時這支 USB 不會插上連網電腦，加上 .arcsign 加密備份檔提供跨設備冗餘 — 多層防禦下，單裝置儲存反而比把分片分散到多人/多地（增加被竊風險）更安全。
