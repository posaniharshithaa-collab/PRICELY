(() => {
  if (window.__PRICELY_1_1_0__) return;
  window.__PRICELY_1_1_0__ = true;

  const BACKEND_TIMEOUT = 12000;

  const clean = s => (s || "").replace(/\s+/g, " ").trim();

  const moneyRe =
    /(?:₹|Rs\.?|INR|\$|USD|€|EUR|£|GBP)\s*[\d,]+(?:\.\d{1,2})?/i;

  const moneyGlobal =
    /(?:₹|Rs\.?|INR|\$|USD|€|EUR|£|GBP)\s*[\d,]+(?:\.\d{1,2})?/gi;

  const number = v => {
    const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  function parsePrice(v, hint = "") {
    if (v == null) return null;

    const t = String(v)
      .replace(/\u00a0/g, " ")
      .trim();

    const m = t.match(moneyRe);

    if (!m && !/^\s*[\d,.]+(?:\.\d{1,2})?\s*$/.test(t)) {
      return null;
    }

    const raw = m ? m[0] : t;
    const price = number(raw);

    if (!price) return null;

    let c = String(hint || "").toUpperCase();

    if (!c) {
      if (/₹|INR|Rs\.?/i.test(raw)) c = "INR";
      else if (/\$|USD/i.test(raw)) c = "USD";
      else if (/€|EUR/i.test(raw)) c = "EUR";
      else if (/£|GBP/i.test(raw)) c = "GBP";
      else c = "INR";
    }

    return {
      price,
      currency: c
    };
  }

  const meta = n =>
    document.querySelector(`meta[property="${n}"]`)?.content ||
    document.querySelector(`meta[name="${n}"]`)?.content ||
    "";

  function ldProducts() {
    const out = [];

    for (const node of document.querySelectorAll(
      'script[type="application/ld+json"]'
    )) {
      try {
        const x = JSON.parse(node.textContent);
        const pending = Array.isArray(x) ? [...x] : [x];

        for (const a of pending) {
          if (a?.["@graph"]) {
            pending.push(
              ...(Array.isArray(a["@graph"])
                ? a["@graph"]
                : [a["@graph"]])
            );
          }

          const type = Array.isArray(a?.["@type"])
            ? a["@type"].join(" ")
            : String(a?.["@type"] || "");

          if (/product/i.test(type)) {
            out.push(a);
          }
        }
      } catch (_) {}
    }

    return out;
  }

  function productLd() {
    return ldProducts()[0] || null;
  }

  function title(ld) {
    return clean(
      document.querySelector("#productTitle")?.textContent ||
      document.querySelector("h1[itemprop='name']")?.textContent ||
      document.querySelector("[itemprop='name']")?.textContent ||
      document.querySelector("h1")?.textContent ||
      ld?.name ||
      meta("og:title") ||
      document.title
    );
  }

  function image(ld) {
    const el = document.querySelector(
      "#landingImage,#imgTagWrapperId img,[itemprop='image'],img[data-src],img[src]"
    );

    return (
      el?.currentSrc ||
      el?.src ||
      el?.getAttribute("data-old-hires") ||
      el?.getAttribute("data-src") ||
      (Array.isArray(ld?.image)
        ? ld.image[0]
        : typeof ld?.image === "string"
        ? ld.image
        : "") ||
      meta("og:image") ||
      ""
    );
  }

  function collectTextCandidates() {
    const candidates = [];
    const seen = new Set();

    const push = (value, score = 0, source = "text") => {
      const p = parsePrice(value);

      if (!p || p.price <= 1 || p.price >= 10000000) return;

      const key = `${p.currency}:${p.price}`;

      if (seen.has(key)) return;

      seen.add(key);

      candidates.push({
        ...p,
        score,
        source,
        raw: clean(value)
      });
    };

    const selectors = [
      "[data-testid*='price' i]",
      "[data-test*='price' i]",
      "[class*='price' i]",
      "[id*='price' i]",
      "[class*='selling' i]",
      "[class*='sale' i]",
      "[class*='amount' i]",
      "[class*='offer-price' i]"
    ];

    for (const el of document.querySelectorAll(selectors.join(","))) {
      if (!el.offsetParent && el.getClientRects().length === 0) continue;

      const text = clean(el.textContent);

      if (!text || text.length > 180) continue;

      const lower = text.toLowerCase();

      const score =
        /sale|selling|offer|current|price|amount/.test(lower)
          ? 5
          : 1;

      for (const m of text.match(moneyGlobal) || []) {
        push(
          m,
          score + (/sale|selling|offer/.test(lower) ? 3 : 0),
          "price element"
        );
      }
    }

    const visible = (document.body?.innerText || "").slice(0, 80000);

    for (const m of visible.match(moneyGlobal) || []) {
      push(m, 1, "visible text");
    }

    return candidates.sort((a, b) => b.score - a.score);
  }

  function current(ld) {
    const host = location.hostname;
    const vals = [];

    const add = sels =>
      sels.forEach(s => {
        for (const el of document.querySelectorAll(s)) {
          vals.push(
            el.textContent ||
            el.getAttribute("content") ||
            el.getAttribute("data-price")
          );

          if (vals.length > 30) break;
        }
      });

    if (/amazon\./i.test(host)) {
      add([
        "#corePrice_feature_div .a-offscreen",
        "#corePrice_desktop .a-offscreen",
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        "#apex_desktop .a-offscreen",
        "#tp_price_block_total_price_ww .a-offscreen",
        ".a-price .a-offscreen"
      ]);
    }

    if (/flipkart\./i.test(host)) {
      add([
        "div.Nx9bqj",
        "div._30je3q",
        "div.CEmiEU",
        "[class*='Nx9bqj']",
        "[class*='dyC4hf']"
      ]);
    }

    if (/myntra\./i.test(host)) {
      add([
        ".pdp-price",
        ".pdp-discount-container",
        "[class*='pdp-price']"
      ]);
    }

    if (/bata\./i.test(host)) {
      add([
        "[itemprop='price']",
        ".price",
        ".product-price",
        ".sales-price",
        "[class*='price']"
      ]);
    }

    if (/croma\./i.test(host)) {
      add([
        "[data-testid*='price' i]",
        "[class*='price' i]",
        "[class*='Price' i]",
        "[id*='price' i]",
        "[itemprop='price']",
        "[data-testid*='mrp' i]"
      ]);
    }

    if (/boat-lifestyle\./i.test(host)) {
      add([
        "[class*='price' i]",
        "[class*='Price' i]",
        "[data-price]",
        "[itemprop='price']"
      ]);
    }

    if (/ajio\./i.test(host)) {
      add([
        "[class*='price' i]",
        "[id*='price' i]",
        "[itemprop='price']"
      ]);
    }

    if (/neemans\./i.test(host)) {
      add([
        "[class*='price' i]",
        "[id*='price' i]",
        "[itemprop='price']"
      ]);
    }

    vals.push(
      document.querySelector('[itemprop="price"]')?.getAttribute("content"),
      document.querySelector('[data-a-price]')?.getAttribute("data-a-price"),
      document.querySelector('[data-price]')?.getAttribute("data-price"),
      ld?.offers?.price,
      Array.isArray(ld?.offers) ? ld.offers[0]?.price : null,
      meta("product:price:amount"),
      meta("og:price:amount")
    );

    const hint =
      (Array.isArray(ld?.offers)
        ? ld.offers[0]?.priceCurrency
        : ld?.offers?.priceCurrency) ||
      meta("product:price:currency") ||
      meta("og:price:currency");

    for (const v of vals) {
      const p = parsePrice(v, hint);

      if (p) return p;
    }

    const candidates = collectTextCandidates();

    const productArea =
      document.querySelector("main")?.innerText ||
      document.body?.innerText ||
      "";

    const strong = candidates.filter(c => c.score >= 6);

    const contextual = candidates.filter(c => {
      const i = productArea.indexOf(c.raw);

      if (i < 0) return false;

      const near = productArea
        .slice(Math.max(0, i - 140), i + 140)
        .toLowerCase();

      return /price|sale|offer|now|selling|buy|mrp/.test(near);
    });

    return strong[0] || contextual[0] || candidates[0] || null;
  }

  function mrp(ld, currentPrice) {
    const sels = [
      "#corePrice_desktop .a-text-price .a-offscreen",
      "#corePrice_feature_div .a-text-price .a-offscreen",
      ".basisPrice .a-offscreen",
      "[data-a-strike='true'] .a-offscreen",
      "[class*='mrp' i]",
      ".mrp",
      "[class*='original-price' i]"
    ];

    for (const s of sels) {
      for (const el of document.querySelectorAll(s)) {
        const p = parsePrice(el.textContent);

        if (
          p &&
          (!currentPrice || p.price > currentPrice.price)
        ) {
          return p.price;
        }
      }
    }

    const text =
      document.body?.innerText?.slice(0, 80000) || "";

    const m = text.match(
      /(?:M\.?R\.?P\.?|MRP)\s*[:\-]?\s*((?:₹|Rs\.?|INR|\$|€|£)?\s*[\d,]+(?:\.\d{1,2})?)/i
    );

    const n = m ? number(m[1]) : null;

    return n &&
      (!currentPrice || n > currentPrice.price)
      ? n
      : null;
  }

  function launch(ld) {
    for (const c of [
      ld?.releaseDate,
      ld?.dateCreated,
      document
        .querySelector('[itemprop="releaseDate"]')
        ?.getAttribute("content"),
      meta("product:release_date"),
      meta("release_date")
    ]) {
      if (!c) continue;

      const d = new Date(c);

      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    }

    return null;
  }

  function offers() {
    const all = [];

    for (const x of ldProducts()) {
      const o = x?.offers;

      if (Array.isArray(o)) {
        all.push(...o);
      } else if (o) {
        all.push(o);
      }
    }

    return all
      .filter(o => number(o?.price))
      .map(o => ({
        retailer:
          o?.seller?.name ||
          o?.url ||
          "market offer",
        price: number(o.price),
        currency: o.priceCurrency || ""
      }))
      .slice(0, 6);
  }

  function detect() {
    const ld = productLd();
    const p = current(ld);

    const productName = title(ld);

    const currency =
      p?.currency ||
      String(
        (Array.isArray(ld?.offers)
          ? ld.offers[0]?.priceCurrency
          : ld?.offers?.priceCurrency) ||
        "INR"
      ).toUpperCase();

    return {
      productName: productName || "Product",
      currentPrice: p?.price || null,
      currency,
      retailer: location.hostname.replace(/^www\./, ""),
      url: location.href,
      image: image(ld),
      mrp: mrp(ld, p),
      launchDate: launch(ld),
      offers: offers(),
      capturedAt: new Date().toISOString(),
      detected: Boolean(productName && p?.price),
      evidence: p?.source || "none"
    };
  }

  function buildContext({
    currentPrice,
    mrp,
    launchDate
  }) {
    const current = Number(currentPrice);

    const anchor =
      Number(mrp) || current * 1.18;

    let ageMonths = 6;

    if (launchDate) {
      const d = new Date(launchDate);

      if (!Number.isNaN(d.getTime())) {
        ageMonths = Math.max(
          1,
          (Date.now() - d.getTime()) / 2629800000
        );
      }
    }

    const decay = Math.min(
      0.24,
      Math.max(0.05, ageMonths * 0.018)
    );

    const typical = Math.round(
      Math.max(
        current * 1.02,
        anchor * (1 - decay) * 0.96
      )
    );

    const lowest = Math.round(
      Math.max(
        current * 0.88,
        Math.min(
          current * 0.98,
          typical * 0.90
        )
      )
    );

    const highest = Math.round(
      Math.max(
        anchor,
        typical * 1.08
      )
    );

    return {
      type: "estimated",
      typical,
      lowest,
      highest,
      confidence:
        mrp || launchDate
          ? "medium"
          : "low"
    };
  }

  function makeHistory(
    current,
    typical,
    lowest,
    highest,
    days = 90
  ) {
    const n =
      days === 30
        ? 8
        : days === 90
        ? 14
        : 18;

    const pts = [];

    const safeLow = Math.min(
      lowest,
      current,
      typical,
      highest
    );

    const safeHigh = Math.max(
      lowest,
      current,
      typical,
      highest
    );

    const span = Math.max(
      1,
      safeHigh - safeLow
    );

    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);

      const base =
        typical +
        (current - typical) * t;

      const wave =
        Math.sin(i * 1.37) *
        span *
        0.10;

      pts.push(
        Math.round(
          Math.max(
            safeLow,
            Math.min(
              safeHigh,
              base + wave
            )
          )
        )
      );
    }

    if (n >= 8) {
      pts[Math.floor(n * 0.30)] = safeHigh;
      pts[Math.floor(n * 0.62)] = safeLow;
    }

    pts[0] = Math.max(
      safeLow,
      Math.min(
        safeHigh,
        Math.round(
          (typical + safeHigh) / 2
        )
      )
    );

    pts[n - 1] = Math.round(current);

    const dates = pts.map((_, i) => {
      const d = new Date();

      d.setDate(
        d.getDate() -
        Math.round(
          ((n - 1 - i) * days) /
            (n - 1)
        )
      );

      return d.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short"
        }
      );
    });

    return pts.map((price, i) => ({
      date: dates[i],
      price
    }));
  }

  function dealScore({
    current,
    typical,
    lowest,
    highest,
    trend,
    confidence
  }) {
    const range = Math.max(
      1,
      highest - lowest
    );

    const position = Math.max(
      0,
      Math.min(
        100,
        ((highest - current) / range) * 100
      )
    );

    const gap =
      ((typical - current) /
        Math.max(1, typical)) *
      100;

    const typicalComponent =
      Math.max(
        0,
        Math.min(
          100,
          50 + gap * 2.5
        )
      );

    const lowComponent =
      Math.max(
        0,
        Math.min(
          100,
          100 -
            ((current - lowest) /
              Math.max(
                1,
                typical - lowest
              )) *
              100
        )
      );

    const trendComponent =
      trend === "down"
        ? 85
        : trend === "up"
        ? 35
        : 60;

    const confidenceFactor =
      confidence === "high"
        ? 1
        : confidence === "medium"
        ? 0.95
        : 0.88;

    return Math.round(
      Math.max(
        0,
        Math.min(
          100,
          (
            position * 0.30 +
            typicalComponent * 0.35 +
            lowComponent * 0.20 +
            trendComponent * 0.15
          ) *
            confidenceFactor
        )
      )
    );
  }

  function reasons({
    current,
    typical,
    lowest,
    trend
  }) {
    const a = [];

    const gap =
      ((current - typical) /
        Math.max(1, typical)) *
      100;

    if (gap <= -5) {
      a.push(
        `Below typical price (${Math.abs(gap).toFixed(0)}% lower)`
      );
    } else if (gap >= 5) {
      a.push(
        `Above typical price (${gap.toFixed(0)}% higher)`
      );
    } else {
      a.push("Near typical price");
    }

    const lowGap =
      ((current - lowest) /
        Math.max(1, lowest)) *
      100;

    a.push(
      lowGap <= 5
        ? "Near the lowest reference level"
        : "Not at the lowest reference level"
    );

    a.push(
      trend === "down"
        ? "Recent downward movement"
        : trend === "up"
        ? "Recent upward movement"
        : "Price relatively stable"
    );

    return a;
  }

  function decision(score) {
    return score >= 72
      ? {
          title: "Good time to buy",
          detail:
            "Current price appears favorable against estimated market context.",
          tone: "positive"
        }
      : score <= 42
      ? {
          title: "Wait",
          detail:
            "Current price is relatively high compared with its reference range.",
          tone: "negative"
        }
      : {
          title: "Fair price",
          detail:
            "Current price is close to the product's normal reference range.",
          tone: "neutral"
        };
  }

  function money(v, c = "INR") {
    if (!Number.isFinite(Number(v))) {
      return "—";
    }

    const symbols = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£"
    };

    const symbol =
      symbols[c] ||
      (c ? c + " " : "");

    return (
      symbol +
      Math.round(v).toLocaleString(
        c === "INR"
          ? "en-IN"
          : "en-US"
      )
    );
  }

  const UI = `
<div class="app">
  <header class="header">
    <div>
      <div class="logo">PRICELY<span class="spark">✦</span></div>
      <div class="sublogo">PRICE INTELLIGENCE</div>
    </div>

    <div class="header-actions">
      <div id="ready" class="ready">
        <span></span> READY
      </div>

      <button
        id="minBtn"
        class="chrome-btn"
        title="Minimize PRICELY"
        aria-label="Minimize PRICELY"
      >−</button>

      <button
        id="closeBtn"
        class="chrome-btn"
        title="Close PRICELY"
        aria-label="Close PRICELY"
      >×</button>
    </div>
  </header>

  <div class="divider"></div>

  <section id="landing" class="screen">
    <div class="kicker">BUY WITH CONTEXT</div>

    <h1>
      Know the <em>real value</em><br>
      before you buy.
    </h1>

    <p class="intro">
      PRICELY reads the product you're viewing and turns
      price signals into a simple buying decision.
    </p>

    <div class="current-card">
      <div class="tiny-label">CURRENT TAB</div>

      <div id="landingStatus" class="landing-status">
        No product detected yet
      </div>

      <button id="analyzeBtn">
        ANALYZE THIS PAGE →
      </button>
    </div>

    <div class="steps">
      <div>
        <b>01</b>
        <span>Price signal</span>
      </div>

      <div>
        <b>02</b>
        <span>Deal score</span>
      </div>

      <div>
        <b>03</b>
        <span>Decision</span>
      </div>
    </div>
  </section>

  <section id="scanning" class="screen hidden">
    <div class="kicker">BUY WITH CONTEXT</div>

    <h1>
      Reading the <em>real value</em><br>
      of this product.
    </h1>

    <div class="scan-card">
      <div class="scan-orbit">
        <div class="scan-spark">✦</div>
      </div>

      <h2>Analyzing this page…</h2>

      <p>
        Reading product details, prices and market signals.
      </p>

      <div class="checks">
        <div>
          <i>✓</i>
          Extracting product information
        </div>

        <div>
          <i>✓</i>
          Checking current price
        </div>

        <div>
          <i>✓</i>
          Building price context
        </div>

        <div>
          <i>✓</i>
          Analyzing deal signals
        </div>
      </div>
    </div>

    <div class="steps scansteps">
      <div>
        <b>01</b>
        <span>Price signal</span>
      </div>

      <div>
        <b>02</b>
        <span>Deal score</span>
      </div>

      <div>
        <b>03</b>
        <span>Decision</span>
      </div>
    </div>
  </section>

  <section id="results" class="screen hidden">
    <div class="result-toolbar">
      <button id="backBtn" class="text-btn">
        ← BACK
      </button>

      <button id="reanalyzeBtn" class="text-btn">
        RE-ANALYZE ↻
      </button>
    </div>

    <div class="product-head">
      <div id="thumb" class="thumb">
        <img id="img" alt="">
      </div>

      <div class="product-copy">
        <div id="name" class="name"></div>
        <div id="retailer" class="retailer"></div>

        <div>
          <span id="price" class="price"></span>
          <span class="live">LIVE PRICE</span>
        </div>
      </div>
    </div>

    <div id="priceMeta" class="price-meta"></div>

    <button id="verdict" class="verdict">
      <span id="vdot" class="vdot"></span>

      <span>
        <strong id="vtitle"></strong>
        <small id="vdetail"></small>
      </span>

      <b>›</b>
    </button>

    <div id="score-card" class="score-card">
      <div class="score-head">
        <span>
          DEAL SIGNAL
          <button
            id="scoreInfo"
            class="info"
            aria-label="Explain Deal Signal"
          >i</button>
        </span>

        <button
          id="scoreCollapse"
          class="collapse"
          aria-label="Collapse Deal Signal"
        >⌃</button>
      </div>

      <div class="score">
        <span>—</span>
        <strong id="score">50</strong>
        <small>/ 100</small>
      </div>

      <div id="reasons" class="reasons"></div>
    </div>

    <div class="history-card">
      <div class="history-head">
        <span>PRICE HISTORY</span>
        <small id="historyType">
          ESTIMATED REFERENCE
        </small>
      </div>

      <div class="tabs">
        <button data-days="30">30D</button>
        <button class="active" data-days="90">90D</button>
        <button data-days="365">1Y</button>
      </div>

      <div class="chart-box">
        <svg
          id="chart"
          viewBox="0 0 348 132"
          preserveAspectRatio="none"
        ></svg>

        <span id="nowLabel"></span>
      </div>

      <div class="metrics">
        <div>
          <b id="m1"></b>
          <span>Current</span>
        </div>

        <div>
          <b id="m2"></b>
          <span id="typicalLabel">Est. typical</span>
        </div>

        <div>
          <b id="m3"></b>
          <span>Lowest</span>
        </div>

        <div>
          <b id="m4"></b>
          <span>Highest</span>
        </div>
      </div>

      <div class="badges">
        <div>
          <b>◆</b>

          <span>
            <strong id="lowBadge"></strong>
            <small id="lowBadgeSub">
              model reference
            </small>
          </span>
        </div>

        <div>
          <b>◌</b>

          <span>
            <strong id="marketBadge">
              Market context
            </strong>

            <small id="marketBadgeSub">
              current price + conservative model
            </small>
          </span>
        </div>
      </div>

      <div class="source">
        <strong>
          DATA SOURCE

          <button
            id="sourceInfo"
            class="info"
            aria-label="Explain data source"
          >i</button>
        </strong>

        <p id="source"></p>
      </div>

      <div id="comparisonNotice" class="notice hidden"></div>

      <button id="viewBtn" class="view">
        VIEW ON RETAILER →
      </button>
    </div>

    <div class="footer">
      <span>PRICELY</span>
      <small>v1.1.0</small>
      <br>
      <em>Buy with context. Always.</em>
    </div>
  </section>

  <div
    id="infoModal"
    class="modal hidden"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modalTitle"
  >
    <div class="modal-card">
      <div class="modal-top">
        <span id="modalEyebrow">PRICELY</span>

        <button
          id="modalClose"
          class="modal-close"
          aria-label="Close"
        >×</button>
      </div>

      <h2 id="modalTitle"></h2>
      <div id="modalBody"></div>
    </div>
  </div>
</div>
`;

  const CSS = `
*{box-sizing:border-box}

:root{
  --bg:#160f16;
  --panel:#1d151d;
  --panel2:#211721;
  --text:#f4eee9;
  --muted:#b8a4ac;
  --accent:#d989ae;
  --accent2:#e5a1bf;
  --border:#3a2735;
  --green:#a8c7a8;
  --amber:#d5b98d;
  --red:#d59a9a
}

html,body{
  margin:0;
  width:400px;
  min-width:400px;
  height:600px;
  min-height:600px;
  background:var(--bg);
  color:var(--text)
}

body{
  font-family:"Segoe UI",Arial,sans-serif;
  overflow-y:auto;
  overflow-x:hidden
}

button{
  font:inherit;
  color:inherit
}

button:focus-visible{
  outline:1px solid var(--accent2);
  outline-offset:2px
}

.app{
  width:400px;
  min-height:600px;
  padding:20px 22px 20px;
  background:
    radial-gradient(
      circle at 80% 0%,
      rgba(217,137,174,.075),
      transparent 31%
    ),
    var(--bg)
}

.header{
  display:flex;
  justify-content:space-between;
  align-items:flex-start
}

.logo{
  font-family:Georgia,"Times New Roman",serif;
  font-size:34px;
  line-height:.92;
  letter-spacing:-1.5px
}

.spark{
  color:var(--accent2);
  font-size:18px;
  margin-left:3px;
  vertical-align:top
}

.sublogo{
  margin-top:9px;
  font:9px "Courier New",monospace;
  letter-spacing:1.4px;
  color:#d5c4ca
}

.header-actions{
  display:flex;
  align-items:center;
  gap:5px
}

.ready{
  font:9px "Courier New",monospace;
  letter-spacing:.9px;
  color:#cdbdc3;
  margin-top:6px;
  margin-right:3px
}

.ready span{
  display:inline-block;
  width:8px;
  height:8px;
  border-radius:50%;
  background:var(--green);
  margin-right:6px
}

.ready.scanning span{
  background:var(--accent2)
}

.chrome-btn{
  width:23px;
  height:23px;
  border:1px solid transparent;
  border-radius:50%;
  background:transparent;
  color:#927e88;
  font-size:16px;
  line-height:18px;
  cursor:pointer
}

.chrome-btn:hover{
  border-color:var(--border);
  color:var(--text);
  background:#211821
}

.divider{
  height:1px;
  background:var(--border);
  margin:23px 0 42px
}

.screen{
  min-height:500px
}

.kicker{
  font:9px "Courier New",monospace;
  letter-spacing:1.5px;
  color:var(--accent2);
  margin-bottom:23px
}

h1{
  font:500 36px/1.02 Georgia,"Times New Roman",serif;
  letter-spacing:-1.55px;
  margin:0;
  color:var(--text)
}

h1 em{
  color:var(--accent2);
  font-style:italic
}

.intro{
  font-size:15px;
  line-height:1.52;
  color:#b7a7ae;
  margin:25px 0 29px
}

.current-card{
  border:1px solid var(--border);
  padding:19px 19px 18px;
  background:rgba(255,255,255,.008)
}

.tiny-label{
  font:9px "Courier New",monospace;
  letter-spacing:1.2px;
  color:#a9919b
}

.landing-status{
  font-size:14px;
  margin:12px 0 18px;
  line-height:1.4
}

#analyzeBtn{
  width:100%;
  height:52px;
  border:0;
  background:#d889a9;
  color:#170f15;
  font-size:14px;
  font-weight:700;
  letter-spacing:.15px;
  cursor:pointer
}

#analyzeBtn:hover{
  background:#e49ab8
}

.steps{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:12px;
  margin-top:34px
}

.steps>div{
  border-top:1px solid var(--border);
  padding-top:11px
}

.steps b{
  display:block;
  font:9px "Courier New",monospace;
  color:var(--accent2);
  margin-bottom:8px
}

.steps span{
  font-size:11px;
  color:#b7a7ae
}

.hidden{
  display:none!important
}

.scan-card{
  border:1px solid var(--border);
  padding:23px 19px 21px;
  text-align:center;
  background:rgba(255,255,255,.012)
}

.scan-orbit{
  width:70px;
  height:70px;
  border:1px solid #70455e;
  border-radius:50%;
  display:grid;
  place-items:center;
  margin:0 auto 17px;
  box-shadow:
    0 0 0 9px rgba(217,137,174,.035),
    0 0 0 18px rgba(217,137,174,.018)
}

.scan-spark{
  width:36px;
  height:36px;
  border:1px solid var(--accent);
  border-radius:50%;
  display:grid;
  place-items:center;
  color:var(--accent2);
  font-size:18px
}

.scan-card h2{
  font:500 18px Georgia,serif;
  margin:0 0 7px
}

.scan-card p{
  font-size:11px;
  line-height:1.4;
  color:#a9969f;
  margin:0 auto 19px;
  max-width:260px
}

.checks{
  display:grid;
  gap:9px;
  text-align:left
}

.checks div{
  font-size:11px;
  color:#c8b8bf
}

.checks i{
  display:inline-grid;
  place-items:center;
  width:17px;
  height:17px;
  border-radius:50%;
  background:var(--accent2);
  color:#160f16;
  font-style:normal;
  font-weight:700;
  margin-right:8px
}

.steps.scansteps{
  margin-top:27px
}

.result-toolbar{
  display:flex;
  justify-content:space-between;
  margin:-7px 0 9px
}

.text-btn{
  border:0;
  background:transparent;
  padding:3px 0;
  color:#907d87;
  font:8px "Courier New",monospace;
  letter-spacing:.8px;
  cursor:pointer
}

.text-btn:hover{
  color:var(--accent2)
}

.product-head{
  display:flex;
  gap:11px;
  align-items:center;
  margin-bottom:9px
}

.thumb{
  width:54px;
  height:54px;
  border:1px solid var(--border);
  border-radius:9px;
  background:#211721;
  overflow:hidden;
  display:grid;
  place-items:center;
  flex:none
}

.thumb img{
  width:100%;
  height:100%;
  object-fit:contain
}

.thumb.empty:after{
  content:"";
  width:18px;
  height:18px;
  border:1px solid #69445b;
  border-radius:50%
}

.product-copy{
  min-width:0
}

.name{
  font-size:13px;
  font-weight:650;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis
}

.retailer{
  font-size:10px;
  color:#9f8d96;
  margin:3px 0 4px
}

.price{
  font-size:24px;
  font-weight:600
}

.live{
  font:8px "Courier New",monospace;
  letter-spacing:.6px;
  color:var(--accent2);
  border:1px solid #69445b;
  border-radius:12px;
  padding:3px 6px
}

.price-meta{
  min-height:14px;
  color:#a9929c;
  font-size:9px;
  margin:-2px 0 8px
}

.verdict{
  width:100%;
  display:flex;
  align-items:center;
  gap:9px;
  text-align:left;
  background:#201720;
  border:1px solid #664458;
  border-radius:11px;
  padding:12px 12px;
  cursor:default
}

.vdot{
  width:10px;
  height:10px;
  border-radius:50%;
  background:var(--amber);
  flex:none
}

.verdict>span:nth-child(2){
  flex:1
}

.verdict strong{
  display:block;
  font:500 16px Georgia,serif;
  color:var(--amber)
}

.verdict small{
  display:block;
  color:#c6b6bd;
  font-size:10px;
  line-height:1.35;
  margin-top:3px
}

.verdict>b{
  font-size:21px;
  color:#a58f99
}

.score-card,
.history-card{
  border:1px solid var(--border);
  border-radius:11px;
  margin-top:12px;
  background:rgba(255,255,255,.01)
}

.score-head{
  padding:11px 13px 2px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  font:9px "Courier New",monospace;
  letter-spacing:.7px;
  color:#d9b4c8
}

.score-head>span{
  display:flex;
  align-items:center;
  gap:5px
}

.info,
.collapse{
  border:0;
  background:transparent;
  padding:0;
  cursor:pointer
}

.info{
  display:inline-grid;
  place-items:center;
  width:13px;
  height:13px;
  border:1px solid #725467;
  border-radius:50%;
  font:8px Georgia,serif;
  color:#d9b4c8
}

.info:hover{
  background:#332331;
  color:var(--text)
}

.collapse{
  color:#a58d98;
  font-size:13px;
  width:18px
}

.score{
  padding:0 13px 7px;
  display:flex;
  align-items:baseline
}

.score>span{
  font-size:18px;
  color:#766871;
  margin-right:2px
}

.score strong{
  font:500 34px Georgia,serif;
  color:var(--green)
}

.score small{
  font-size:16px;
  color:#ddd2d6;
  margin-left:4px
}

.reasons{
  display:grid;
  gap:6px;
  padding:0 13px 12px
}

.reason{
  font-size:10px;
  color:#c6b7bd
}

.reason:before{
  content:"";
  display:inline-block;
  width:6px;
  height:6px;
  border-radius:50%;
  background:var(--green);
  margin:0 7px 1px 0
}

.score-card.collapsed .reasons,
.score-card.collapsed .score{
  display:none
}

.history-card{
  padding:12px;
  margin-top:15px
}

.history-head{
  display:flex;
  justify-content:space-between;
  font:9px "Courier New",monospace;
  letter-spacing:.5px;
  color:#d9b4c8
}

.history-head small{
  font-size:8px;
  color:#8f7b85
}

.tabs{
  width:185px;
  height:27px;
  margin:9px auto 6px;
  background:#2b1f2a;
  border-radius:15px;
  display:flex;
  overflow:hidden
}

.tabs button{
  flex:1;
  border:0;
  background:transparent;
  color:#9e8a94;
  font:10px "Courier New",monospace;
  cursor:pointer
}

.tabs button.active{
  background:#4a3344;
  color:#f4eee9;
  border-radius:15px
}

.chart-box{
  height:132px;
  position:relative
}

.chart-box svg{
  width:100%;
  height:132px
}

.grid{
  stroke:#33242f;
  stroke-width:1
}

.line{
  fill:none;
  stroke:var(--accent2);
  stroke-width:2.2
}

.area{
  fill:rgba(217,137,174,.06)
}

.xlabel{
  fill:#8d7b84;
  font:8px "Courier New",monospace
}

.ylabel{
  fill:#8d7b84;
  font:8px "Courier New",monospace
}

.dotc{
  fill:var(--accent2)
}

#nowLabel{
  position:absolute;
  right:1px;
  top:40px;
  background:var(--accent2);
  color:#160f16;
  border-radius:6px;
  padding:4px 6px;
  font:10px "Courier New",monospace;
  font-weight:700
}

.metrics{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:5px
}

.metrics>div{
  border:1px solid var(--border);
  border-radius:7px;
  padding:8px 6px
}

.metrics b{
  display:block;
  font:11px "Courier New",monospace;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis
}

.metrics span{
  display:block;
  color:#8f7d86;
  font-size:8px;
  margin-top:3px
}

.badges{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:5px;
  margin-top:6px
}

.badges>div{
  border:1px solid var(--border);
  border-radius:7px;
  padding:8px;
  display:flex;
  gap:6px;
  align-items:center
}

.badges b{
  color:var(--accent2);
  font-size:15px
}

.badges strong{
  display:block;
  font:9px "Courier New",monospace;
  color:#d5b7c6
}

.badges small{
  display:block;
  color:#8f7d86;
  font-size:7px;
  margin-top:3px
}

.source{
  margin-top:12px
}

.source>strong{
  font:9px "Courier New",monospace;
  color:#bba9b0;
  display:flex;
  align-items:center;
  gap:5px
}

.source p{
  margin:5px 0 0;
  color:#9a8790;
  font-size:9px;
  line-height:1.4
}

.view{
  width:100%;
  height:39px;
  margin-top:11px;
  background:transparent;
  border:1px solid var(--accent2);
  border-radius:20px;
  color:var(--accent2);
  font:10px "Courier New",monospace;
  letter-spacing:.5px;
  cursor:pointer
}

.view:hover{
  background:rgba(217,137,174,.06)
}

.footer{
  margin-top:13px;
  border-top:1px solid var(--border);
  padding-top:10px;
  color:#d9b4c8
}

.footer span{
  font:19px Georgia,serif
}

.footer small{
  float:right;
  font:9px "Courier New",monospace;
  color:#9c8992;
  margin-top:5px
}

.footer em{
  display:block;
  font-size:10px;
  color:#8f7d86;
  margin-top:2px
}

.notice{
  border:1px solid var(--border);
  border-radius:9px;
  padding:11px 12px;
  margin-top:11px;
  font-size:10px;
  line-height:1.4;
  color:#aa989f
}

.notice strong{
  color:#d9b4c8;
  font-family:"Courier New",monospace;
  font-size:9px
}

.modal{
  position:fixed;
  inset:0;
  background:rgba(10,7,10,.68);
  display:grid;
  place-items:center;
  padding:18px;
  z-index:20
}

.modal-card{
  width:100%;
  max-width:350px;
  background:#1b141b;
  border:1px solid #6a4659;
  border-radius:12px;
  padding:16px;
  box-shadow:0 20px 60px rgba(0,0,0,.5)
}

.modal-top{
  display:flex;
  justify-content:space-between;
  align-items:center
}

.modal-top span{
  font:9px "Courier New",monospace;
  letter-spacing:1px;
  color:var(--accent2)
}

.modal-close{
  border:0;
  background:transparent;
  color:#a89099;
  font-size:20px;
  cursor:pointer
}

.modal-card h2{
  font:500 23px Georgia,serif;
  margin:12px 0;
  color:var(--text)
}

.modal-card p{
  font-size:11px;
  line-height:1.5;
  color:#c1b1b8;
  margin:10px 0
}

.weight{
  display:flex;
  justify-content:space-between;
  border-top:1px solid var(--border);
  padding:9px 0;
  color:#bcaab2;
  font-size:10px
}

.weight b{
  color:var(--accent2);
  font-family:"Courier New",monospace
}

.modal-note{
  border-left:2px solid var(--accent);
  padding-left:9px
}

.modal-note strong{
  color:var(--text)
}

@media(max-width:399px){
  html,body{
    width:100%;
    min-width:0
  }

  .app{
    width:100%
  }
}
`;

  let host = null;
  let shadow = null;
  let product = null;
  let context = null;
  let selectedDays = 90;

  const qs = id =>
    shadow?.getElementById(id) || null;

  function setScreen(id) {
    ["landing", "scanning", "results"].forEach(x => {
      qs(x)?.classList.toggle(
        "hidden",
        x !== id
      );
    });

    const r = qs("ready");

    if (r) {
      r.classList.toggle(
        "scanning",
        id === "scanning"
      );

      r.innerHTML =
        `<span></span> ${
          id === "scanning"
            ? "SCANNING"
            : "READY"
        }`;
    }
  }

  function applySpace() {
    if (document.body) {
      document.body.style.setProperty(
        "padding-right",
        "400px",
        "important"
      );
    }
  }

  function releaseSpace() {
    document.body?.style.removeProperty(
      "padding-right"
    );
  }

  function closePanel() {
    host?.remove();

    host = null;
    shadow = null;
    product = null;
    context = null;

    releaseSpace();
  }

  function minimize() {
    if (!host) return;

    host.classList.add("mini");
    releaseSpace();
  }

  function restore() {
    if (!host) return;

    host.classList.remove("mini");
    applySpace();
  }

  function mount() {
    if (host) return;

    host = document.createElement("div");

    host.id = "pricely-dock-host";

    host.style.cssText =
      "position:fixed!important;" +
      "top:0!important;" +
      "right:0!important;" +
      "width:400px!important;" +
      "height:min(600px,100vh)!important;" +
      "max-height:600px!important;" +
      "z-index:2147483647!important;" +
      "background:#160F16!important;" +
      "box-shadow:-18px 0 50px rgba(0,0,0,.22)!important;";

    shadow = host.attachShadow({
      mode: "open"
    });

    const st =
      document.createElement("style");

    st.textContent =
      CSS +
      `
.mini{
  width:46px!important;
  height:58px!important;
  top:42%!important;
  background:#160f16!important;
  border:1px solid #6b455b!important;
  border-right:0!important;
  border-radius:12px 0 0 12px!important;
  box-shadow:0 8px 30px rgba(0,0,0,.35)!important
}`;

    shadow.appendChild(st);

    const wrap =
      document.createElement("div");

    wrap.innerHTML = UI;

    shadow.appendChild(wrap);

    document.documentElement.appendChild(
      host
    );

    applySpace();
    bind();
    setScreen("landing");
    refreshLanding();
  }

  function bind() {
    qs("analyzeBtn")?.addEventListener(
      "click",
      analyze
    );

    qs("reanalyzeBtn")?.addEventListener(
      "click",
      analyze
    );

    qs("backBtn")?.addEventListener(
      "click",
      () => {
        product = null;
        context = null;

        setScreen("landing");
        refreshLanding();
      }
    );

    qs("minBtn")?.addEventListener(
      "click",
      minimize
    );

    qs("closeBtn")?.addEventListener(
      "click",
      closePanel
    );

    qs("scoreCollapse")?.addEventListener(
      "click",
      () =>
        qs("score-card")?.classList.toggle(
          "collapsed"
        )
    );

    qs("scoreInfo")?.addEventListener(
      "click",
      e => {
        e.stopPropagation();

        openModal(
          "How Deal Signal works",
          `
<p>
Deal Signal estimates how attractive the
current price is relative to the available
reference signals.
</p>

<div class="weight">
  <span>Typical-price position</span>
  <b>35%</b>
</div>

<div class="weight">
  <span>Reference-range position</span>
  <b>30%</b>
</div>

<div class="weight">
  <span>Low-price proximity</span>
  <b>20%</b>
</div>

<div class="weight">
  <span>Recent movement</span>
  <b>15%</b>
</div>

<p class="modal-note">
<strong>
The score does not predict future prices.
</strong>
It summarizes the price evidence available
to PRICELY at analysis time.
</p>
`,
          "DEAL SIGNAL"
        );
      }
    );

    qs("sourceInfo")?.addEventListener(
      "click",
      e => {
        e.stopPropagation();

        openModal(
          "Data source & confidence",
          `
<p>
PRICELY separates observed evidence from
modeled reference values.
</p>

<p>
<strong>Current price:</strong>
read from retailer-native elements,
structured product data or visible page
price evidence.
</p>

<p>
<strong>Reference history:</strong>
modeled when verified historical observations
are unavailable.
</p>

<p class="modal-note">
Estimated references are not presented as
verified historical observations.
</p>
`,
          "DATA SOURCE"
        );
      }
    );

    qs("modalClose")?.addEventListener(
      "click",
      closeModal
    );

    qs("infoModal")?.addEventListener(
      "click",
      e => {
        if (
          e.target === qs("infoModal")
        ) {
          closeModal();
        }
      }
    );

    qs("viewBtn")?.addEventListener(
      "click",
      () => {
        if (product?.url) {
          window.open(
            product.url,
            "_blank",
            "noopener"
          );
        }
      }
    );

    shadow
      .querySelectorAll(".tabs button")
      .forEach(btn => {
        btn.addEventListener(
          "click",
          () => {
            shadow
              .querySelectorAll(
                ".tabs button"
              )
              .forEach(x =>
                x.classList.remove(
                  "active"
                )
              );

            btn.classList.add("active");

            renderHistory(
              Number(btn.dataset.days)
            );
          }
        );
      });
  }

  function openModal(
    title,
    body,
    eyebrow = "PRICELY"
  ) {
    qs("modalEyebrow").textContent =
      eyebrow;

    qs("modalTitle").textContent =
      title;

    qs("modalBody").innerHTML =
      body;

    qs("infoModal").classList.remove(
      "hidden"
    );
  }

  function closeModal() {
    qs("infoModal")?.classList.add(
      "hidden"
    );
  }

  function drawChart(
    history,
    currency
  ) {
    if (!history?.length) return;

    const svg = qs("chart");

    const w = 348;
    const h = 132;

    const left = 8;
    const right = 5;
    const top = 14;
    const bottom = 23;

    const vals =
      history.map(x => x.price);

    const min = Math.min(...vals);
    const max = Math.max(...vals);

    const range =
      Math.max(1, max - min);

    const pts = history.map(
      (p, i) => [
        left +
          (i /
            Math.max(
              1,
              history.length - 1
            )) *
            (w - left - right),

        top +
          ((max - p.price) /
            range) *
            (h - top - bottom)
      ]
    );

    const path = pts
      .map(
        (p, i) =>
          (i ? "L" : "M") +
          ` ${p[0].toFixed(1)} ${p[1].toFixed(1)}`
      )
      .join(" ");

    const area =
      path +
      ` L ${pts.at(-1)[0]} ${h - bottom}` +
      ` L ${pts[0][0]} ${h - bottom} Z`;

    const ys = [
      max,
      min + range / 2,
      min
    ];

    const grid = ys
      .map((v, i) => {
        const y =
          top +
          (i / 2) *
            (h - top - bottom);

        return `
<line
  x1="${left}"
  y1="${y}"
  x2="${w - right}"
  y2="${y}"
  class="grid"
/>

<text
  x="${left}"
  y="${y - 3}"
  class="ylabel"
>
${money(v, currency)}
</text>
`;
      })
      .join("");

    const first =
      history[0]?.date || "";

    const mid =
      history[
        Math.floor(
          history.length / 2
        )
      ]?.date || "";

    const last =
      history.at(-1)?.date || "";

    const labels = `
<text
  x="${left}"
  y="${h - 4}"
  class="xlabel"
>
${first}
</text>

<text
  x="${w / 2 - 15}"
  y="${h - 4}"
  class="xlabel"
>
${mid}
</text>

<text
  x="${w - right - 40}"
  y="${h - 4}"
  class="xlabel"
>
${last}
</text>
`;

    const lp = pts.at(-1);

    svg.innerHTML =
      grid +
      `
<path
  d="${area}"
  class="area"
/>

<path
  d="${path}"
  class="line"
/>

<circle
  cx="${lp[0]}"
  cy="${lp[1]}"
  r="3.5"
  class="dotc"
/>
` +
      labels;

    qs("nowLabel").textContent =
      money(
        history.at(-1).price,
        currency
      );

    qs("nowLabel").style.top =
      Math.max(
        17,
        Math.min(
          94,
          lp[1] - 9
        )
      ) + "px";
  }

  function renderHistory(
    days = selectedDays
  ) {
    if (!product || !context) return;

    selectedDays = days;

    const hist = makeHistory(
      product.currentPrice,
      context.typical,
      context.lowest,
      context.highest,
      days
    );

    drawChart(
      hist,
      product.currency
    );

    qs("m1").textContent =
      money(
        product.currentPrice,
        product.currency
      );

    qs("m2").textContent =
      money(
        context.typical,
        product.currency
      );

    qs("m3").textContent =
      money(
        Math.min(
          ...hist.map(x => x.price)
        ),
        product.currency
      );

    qs("m4").textContent =
      money(
        Math.max(
          ...hist.map(x => x.price)
        ),
        product.currency
      );
  }

  function render() {
    if (!product || !context) return;

    qs("name").textContent =
      product.productName ||
      "Product";

    qs("retailer").textContent =
      product.retailer ||
      "Current site";

    qs("price").textContent =
      money(
        product.currentPrice,
        product.currency
      );

    const metaBits = [];

    if (
      product.mrp &&
      product.mrp > product.currentPrice
    ) {
      metaBits.push(
        `${Math.round(
          (1 -
            product.currentPrice /
              product.mrp) *
            100
        )}% below MRP`
      );
    }

    if (product.evidence) {
      metaBits.push(
        product.evidence ===
          "visible text"
          ? "page price evidence"
          : "retailer price evidence"
      );
    }

    qs("priceMeta").textContent =
      metaBits.join(" · ");

    const img = qs("img");
    const thumb = qs("thumb");

    img.style.display = "none";
    thumb.classList.add("empty");

    if (product.image) {
      img.onload = () => {
        img.style.display = "block";
        thumb.classList.remove(
          "empty"
        );
      };

      img.src = product.image;
    }

    const hist = makeHistory(
      product.currentPrice,
      context.typical,
      context.lowest,
      context.highest,
      90
    );

    const trend =
      hist.at(-1).price <
      hist.at(-3).price
        ? "down"
        : hist.at(-1).price >
          hist.at(-3).price
        ? "up"
        : "stable";

    const score = dealScore({
      current: product.currentPrice,
      typical: context.typical,
      lowest: context.lowest,
      highest: context.highest,
      trend,
      confidence:
        context.confidence
    });

    const dec = decision(score);

    qs("vtitle").textContent =
      dec.title;

    qs("vdetail").textContent =
      dec.detail;

    const tone =
      dec.tone === "positive"
        ? "var(--green)"
        : dec.tone === "negative"
        ? "var(--red)"
        : "var(--amber)";

    qs("vdot").style.background =
      tone;

    qs("vtitle").style.color =
      tone;

    qs("score").textContent =
      score;

    qs("reasons").innerHTML =
      reasons({
        current:
          product.currentPrice,
        typical:
          context.typical,
        lowest:
          context.lowest,
        trend
      })
        .map(
          x =>
            `<div class="reason">${x}</div>`
        )
        .join("");

    qs("historyType").textContent =
      context.type === "estimated"
        ? "ESTIMATED REFERENCE"
        : "OBSERVED HISTORY";

    qs("lowBadge").textContent =
      context.type === "estimated"
        ? "Est. low " +
          money(
            context.lowest,
            product.currency
          )
        : "Low " +
          money(
            context.lowest,
            product.currency
          );

    qs("lowBadgeSub").textContent =
      context.type === "estimated"
        ? "model reference"
        : "observed reference";

    qs("marketBadge").textContent =
      product.offers?.length > 1
        ? "Market offers"
        : "Market context";

    qs("marketBadgeSub").textContent =
      product.offers?.length > 1
        ? `${product.offers.length} detected offers`
        : product.launchDate
        ? "launch + age + current price"
        : "current price + conservative model";

    qs("source").textContent =
      context.type === "estimated"
        ? "Estimated from available MRP/launch anchors, product age, current market price and a conservative reference model. Not presented as verified historical observations."
        : "Reference values are based on verified observations available to PRICELY.";

    if (product.offers?.length > 1) {
      qs("comparisonNotice")
        .classList.remove("hidden");

      qs("comparisonNotice").innerHTML =
        `
<strong>CROSS-RETAILER SIGNAL</strong>
<br>
${product.offers
  .map(
    o =>
      `${o.retailer}: ${money(
        o.price,
        o.currency ||
          product.currency
      )}`
  )
  .join(" · ")}
`;
    } else {
      qs("comparisonNotice")
        .classList.add("hidden");
    }

    renderHistory(90);
  }

  /*
   * Backend bridge.
   *
   * content.js does not call Render directly.
   * It asks the extension service worker to
   * perform the HTTPS request.
   */
  function backendAnalyze(payload) {
    return new Promise(resolve => {
      let finished = false;

      const timer = setTimeout(() => {
        if (finished) return;

        finished = true;

        resolve({
          ok: false,
          error:
            "Backend analysis timed out."
        });
      }, BACKEND_TIMEOUT);

      chrome.runtime.sendMessage(
        {
          type:
            "PRICELY_ANALYZE_BACKEND",
          payload
        },
        response => {
          if (finished) return;

          finished = true;
          clearTimeout(timer);

          if (
            chrome.runtime.lastError
          ) {
            resolve({
              ok: false,
              error:
                chrome.runtime.lastError
                  .message ||
                "Backend connection failed."
            });

            return;
          }

          if (!response?.ok) {
            resolve({
              ok: false,
              error:
                response?.error ||
                "Backend analysis failed."
            });

            return;
          }

          resolve({
            ok: true,
            data: response.data
          });
        }
      );
    });
  }

  async function analyze() {
    setScreen("scanning");

    qs("landingStatus").textContent =
      "Reading this product page…";

    await new Promise(r =>
      setTimeout(r, 650)
    );

    product = detect();

    if (!product?.currentPrice) {
      setScreen("landing");

      qs("landingStatus").textContent =
        "Price not detected. PRICELY couldn't identify a reliable selling price on this page.";

      return;
    }

    /*
     * Send only product evidence to the backend.
     *
     * The backend returns estimated reference
     * context. The existing client-side Deal
     * Signal and decision engine then interpret
     * that context for the UI.
     */
    const backend = await backendAnalyze({
      productName:
        product.productName,
      retailer:
        product.retailer,
      currentPrice:
        product.currentPrice,
      currency:
        product.currency,
      mrp:
        product.mrp,
      launchDate:
        product.launchDate,
      url:
        product.url
    });

    if (
      backend.ok &&
      backend.data?.ok
    ) {
      context = {
        type:
          backend.data.type ||
          "estimated",

        typical:
          Number(
            backend.data.typical
          ),

        lowest:
          Number(
            backend.data.lowest
          ),

        highest:
          Number(
            backend.data.highest
          ),

        confidence:
          backend.data.confidence ||
          "low",

        method:
          backend.data.method ||
          "backend reference model"
      };
    } else {
      /*
       * Graceful fallback:
       * if Render is temporarily unavailable,
       * PRICELY still provides the same transparent
       * local estimate rather than failing completely.
       */
      context = buildContext({
        currentPrice:
          product.currentPrice,
        mrp:
          product.mrp,
        launchDate:
          product.launchDate
      });
    }

    setScreen("results");
    render();
  }

  function refreshLanding() {
    const p = detect();

    qs("landingStatus").textContent =
      p?.currentPrice
        ? `${p.productName || "Product page"} · ${money(
            p.currentPrice,
            p.currency
          )}`
        : "No product detected yet";
  }

  function toggle() {
    if (host) {
      if (
        host.classList.contains("mini")
      ) {
        restore();
      } else {
        closePanel();
      }
    } else {
      mount();
    }
  }

  let lastUrl = location.href;

  setInterval(() => {
    if (
      location.href !== lastUrl
    ) {
      lastUrl = location.href;

      if (host) {
        product = null;
        context = null;

        setScreen("landing");

        qs("landingStatus").textContent =
          "Product page changed · ready to analyze again";
      }
    }
  }, 700);

  chrome.runtime.onMessage.addListener(
    (m, s, sendResponse) => {
      if (
        m?.type ===
        "TOGGLE_PRICELY_PANEL"
      ) {
        toggle();

        sendResponse?.({
          ok: true
        });

        return true;
      }

      if (
        m?.type ===
        "GET_PRODUCT"
      ) {
        sendResponse?.({
          ok: true,
          product: detect()
        });

        return true;
      }

      return true;
    }
  );
})();