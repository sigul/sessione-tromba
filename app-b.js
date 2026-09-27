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
        <button class="btn primary" id="nextb">${state.idx === s.blocks.length - 1 ? "Chiudi" : "Prossimo blocco"}</button>
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
