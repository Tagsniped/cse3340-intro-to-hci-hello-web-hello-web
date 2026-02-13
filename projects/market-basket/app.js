/* Market Basket Prototype
   - Market selector (modal search)
   - Produce list with expandable cards
   - Seasonality band (Winter/Spring/Summer/Fall) + Today marker (month)
   - Sort: Fresh First / A–Z
   - Persona modes: Default / Focus / Demo
*/

const STORAGE_KEY = "marketBasketState_v1";

const PERSONAS = [
  { key: "default", label: "Default" },
  { key: "focus", label: "Focus" }, // show only in-season now
  { key: "demo", label: "Demo" },   // auto-expand top item, emphasize Today marker
];

const MARKETS = [
  { id: "ferry", name: "Ferry Plaza Farmers Market", city: "San Francisco, CA", region: "coastal_west" },
  { id: "santamonica", name: "Santa Monica Farmers Market", city: "Santa Monica, CA", region: "coastal_west" },
  { id: "pike", name: "Pike Place Market", city: "Seattle, WA", region: "pnw" },
  { id: "portland", name: "Portland Farmers Market", city: "Portland, OR", region: "pnw" },
  { id: "union", name: "Union Square Greenmarket", city: "New York, NY", region: "northeast" },
  { id: "boston", name: "Boston Public Market", city: "Boston, MA", region: "northeast" },
  { id: "austin", name: "Austin Farmers Market", city: "Austin, TX", region: "texas" },
  { id: "arlington", name: "Arlington Farmers Market", city: "Arlington, TX", region: "texas" },
  { id: "miami", name: "Miami Farmers Market", city: "Miami, FL", region: "florida" },
];

// Each produce item has a "base" peak window (month indices 0..11) and region offsets.
const PRODUCE = [
  {
    id: "oranges",
    name: "Oranges",
    about: "Citrus fruit packed with vitamin C, perfect for fresh juice or snacking.",
    tips: "Choose firm, heavy oranges for their size. Store at room temperature or refrigerate for longer freshness.",
    nutrition: "Excellent source of Vitamin C, fiber, and folate. Supports immune health.",
    peak: { start: 10, end: 2 }, // Nov–Mar (wrap)
    tags: ["Citrus"]
  },
  {
    id: "strawberries",
    name: "Strawberries",
    about: "Bright, sweet berries that shine fresh, in desserts, or blended.",
    tips: "Look for dry, glossy berries with green caps. Refrigerate unwashed; wash right before eating.",
    nutrition: "Vitamin C, manganese, antioxidants. Naturally sweet with high water content.",
    peak: { start: 3, end: 6 }, // Apr–Jul
    tags: ["Berry"]
  },
  {
    id: "blueberries",
    name: "Blueberries",
    about: "Small berries with big flavor—great for snacking, baking, and oatmeal.",
    tips: "Pick firm berries with a silvery bloom. Refrigerate; freeze for long-term storage.",
    nutrition: "Antioxidants, Vitamin K, fiber. Often associated with heart and brain health.",
    peak: { start: 5, end: 8 }, // Jun–Sep
    tags: ["Berry"]
  },
  {
    id: "tomatoes",
    name: "Tomatoes",
    about: "Summer staple for salads, sauces, and sandwiches.",
    tips: "Aromatic and slightly soft is good. Keep at room temp until ripe, then refrigerate briefly.",
    nutrition: "Vitamin C, potassium, lycopene. Great for fresh and cooked dishes.",
    peak: { start: 6, end: 9 }, // Jul–Oct
    tags: ["Vegetable"]
  },
  {
    id: "cucumber",
    name: "Cucumber",
    about: "Crisp and refreshing—perfect for salads and quick pickles.",
    tips: "Choose firm cucumbers with even color. Store in the fridge; avoid freezing.",
    nutrition: "Hydration-focused, low calorie, with small amounts of Vitamin K.",
    peak: { start: 5, end: 8 }, // Jun–Sep
    tags: ["Vegetable"]
  },
  {
    id: "watermelon",
    name: "Watermelon",
    about: "Hydrating summer fruit—best icy-cold on a hot day.",
    tips: "Look for a creamy yellow field spot and a deep hollow sound when tapped.",
    nutrition: "Hydration, Vitamin C, and lycopene; naturally sweet with lots of water.",
    peak: { start: 6, end: 8 }, // Jul–Sep
    tags: ["Melon"]
  },
  {
    id: "apples",
    name: "Apples",
    about: "Crunchy and versatile—from snacking to pies to savory pairings.",
    tips: "Pick firm apples without bruises. Refrigerate for longer freshness.",
    nutrition: "Fiber (pectin), Vitamin C. Classic high-satiety snack.",
    peak: { start: 8, end: 10 }, // Sep–Nov
    tags: ["Pome"]
  },
  {
    id: "peaches",
    name: "Peaches",
    about: "Fragrant stone fruit with peak sweetness in warm months.",
    tips: "Slight give + strong aroma is good. Ripen on counter; refrigerate once ripe.",
    nutrition: "Vitamins A & C; juicy, sweet, and satisfying.",
    peak: { start: 5, end: 7 }, // Jun–Aug
    tags: ["Stone fruit"]
  },
];

const REGION_SHIFT = {
  coastal_west: -1,
  pnw: 0,
  northeast: 0,
  texas: 1,
  florida: -2,
};

function clampMonth(m){ return (m + 12) % 12; }

function shiftPeak(peak, region){
  const s = REGION_SHIFT[region] ?? 0;
  return { start: clampMonth(peak.start + s), end: clampMonth(peak.end + s) };
}

function isInPeak(monthIdx, peak){
  // peak window can wrap (e.g., Nov -> Mar)
  if (peak.start <= peak.end) return monthIdx >= peak.start && monthIdx <= peak.end;
  return (monthIdx >= peak.start) || (monthIdx <= peak.end);
}

function monthName(i){
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i];
}

function monthRangeLabel(peak){
  return `${monthName(peak.start)} – ${monthName(peak.end)}`;
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) throw new Error("no state");
    const parsed = JSON.parse(raw);
    return {
      theme: parsed.theme ?? "dark",
      persona: parsed.persona ?? "default",
      sort: parsed.sort ?? "fresh",
      marketId: parsed.marketId ?? "austin"
    };
  }catch{
    return { theme:"dark", persona:"default", sort:"fresh", marketId:"austin" };
  }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

/* Elements */
const personaLabel = document.getElementById("personaLabel");
const btnPersona = document.getElementById("btnPersona");
const btnTheme = document.getElementById("btnTheme");

const marketSelect = document.getElementById("marketSelect");
const marketMeta = document.getElementById("marketMeta");
const btnChangeMarket = document.getElementById("btnChangeMarket");

const todayValue = document.getElementById("todayValue");
const searchInput = document.getElementById("searchInput");

const segBtns = Array.from(document.querySelectorAll(".seg-btn"));
const listEl = document.getElementById("list");

const marketModal = document.getElementById("marketModal");
const marketSearch = document.getElementById("marketSearch");
const marketList = document.getElementById("marketList");

/* Date / “Today” */
const now = new Date();
const todayMonth = now.getMonth(); // 0..11
const todayLabel = now.toLocaleString(undefined, { month: "long", year: "numeric" });
todayValue.textContent = todayLabel;

/* UI helpers */
function setTheme(theme){
  document.documentElement.dataset.theme = theme;
  state.theme = theme;
  saveState();
}

function setPersona(persona){
  state.persona = persona;
  const meta = PERSONAS.find(p => p.key === persona) || PERSONAS[0];
  personaLabel.textContent = meta.label;
  saveState();
  render();
}

function cyclePersona(){
  const idx = PERSONAS.findIndex(p => p.key === state.persona);
  const next = PERSONAS[(idx + 1) % PERSONAS.length];
  setPersona(next.key);
}

function setSort(sort){
  state.sort = sort;
  segBtns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.sort === sort)));
  saveState();
  render();
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function getMarket(){
  return MARKETS.find(m => m.id === state.marketId) || MARKETS[0];
}

/* Market modal */
function openMarketModal(){
  marketSearch.value = "";
  renderMarketList("");
  marketModal.showModal();
  marketSearch.focus();
}

function renderMarketList(q){
  const query = (q || "").trim().toLowerCase();
  const items = MARKETS.filter(m => {
    if(!query) return true;
    return `${m.name} ${m.city}`.toLowerCase().includes(query);
  });

  marketList.innerHTML = items.map(m => `
    <div class="market-item">
      <div>
        <strong>${escapeHtml(m.name)}</strong>
        <div class="meta">${escapeHtml(m.city)}</div>
      </div>
      <button class="btn btn-primary" data-pick="${escapeHtml(m.id)}">Select</button>
    </div>
  `).join("");

  marketList.querySelectorAll("[data-pick]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.marketId = btn.getAttribute("data-pick");
      saveState();
      applyMarketToSelect();
      render();
      marketModal.close();
    });
  });
}

function applyMarketToSelect(){
  marketSelect.innerHTML = MARKETS.map(m =>
    `<option value="${escapeHtml(m.id)}"${m.id === state.marketId ? " selected" : ""}>${escapeHtml(m.name)}</option>`
  ).join("");

  const m = getMarket();
  marketMeta.textContent = `${m.city}`;
}

/* Produce sorting + rendering */
function scoreForFresh(item, region){
  const peak = shiftPeak(item.peak, region);
  // heuristic: in-season now = highest, else distance to peak start
  if(isInPeak(todayMonth, peak)) return 100;

  // distance (circular) from today -> start
  const dist = (peak.start - todayMonth + 12) % 12;
  // closer to start => higher
  return Math.max(0, 60 - dist * 6);
}

function sortedProduce(list, region){
  const copy = [...list];
  if(state.sort === "az"){
    copy.sort((a,b)=> a.name.localeCompare(b.name));
    return copy;
  }

  // Fresh First: by score desc, then A-Z
  copy.sort((a,b)=> {
    const sa = scoreForFresh(a, region);
    const sb = scoreForFresh(b, region);
    return (sb - sa) || a.name.localeCompare(b.name);
  });
  return copy;
}

function bandHtml(peak){
  // peak segment in percent of 12 months; handle wrap by splitting
  const pct = (m) => (m / 12) * 100;

  const segments = [];
  if(peak.start <= peak.end){
    segments.push({ left: pct(peak.start), right: pct(peak.end + 1) }); // +1 to feel inclusive
  }else{
    segments.push({ left: pct(peak.start), right: 100 });
    segments.push({ left: 0, right: pct(peak.end + 1) });
  }

  const todayLeft = pct(todayMonth);

  return `
    <div class="season">
      <div class="season-top">
        <span>Jan</span>
        <span>Dec</span>
      </div>
      <div class="band" aria-label="Seasonality band">
        ${segments.map(s => `<div class="peak" style="left:${s.left}%; width:${Math.max(0, s.right - s.left)}%"></div>`).join("")}
        <div class="today" style="left:${todayLeft}%"></div>
      </div>
      <div class="seasons-label" aria-hidden="true">
        <span>Winter</span><span>Spring</span><span>Summer</span><span>Fall</span>
      </div>
    </div>
  `;
}

function cardHtml(item, region){
  const peak = shiftPeak(item.peak, region);
  const inNow = isInPeak(todayMonth, peak);

  const badges = [
    ...(inNow ? [`<span class="badge badge-live">In Season Now!</span>`] : [`<span class="badge">Out of Season</span>`]),
    ...(item.tags || []).slice(0,2).map(t => `<span class="badge">${escapeHtml(t)}</span>`)
  ].join("");

  return `
    <article class="card" data-id="${escapeHtml(item.id)}">
      <div class="card-head">
        <div style="flex:1">
          <div class="badges">${badges}</div>
          <div class="card-title">${escapeHtml(item.name)}</div>
          <p class="desc">${escapeHtml(item.about)}</p>
        </div>
        <div>
          <button class="btn" data-action="toggle">Expand</button>
        </div>
      </div>

      <div class="row">
        <div>
          <div class="badge" style="display:inline-flex">Peak Season</div>
          <div style="margin-top:8px; font-weight:850">${escapeHtml(monthRangeLabel(peak))}</div>
        </div>

        <div>
          ${bandHtml(peak)}
        </div>

        <div>
          <button class="btn btn-primary" data-action="quick">${inNow ? "Add to basket" : "Save for later"}</button>
        </div>
      </div>

      <div class="expand">
        <div class="kv">
          <div class="kv-block">
            <div class="kv-title">Selection & Storage Tips</div>
            <div class="kv-body">${escapeHtml(item.tips)}</div>
          </div>
          <div class="kv-block">
            <div class="kv-title">Nutrition Highlights</div>
            <div class="kv-body">${escapeHtml(item.nutrition)}</div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function render(){
  const market = getMarket();
  const region = market.region;

  const q = (searchInput.value || "").trim().toLowerCase();

  let items = PRODUCE.filter(p => {
    if(!q) return true;
    return `${p.name} ${p.about} ${(p.tags||[]).join(" ")}`.toLowerCase().includes(q);
  });

  // Persona: focus = only in-season now
  if(state.persona === "focus"){
    items = items.filter(p => isInPeak(todayMonth, shiftPeak(p.peak, region)));
  }

  items = sortedProduce(items, region);

  listEl.innerHTML = items.map(p => cardHtml(p, region)).join("");

  // Wire card controls
  listEl.querySelectorAll(".card").forEach(card => {
    const id = card.getAttribute("data-id");
    const item = PRODUCE.find(p => p.id === id);
    if(!item) return;

    const toggle = card.querySelector('[data-action="toggle"]');
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      card.classList.toggle("expanded");
      toggle.textContent = card.classList.contains("expanded") ? "Collapse" : "Expand";
    });

    const quick = card.querySelector('[data-action="quick"]');
    quick.addEventListener("click", (e) => {
      e.stopPropagation();
      quick.textContent = "Saved ✓";
      setTimeout(() => (quick.textContent = (quick.textContent.includes("Saved") ? "Saved ✓" : "Saved ✓")), 250);
    });

    // click anywhere on card toggles (nice for touch)
    card.addEventListener("click", (e) => {
      if(e.target.closest("button")) return;
      card.classList.toggle("expanded");
      toggle.textContent = card.classList.contains("expanded") ? "Collapse" : "Expand";
    });
  });

  // Persona: demo = auto-expand top item
  if(state.persona === "demo"){
    const first = listEl.querySelector(".card");
    if(first){
      first.classList.add("expanded");
      const t = first.querySelector('[data-action="toggle"]');
      if(t) t.textContent = "Collapse";
    }
  }
}

/* Events */
btnPersona.addEventListener("click", cyclePersona);

btnTheme.addEventListener("click", () => {
  const next = (state.theme === "dark") ? "light" : "dark";
  setTheme(next);
});

marketSelect.addEventListener("change", () => {
  state.marketId = marketSelect.value;
  saveState();
  render();
});

btnChangeMarket.addEventListener("click", openMarketModal);

marketSearch.addEventListener("input", () => renderMarketList(marketSearch.value));

searchInput.addEventListener("input", render);

segBtns.forEach(b => b.addEventListener("click", () => setSort(b.dataset.sort)));

/* Init */
applyMarketToSelect();
setTheme(state.theme);
setPersona(state.persona);
setSort(state.sort);
render();
