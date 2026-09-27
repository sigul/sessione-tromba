const RANK = { principiante: 0, base: 1, intermedio: 2, avanzato: 3 };
const MAP = {
  tensione: ["corpo", "buzzing", "suono", "grave", "warmdown"],
  suono: ["suono", "buzzing", "flessibilita"],
  intonazione: ["buzzing", "suono", "intervalli"],
  buzzing: ["buzzing", "corpo"],
  resistenza: ["suono", "flessibilita", "grave"],
  acuto: ["flessibilita", "suono", "acuto"],
  grave: ["grave", "suono", "warmdown"],
  flessibilita: ["flessibilita", "suono"],
  articolazione: ["staccato", "staccato-misto", "clarke"],
  lettura: ["lettura"],
  jazz: ["accordi", "repertorio"],
  repertorio: ["repertorio"],
};

const state = {
  step: 0,
  minutes: 30,
  level: "base",
  problems: ["suono"],
  focuses: ["suono"],
  energy: "normale",
  last: "prima",
  session: null,
  idx: 0,
  data: null,
};

try {
  const s = JSON.parse(localStorage.getItem("st:last") || "null");
  if (s) state.session = s;
} catch (_) {}

function pick(cat, level, preferShort) {
  const rank = RANK[level];
  const pool = cat.videos.filter((v) => {
    if (RANK[v.minLevel] > rank) return false;
    if (v.maxLevel && rank > RANK[v.maxLevel]) return false;
    return v.instrument !== "C";
  });
  const list = pool.length ? pool : cat.videos;
  if (!list.length) return null;
  return [...list].sort((a, b) => {
    const da = Math.abs(RANK[a.minLevel] - rank);
    const db = Math.abs(RANK[b.minLevel] - rank);
    if (da !== db) return da - db;
    if (preferShort) return a.durationSec - b.durationSec;
    return 0;
  })[0];
}

function byId(id) {
  return state.data.categories.find((c) => c.id === id);
}

function build() {
  const d = state.data;
  const minutes = state.minutes;
  const warm = Math.max(4, Math.round(minutes * 0.2));
  const music = minutes >= 60 ? Math.round(minutes * 0.18) : minutes >= 30 ? Math.round(minutes * 0.15) : minutes >= 20 ? 3 : 2;
  const close = minutes >= 30 ? 3 : minutes >= 20 ? 2 : 0;
  const fund = Math.max(6, minutes - warm - music - close);
  const tired = state.energy === "stanco" || state.last === "faticosa";
  const preferShort = tired || minutes <= 20;
  const scored = d.categories
    .filter((c) => c.phase === "fondamentali")
    .map((c) => {
      if (RANK[c.minLevel] > RANK[state.level]) return { c, s: -100 };
      let s = 0;
      if (state.focuses.includes(c.id)) s += 8;
      state.problems.forEach((p) => {
        if (c.problems.includes(p)) s += 5;
        if ((MAP[p] || []).includes(c.id)) s += 2;
      });
      if (state.energy === "stanco" && c.id === "acuto") s -= 12;
      if (state.energy === "stanco" && c.id === "staccato-misto") s -= 4;
      if (state.energy === "fresco" && c.id === "acuto") s += 3;
      if (state.last === "faticosa" && c.id === "acuto") s -= 8;
      if (state.last === "faticosa" && (c.id === "grave" || c.id === "suono")) s += 3;
      return { c, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  const maxFund = minutes >= 60 ? 3 : minutes >= 30 ? 2 : 1;
  const chosen = scored.slice(0, maxFund).map((x) => x.c);
  if (!chosen.length) chosen.push(byId("suono"));
  const blocks = [];
  const bodyMin = Math.max(2, Math.round(warm * 0.65));
  blocks.push({ title: "Riscaldamento del corpo", min: bodyMin, cat: byId("corpo"), tip: "80% attenzione al corpo. Spalle basse, respiro basso." });
  blocks.push({ title: "Buzzing sul boccale", min: Math.max(2, warm - bodyMin), cat: byId("buzzing"), tip: "Thompson con il piano: cerca il centro, non spingere." });
  const weights = chosen.map((_, i) => (i === 0 ? 1.4 : 1));
  const sum = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  chosen.forEach((c, i) => {
    const m = i === chosen.length - 1 ? Math.max(4, fund - acc) : Math.max(4, Math.round((fund * weights[i]) / sum));
    acc += m;
    blocks.push({ title: c.label, min: m, cat: c, tip: c.blurb });
  });
  if (music > 0) {
    blocks.push({ title: "Musica — play along", min: music, cat: byId("repertorio"), tip: "Fraseggio e dinamica. Se il suono si chiude, scendi." });
  }
  if (close > 0) {
    blocks.push({ title: "Warm-down", min: close, cat: byId("warmdown"), tip: "Volume piano, pedali, niente ambizione." });
  }
  const session = {
    id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()),
    title: `Sessione ${minutes}' · ${chosen.map((c) => c.label).join(" · ")}`,
    summary: `Percorso da ${minutes} minuti per un allievo ${state.level}. Riscaldamento 20%, fondamentali, poi musica.`,
    createdAt: new Date().toISOString(),
    savedAt: new Date().toISOString(),
    note: "",
    level: state.level,
    minutes,
    blocks: blocks.map((b) => ({ ...b, video: pick(b.cat, state.level, preferShort) })),
  };
  state.session = session;
  state.idx = 0;
  const diary = loadDiary().filter((s) => s.id !== session.id);
  diary.unshift(session);
  localStorage.setItem("st:diary", JSON.stringify(diary));
  localStorage.setItem("st:last", JSON.stringify(session));
  showSession();
}

function yt(id, title) {
  return `<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0" title="${title}" allowfullscreen></iframe>
    <a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noreferrer">${title} · Apri su YouTube</a></div>`;
}

function renderStudio() {
  const d = state.data;
  const steps = ["Tempo", "Livello", "Problemi", "Categorie", "Oggi"];
  const body = [
    `<fieldset><legend>Quanto tempo hai?</legend><p class="muted">Il 20% va al corpo, l'80% ai fondamentali.</p>
      <div class="grid two">${d.times.map((t) => `<button class="choice ${state.minutes === t ? "sel" : ""}" data-k="minutes" data-v="${t}">${t} minuti</button>`).join("")}</div></fieldset>`,
    `<fieldset><legend>A che punto sei?</legend>
      <div class="grid">${d.levels.map((l) => `<button class="choice ${state.level === l.id ? "sel" : ""}" data-k="level" data-v="${l.id}">${l.label}<small>${l.hint}</small></button>`).join("")}</div></fieldset>`,
    `<fieldset><legend>Dove senti il problema?</legend>
      <div class="grid two">${d.problems.map((p) => `<button class="choice ${state.problems.includes(p.id) ? "sel" : ""}" data-multi="problems" data-v="${p.id}">${p.label}<small>${p.hint}</small></button>`).join("")}</div></fieldset>`,
    `<fieldset><legend>Su cosa vuoi lavorare?</legend>
      <div class="grid">${d.categories.filter((c) => c.phase === "fondamentali" || c.phase === "musica").map((c) => `<button class="choice ${state.focuses.includes(c.id) ? "sel" : ""}" data-multi="focuses" data-v="${c.id}">${c.label}<span class="meta">${c.book}</span></button>`).join("")}</div></fieldset>`,
    `<fieldset><legend>Come è andata la pratica dall'ultima volta?</legend>
      <div class="grid">${[["prima", "È la prima volta"], ["bene", "Bene"], ["cosi", "Così così"], ["faticosa", "Faticosa"], ["assente", "Non ho studiato"]].map(([id, l]) => `<button class="choice ${state.last === id ? "sel" : ""}" data-k="last" data-v="${id}">${l}</button>`).join("")}</div>
      <p>Energia di oggi</p>
      <div class="grid two">${[["fresco", "Fresco"], ["normale", "Normale"], ["stanco", "Stanco"]].map(([id, l]) => `<button class="choice ${state.energy === id ? "sel" : ""}" data-k="energy" data-v="${id}">${l}</button>`).join("")}</div></fieldset>`,
  ][state.step];
  document.getElementById("studio").innerHTML = `
    <p class="eyebrow">Analisi strategica · 5 domande</p>
    <h1>Cosa studiare oggi</h1>
    <p class="muted">Non si pratica a caso. Tempo, livello e blocco: poi play-along del canale Corso di Tromba.</p>
    <div class="steps">${steps.map((_, i) => `<i class="${i <= state.step ? "on" : ""}"></i>`).join("")}</div>
    <div class="card">${body}
      <div class="row">
        <button class="btn" id="back" ${state.step === 0 ? "disabled" : ""}>Indietro</button>
        ${state.step < 4 ? `<button class="btn primary" id="next">Avanti</button>` : `<button class="btn primary" id="gen">Genera la sessione</button>`}
      </div>
    </div>`;
}

function showSession() {
  goto("sessione");
  const s = state.session;
  const b = s.blocks[state.idx];
  const v = b.video;
  document.getElementById("sessione").innerHTML = `
    <p class="eyebrow">Blocco ${state.idx + 1} di ${s.blocks.length}</p>
    <h1>${b.title}</h1>
    <p class="muted">${s.summary}</p>
    <div class="card">
      <div class="timer">${String(b.min).padStart(2, "0")}:00</div>
      <p class="muted">Durata prevista ${b.min} min · ${b.cat.book}</p>
      ${v ? yt(v.id, v.title) : ""}
      <aside class="note">${b.tip}</aside>
      <div class="row">
        <button class="btn" id="prevb" ${state.idx === 0 ? "disabled" : ""}>Precedente</button>
        <button class="btn primary" id="nextb">${state.idx === s.blocks.length - 1 ? "Fine sessione" : "Prossimo blocco"}</button>
      </div>
    </div>
    <h2>${s.title}</h2>
    <div class="block-list">${s.blocks.map((x, i) => `<button class="choice ${i === state.idx ? "sel" : ""}" data-i="${i}">${String(i + 1).padStart(2, "0")} · ${x.title} · ${x.min} min</button>`).join("")}</div>`;
}

function renderCatalogo(filter = "tutti") {
  const cats = filter === "tutti" ? state.data.categories : state.data.categories.filter((c) => c.id === filter);
  document.getElementById("catalogo").innerHTML = `
    <p class="eyebrow">Play along · CORSO DI TROMBA</p>
    <h1>Catalogo</h1>
    <div class="chips"><button data-f="tutti" class="${filter === "tutti" ? "on" : ""}">Tutti</button>
      ${state.data.categories.map((c) => `<button data-f="${c.id}" class="${filter === c.id ? "on" : ""}">${c.label}</button>`).join("")}</div>
    ${cats.map((c) => `<h2>${c.label}</h2><p class="muted">${c.book}</p>
      <div class="thumbs">${c.videos.map((v) => `<a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noreferrer">
        <img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" referrerpolicy="no-referrer" />
        <p>${v.title}<br><small class="muted">${v.book} (${v.exercise})</small></p></a>`).join("")}</div>`).join("")}`;
}

function renderMetodo() {
  document.getElementById("metodo").innerHTML = `
    <p class="eyebrow">Fonte · corsoditromba.com</p>
    <h1>Il metodo</h1>
    <p class="muted">Davide Pianegonda distingue riscaldamento e fondamentali. Warm-up: 80% corpo, 20% buzzing. Fondamentali: 80% strumento. Poi musica fino a una stanchezza onesta.</p>
    <h2>Testi in sessione</h2>
    <p>Thompson Buzzing Book · Schlossberg Daily Drills · Stamp Warm-ups · Thibaud A.B.C. · Plog · Clarke · Arban · Damrow Shape Up · Vizzutti.</p>
    <p class="muted">Questa pagina non sostituisce una lezione. Per un piano lungo: <a href="https://corsoditromba.com" style="color:var(--accent)">corsoditromba.com</a></p>`;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;")
    .replace(/'/g, "\u0026#39;");
}

function fmtDate(iso) {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    }).format(new Date(iso));
  } catch (_) {
    return iso || "";
  }
}

function loadDiary() {
  let diary = [];
  try {
    const raw = JSON.parse(localStorage.getItem("st:diary") || "[]");
    if (Array.isArray(raw)) diary = raw;
  } catch (_) {}
  const seen = new Set(diary.map((s) => s.id || `${s.createdAt}|${s.title}`));
  const has = (s) => {
    const id = s.id || `${s.createdAt}|${s.title}`;
    if (seen.has(id)) return true;
    return diary.some((d) => d.createdAt && d.createdAt === s.createdAt && d.title === s.title);
  };
  const adopt = (s, fallbackId) => {
    if (!s || !s.title || has(s)) return;
    const id = s.id || fallbackId;
    const entry = {
      id,
      title: s.title,
      summary: s.summary || "",
      createdAt: s.createdAt,
      savedAt: s.savedAt || s.createdAt,
      note: s.note || "",
      blocks: s.blocks || [],
      level: s.level,
      minutes: s.minutes,
    };
    diary.push(entry);
    seen.add(id);
  };
  try {
    const hist = JSON.parse(localStorage.getItem("st:hist") || "[]");
    if (Array.isArray(hist)) hist.forEach((s, i) => adopt(s, `legacy-${s.createdAt || i}`));
  } catch (_) {}
  try {
    adopt(JSON.parse(localStorage.getItem("st:last") || "null"), `last-${Date.now()}`);
  } catch (_) {}
  diary.sort((a, b) => String(b.savedAt || b.createdAt).localeCompare(String(a.savedAt || a.createdAt)));
  try {
    localStorage.setItem("st:diary", JSON.stringify(diary));
  } catch (_) {}
  return diary;
}

function showClose() {
  goto("sessione");
  const s = state.session;
  const list = s.blocks.map((x) => `<li>${esc(x.title)} · ${x.min} min</li>`).join("");
  document.getElementById("sessione").innerHTML = `
    <p class="eyebrow">Fine sessione</p>
    <h1>Salva nel diario</h1>
    <p class="muted">${esc(s.summary)}</p>
    <div class="card">
      <ul class="blocks">${list}</ul>
      <label class="field" for="practice-note">Nota di pratica</label>
      <textarea id="practice-note" class="note-input" placeholder="Come è andata, cosa tenere, cosa cambiare la prossima volta.">${esc(s.note || "")}</textarea>
      <div class="row">
        <button class="btn" id="back-blocks">Torna ai blocchi</button>
        <button class="btn primary" id="save-diary">Salva nel diario</button>
      </div>
    </div>`;
  document.getElementById("practice-note").focus();
}

function saveDiary() {
  const field = document.getElementById("practice-note");
  if (!field || !state.session) return;
  const s = state.session;
  const entry = {
    id: s.id || (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()),
    title: s.title,
    summary: s.summary,
    createdAt: s.createdAt,
    savedAt: new Date().toISOString(),
    note: field.value.trim(),
    blocks: s.blocks,
    level: s.level || state.level,
    minutes: s.minutes || state.minutes,
  };
  state.session = entry;
  const diary = loadDiary();
  const idx = diary.findIndex((x) => x.id === s.id);
  if (idx >= 0) diary[idx] = entry;
  else diary.unshift(entry);
  diary.sort((a, b) => String(b.savedAt || b.createdAt).localeCompare(String(a.savedAt || a.createdAt)));
  try {
    localStorage.setItem("st:diary", JSON.stringify(diary));
  } catch (_) {
    alert("Il browser ha rifiutato il salvataggio: memoria locale piena.");
    return;
  }
  state.justSaved = entry.id;
  renderDiario();
  goto("diario");
}

function renderDiario() {
  const hist = loadDiary();
  const n = hist.length;
  const banner = state.justSaved ? `<p class="muted">Sessione salvata. Resta su questo browser.</p>` : "";
  state.justSaved = false;
  document.getElementById("diario").innerHTML = n
    ? `<p class="eyebrow">Pratica salvata</p><h1>Diario</h1>${banner}<p class="muted">${n} ${n === 1 ? "sessione" : "sessioni"}.</p>${hist
        .map((s) => {
          const when = fmtDate(s.savedAt || s.createdAt);
          const note = s.note ? `<p class="diary-note">${esc(s.note)}</p>` : `<p class="muted">Nessuna nota.</p>`;
          const blocks = (s.blocks || []).map((b) => `${esc(b.title)} ${b.min}'`).join(" · ");
          return `<div class="card entry"><strong>${esc(s.title)}</strong><p class="meta">${esc(when)}</p><p class="muted">${esc(s.summary || "")}</p>${note}<p class="muted">${blocks}</p><button class="btn primary" data-open="${esc(s.id)}">Riapri</button></div>`;
        })
        .join("")}`
    : `<h1>Diario vuoto</h1><p class="muted">Genera una sessione: entra qui da sola. Alla fine puoi aggiungere una nota.</p>`;
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
    else showClose();
  }
  if (e.target.id === "back-blocks") showSession();
  if (e.target.id === "save-diary") saveDiary();
  if (e.target.id === "prevb") { state.idx = Math.max(0, state.idx - 1); showSession(); }
  const i = e.target.closest("[data-i]");
  if (i) { state.idx = +i.dataset.i; showSession(); }
  const f = e.target.closest("[data-f]");
  if (f) renderCatalogo(f.dataset.f);
  const o = e.target.closest("[data-open]");
  if (o) {
    const hit = loadDiary().find((s) => s.id === o.dataset.open);
    if (!hit) return;
    state.session = hit;
    state.idx = 0;
    showSession();
  }
});

Promise.all(["meta","c0","c1","c2","c3"].map((n) => fetch(`./${n}.json`).then((r) => r.json()))).then(([meta, ...parts]) => {
  state.data = { ...meta, categories: parts.flatMap((p) => p.categories) };
  renderStudio();
});
