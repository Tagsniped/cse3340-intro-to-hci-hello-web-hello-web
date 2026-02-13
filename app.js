/* -----------------------------------------
   Projects Hub (no framework)
   - Cards view with modal
   - Dashboard config (visibility, pin, persona)
   - LocalStorage persistence
------------------------------------------ */

const DEFAULT_STATE = {
  layout: "grid",      // grid | list | compact
  sort: "pinned",      // pinned | recent | name
  accent: 25,          // 0..100
  theme: "dark",       // dark | light
  projects: [
    {
      id: "p1",
      name: "CSV Dashboard Widget",
      description: "Loads a CSV and renders a clean table view with filtering and quick stats.",
      tags: ["Web", "Data"],
      updated: "2026-02-01",
      url: "./projects/csv-widget/index.html",
      visible: true,
      pinned: true,
      persona: "default",
      personas: {
        default: { title: "Default", summary: "Table + filters + stats." },
        focus: { title: "Focus", summary: "Stats-only mini widget for quick checks." },
        dev: { title: "Dev", summary: "Shows schema, validation, and raw preview." }
      }
    },
    {
      id: "p2",
      name: "Gradient Loop Tool",
      description: "Generate smooth cyclic gradients from key points and preview them live.",
      tags: ["Tool", "UI"],
      updated: "2026-01-20",
      url: "./projects/gradient-loop/index.html",
      visible: true,
      pinned: false,
      persona: "focus",
      personas: {
        default: { title: "Default", summary: "Editor + preview + export." },
        focus: { title: "Focus", summary: "Big preview + minimal controls." },
        share: { title: "Share", summary: "Copy CSS, PNG export, and link settings." }
      }
    },
    {
      id: "p3",
      name: "NTSS Mock Login Flow",
      description: "A small standalone prototype showing account registration & login states.",
      tags: ["HCI", "Prototype"],
      updated: "2026-02-10",
      url: "./projects/ntss-login/index.html",
      visible: true,
      pinned: false,
      persona: "default",
      personas: {
        default: { title: "Default", summary: "Walkthrough with states A→B→C→D." },
        critique: { title: "Critique", summary: "Highlights affordances & breakdowns." },
        demo: { title: "Demo", summary: "Fullscreen flow with narration notes." }
      }
    },
    {
      id: "p4",
      name: "Minecraft Build Viewer (WIP)",
      description: "Prototype for browsing build layers and materials lists (future).",
      tags: ["Minecraft", "WIP"],
      updated: "2026-01-05",
      url: "#",
      visible: false,
      pinned: false,
      persona: "dev",
      personas: {
        default: { title: "Default", summary: "Browse builds and steps." },
        dev: { title: "Dev", summary: "Shows parsing pipeline + debug views." },
        compact: { title: "Compact", summary: "Tiny widget with next build step." }
      }
    },
    {
      id: "p5",
      name: "The Market Basket (Prototype)",
      description: "Seasonal produce finder with market selector, expandable cards, and seasonality bars.",
      tags: ["HCI", "Prototype", "Web"],
      updated: "2026-02-13",
      url: "./projects/market-basket/index.html",
      visible: true,
      pinned: true,
      persona: "default",
      personas: {
        default: { title: "Default", summary: "Market selector + Fresh First list + expandable cards." },
        focus: { title: "Focus", summary: "Shows only items in season now (fast scan)." },
        demo: { title: "Demo", summary: "Auto-expands top item and highlights Today marker." }
      }
    }

  ]
};

const STORAGE_KEY = "projectsHubState_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    // light merge to tolerate future additions
    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      projects: parsed.projects ?? structuredClone(DEFAULT_STATE.projects),
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

/* Elements */
const viewProjects = document.getElementById("viewProjects");
const viewDashboard = document.getElementById("viewDashboard");

const btnProjects = document.getElementById("btnProjects");
const btnDashboard = document.getElementById("btnDashboard");
const btnTheme = document.getElementById("btnTheme");

const cardsEl = document.getElementById("cards");
const searchInput = document.getElementById("searchInput");
const segButtons = Array.from(document.querySelectorAll(".seg-btn"));

const dashLayout = document.getElementById("dashLayout");
const dashSort = document.getElementById("dashSort");
const dashAccent = document.getElementById("dashAccent");
const dashList = document.getElementById("dashList");
const btnReset = document.getElementById("btnReset");
const btnSave = document.getElementById("btnSave");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalMeta = document.getElementById("modalMeta");
const modalBody = document.getElementById("modalBody");
const modalLink = document.getElementById("modalLink");

/* Helpers */
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  state.theme = theme;
  saveState();
}

function setAccentIntensity(val0to100) {
  const a = Math.max(0, Math.min(100, Number(val0to100))) / 100;
  // keep it subtle even at 100
  const mapped = 0.08 + a * 0.32; // 0.08..0.40
  document.documentElement.style.setProperty("--accent-alpha", mapped.toFixed(3));
  state.accent = Math.round(Number(val0to100));
}

function switchView(which) {
  const isProjects = which === "projects";
  viewProjects.classList.toggle("view-active", isProjects);
  viewDashboard.classList.toggle("view-active", !isProjects);

  btnProjects.setAttribute("aria-pressed", String(isProjects));
  btnDashboard.setAttribute("aria-pressed", String(!isProjects));

  if (isProjects) {
    renderCards();
  } else {
    renderDashboard();
  }
}

function sortProjects(list) {
  const copy = [...list];
  const mode = state.sort;

  if (mode === "name") {
    copy.sort((a,b)=> a.name.localeCompare(b.name));
  } else if (mode === "recent") {
    copy.sort((a,b)=> (b.updated || "").localeCompare(a.updated || ""));
  } else {
    // pinned first, then recent
    copy.sort((a,b)=> (Number(b.pinned) - Number(a.pinned)) || ((b.updated || "").localeCompare(a.updated || "")));
  }
  return copy;
}

function layoutClass(layout) {
  if (layout === "list") return "cards cards-list";
  if (layout === "compact") return "cards cards-compact";
  return "cards cards-grid";
}

function getPersona(project) {
  const key = project.persona || "default";
  return project.personas?.[key] || project.personas?.default || { title: "Default", summary: "" };
}

function pill(text) {
  return `<span class="badge">${escapeHtml(text)}</span>`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openModal(project) {
  const persona = getPersona(project);
  modalTitle.textContent = project.name;
  modalMeta.textContent = `${project.tags?.join(" • ") || ""}${project.updated ? " • Updated " + project.updated : ""}`;
  modalBody.innerHTML = `
    <p class="muted" style="margin-top:0">${escapeHtml(project.description)}</p>
    <div class="persona">
      <div class="persona-title">Persona view: ${escapeHtml(persona.title)}</div>
      <div class="persona-content">${escapeHtml(persona.summary)}</div>
    </div>
  `;

  if (project.url && project.url !== "#") {
    modalLink.href = project.url;
    modalLink.style.display = "inline-flex";
  } else {
    modalLink.href = "#";
    modalLink.style.display = "none";
  }

  modal.showModal();
}

/* Rendering */
function renderCards() {
  const query = (searchInput.value || "").trim().toLowerCase();

  const visibleProjects = state.projects
    .filter(p => p.visible)
    .filter(p => {
      if (!query) return true;
      const hay = `${p.name} ${p.description} ${(p.tags||[]).join(" ")}`.toLowerCase();
      return hay.includes(query);
    });

  const sorted = sortProjects(visibleProjects);

  cardsEl.className = layoutClass(state.layout);

  cardsEl.innerHTML = sorted.map(project => {
    const persona = getPersona(project);
    const badges = [
      ...(project.pinned ? ["Pinned"] : []),
      ...(project.tags || [])
    ].slice(0, 5);

    return `
      <article class="card" data-id="${escapeHtml(project.id)}">
        <div class="card-head">
          <div style="flex:1">
            <div class="badges">${badges.map(pill).join("")}</div>
            <div class="card-title">${escapeHtml(project.name)}</div>
          </div>
          <div class="mini" title="Persona view">
            <span class="dot" aria-hidden="true"></span>
            <span>${escapeHtml(persona.title)}</span>
          </div>
        </div>

        <p class="card-desc">${escapeHtml(project.description)}</p>

        <div class="persona">
          <div class="persona-title">Widget view</div>
          <div class="persona-content">${escapeHtml(persona.summary)}</div>
        </div>

        <div class="card-foot">
          <div class="mini">${project.updated ? `Updated ${escapeHtml(project.updated)}` : ""}</div>
          <div class="card-actions">
            <button class="btn" data-action="details">Details</button>
            ${project.url && project.url !== "#"
              ? `<a class="btn btn-primary" href="${escapeHtml(project.url)}" target="_blank" rel="noreferrer">Open</a>`
              : `<button class="btn btn-primary" data-action="comingsoon" type="button">Coming soon</button>`
            }
          </div>
        </div>
      </article>
    `;
  }).join("");

  // Card events
  cardsEl.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", (e) => {
      const id = card.getAttribute("data-id");
      const project = state.projects.find(p => p.id === id);
      if (!project) return;

      const action = e.target?.getAttribute?.("data-action");
      if (action === "details" || action === "comingsoon" || e.target.tagName === "ARTICLE") {
        openModal(project);
      }
    });
  });
}

function renderDashboard() {
  dashLayout.value = state.layout;
  dashSort.value = state.sort;
  dashAccent.value = String(state.accent);

  const sorted = sortProjects(state.projects);

  dashList.innerHTML = sorted.map(p => {
    const personaKeys = Object.keys(p.personas || { default: {} });
    const options = personaKeys.map(k => {
      const title = p.personas[k]?.title || k;
      return `<option value="${escapeHtml(k)}"${k === (p.persona || "default") ? " selected" : ""}>${escapeHtml(title)}</option>`;
    }).join("");

    return `
      <div class="dash-row" data-id="${escapeHtml(p.id)}">
        <div>
          <strong>${escapeHtml(p.name)}</strong>
          <div class="muted" style="margin:4px 0 0; font-size:12px;">
            ${escapeHtml(p.description)}
          </div>
        </div>

        <div class="row-controls">
          <label class="toggle">
            <input type="checkbox" data-field="visible" ${p.visible ? "checked" : ""}/>
            Show
          </label>
          <label class="toggle">
            <input type="checkbox" data-field="pinned" ${p.pinned ? "checked" : ""}/>
            Pin
          </label>
        </div>

        <div class="row-controls">
          <select class="select" data-field="persona" title="Persona view">
            ${options}
          </select>
        </div>
      </div>
    `;
  }).join("");

  // Wire inputs
  dashList.querySelectorAll(".dash-row").forEach(row => {
    const id = row.getAttribute("data-id");
    const project = state.projects.find(p => p.id === id);
    if (!project) return;

    row.querySelectorAll("[data-field]").forEach(el => {
      el.addEventListener("change", () => {
        const field = el.getAttribute("data-field");
        if (field === "visible" || field === "pinned") {
          project[field] = Boolean(el.checked);
        } else if (field === "persona") {
          project.persona = el.value;
        }
      });
    });
  });
}

/* Events */
btnProjects.addEventListener("click", () => switchView("projects"));
btnDashboard.addEventListener("click", () => switchView("dashboard"));

btnTheme.addEventListener("click", () => {
  const next = (state.theme === "dark") ? "light" : "dark";
  setTheme(next);
});

searchInput.addEventListener("input", () => renderCards());

segButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const layout = btn.dataset.layout;
    state.layout = layout;
    saveState();

    segButtons.forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
    renderCards();
  });
});

dashLayout.addEventListener("change", () => { state.layout = dashLayout.value; });
dashSort.addEventListener("change", () => { state.sort = dashSort.value; });
dashAccent.addEventListener("input", () => { setAccentIntensity(dashAccent.value); });

btnSave.addEventListener("click", () => {
  saveState();
  switchView("projects");
});

btnReset.addEventListener("click", () => {
  state = structuredClone(DEFAULT_STATE);
  saveState();
  applyStateToUI();
  renderDashboard();
});

/* Init */
function applyStateToUI() {
  setTheme(state.theme || "dark");
  setAccentIntensity(state.accent ?? 25);

  // set segmented buttons
  segButtons.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.layout === state.layout)));
}

applyStateToUI();
switchView("projects");
