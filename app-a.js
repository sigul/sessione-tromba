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
    title: `Sessione ${minutes}' · ${chosen.map((c) => c.label).join(" · ")}`,
    summary: `Percorso da ${minutes} minuti per un allievo ${state.level}. Riscaldamento 20%, fondamentali, poi musica.`,
    createdAt: new Date().toISOString(),
    blocks: blocks.map((b) => ({ ...b, video: pick(b.cat, state.level, preferShort) })),
  };
  state.session = session;
  state.idx = 0;
  localStorage.setItem("st:last", JSON.stringify(session));
  const hist = JSON.parse(localStorage.getItem("st:hist") || "[]");
  hist.unshift({ title: session.title, summary: session.summary, createdAt: session.createdAt, blocks: session.blocks });
  localStorage.setItem("st:hist", JSON.stringify(hist.slice(0, 12)));
  showSession();
}
