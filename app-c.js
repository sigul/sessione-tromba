function renderMetodo() {
  document.getElementById("metodo").innerHTML = `
    <p class="eyebrow">Fonte · corsoditromba.com</p>
    <h1>Il metodo</h1>
    <p class="muted">Davide Pianegonda distingue riscaldamento e fondamentali. Warm-up: 80% corpo, 20% buzzing. Fondamentali: 80% strumento. Poi musica fino a una stanchezza onesta.</p>
    <h2>Testi in sessione</h2>
    <p>Thompson Buzzing Book · Schlossberg Daily Drills · Stamp Warm-ups · Thibaud A.B.C. · Plog · Clarke · Arban · Damrow Shape Up · Vizzutti.</p>
    <p class="muted">Questa pagina non sostituisce una lezione. Per un piano lungo: <a href="https://corsoditromba.com" style="color:var(--accent)">corsoditromba.com</a></p>`;
}

function renderDiario() {
  const hist = JSON.parse(localStorage.getItem("st:hist") || "[]");
  document.getElementById("diario").innerHTML = hist.length
    ? `<h1>Diario</h1>${hist.map((s, i) => `<div class="card" style="margin:12px 0"><strong>${s.title}</strong><p class="muted">${s.summary}</p><button class="btn primary" data-open="${i}">Riapri</button></div>`).join("")}`
    : `<h1>Diario vuoto</h1><p class="muted">Genera una sessione per vederla qui.</p>`;
}

function goto(id) {
  ["studio", "sessione", "catalogo", "metodo", "diario"].forEach((p) => {
    document.getElementById(p).classList.toggle("hidden", p !== id);
  });
  document.querySelectorAll("nav button").forEach((b) =>
    b.classList.toggle("active", id === "studio" || id === "sessione" ? b.dataset.page === "studio" : b.dataset.page === id),
  );
}

document.body.addEventListener("click", (e) => {
  const n = e.target.closest("[data-page]");
  if (n) {
    const p = n.dataset.page;
    if (p === "studio") { renderStudio(); goto("studio"); }
    if (p === "catalogo") { renderCatalogo(); goto("catalogo"); }
    if (p === "metodo") { renderMetodo(); goto("metodo"); }
    if (p === "diario") { renderDiario(); goto("diario"); }
  }
  const c = e.target.closest(".choice[data-k]");
  if (c) {
    state[c.dataset.k] = Number.isNaN(Number(c.dataset.v)) ? c.dataset.v : +c.dataset.v;
    renderStudio();
  }
  const m = e.target.closest(".choice[data-multi]");
  if (m) {
    const k = m.dataset.multi;
    const v = m.dataset.v;
    state[k] = state[k].includes(v) ? state[k].filter((x) => x !== v) : [...state[k], v];
    renderStudio();
  }
  if (e.target.id === "next") { state.step = Math.min(4, state.step + 1); renderStudio(); }
  if (e.target.id === "back") { state.step = Math.max(0, state.step - 1); renderStudio(); }
  if (e.target.id === "gen") build();
  if (e.target.id === "nextb") {
    if (state.idx < state.session.blocks.length - 1) { state.idx++; showSession(); }
    else { renderDiario(); goto("diario"); }
  }
  if (e.target.id === "prevb") { state.idx = Math.max(0, state.idx - 1); showSession(); }
  const i = e.target.closest("[data-i]");
  if (i) { state.idx = +i.dataset.i; showSession(); }
  const f = e.target.closest("[data-f]");
  if (f) renderCatalogo(f.dataset.f);
  const o = e.target.closest("[data-open]");
  if (o) {
    const hist = JSON.parse(localStorage.getItem("st:hist"));
    state.session = hist[+o.dataset.open];
    state.idx = 0;
    showSession();
  }
});

Promise.all(["meta","c0","c1","c2","c3"].map((n) => fetch(`./${n}.json`).then((r) => r.json()))).then(([meta, ...parts]) => {
  state.data = { ...meta, categories: parts.flatMap((p) => p.categories) };
  renderStudio();
});
