(function () {
  "use strict";

  const DATA = window.DASHBOARD_DATA;
  const RULES = DATA.pricing;
  const { icon, hydrate } = window.Icons;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------------- Helpers ---------------- */
  const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
  const pct = (n, d = 1) => n.toFixed(d) + "%";
  const signed = (n, d = 1) => (n > 0 ? "+" : n < 0 ? "−" : "±") + Math.abs(n).toFixed(d);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const mean = (arr) => arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtDate = (d) => d.getDate() + " " + MONTHS[d.getMonth()];
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
  const siteById = Object.fromEntries(DATA.sites.map((s) => [s.id, s]));
  // Retail-style prices ending in 9.
  const roundDown9 = (v) => Math.floor((v + 1) / 10) * 10 - 1;
  const roundUp9 = (v) => Math.ceil((v + 1) / 10) * 10 - 1;
  const marginAt = (price, cost) => ((price - cost) / price) * 100;

  // Diverging scale: green = below market, neutral = at market, warm = above market.
  const POSITIONS = [
    { key: "cheapest", label: "Cheapest", color: "var(--pos-cheapest)" },
    { key: "cheaper", label: "Cheaper than average", color: "var(--pos-cheaper)" },
    { key: "average", label: "Average", color: "var(--pos-average)" },
    { key: "pricier", label: "Pricier than average", color: "var(--pos-pricier)" },
    { key: "priciest", label: "Priciest", color: "var(--pos-priciest)" },
  ];
  const posOf = (key) => POSITIONS.find((p) => p.key === key);

  /* ---------------- Per-product analysis ---------------- */
  function analyze(p) {
    const listings = Object.entries(p.competitors).map(([site, c]) => ({ site, ...c }));
    const live = listings.filter((c) => c.inStock);
    const ladder = live.map((c) => ({ ...c, you: false }))
      .concat([{ site: "you", price: p.price, you: true }])
      .sort((a, b) => a.price - b.price || (a.you ? -1 : 1));
    const rank = ladder.findIndex((r) => r.you) + 1;
    const total = ladder.length;
    const avg = mean(live.map((c) => c.price));
    const gapPct = live.length ? ((p.price - avg) / avg) * 100 : 0;
    const index = live.length ? (p.price / avg) * 100 : 100;
    const cheaperSites = live.filter((c) => c.price < p.price).length;
    const margin = marginAt(p.price, p.cost);

    let position;
    if (!live.length || rank === 1) position = "cheapest";
    else if (rank === total) position = "priciest";
    else if (gapPct < -RULES.averageBand) position = "cheaper";
    else if (gapPct > RULES.averageBand) position = "pricier";
    else position = "average";

    let rankNote;
    if (rank === 1) rankNote = "cheapest";
    else if (rank === total) rankNote = "priciest";
    else rankNote = plural(cheaperSites, "site", "sites") + " cheaper";

    // One rule for every product: undercut the cheapest in-stock competitor,
    // but never go below the margin floor.
    let suggestion = null;
    if (live.length) {
      const cheapest = Math.min(...live.map((c) => c.price));
      const target = roundDown9(cheapest - RULES.undercut);
      const floorPrice = roundUp9(p.cost / (1 - RULES.marginFloor / 100));
      let price = target, capped = false;
      if (target < floorPrice) { price = floorPrice; capped = true; }

      if (price === p.price) {
        suggestion = { hold: true, reason: "Already at the suggested price" };
      } else if (capped && price > p.price) {
        suggestion = { hold: true, reason: `Can't undercut without dropping below a ${RULES.marginFloor}% margin` };
      } else {
        suggestion = { price, capped, up: price > p.price, margin: marginAt(price, p.cost) };
      }
    }

    return { listings, live, ladder, rank, total, avg, gapPct, index, position, rankNote, margin, suggestion };
  }

  /* ---------------- Portfolio-level metrics ---------------- */
  function metrics() {
    const total = products.length;
    const analyses = products.map((p) => ({ p, a: analyze(p) }));

    const sites = DATA.sites.map((s) => {
      const rows = products.filter((p) => p.competitors[s.id]).map((p) => ({ p, c: p.competitors[s.id] }));
      const inStock = rows.filter((r) => r.c.inStock);
      return {
        ...s,
        listed: rows.length,
        outOfStock: rows.length - inStock.length,
        changes: rows.filter((r) => r.c.prev != null && r.c.prev !== r.c.price).length,
        index: inStock.length ? mean(inStock.map((r) => (r.p.price / r.c.price) * 100)) : 100,
      };
    });

    const allListings = products.flatMap((p) =>
      Object.entries(p.competitors).map(([site, c]) => ({ p, site, ...c })));
    const moves = allListings.filter((l) => l.prev != null && l.prev !== l.price);
    const biggestMove = moves.slice().sort((a, b) => Math.abs(b.price - b.prev) - Math.abs(a.price - a.prev))[0];

    const history = historyFor(7, sites);
    const avgSeries = history.avg;

    return {
      total,
      analyses,
      sites,
      brands: new Set(products.map((p) => p.brand)).size,
      categories: new Set(products.map((p) => p.category)).size,
      increased: moves.filter((l) => l.price > l.prev).length,
      decreased: moves.filter((l) => l.price < l.prev).length,
      biggestMove,
      myOutOfStock: products.filter((p) => !p.inStock),
      competitorOutOfStock: allListings.filter((l) => !l.inStock).length,
      index: avgSeries[avgSeries.length - 1],
      indexChange: avgSeries[avgSeries.length - 1] - avgSeries[0],
      weekAvg: avgSeries,
    };
  }

  /* ---------------- State ---------------- */
  const products = DATA.products.map((p) => ({ ...p, originalPrice: p.price }));
  const state = {
    view: "cards",
    query: "",
    brand: "",
    category: "",
    sort: "gap",
    showAll: false,
    starred: new Set(),
    expanded: new Set(),
    siteQuery: "",
    siteSortAsc: true,
    range: 7,
    hiddenSeries: new Set(),
  };
  const CARD_LIMIT = 4;
  let M = null; // current metrics

  /* ---------------- Toast ---------------- */
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2400);
  }

  /* ---------------- Header ---------------- */
  function renderHeader() {
    $("#userName").textContent = DATA.user.name;
    $("#lastUpdated").textContent = "Last updated " + DATA.user.lastUpdated;
    $("#headerMeta").innerHTML =
      `<b>${M.total}</b> products<span class="sep">·</span><b>${M.brands}</b> brands<span class="sep">·</span><b>${M.categories}</b> categories`;
  }

  /* ---------------- Overview ---------------- */
  function renderOverview() {
    const row = (ic, label, n, unit) =>
      `<div class="ov-row"><span class="ico">${icon(ic)}</span><span>${label}</span><span><b>${n}</b> ${unit}</span></div>`;

    const bm = M.biggestMove;
    const bmText = bm
      ? `Biggest move: ${esc(shortName(bm.p.name))} on ${esc(siteById[bm.site].name)}, ${bm.price > bm.prev ? "+" : "−"}${inr(Math.abs(bm.price - bm.prev))}`
      : "No competitor price changes this week";
    const oos = M.myOutOfStock;
    const oosText = oos.length
      ? `${esc(shortName(oos[0].name))}${oos.length > 1 ? ` and ${oos.length - 1} more` : ""} out of stock in your store`
      : "Everything is in stock in your store";

    const up = M.indexChange > 0.05, down = M.indexChange < -0.05;
    const trendClass = up ? "warn" : down ? "good" : "";
    const trendWord = up ? "pricier" : down ? "cheaper" : "no change";
    const idx = Math.round(M.index);
    const vsAvg = idx === 100 ? "in line with" : `${Math.abs(idx - 100)}% ${idx > 100 ? "above" : "below"}`;

    $("#overview").innerHTML = `
      <article class="panel ov-card">
        <div class="ov-head"><span class="ov-icon">${icon("arrowsUpDown")}</span><h3>Competitor prices</h3>
          <a class="ov-link" href="#sites" aria-label="Go to sites">${icon("arrowRight")}</a></div>
        <div class="ov-rows">
          ${row("arrowUp", "Increased", M.increased, M.increased === 1 ? "listing" : "listings")}
          ${row("arrowDown", "Decreased", M.decreased, M.decreased === 1 ? "listing" : "listings")}
        </div>
        <p class="ov-foot">${bmText}</p>
      </article>
      <article class="panel ov-card">
        <div class="ov-head"><span class="ov-icon">${icon("package")}</span><h3>Out of stock</h3>
          <button class="ov-link" data-filter="oos" aria-label="Show out-of-stock products">${icon("arrowRight")}</button></div>
        <div class="ov-rows">
          ${row("store", "My store", oos.length, oos.length === 1 ? "product" : "products")}
          ${row("users", "Competitors", M.competitorOutOfStock, M.competitorOutOfStock === 1 ? "listing" : "listings")}
        </div>
        <p class="ov-foot">${oosText}</p>
      </article>
      <article class="panel ov-card">
        <div class="ov-head"><span class="ov-icon">${icon("chart")}</span>
          <h3>Price index <span class="info" title="Your price ÷ the competitor's price × 100, averaged over each site's listings, then across the ${M.sites.length} sites. 100 = same price. Above 100 = you're more expensive.">${icon("info")}</span></h3>
          <a class="ov-link" href="#history" aria-label="Go to historical index">${icon("arrowRight")}</a></div>
        <div class="ov-index">
          <div>
            <div class="display">${idx}</div>
            <div class="trend ${trendClass}">${icon(up ? "arrowUp" : down ? "arrowDown" : "arrowRight")}<b>${signed(M.indexChange)} pts</b>&nbsp;this week (${trendWord})</div>
          </div>
          <svg class="sparkline" id="sparkline" preserveAspectRatio="none" aria-hidden="true"></svg>
        </div>
        <p class="ov-foot">You're ${vsAvg} the average competitor price</p>
      </article>`;
    drawSparkline();
  }

  const shortName = (n) => n.split(/[,(]/)[0].replace(/ with .*/, "");

  function drawSparkline() {
    const svg = $("#sparkline");
    if (!svg) return;
    const w = svg.clientWidth || 300, h = svg.clientHeight || 44;
    const avg = M.weekAvg, n = avg.length;
    const min = Math.min(...avg) - 0.6, max = Math.max(...avg) + 0.6;
    const pts = avg.map((v, i) => [(i / (n - 1)) * (w - 4) + 2, h - 4 - ((v - min) / (max - min)) * (h - 8)]);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = `<path d="${smoothPath(pts)}" fill="none" stroke="var(--text)" stroke-width="2" stroke-linecap="round"/>
      <circle cx="${pts[n - 1][0]}" cy="${pts[n - 1][1]}" r="3" fill="var(--text)"/>`;
  }

  /* ---------------- Price position ---------------- */
  function renderPosition() {
    const names = DATA.sites.map((s) => s.name);
    $("#positionSub").textContent =
      `Where your ${M.total} products sit against ${names.slice(0, -1).join(", ")} and ${names.slice(-1)} (in-stock listings only)`;

    const groups = Object.fromEntries(POSITIONS.map((p) => [p.key, []]));
    M.analyses.forEach(({ p, a }) => groups[a.position].push(p));
    const visible = POSITIONS.filter((p) => groups[p.key].length);

    const bar = visible.map((p) =>
      `<span data-key="${p.key}" style="flex:${groups[p.key].length};background:${p.color}"></span>`).join("");
    const labels = visible.map((p) =>
      `<button class="pos-item" data-key="${p.key}" style="flex:${groups[p.key].length}" title="${esc(groups[p.key].map((x) => x.name).join("\n"))}">
         <span class="n">${groups[p.key].length}</span><span class="l"><i style="background:${p.color}"></i>${p.label}</span></button>`).join("");

    const el = $("#position");
    el.innerHTML = `<div class="pos-scale"><span>${icon("arrowLeft")}Below market</span><span>Above market${icon("arrowRight")}</span></div>
      <div class="pos-bar">${bar}</div><div class="pos-labels">${labels}</div>`;
    $$(".pos-item", el).forEach((item) => {
      item.addEventListener("mouseenter", () => {
        el.classList.add("hovering");
        $(`.pos-bar span[data-key="${item.dataset.key}"]`, el).classList.add("hl");
      });
      item.addEventListener("mouseleave", () => {
        el.classList.remove("hovering");
        $$(".pos-bar span", el).forEach((s) => s.classList.remove("hl"));
      });
      item.addEventListener("click", () => {
        state.query = "";
        $("#productSearch").value = "";
        state.position = state.position === item.dataset.key ? "" : item.dataset.key;
        state.showAll = true;
        renderProducts();
        $("#products").scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  /* ---------------- Products ---------------- */
  function filterOptions() {
    const fill = (sel, values, label) => {
      const cur = sel.value;
      sel.innerHTML = `<option value="">All ${label}</option>` + values.map((v) => `<option>${esc(v)}</option>`).join("");
      sel.value = cur;
    };
    fill($("#brandFilter"), [...new Set(products.map((p) => p.brand))].sort(), "brands");
    fill($("#categoryFilter"), [...new Set(products.map((p) => p.category))].sort(), "categories");
  }

  function sortedFilteredProducts() {
    const q = state.query.trim().toLowerCase();
    let list = M.analyses.slice();
    if (q) list = list.filter(({ p }) => [p.name, p.brand, p.category, String(p.id)].some((v) => v.toLowerCase().includes(q)));
    if (state.brand) list = list.filter(({ p }) => p.brand === state.brand);
    if (state.category) list = list.filter(({ p }) => p.category === state.category);
    if (state.position) list = list.filter(({ a }) => a.position === state.position);
    if (state.oos) list = list.filter(({ p }) => !p.inStock);
    const sorters = {
      gap: (x, y) => Math.abs(y.a.gapPct) - Math.abs(x.a.gapPct),
      rank: (x, y) => x.a.rank - y.a.rank || x.p.name.localeCompare(y.p.name),
      name: (x, y) => x.p.name.localeCompare(y.p.name),
      priceAsc: (x, y) => x.p.price - y.p.price,
      priceDesc: (x, y) => y.p.price - x.p.price,
      margin: (x, y) => y.a.margin - x.a.margin,
    };
    // Starred products float to the top.
    list.sort((x, y) => (state.starred.has(y.p.id) - state.starred.has(x.p.id)) || sorters[state.sort](x, y));
    return list;
  }

  function actionBlock(p, a, compact) {
    const s = a.suggestion;
    if (!s) return `<span class="muted">No in-stock competitors</span>`;
    if (s.hold) {
      return `<span class="hold" title="${esc(s.reason)}">${icon("check")}Hold price</span>`;
    }
    const delta = s.margin - a.margin;
    const marginNote = `<span class="margin-note ${s.capped ? "warn" : ""}" title="${s.capped ? `Limited by the ${RULES.marginFloor}% margin floor` : ""}">
        Margin ${pct(a.margin)} → <b>${pct(s.margin)}</b>${s.capped ? " (floor)" : ""}</span>`;
    const btn = `<button class="btn" data-action="apply" data-id="${p.id}" title="Margin changes by ${signed(delta)} pts">
        ${s.up ? "Raise" : "Lower"} to ${inr(s.price)} ${icon(s.up ? "arrowUp" : "arrowDown")}</button>`;
    return compact ? `<div class="action-stack">${btn}${marginNote}</div>` : `<div class="action">${marginNote}${btn}</div>`;
  }

  // Place ladder points by actual price, then nudge apart so labels don't collide.
  function ladderPositions(points) {
    const prices = points.map((r) => r.price);
    const lo = Math.min(...prices), hi = Math.max(...prices);
    const raw = points.map((r) => (hi === lo ? 50 : ((r.price - lo) / (hi - lo)) * 100));
    const MIN = 15; // % minimum distance between points
    const pos = raw.slice();
    for (let pass = 0; pass < 20; pass++) {
      for (let i = 1; i < pos.length; i++) {
        const gap = pos[i] - pos[i - 1];
        if (gap < MIN) { const push = (MIN - gap) / 2; pos[i - 1] -= push; pos[i] += push; }
      }
      const shift = Math.min(0, pos[0]); // keep inside [0, 100]
      for (let i = 0; i < pos.length; i++) pos[i] -= shift;
      const over = Math.max(0, pos[pos.length - 1] - 100);
      for (let i = 0; i < pos.length; i++) pos[i] -= over;
    }
    return pos;
  }

  function productCard({ p, a }) {
    // Show every listing on the ladder; out-of-stock ones are hollow and unranked.
    const points = a.listings.map((c) => ({ ...c, you: false }))
      .concat([{ site: "you", price: p.price, you: true, inStock: p.inStock }])
      .sort((x, y) => x.price - y.price || (x.you ? -1 : 1));
    const pos = ladderPositions(points);
    const rungs = points.map((r, i) => {
      const s = siteById[r.site];
      const label = r.you ? "You" : s.name.split(".")[0];
      const dot = r.you
        ? `<span class="dot you">You</span>`
        : `<span class="dot${r.inStock ? "" : " oos"}" style="--c:${s.color}">${esc(s.initial)}</span>`;
      const title = r.you ? `Your store: ${inr(r.price)}${p.inStock ? "" : " (out of stock)"}` : `${s.name}: ${inr(r.price)}${r.inStock ? "" : " (out of stock)"}`;
      return `<div class="rung${r.you ? " is-you" : ""}${r.inStock ? "" : " is-oos"}" style="left:${pos[i]}%" title="${esc(title)}">
        ${dot}<span class="price">${inr(r.price)}</span><span class="site">${r.inStock ? esc(label) : "out of stock"}</span></div>`;
    }).join("");

    const starred = state.starred.has(p.id);
    const expanded = state.expanded.has(p.id);
    const pos0 = posOf(a.position);
    const gapCls = a.gapPct > RULES.averageBand ? "warn" : a.gapPct < -RULES.averageBand ? "good" : "";

    return `
      <article class="panel p-card">
        <div class="p-top">
          <div class="thumb" aria-hidden="true">${esc(initials(p.name))}</div>
          <div class="p-info">
            <h3 class="p-name" title="${esc(p.name)}">${esc(p.name)}</h3>
            <p class="p-sub"><b>${inr(p.price)}</b> · margin ${pct(a.margin)} · SKU ${p.id}${p.inStock ? "" : ` · <span class="tag">Out of stock</span>`}</p>
          </div>
          <div class="p-actions">
            <button class="icon-btn${starred ? " starred" : ""}" data-action="star" data-id="${p.id}" aria-label="${starred ? "Unstar" : "Star"} product" aria-pressed="${starred}">${icon("star")}</button>
            <button class="icon-btn" data-action="menu" data-id="${p.id}" aria-label="More actions">${icon("more")}</button>
          </div>
        </div>
        <p class="p-rank"><span class="pill"><i style="background:${pos0.color}"></i>${pos0.label}</span>
          <span><b>#${a.rank} of ${a.total}</b> · ${a.rankNote} · <span class="${gapCls}">${signed(a.gapPct)}% vs avg</span></span></p>
        <div class="ladder"><div class="ladder-track"></div>${rungs}</div>
        <div class="p-foot">
          <button class="comp-toggle" data-action="expand" data-id="${p.id}" aria-expanded="${expanded}">
            Competition (${a.live.length})${a.listings.length > a.live.length ? ` · ${a.listings.length - a.live.length} out of stock` : ""} ${icon(expanded ? "chevronUp" : "chevronDown")}</button>
          ${actionBlock(p, a)}
        </div>
        ${expanded ? competitorList(a) : ""}
      </article>`;
  }

  const initials = (name) => name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

  function competitorList(a) {
    return `<div class="comp-list">${a.listings.slice().sort((x, y) => x.price - y.price).map((c) => {
      const s = siteById[c.site];
      const move = c.prev != null && c.prev !== c.price
        ? `<span class="${c.price > c.prev ? "warn" : "good"}">${c.price > c.prev ? "+" : "−"}${inr(Math.abs(c.price - c.prev))} this week</span>` : `<span class="muted">no change</span>`;
      return `<div><span class="site-name"><i class="swatch" style="background:${s.color}"></i>${esc(s.name)}${c.inStock ? "" : ` <span class="tag">Out of stock</span>`}</span>
        ${move}<b>${inr(c.price)}</b></div>`;
    }).join("")}</div>`;
  }

  function productRow({ p, a }) {
    const pos = posOf(a.position);
    return `
      <tr>
        <td><div class="prod"><div class="thumb">${esc(initials(p.name))}</div><div><b>${esc(p.name)}</b><small>SKU ${p.id} · ${esc(p.brand)}${p.inStock ? "" : " · out of stock"}</small></div></div></td>
        <td class="num"><b>${inr(p.price)}</b></td>
        <td>#${a.rank} of ${a.total}</td>
        <td><span class="pill"><i style="background:${pos.color}"></i>${pos.label}</span></td>
        <td class="num">${a.live.length ? inr(Math.min(...a.live.map((c) => c.price))) : "—"}</td>
        <td class="num">${a.live.length ? inr(a.avg) : "—"}</td>
        <td class="num">${actionBlock(p, a, true)}</td>
      </tr>`;
  }

  function renderProducts() {
    const list = sortedFilteredProducts();
    const shown = state.showAll ? list : list.slice(0, CARD_LIMIT);
    const view = $("#productView");
    $("#productCount").textContent = M.total;

    const chips = [];
    if (state.position) chips.push({ key: "position", label: posOf(state.position).label });
    if (state.oos) chips.push({ key: "oos", label: "Out of stock in my store" });
    $("#activeFilters").innerHTML = chips.map((c) =>
      `<button class="chip" data-clear="${c.key}">${esc(c.label)} ${icon("x")}</button>`).join("");

    if (!list.length) {
      view.innerHTML = `<div class="panel empty">No products match these filters.</div>`;
    } else if (state.view === "cards") {
      view.innerHTML = `<div class="cards">${shown.map(productCard).join("")}</div>`;
    } else {
      view.innerHTML = `
        <div class="panel list-panel"><table class="table list-table">
          <thead><tr><th>Product</th><th class="num">Your price</th><th>Rank</th><th>Position</th>
          <th class="num">Cheapest rival</th><th class="num">Avg. rival</th><th class="num">Suggestion</th></tr></thead>
          <tbody>${shown.map(productRow).join("")}</tbody></table></div>`;
    }

    $("#productShowing").innerHTML = `Showing <b>${shown.length}</b> of ${list.length} products`;
    const toggle = $("#toggleAll");
    toggle.hidden = list.length <= CARD_LIMIT;
    toggle.innerHTML = state.showAll ? `Show fewer ${icon("arrowUp")}` : `View all products ${icon("arrowRight")}`;
  }

  /* Product menu (⋮) */
  let openMenu = null;
  function closeMenu() { if (openMenu) { openMenu.remove(); openMenu = null; } }
  function showMenu(btn, p) {
    closeMenu();
    const changed = p.price !== p.originalPrice;
    const menu = document.createElement("div");
    menu.className = "panel menu";
    const item = (act, label, disabled) => `<button data-menu="${act}" ${disabled ? "disabled" : ""}>${label}</button>`;
    menu.innerHTML =
      item("competitors", state.expanded.has(p.id) ? "Hide competitor prices" : "Show competitor prices") +
      item("copy", "Copy SKU") +
      item("undo", "Undo price change", !changed);
    document.body.appendChild(menu);
    const r = btn.getBoundingClientRect();
    menu.style.top = window.scrollY + r.bottom + 6 + "px";
    menu.style.left = Math.max(8, window.scrollX + r.right - menu.offsetWidth) + "px";
    menu.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-menu]");
      if (!b || b.disabled) return;
      if (b.dataset.menu === "competitors") toggleExpand(p.id);
      if (b.dataset.menu === "copy") {
        (navigator.clipboard ? navigator.clipboard.writeText(String(p.id)) : Promise.reject())
          .then(() => toast("SKU " + p.id + " copied"), () => toast("SKU " + p.id));
      }
      if (b.dataset.menu === "undo") {
        p.price = p.originalPrice;
        toast(`${p.name} reset to ${inr(p.price)}`);
        renderAll();
      }
      closeMenu();
    });
    openMenu = menu;
  }

  function toggleExpand(id) {
    state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id);
    renderProducts();
  }

  function bindProducts() {
    $$(".tab").forEach((t) => t.addEventListener("click", () => {
      $$(".tab").forEach((x) => { x.classList.toggle("active", x === t); x.setAttribute("aria-selected", x === t); });
      state.view = t.dataset.view;
      renderProducts();
    }));
    $("#productSearch").addEventListener("input", (e) => { state.query = e.target.value; renderProducts(); });
    $("#productSort").addEventListener("change", (e) => { state.sort = e.target.value; renderProducts(); });
    $("#brandFilter").addEventListener("change", (e) => { state.brand = e.target.value; renderProducts(); });
    $("#categoryFilter").addEventListener("change", (e) => { state.category = e.target.value; renderProducts(); });
    $("#toggleAll").addEventListener("click", () => {
      state.showAll = !state.showAll;
      renderProducts();
      if (!state.showAll) $("#products").scrollIntoView({ behavior: "smooth" });
    });
    $("#activeFilters").addEventListener("click", (e) => {
      const b = e.target.closest("[data-clear]");
      if (!b) return;
      state[b.dataset.clear] = b.dataset.clear === "oos" ? false : "";
      renderProducts();
    });
    $("#overview").addEventListener("click", (e) => {
      if (!e.target.closest('[data-filter="oos"]')) return;
      state.oos = true; state.showAll = true;
      renderProducts();
      $("#products").scrollIntoView({ behavior: "smooth" });
    });

    $("#productView").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const p = products.find((x) => x.id === +btn.dataset.id);
      if (!p) return;
      switch (btn.dataset.action) {
        case "star":
          state.starred.has(p.id) ? state.starred.delete(p.id) : state.starred.add(p.id);
          renderProducts();
          break;
        case "expand":
          toggleExpand(p.id);
          break;
        case "menu":
          e.stopPropagation();
          openMenu ? closeMenu() : showMenu(btn, p);
          break;
        case "apply": {
          const a = analyze(p);
          if (!a.suggestion || a.suggestion.hold) return;
          const from = p.price;
          p.price = a.suggestion.price;
          toast(`${shortName(p.name)}: ${inr(from)} → ${inr(p.price)} · margin ${pct(a.suggestion.margin)}`);
          renderAll();
          break;
        }
      }
    });
    document.addEventListener("click", (e) => { if (openMenu && !openMenu.contains(e.target)) closeMenu(); });
    window.addEventListener("resize", closeMenu);
  }

  /* ---------------- Sites ---------------- */
  function renderSites() {
    const sites = M.sites;
    $("#siteCount").textContent = sites.length;

    const avgMatch = Math.round(mean(sites.map((s) => s.listed / M.total)) * 100);
    const listings = sites.reduce((s, x) => s + x.listed, 0);
    $("#siteStats").innerHTML =
      `<span>Avg. coverage<b>${avgMatch}%</b></span><span>Listings<b>${listings}</b></span><span>Avg. index<b>${Math.round(M.index)}</b></span>`;

    const q = state.siteQuery.trim().toLowerCase();
    const rows = sites
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) => (state.siteSortAsc ? 1 : -1) * a.name.localeCompare(b.name));

    $("#siteSortIcon").innerHTML = icon(state.siteSortAsc ? "arrowUp" : "arrowDown");
    $("#siteRows").innerHTML = rows.length ? rows.map((s) => {
      const share = (s.listed / M.total) * 100;
      const idx = Math.round(s.index);
      const cls = idx > 100 ? "warn" : idx < 100 ? "good" : "";
      return `<tr>
        <td><div class="site-cell"><span class="site-badge" style="--c:${s.color}">${esc(s.initial)}</span>${esc(s.name)}</div></td>
        <td><div class="cover"><span class="matched"><b>${s.listed}</b> of ${M.total}</span>
          <span class="bar" role="img" aria-label="${Math.round(share)}% of your catalogue"><i style="width:${share}%"></i></span></div></td>
        <td class="num">${s.outOfStock}</td>
        <td class="num">${s.changes}</td>
        <td class="num"><b>${idx}</b> <span class="idx-note ${cls}">${idx === 100 ? "same" : idx > 100 ? "you're pricier" : "you're cheaper"}</span></td>
      </tr>`;
    }).join("") : `<tr><td colspan="5" class="muted center">No sites match “${esc(state.siteQuery)}”.</td></tr>`;
  }

  function bindSites() {
    $("#siteSearch").addEventListener("input", (e) => { state.siteQuery = e.target.value; renderSites(); });
    $("#siteSortBtn").addEventListener("click", () => { state.siteSortAsc = !state.siteSortAsc; renderSites(); });
  }

  /* ---------------- Historical chart ---------------- */
  function rng(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Each site's line is shifted so its last point equals today's computed index.
  function historyFor(days, sites) {
    const week = DATA.history.week;
    const out = {};
    sites.forEach((s, k) => {
      const shape = week[s.id] || Array(7).fill(100);
      const offset = s.index - shape[shape.length - 1];
      const shifted = shape.map((v) => v + offset);
      if (days <= shifted.length) { out[s.id] = shifted.slice(-days); return; }
      const rand = rng(1000 + k * 97 + days);
      const target = mean(shifted) - 1.2;
      const back = [];
      let v = shifted[0];
      for (let i = 0; i < days - shifted.length; i++) {
        v += (rand() - 0.5) * 2.2 + (target - v) * 0.12;
        back.unshift(v);
      }
      out[s.id] = back.concat(shifted);
    });
    out.avg = Array.from({ length: days }, (_, i) => mean(sites.map((s) => out[s.id][i])));
    return out;
  }

  function datesFor(days) {
    const end = new Date(DATA.history.endDate + "T00:00:00");
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(end);
      d.setDate(end.getDate() - (days - 1 - i));
      return d;
    });
  }

  // Monotone cubic interpolation (no overshoot) → SVG path.
  function smoothPath(pts) {
    const n = pts.length;
    if (n < 2) return "";
    const dx = [], dy = [], m = [];
    for (let i = 0; i < n - 1; i++) {
      dx.push(pts[i + 1][0] - pts[i][0]);
      dy.push(pts[i + 1][1] - pts[i][1]);
      m.push(dy[i] / dx[i]);
    }
    const t = [m[0]];
    for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
    t.push(m[n - 2]);
    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
      const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
      if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
    }
    let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
    for (let i = 0; i < n - 1; i++) {
      const h = dx[i] / 3;
      d += `C${(pts[i][0] + h).toFixed(2)},${(pts[i][1] + t[i] * h).toFixed(2)} ${(pts[i + 1][0] - h).toFixed(2)},${(pts[i + 1][1] - t[i + 1] * h).toFixed(2)} ${pts[i + 1][0].toFixed(2)},${pts[i + 1][1].toFixed(2)}`;
    }
    return d;
  }

  function renderLegend() {
    $("#legend").innerHTML = DATA.sites.map((s) =>
      `<button class="chip${state.hiddenSeries.has(s.id) ? " off" : ""}" data-series="${s.id}" aria-pressed="${!state.hiddenSeries.has(s.id)}">
        <i style="background:${s.color}"></i>${esc(s.name)}</button>`).join("");
  }

  let chartModel = null;
  function renderChart() {
    const svg = $("#chart");
    const W = svg.clientWidth || 900;
    const H = svg.clientHeight || 280;
    const narrow = W < 520;
    const pad = { l: 34, r: narrow ? 40 : 110, t: 12, b: 30 };
    const days = state.range;
    const data = historyFor(days, M.sites);
    const dates = datesFor(days);
    const visible = M.sites.filter((s) => !state.hiddenSeries.has(s.id));

    const values = (visible.length ? visible : M.sites).flatMap((s) => data[s.id]).concat([100]);
    const lo = Math.floor((Math.min(...values) - 1) / 4) * 4;
    const hi = Math.ceil((Math.max(...values) + 1) / 4) * 4;
    const step = Math.max(4, Math.ceil((hi - lo) / 5 / 2) * 2);
    const x = (i) => pad.l + (i / (days - 1)) * (W - pad.l - pad.r);
    const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);

    let out = "";
    for (let v = lo; v <= hi; v += step) {
      if (v !== 100) out += `<line class="grid" x1="${pad.l}" x2="${x(days - 1)}" y1="${y(v)}" y2="${y(v)}"/>`;
      out += `<text class="axis" x="${pad.l - 10}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
    }
    // Reference line: 100 = same as the average competitor.
    out += `<line class="baseline" x1="${pad.l}" x2="${x(days - 1)}" y1="${y(100)}" y2="${y(100)}"/>`;
    out += `<text class="axis strong" x="${pad.l - 10}" y="${y(100) + 3}" text-anchor="end">100</text>`;

    const maxLabels = narrow ? 4 : 7;
    const every = Math.max(1, Math.ceil((days - 1) / (maxLabels - 1)));
    for (let i = days - 1; i >= 0; i -= every) {
      out += `<text class="axis" x="${x(i)}" y="${H - 8}" text-anchor="middle">${fmtDate(dates[i])}</text>`;
    }

    visible.forEach((s) => {
      const pts = data[s.id].map((v, i) => [x(i), y(v)]);
      out += `<path class="series" d="${smoothPath(pts)}" stroke="${s.color}"/>`;
    });

    // Direct labels at the line ends (text in text colours, the dot carries identity).
    const ends = visible.map((s) => ({ s, v: data[s.id][days - 1], cy: y(data[s.id][days - 1]) }))
      .map((e) => ({ ...e, ly: e.cy })).sort((a, b) => a.ly - b.ly);
    for (let i = 1; i < ends.length; i++) if (ends[i].ly - ends[i - 1].ly < 14) ends[i].ly = ends[i - 1].ly + 14;
    ends.forEach((e) => {
      out += `<circle cx="${x(days - 1)}" cy="${e.cy}" r="4" fill="${e.s.color}" stroke="var(--panel)" stroke-width="2"/>`;
      out += `<text class="end-label" x="${x(days - 1) + 10}" y="${e.ly + 4}"><tspan class="v">${Math.round(e.v)}</tspan>${narrow ? "" : `<tspan class="n" dx="6">${esc(e.s.name)}</tspan>`}</text>`;
    });

    out += `<g id="hover" style="display:none"><line class="hover-line" y1="${pad.t}" y2="${H - pad.b}"/>${visible.map((s) => `<circle r="4" fill="${s.color}" stroke="var(--panel)" stroke-width="2" data-s="${s.id}"/>`).join("")}</g>`;
    out += `<rect id="hit" x="${pad.l - 10}" y="0" width="${W - pad.l - pad.r + 20}" height="${H}" fill="transparent"/>`;

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = out;
    chartModel = { x, y, data, dates, visible, days, W, pad };
    bindChartHover();
    renderChartTable(data, dates, days);
  }

  function renderChartTable(data, dates, days) {
    $("#chartTable").innerHTML = `<table class="table"><thead><tr><th>Date</th>${M.sites.map((s) => `<th class="num">${esc(s.name)}</th>`).join("")}</tr></thead>
      <tbody>${dates.map((d, i) => `<tr><td>${fmtDate(d)}</td>${M.sites.map((s) => `<td class="num">${data[s.id][i].toFixed(1)}</td>`).join("")}</tr>`).reverse().join("")}</tbody></table>`;
  }

  function bindChartHover() {
    const svg = $("#chart");
    const hit = $("#hit", svg);
    const g = $("#hover", svg);
    const tip = $("#tooltip");
    const { x, y, data, dates, visible, days, W, pad } = chartModel;

    const move = (clientX) => {
      if (!visible.length) return;
      const r = svg.getBoundingClientRect();
      const px = ((clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(days - 1, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (days - 1))));
      g.style.display = "";
      const line = $("line", g);
      line.setAttribute("x1", x(i)); line.setAttribute("x2", x(i));
      $$("circle", g).forEach((c) => { c.setAttribute("cx", x(i)); c.setAttribute("cy", y(data[c.dataset.s][i])); });

      tip.hidden = false;
      tip.innerHTML = `<div class="t-date">${fmtDate(dates[i])} ${dates[i].getFullYear()}</div>` +
        visible.slice().sort((a, b) => data[b.id][i] - data[a.id][i]).map((s) =>
          `<div class="t-row"><span><i style="background:${s.color}"></i>${esc(s.name)}</span><b>${data[s.id][i].toFixed(1)}</b></div>`).join("");
      const left = (x(i) / W) * r.width;
      const tipW = tip.offsetWidth;
      tip.style.left = (left + 14 + tipW > r.width ? left - tipW - 14 : left + 14) + "px";
      tip.style.top = "8px";
    };
    const leave = () => { g.style.display = "none"; tip.hidden = true; };

    hit.addEventListener("mousemove", (e) => move(e.clientX));
    hit.addEventListener("mouseleave", leave);
    hit.addEventListener("touchstart", (e) => move(e.touches[0].clientX), { passive: true });
    hit.addEventListener("touchmove", (e) => move(e.touches[0].clientX), { passive: true });
    hit.addEventListener("touchend", leave);
  }

  function bindChart() {
    $("#rangeSwitch").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-range]");
      if (!b) return;
      $$("#rangeSwitch button").forEach((x) => x.classList.toggle("active", x === b));
      state.range = +b.dataset.range;
      renderChart();
    });
    $("#legend").addEventListener("click", (e) => {
      const b = e.target.closest("[data-series]");
      if (!b) return;
      const id = b.dataset.series;
      state.hiddenSeries.has(id) ? state.hiddenSeries.delete(id) : state.hiddenSeries.add(id);
      renderLegend();
      renderChart();
    });
    $("#customDates").addEventListener("click", () => toast("Custom date ranges are coming soon"));
    $("#tableToggle").addEventListener("click", (e) => {
      const t = $("#chartTable");
      t.hidden = !t.hidden;
      e.currentTarget.setAttribute("aria-expanded", !t.hidden);
      e.currentTarget.lastChild.textContent = t.hidden ? "Show data table" : "Hide data table";
    });
  }

  /* ---------------- Sidebar ---------------- */
  function bindSidebar() {
    $("#sidebarToggle").addEventListener("click", () => $("#app").classList.toggle("collapsed"));
    $$(".side-nav .side-btn").forEach((a) => a.addEventListener("click", (e) => {
      if (a.getAttribute("href") === "#") {
        e.preventDefault();
        if (a.title === "Dashboard") window.scrollTo({ top: 0, behavior: "smooth" });
      }
      $$(".side-nav .side-btn").forEach((x) => x.classList.toggle("active", x === a));
    }));
  }

  /* ---------------- Init ---------------- */
  function renderAll() {
    M = metrics();
    renderHeader();
    renderOverview();
    renderPosition();
    renderProducts();
    renderSites();
    renderChart();
  }

  function init() {
    hydrate();
    $("#ruleNote").textContent =
      `Suggestions price ₹${RULES.undercut} below the cheapest in-stock competitor, never below a ${RULES.marginFloor}% margin.`;
    filterOptions();
    renderLegend();
    renderAll();
    bindProducts();
    bindSites();
    bindChart();
    bindSidebar();

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { renderChart(); drawSparkline(); }, 100);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
