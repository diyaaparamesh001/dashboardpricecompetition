(function () {
  "use strict";

  const DATA = window.DASHBOARD_DATA;
  const { icon, hydrate } = window.Icons;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------------- Helpers ---------------- */
  const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtDate = (d) => d.getDate() + " " + MONTHS[d.getMonth()];
  const siteById = Object.fromEntries(DATA.sites.map((s) => [s.id, s]));

  const POSITIONS = [
    { key: "cheapest", label: "Cheapest", color: "var(--pos-1)" },
    { key: "cheaper", label: "Cheaper than average", color: "var(--pos-2)" },
    { key: "average", label: "Average", color: "var(--pos-3)" },
    { key: "pricier", label: "Pricier than average", color: "var(--pos-4)" },
    { key: "priciest", label: "Priciest", color: "var(--pos-5)" },
  ];
  const AVERAGE_BAND = 1; // within ±1% of the competitor average counts as "average"

  // Colour for the i-th rung of an n-rung ladder (green → orange).
  const rungColor = (i, n) => {
    const idx = n <= 1 ? 0 : Math.round((i / (n - 1)) * (POSITIONS.length - 1));
    return POSITIONS[idx].color;
  };

  function analyze(p) {
    const comps = Object.entries(p.competitors)
      .filter(([, price]) => price != null)
      .map(([site, price]) => ({ site, price }));
    const ladder = comps.map((c) => ({ ...c, you: false }))
      .concat([{ site: "you", price: p.price, you: true }])
      .sort((a, b) => a.price - b.price || (a.you ? -1 : 1));
    const rank = ladder.findIndex((r) => r.you) + 1;
    const total = ladder.length;
    const avg = comps.reduce((s, c) => s + c.price, 0) / (comps.length || 1);
    const gapPct = ((p.price - avg) / avg) * 100;
    const cheaperSites = comps.filter((c) => c.price < p.price).length;

    let position;
    if (rank === 1) position = "cheapest";
    else if (rank === total) position = "priciest";
    else if (gapPct < -AVERAGE_BAND) position = "cheaper";
    else if (gapPct > AVERAGE_BAND) position = "pricier";
    else position = "average";

    let rankNote;
    if (rank === 1) rankNote = "cheapest";
    else if (rank === total) rankNote = "priciest";
    else rankNote = cheaperSites + (cheaperSites === 1 ? " site" : " sites") + " cheaper";

    return { comps, ladder, rank, total, avg, gapPct, position, rankNote };
  }

  /* ---------------- State ---------------- */
  const products = DATA.products.map((p) => ({ ...p, originalPrice: p.price }));
  const state = {
    view: "cards",
    query: "",
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

  /* ---------------- Toast ---------------- */
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2200);
  }

  /* ---------------- Header ---------------- */
  function renderHeader() {
    const brands = new Set(products.map((p) => p.brand)).size;
    const cats = new Set(products.map((p) => p.category)).size;
    $("#userName").textContent = DATA.user.name;
    $("#lastUpdated").textContent = "Last updated " + DATA.user.lastUpdated;
    $("#headerMeta").innerHTML =
      `<b>${products.length}</b> products<span class="sep">·</span><b>${brands}</b> brands<span class="sep">·</span><b>${cats}</b> categories`;
  }

  /* ---------------- Overview ---------------- */
  function renderOverview() {
    const o = DATA.overview;
    const pl = (n, one, many) => n + " " + (n === 1 ? one : many);
    const row = (ic, label, value) =>
      `<div class="ov-row"><span class="ico">${icon(ic)}</span><span>${label}</span><span><b>${value.split(" ")[0]}</b> ${value.split(" ").slice(1).join(" ")}</span></div>`;

    $("#overview").innerHTML = `
      <article class="panel ov-card">
        <div class="ov-head"><span class="ov-icon">${icon("arrowsUpDown")}</span><h3>Price changes</h3>
          <a class="ov-link" href="#products" aria-label="Go to products">${icon("arrowRight")}</a></div>
        <div class="ov-rows">
          ${row("arrowUp", "Increased", pl(o.priceChanges.increased, "product", "products"))}
          ${row("arrowDown", "Decreased", pl(o.priceChanges.decreased, "product", "products"))}
        </div>
      </article>
      <article class="panel ov-card">
        <div class="ov-head"><span class="ov-icon">${icon("package")}</span><h3>Out of stock</h3>
          <a class="ov-link" href="#sites" aria-label="Go to sites">${icon("arrowRight")}</a></div>
        <div class="ov-rows">
          ${row("store", "My store", pl(o.outOfStock.myStore, "product", "products"))}
          ${row("users", "Competitors", pl(o.outOfStock.competitors, "listing", "listings"))}
        </div>
      </article>
      <article class="panel ov-card">
        <div class="ov-head"><span class="ov-icon">${icon("chart")}</span>
          <h3>Index <span class="info" title="Your average price vs. the average competitor price (100 = same)">${icon("info")}</span></h3>
          <a class="ov-link" href="#history" aria-label="Go to historical index">${icon("arrowRight")}</a></div>
        <div class="ov-index">
          <div>
            <div class="big">${o.index.value}</div>
            <div class="note">${icon(o.index.change >= 0 ? "arrowUp" : "arrowDown")}<b>${Math.abs(o.index.change)}</b>&nbsp;this week · avg. of ${DATA.sites.length} sites</div>
          </div>
          <svg class="sparkline" id="sparkline" preserveAspectRatio="none"></svg>
        </div>
      </article>`;
    drawSparkline();
  }

  function drawSparkline() {
    const svg = $("#sparkline");
    if (!svg) return;
    const w = svg.clientWidth || 300, h = svg.clientHeight || 40;
    const week = DATA.history.week;
    const ids = Object.keys(week);
    const n = week[ids[0]].length;
    const avg = Array.from({ length: n }, (_, i) => ids.reduce((s, id) => s + week[id][i], 0) / ids.length);
    // Upsample a little so the line reads as a gentle wave like the design.
    const min = Math.min(...avg) - 0.6, max = Math.max(...avg) + 0.6;
    const pts = avg.map((v, i) => [(i / (n - 1)) * w, h - 4 - ((v - min) / (max - min)) * (h - 8)]);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = `<path d="${smoothPath(pts)}" fill="none" stroke="#f2f2f2" stroke-width="1.4" stroke-linecap="round"/>`;
  }

  /* ---------------- Price position ---------------- */
  function renderPosition() {
    const siteNames = DATA.sites.map((s) => s.name);
    $("#positionSub").textContent =
      `Where your ${products.length} products sit against ${siteNames.slice(0, -1).join(", ")} and ${siteNames.slice(-1)}`;

    const groups = Object.fromEntries(POSITIONS.map((p) => [p.key, []]));
    products.forEach((p) => groups[analyze(p).position].push(p));
    const visible = POSITIONS.filter((p) => groups[p.key].length);

    const bar = visible.map((p) =>
      `<span data-key="${p.key}" style="flex:${groups[p.key].length};background:${p.color}"></span>`).join("");
    const labels = visible.map((p) =>
      `<div class="pos-item" data-key="${p.key}" style="flex:${groups[p.key].length}" title="${esc(groups[p.key].map((x) => x.name).join("\n"))}">
         <div class="n">${groups[p.key].length}</div><div class="l">${p.label}</div></div>`).join("");

    const el = $("#position");
    el.innerHTML = `<div class="pos-bar">${bar}</div><div class="pos-labels">${labels}</div>`;
    $$(".pos-item", el).forEach((item) => {
      item.addEventListener("mouseenter", () => {
        el.classList.add("hovering");
        $(`.pos-bar span[data-key="${item.dataset.key}"]`, el).classList.add("hl");
      });
      item.addEventListener("mouseleave", () => {
        el.classList.remove("hovering");
        $$(".pos-bar span", el).forEach((s) => s.classList.remove("hl"));
      });
    });
  }

  /* ---------------- Products ---------------- */
  function sortedFilteredProducts() {
    const q = state.query.trim().toLowerCase();
    let list = products.map((p) => ({ p, a: analyze(p) }));
    if (q) {
      list = list.filter(({ p }) =>
        [p.name, p.brand, p.category, String(p.id)].some((v) => v.toLowerCase().includes(q)));
    }
    const sorters = {
      gap: (x, y) => Math.abs(y.a.gapPct) - Math.abs(x.a.gapPct),
      rank: (x, y) => x.a.rank - y.a.rank || x.p.name.localeCompare(y.p.name),
      name: (x, y) => x.p.name.localeCompare(y.p.name),
      priceAsc: (x, y) => x.p.price - y.p.price,
      priceDesc: (x, y) => y.p.price - x.p.price,
      margin: (x, y) => y.p.margin - x.p.margin,
    };
    // Starred products always float to the top.
    list.sort((x, y) =>
      (state.starred.has(y.p.id) - state.starred.has(x.p.id)) || sorters[state.sort](x, y));
    return list;
  }

  function actionButton(p) {
    if (p.suggestion == null || p.suggestion === p.price) {
      return `<button class="btn done" disabled>${icon("arrowRight")}Price set</button>`;
    }
    const up = p.suggestion > p.price;
    return `<button class="btn" data-action="apply" data-id="${p.id}">${up ? "Raise" : "Lower"} to ${inr(p.suggestion)} ${icon(up ? "arrowUp" : "arrowDown")}</button>`;
  }

  function competitorList(a) {
    return `<div class="comp-list">${a.comps
      .slice().sort((x, y) => x.price - y.price)
      .map((c) => {
        const s = siteById[c.site] || { name: c.site, color: "#888" };
        return `<div><span class="site-name"><i class="swatch" style="background:${s.color}"></i>${esc(s.name)}</span><b>${inr(c.price)}</b></div>`;
      }).join("")}</div>`;
  }

  function productCard({ p, a }) {
    const rungs = a.ladder.map((r, i) => {
      const dot = r.you
        ? `<div class="dot you">You</div>`
        : `<div class="dot" style="color:${rungColor(i, a.total)}"><span>${i + 1}</span></div>`;
      const title = r.you ? "Your store" : (siteById[r.site] || {}).name;
      return `<div class="rung${r.you ? " is-you" : ""}" title="${esc(title)}">${dot}<div class="price">${inr(r.price)}</div></div>`;
    }).join("");
    const starred = state.starred.has(p.id);
    const expanded = state.expanded.has(p.id);

    return `
      <article class="panel p-card">
        <div class="p-top">
          <div class="thumb" aria-hidden="true"></div>
          <div class="p-info">
            <h3 class="p-name" title="${esc(p.name)}">${esc(p.name)}</h3>
            <p class="p-sub"><b>${inr(p.price)}</b> · margin ${p.margin}% · SKU ${p.id}</p>
          </div>
          <div class="p-actions">
            <button class="icon-btn${starred ? " starred" : ""}" data-action="star" data-id="${p.id}" aria-label="${starred ? "Unstar" : "Star"} product" aria-pressed="${starred}">${icon("star")}</button>
            <button class="icon-btn" data-action="menu" data-id="${p.id}" aria-label="More actions">${icon("more")}</button>
          </div>
        </div>
        <p class="p-rank"><b>#${a.rank} of ${a.total}</b> · ${a.rankNote}</p>
        <div class="ladder"><div class="ladder-track"></div><div class="ladder-row">${rungs}</div></div>
        <div class="p-foot">
          <button class="comp-toggle" data-action="expand" data-id="${p.id}" aria-expanded="${expanded}">Competition (${a.comps.length})</button>
          ${actionButton(p)}
        </div>
        ${expanded ? competitorList(a) : ""}
      </article>`;
  }

  function productRow({ p, a }) {
    const pos = POSITIONS.find((x) => x.key === a.position);
    const cheapest = Math.min(...a.comps.map((c) => c.price));
    return `
      <tr>
        <td><div class="prod"><div class="thumb"></div><div><b>${esc(p.name)}</b><small>SKU ${p.id} · ${esc(p.brand)}</small></div></div></td>
        <td class="num"><b>${inr(p.price)}</b></td>
        <td class="num">${p.margin}%</td>
        <td>#${a.rank} of ${a.total}</td>
        <td><span class="pill"><i style="background:${pos.color}"></i>${pos.label}</span></td>
        <td class="num">${inr(cheapest)}</td>
        <td class="num">${inr(a.avg)}</td>
        <td class="num">${actionButton(p)}</td>
      </tr>`;
  }

  function renderProducts() {
    const list = sortedFilteredProducts();
    const shown = state.showAll ? list : list.slice(0, CARD_LIMIT);
    const view = $("#productView");
    $("#productCount").textContent = products.length;

    if (!list.length) {
      view.innerHTML = `<div class="panel empty">No products match “${esc(state.query)}”.</div>`;
    } else if (state.view === "cards") {
      view.innerHTML = `<div class="cards">${shown.map(productCard).join("")}</div>`;
    } else {
      view.innerHTML = `
        <div class="panel list-panel"><table class="table list-table">
          <thead><tr><th>Product</th><th class="num">Your price</th><th class="num">Margin</th><th>Rank</th><th>Position</th>
          <th class="num">Cheapest rival</th><th class="num">Avg. rival</th><th class="num">Next step</th></tr></thead>
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
    menu.className = "panel";
    menu.style.cssText = "position:absolute;z-index:20;padding:4px;min-width:170px;box-shadow:0 10px 30px rgba(0,0,0,.5)";
    const item = (act, label, disabled) =>
      `<button data-menu="${act}" ${disabled ? "disabled" : ""} style="display:block;width:100%;text-align:left;border:0;background:none;padding:7px 10px;border-radius:6px;font-size:10.5px;color:${disabled ? "var(--faint)" : "var(--text)"}">${label}</button>`;
    menu.innerHTML =
      item("competitors", state.expanded.has(p.id) ? "Hide competitor prices" : "Show competitor prices") +
      item("copy", "Copy SKU") +
      item("undo", "Undo price change", !changed);
    document.body.appendChild(menu);
    const r = btn.getBoundingClientRect();
    menu.style.top = window.scrollY + r.bottom + 6 + "px";
    menu.style.left = Math.max(8, window.scrollX + r.right - menu.offsetWidth) + "px";
    menu.addEventListener("mouseover", (e) => { const b = e.target.closest("button:not([disabled])"); $$("button", menu).forEach((x) => (x.style.background = x === b ? "#262626" : "none")); });
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
        toast(p.name + " reset to " + inr(p.price));
        renderAllProductViews();
      }
      closeMenu();
    });
    openMenu = menu;
  }

  function toggleExpand(id) {
    state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id);
    renderProducts();
  }

  function renderAllProductViews() {
    renderPosition();
    renderProducts();
  }

  function bindProducts() {
    $$(".tab").forEach((t) => t.addEventListener("click", () => {
      $$(".tab").forEach((x) => x.classList.toggle("active", x === t));
      state.view = t.dataset.view;
      renderProducts();
    }));
    $("#productSearch").addEventListener("input", (e) => { state.query = e.target.value; renderProducts(); });
    $("#productSort").addEventListener("change", (e) => { state.sort = e.target.value; renderProducts(); });
    $("#toggleAll").addEventListener("click", () => {
      state.showAll = !state.showAll;
      renderProducts();
      if (!state.showAll) $("#products").scrollIntoView({ behavior: "smooth" });
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
          const from = p.price;
          p.price = p.suggestion;
          toast(`${p.name}: ${inr(from)} → ${inr(p.price)}`);
          renderAllProductViews();
          break;
        }
      }
    });
    document.addEventListener("click", (e) => { if (openMenu && !openMenu.contains(e.target)) closeMenu(); });
    window.addEventListener("resize", closeMenu);
  }

  /* ---------------- Sites ---------------- */
  function renderSites() {
    const total = products.length;
    const sites = DATA.sites;
    $("#siteCount").textContent = sites.length;

    const avgMatch = Math.round(sites.reduce((s, x) => s + x.matched / total, 0) / sites.length * 100);
    const listings = sites.reduce((s, x) => s + x.matched, 0);
    const avgIndex = Math.round(sites.reduce((s, x) => s + x.index, 0) / sites.length);
    $("#siteStats").innerHTML =
      `<span>Avg. match<b>${avgMatch}%</b></span><span>Listings<b>${listings}</b></span><span>Avg. index<b>${avgIndex}</b></span>`;

    const q = state.siteQuery.trim().toLowerCase();
    const rows = sites
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) => (state.siteSortAsc ? 1 : -1) * a.name.localeCompare(b.name));

    $("#siteSortIcon").innerHTML = icon(state.siteSortAsc ? "arrowUp" : "arrowDown");
    $("#siteRows").innerHTML = rows.length ? rows.map((s) => {
      const pct = Math.round((s.matched / total) * 100);
      return `<tr>
        <td><div class="site-cell"><span class="site-badge" style="color:${s.color}">${esc(s.initial)}</span>${esc(s.name)}</div></td>
        <td class="matched"><b>${s.matched}</b> <span>of ${total}</span></td>
        <td class="bar-cell hide-sm"><div class="wrap"><div class="bar"><i style="width:${pct}%"></i></div><span class="pct">${pct}%</span></div></td>
        <td class="num">${s.priceChanges}</td>
        <td class="num">${s.index}</td>
      </tr>`;
    }).join("") : `<tr><td colspan="5" class="muted" style="text-align:center">No sites match “${esc(state.siteQuery)}”.</td></tr>`;
  }

  function bindSites() {
    $("#siteSearch").addEventListener("input", (e) => { state.siteQuery = e.target.value; renderSites(); });
    $("#siteSortBtn").addEventListener("click", () => { state.siteSortAsc = !state.siteSortAsc; renderSites(); });
  }

  /* ---------------- Historical chart ---------------- */
  // Deterministic pseudo-random generator so longer ranges look the same on every load.
  function rng(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seriesFor(days) {
    const week = DATA.history.week;
    const out = {};
    Object.keys(week).forEach((id, k) => {
      const base = week[id].slice(-days);
      if (days <= base.length) { out[id] = base; return; }
      const rand = rng(1000 + k * 97 + days);
      const mean = week[id].reduce((s, v) => s + v, 0) / week[id].length - 1.2;
      const back = [];
      let v = week[id][0];
      for (let i = 0; i < days - week[id].length; i++) {
        v += (rand() - 0.5) * 2.2 + (mean - v) * 0.12;
        back.unshift(+v.toFixed(2));
      }
      out[id] = back.concat(week[id]);
    });
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
    const H = svg.clientHeight || 270;
    const pad = { l: 34, r: 46, t: 10, b: 30 };
    const days = state.range;
    const data = seriesFor(days);
    const dates = datesFor(days);
    const visible = DATA.sites.filter((s) => !state.hiddenSeries.has(s.id));

    const values = (visible.length ? visible : DATA.sites).flatMap((s) => data[s.id]);
    let lo = Math.floor((Math.min(...values) - 1) / 4) * 4;
    let hi = Math.ceil((Math.max(...values) + 1) / 4) * 4;
    lo = Math.min(lo, 96); hi = Math.max(hi, 112);
    const step = (hi - lo) / 4 > 4 ? Math.ceil((hi - lo) / 16) * 4 : 4;
    const x = (i) => pad.l + (i / (days - 1)) * (W - pad.l - pad.r);
    const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);

    let out = "";
    for (let v = lo; v <= hi; v += step) {
      out += `<line class="grid" x1="${pad.l}" x2="${W - pad.r + 10}" y1="${y(v)}" y2="${y(v)}"/>`;
      out += `<text class="axis" x="${pad.l - 10}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
    }
    const maxLabels = W < 500 ? 4 : 7;
    const every = Math.max(1, Math.ceil((days - 1) / (maxLabels - 1)));
    for (let i = days - 1; i >= 0; i -= every) {
      out += `<text class="axis" x="${x(i)}" y="${H - 8}" text-anchor="middle">${fmtDate(dates[i])}</text>`;
    }

    visible.forEach((s) => {
      const pts = data[s.id].map((v, i) => [x(i), y(v)]);
      out += `<path class="series" d="${smoothPath(pts)}" stroke="${s.color}"/>`;
    });

    // End labels, nudged apart so they never overlap.
    const ends = visible.map((s) => {
      const v = data[s.id][days - 1];
      return { s, v, cy: y(v), ly: y(v) };
    }).sort((a, b) => a.ly - b.ly);
    for (let i = 1; i < ends.length; i++) {
      if (ends[i].ly - ends[i - 1].ly < 11) ends[i].ly = ends[i - 1].ly + 11;
    }
    ends.forEach((e) => {
      out += `<circle cx="${x(days - 1)}" cy="${e.cy}" r="3" fill="${e.s.color}"/>`;
      out += `<text class="end-label" x="${x(days - 1) + 7}" y="${e.ly + 3}" fill="${e.s.color}">${Math.round(e.v)}</text>`;
    });

    out += `<g id="hover" style="display:none"><line class="hover-line" y1="${pad.t}" y2="${H - pad.b}"/>${visible.map((s) => `<circle r="3.5" fill="${s.color}" stroke="#191919" stroke-width="2" data-s="${s.id}"/>`).join("")}</g>`;
    out += `<rect id="hit" x="${pad.l}" y="0" width="${W - pad.l - pad.r}" height="${H}" fill="transparent"/>`;

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = out;
    chartModel = { x, y, data, dates, visible, days, W, pad };
    bindChartHover();
  }

  function bindChartHover() {
    const svg = $("#chart");
    const hit = $("#hit", svg);
    const g = $("#hover", svg);
    const tip = $("#tooltip");
    const { x, y, data, dates, visible, days, W, pad } = chartModel;

    const move = (clientX) => {
      const r = svg.getBoundingClientRect();
      const px = ((clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(days - 1, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (days - 1))));
      if (!visible.length) return;
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
      tip.style.top = "10px";
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
  }

  /* ---------------- Sidebar ---------------- */
  function bindSidebar() {
    $("#sidebarToggle").addEventListener("click", () => $("#app").classList.toggle("collapsed"));
    $$(".side-nav .side-btn").forEach((a) => a.addEventListener("click", (e) => {
      if (a.getAttribute("href") === "#") e.preventDefault();
      if (a.getAttribute("href") === "#" && a.title === "Dashboard") window.scrollTo({ top: 0, behavior: "smooth" });
      $$(".side-nav .side-btn").forEach((x) => x.classList.toggle("active", x === a));
    }));
  }

  /* ---------------- Init ---------------- */
  function init() {
    hydrate();
    renderHeader();
    renderOverview();
    renderPosition();
    renderProducts();
    renderSites();
    renderLegend();
    renderChart();
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
