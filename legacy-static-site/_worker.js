/**
 * Cloudflare Pages Advanced Mode Worker
 *
 * Routes:
 *   /nft/metadata/:tokenId  — ERC721 metadata for ArcSign Pro Membership NFTs
 *   /api/heartbeat (POST)   — Anonymous app usage ping (HMAC-signed, IP-deduped)
 *   /api/subscribe (POST)   — Email newsletter subscription + drip schedule
 *   /api/drip-cron (POST)   — Daily drip trigger (called by cron-job.org, DRIP_SECRET)
 *   /api/public-stats (GET) — Public user count (cached 1h)
 *   /api/stats (GET)        — Developer stats dashboard (STATS_SECRET)
 *   Everything else          — Static files
 *
 * Required env vars: HEARTBEAT_SECRET, STATS_SECRET, RESEND_API_KEY, DRIP_SECRET
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- NFT Metadata ---
    const nftMatch = url.pathname.match(/^\/nft\/metadata\/(\d+)$/);
    if (nftMatch) {
      return handleNftMetadata(nftMatch[1], url);
    }

    // --- Heartbeat API ---
    if (url.pathname === "/api/heartbeat") {
      if (request.method === "OPTIONS") return corsPreflightResponse();
      if (request.method === "POST") return handleHeartbeat(request, env);
      return new Response("Method Not Allowed", { status: 405 });
    }

    // --- Email Subscribe API ---
    if (url.pathname === "/api/subscribe") {
      if (request.method === "OPTIONS") return corsPreflightResponse();
      if (request.method === "POST") return handleSubscribe(request, env);
      return new Response("Method Not Allowed", { status: 405 });
    }

    // --- Stats API ---
    if (url.pathname === "/api/stats" && request.method === "GET") {
      return handleStats(url, env);
    }

    // --- Public Stats (no auth, cached) ---
    if (url.pathname === "/api/public-stats" && request.method === "GET") {
      return handlePublicStats(env);
    }

    // --- Drip Cron (called by external cron daily) ---
    if (url.pathname === "/api/drip-cron" && request.method === "POST") {
      return handleDripCron(request, env);
    }

    // --- SEO Canonical Redirects ---
    // Redirect extensionless URLs to .html versions to fix canonical split
    if (url.pathname === '/faq') {
      return Response.redirect(url.origin + '/faq.html', 301);
    }
    if (url.pathname === '/tutorial') {
      return Response.redirect(url.origin + '/tutorial.html', 301);
    }
    if (url.pathname === '/pricing') {
      return Response.redirect(url.origin + '/pricing.html', 301);
    }
    if (url.pathname === '/developer') {
      return Response.redirect(url.origin + '/developer.html', 301);
    }
    if (url.pathname === '/enterprise') {
      return Response.redirect(url.origin + '/enterprise.html', 301);
    }
    if (url.pathname === '/changelog') {
      return Response.redirect(url.origin + '/changelog.html', 301);
    }
    if (url.pathname === '/referral') {
      return Response.redirect(url.origin + '/referral.html', 301);
    }
    if (url.pathname === '/whitepaper') {
      return Response.redirect(url.origin + '/whitepaper.html', 301);
    }
    // Blog URLs without .html extension
    if (url.pathname.startsWith('/blog/') && !url.pathname.endsWith('/') && !url.pathname.endsWith('.html') && !url.pathname.includes('/en/images/') && !url.pathname.includes('/images/')) {
      return Response.redirect(url.origin + url.pathname + '.html', 301);
    }

    // All other requests — serve static files
    return env.ASSETS.fetch(request);
  },
};

// ─── NFT Metadata ───────────────────────────────────────────────

function handleNftMetadata(tokenId, url) {
  if (tokenId === "0") {
    return new Response(JSON.stringify({ error: "Invalid token ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const metadata = {
    name: `ArcSign Pro Membership #${tokenId}`,
    description:
      "ArcSign Pro Membership NFT — Secure multi-chain HD wallet with USB-only cold storage. Unlock unlimited wallets across 22 blockchain networks (BTC + 21 EVM), built-in DEX swap, WalletConnect integration, and priority support. Valid for 1 year from mint date.",
    image: `${url.origin}/nft/arcsign-pro.png`,
    external_url: "https://arcsign.io",
    attributes: [
      { trait_type: "Tier", value: "Pro" },
      { trait_type: "Duration", value: "1 Year" },
      { trait_type: "Network", value: "BNB Chain" },
      { trait_type: "Token Standard", value: "ERC-721" },
      { display_type: "number", trait_type: "Chains Supported", value: 22 },
      { trait_type: "USB Cold Storage", value: "Yes" },
      { trait_type: "DEX Swap", value: "Yes" },
      { trait_type: "WalletConnect", value: "Yes" },
    ],
  };

  return new Response(JSON.stringify(metadata, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

// ─── Heartbeat (Anonymous App Usage Ping) ───────────────────────

const JSON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

function corsPreflightResponse() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

async function handleHeartbeat(request, env) {
  try {
    const { v, os, t, sig, tier } = await request.json();
    if (!v || !os || !t || !sig) {
      return new Response("{}", { status: 400, headers: JSON_HEADERS });
    }

    // --- Layer 1: Validate HMAC signature ---
    const secret = env.HEARTBEAT_SECRET;
    if (!secret) {
      // Secret not configured — accept silently to avoid breaking the app
      return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const message = `${v}|${os}|${t}`;
    const sigBytes = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder.encode(message)
    );
    if (!valid) {
      return new Response("{}", { status: 403, headers: JSON_HEADERS });
    }

    // --- Layer 2: Timestamp must be within 60 seconds ---
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - t) > 60) {
      return new Response("{}", { status: 403, headers: JSON_HEADERS });
    }

    // --- Layer 3: IP-hash daily deduplication ---
    const today = new Date().toISOString().split("T")[0];
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const ipHashBuf = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(ip + today)
    );
    const ipHash = Array.from(new Uint8Array(ipHashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const dedupKey = `dedup:${today}:${ipHash}`;

    if (await env.ANALYTICS.get(dedupKey)) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: JSON_HEADERS,
      });
    }
    await env.ANALYTICS.put(dedupKey, "1", { expirationTtl: 86400 });

    // --- Cumulative unique user counter (per-IP, 365-day window) ---
    const seenKey = `seen:${ipHash}`;
    const alreadySeen = await env.ANALYTICS.get(seenKey);
    if (!alreadySeen) {
      await env.ANALYTICS.put(seenKey, "1", { expirationTtl: 365 * 86400 });
      const totalUsers = parseInt((await env.ANALYTICS.get("total_users")) || "0");
      await env.ANALYTICS.put("total_users", String(totalUsers + 1));
      // Invalidate public stats cache
      await env.ANALYTICS.delete("cache:public_stats");
    }

    // --- Increment counters ---
    const dailyKey = `daily:${today}`;
    const current = parseInt((await env.ANALYTICS.get(dailyKey)) || "0");
    await env.ANALYTICS.put(dailyKey, String(current + 1), {
      expirationTtl: 90 * 86400,
    });

    const versionKey = `version:${today}:${v}`;
    const vCurrent = parseInt((await env.ANALYTICS.get(versionKey)) || "0");
    await env.ANALYTICS.put(versionKey, String(vCurrent + 1), {
      expirationTtl: 90 * 86400,
    });

    const osKey = `os:${today}:${os}`;
    const osCurrent = parseInt((await env.ANALYTICS.get(osKey)) || "0");
    await env.ANALYTICS.put(osKey, String(osCurrent + 1), {
      expirationTtl: 90 * 86400,
    });

    // --- Tier counter (free/pro) ---
    if (tier === "free" || tier === "pro") {
      const tierKey = `tier:${today}:${tier}`;
      const tierCurrent = parseInt((await env.ANALYTICS.get(tierKey)) || "0");
      await env.ANALYTICS.put(tierKey, String(tierCurrent + 1), {
        expirationTtl: 90 * 86400,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: JSON_HEADERS,
    });
  } catch {
    return new Response(JSON.stringify({ ok: true }), {
      headers: JSON_HEADERS,
    });
  }
}

// ─── Email Subscribe ─────────────────────────────────────────────

// Drip schedule: [step, daysAfterSubscribe]
const DRIP_SCHEDULE = [
  [1, 3],
  [2, 7],
  [3, 14],
  [4, 30],
];

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

async function handleSubscribe(request, env) {
  try {
    const { email, source } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ ok: false, error: "invalid_email" }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rate limit: 3 subscriptions per IP per day
    const today = new Date().toISOString().split("T")[0];
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const encoder = new TextEncoder();
    const ipHashBuf = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(ip + today + "subscribe")
    );
    const ipHash = Array.from(new Uint8Array(ipHashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
    const rateLimitKey = `sub_rate:${today}:${ipHash}`;
    const attempts = parseInt((await env.ANALYTICS.get(rateLimitKey)) || "0");
    if (attempts >= 3) {
      return new Response(
        JSON.stringify({ ok: false, error: "rate_limited" }),
        { status: 429, headers: JSON_HEADERS }
      );
    }
    await env.ANALYTICS.put(rateLimitKey, String(attempts + 1), {
      expirationTtl: 86400,
    });

    // Check if already subscribed
    const existing = await env.ANALYTICS.get(`sub:${normalizedEmail}`);
    if (existing) {
      return new Response(
        JSON.stringify({ ok: true, already: true }),
        { headers: JSON_HEADERS }
      );
    }

    // Store subscription
    const now = new Date().toISOString();
    await env.ANALYTICS.put(
      `sub:${normalizedEmail}`,
      JSON.stringify({
        email: normalizedEmail,
        source: source || "homepage",
        subscribed_at: now,
      })
    );

    // Increment counters
    const countKey = `sub_count:${today}`;
    const current = parseInt((await env.ANALYTICS.get(countKey)) || "0");
    await env.ANALYTICS.put(countKey, String(current + 1), { expirationTtl: 365 * 86400 });
    const total = parseInt((await env.ANALYTICS.get("sub_total")) || "0");
    await env.ANALYTICS.put("sub_total", String(total + 1));

    // Schedule drip emails (date-bucketed keys)
    for (const [step, days] of DRIP_SCHEDULE) {
      const sendDate = addDays(today, days);
      const dripKey = `drip:${sendDate}:${normalizedEmail}`;
      await env.ANALYTICS.put(dripKey, String(step), { expirationTtl: 35 * 86400 });
    }

    // Send welcome email immediately (step 0)
    await sendDripEmail(normalizedEmail, 0, env);

    return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "server_error" }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
}

// ─── Drip Cron ───────────────────────────────────────────────────
// Called daily by cron-job.org: POST /api/drip-cron  {key: DRIP_SECRET}

async function handleDripCron(request, env) {
  try {
    const { key } = await request.json();
    if (!key || key !== env.DRIP_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0];
    const list = await env.ANALYTICS.list({ prefix: `drip:${today}:` });
    let sent = 0;
    let failed = 0;

    for (const kv of list.keys) {
      const step = parseInt((await env.ANALYTICS.get(kv.name)) || "0");
      const email = kv.name.replace(`drip:${today}:`, "");
      const ok = await sendDripEmail(email, step, env);
      if (ok) {
        await env.ANALYTICS.delete(kv.name);
        sent++;
      } else {
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, today, sent, failed }),
      { headers: JSON_HEADERS }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
}

// ─── Email Sending (Resend) ───────────────────────────────────────

async function sendEmail(to, subject, html, env) {
  if (!env.RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ArcSign <hello@arcsign.io>",
        to: [to],
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function emailWrapper(content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f0fdfa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937}
  .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)}
  .top-bar{height:4px;background:linear-gradient(90deg,#0d9488,#2dd4bf)}
  .body{padding:40px 36px}
  h1{font-size:22px;font-weight:700;color:#0d9488;margin:0 0 12px}
  p{font-size:15px;line-height:1.7;color:#374151;margin:0 0 16px}
  .btn{display:inline-block;padding:12px 28px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;margin:8px 0}
  .divider{border:none;border-top:1px solid #f0f9ff;margin:24px 0}
  .footer{padding:20px 36px;background:#f0fdfa;font-size:12px;color:#6b7280;text-align:center}
  .footer a{color:#0d9488}
</style></head><body>
<div class="wrap">
  <div class="top-bar"></div>
  <div class="body">${content}</div>
  <div class="footer">
    ArcSign — USB 冷錢包<br>
    <a href="https://arcsign.io">arcsign.io</a> ·
    你收到此郵件是因為訂閱了 ArcSign 電子報。
  </div>
</div>
</body></html>`;
}

const EMAIL_TEMPLATES = [
  // Step 0: Welcome (immediate)
  {
    subject: "歡迎使用 ArcSign — 開始設定你的 USB 冷錢包",
    html: emailWrapper(`
      <h1>歡迎加入 ArcSign！</h1>
      <p>感謝你訂閱。ArcSign 讓你用現有的 USB 隨身碟當冷錢包，私鑰永遠不上網，拔掉就安全。</p>
      <p><strong>三步驟快速開始：</strong></p>
      <p>① 下載並安裝 ArcSign<br>
         ② 插入 USB 隨身碟，建立錢包<br>
         ③ 匯出 .arcsign 加密備份到第二支 USB</p>
      <a href="https://arcsign.io/#download" class="btn">立即免費下載</a>
      <hr class="divider">
      <p style="font-size:13px;color:#6b7280">支援 macOS / Windows / Linux，54+ 條鏈，完全免費。</p>
    `),
  },
  // Step 1: Features (Day 3)
  {
    subject: "ArcSign 的這些功能，你用過了嗎？",
    html: emailWrapper(`
      <h1>冷錢包不只是「存」</h1>
      <p>很多人以為冷錢包只能存幣，但 ArcSign 還能做更多：</p>
      <p>🔄 <strong>內建 DEX Swap</strong> — 直接在 App 內換幣，Pro 用戶免手續費<br>
         🔗 <strong>WalletConnect</strong> — 安全連接任何 DeFi、NFT、DApp<br>
         🖼 <strong>NFT Gallery</strong> — 跨鏈瀏覽你的 NFT 收藏<br>
         🛡 <strong>Token Approvals 管理</strong> — 查看並撤銷危險的合約授權</p>
      <a href="https://arcsign.io/#features" class="btn">探索所有功能</a>
    `),
  },
  // Step 2: Security (Day 7)
  {
    subject: "你的加密資產，真的安全嗎？",
    html: emailWrapper(`
      <h1>軟體錢包的隱患</h1>
      <p>MetaMask 等軟體錢包把私鑰存在電腦硬碟，惡意軟體可以 24/7 掃描竊取。一旦中毒，資產全失。</p>
      <p>ArcSign 的做法不同：</p>
      <p>🔌 <strong>USB 隔離</strong> — 私鑰只在 USB 裡，不插就不存在<br>
         🔒 <strong>AES-256 加密備份</strong> — .arcsign 檔案匯出即加密，不需要額外設密碼<br>
         📵 <strong>離線簽名</strong> — 交易在本地簽名，私鑰從不上網</p>
      <a href="https://arcsign.io/#security" class="btn">了解安全機制</a>
    `),
  },
  // Step 3: Pro upgrade (Day 14)
  {
    subject: "ArcSign Pro — $30/年，讓冷錢包更強大",
    html: emailWrapper(`
      <h1>升級 Pro，解鎖完整功能</h1>
      <p>Free 版已經很強，但 Pro 讓你走得更遠：</p>
      <p>✅ 無限個 HD 錢包（Free 限 3 個）<br>
         ✅ DEX Swap 免手續費（Free 收 0.1%）<br>
         ✅ Token Approvals 批量撤銷<br>
         ✅ 推薦佣金 20%（Free 是 10%）<br>
         ✅ 優先客服支援</p>
      <p><strong>一年只需 $30 USDT</strong>，鑄造 Pro NFT 永久記錄在 BSC 鏈上。</p>
      <a href="https://arcsign.io/pricing.html" class="btn">查看 Pro 方案</a>
    `),
  },
  // Step 4: Referral (Day 30)
  {
    subject: "推薦 ArcSign，永久賺取 10–20% 佣金",
    html: emailWrapper(`
      <h1>邊用邊賺的推薦計畫</h1>
      <p>你推薦的朋友每次在 ArcSign 上 swap 或購買 Pro，你就永久抽取佣金：</p>
      <p>💰 <strong>Free 用戶：10% 佣金</strong><br>
         💎 <strong>Pro 用戶：20% 佣金</strong><br>
         ⏳ <strong>永久有效</strong> — 沒有到期日，沒有上限</p>
      <p>在 ArcSign App 內 → Membership → Referral Program → 建立你的推薦碼，一鍵複製推薦連結分享給朋友。</p>
      <a href="https://arcsign.io/referral.html" class="btn">了解推薦計畫</a>
    `),
  },
];

async function sendDripEmail(email, step, env) {
  const template = EMAIL_TEMPLATES[step];
  if (!template) return false;
  return sendEmail(email, template.subject, template.html, env);
}

// ─── Public Stats (no auth, 1-hour KV cache) ────────────────────

async function handlePublicStats(env) {
  const CACHE_KEY = "cache:public_stats";
  const CACHE_TTL = 3600; // 1 hour

  const cached = await env.ANALYTICS.get(CACHE_KEY);
  if (cached) {
    return new Response(cached, {
      headers: { ...JSON_HEADERS, "Cache-Control": "public, max-age=3600" },
    });
  }

  const total = parseInt((await env.ANALYTICS.get("total_users")) || "0");
  // Round down to nearest 100 for conservative display
  const displayed = Math.max(Math.floor(total / 100) * 100, total > 0 ? 100 : 0);

  const payload = JSON.stringify({ users: displayed, exact: total });
  await env.ANALYTICS.put(CACHE_KEY, payload, { expirationTtl: CACHE_TTL });

  return new Response(payload, {
    headers: { ...JSON_HEADERS, "Cache-Control": "public, max-age=3600" },
  });
}

// ─── Stats (Developer Dashboard) ────────────────────────────────

async function handleStats(url, env) {
  const secret = url.searchParams.get("key");
  if (!secret || secret !== env.STATS_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const daily = {};
  const versions = {};
  const osCounts = {};

  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];

    const count = await env.ANALYTICS.get(`daily:${dateKey}`);
    if (count) daily[dateKey] = parseInt(count);
  }

  // Also list recent version/os keys from today
  const today = new Date().toISOString().split("T")[0];
  const list = await env.ANALYTICS.list({ prefix: `version:${today}:` });
  for (const key of list.keys) {
    const val = await env.ANALYTICS.get(key.name);
    const ver = key.name.replace(`version:${today}:`, "");
    if (val) versions[ver] = parseInt(val);
  }

  const osList = await env.ANALYTICS.list({ prefix: `os:${today}:` });
  for (const key of osList.keys) {
    const val = await env.ANALYTICS.get(key.name);
    const osName = key.name.replace(`os:${today}:`, "");
    if (val) osCounts[osName] = parseInt(val);
  }

  return new Response(
    JSON.stringify({ daily, versions_today: versions, os_today: osCounts }, null, 2),
    { headers: { "Content-Type": "application/json" } }
  );
}
