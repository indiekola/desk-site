// Desk by Volume Attack — the ANALYZE flow (product/flow.md), shared by the device views. It owns the step copy,
// the work layer (the ANALYZE / CANCEL / RETRY key and the six-line log over the module area) and the bridge client
// (POST /analyze, GET /analyze/status, POST /analyze/cancel). The page decides what happens around it: the empty
// device, the reveal, READY. Needs design.js (ICON, colorsFor) and controls.js (Desk.info, Desk.infoState). Layout: product/figma/SPEC.md.
const Flow = (() => {
  const STEPS = [
    { id: "read", verb: "read", info: "Reading tracks, clips, devices and routing through the Live API. Nothing in the set changes." },
    { id: "roles", verb: "roles", info: "Grouping tracks into modules by their job in the song (drums, bass, vocal…), by track and device names, on this computer." },
    { id: "plugins", verb: "plugins", info: "Checking which plugins show their settings to Live. One that hides them is left as it is; Desk uses Live's own devices instead." },
    { id: "master", verb: "master", info: "Measuring the master's loudness while the song plays (6 s). Stopped? Press play in Live, or wait: Desk measures the next time you play." },
    { id: "build", verb: "build", info: "Adding Live's own devices at the end of module tracks and setting levels, pan and sends. Your devices are not removed. CANCEL puts everything back; later, Undo in Live (Cmd/Ctrl+Z) takes the changes back.",
      plan: "Planning Live's own devices for the ends of module tracks, and their levels, pan and sends. This bridge only plans: nothing is written to the set until the plan gets a yes." },
    { id: "mine", verb: "mine", info: "Saving MINE: the sound built for this song. Every knob's centre returns here; BYPASS always plays your original." }];
  // rough share of each step in the whole run, for the progress fill
  const WEIGHT = [1, 1, .5, 3, 3, .5], WSUM = WEIGHT.reduce((a, b) => a + b);
  const el = h => { const t = document.createElement("template"); t.innerHTML = h.trim(); return t.content.firstChild; };
  const post = (u, b) => fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b || {}) }).then(r => r.json().then(j => ({ ok: r.ok, ...j })));
  const status = () => fetch("/analyze/status").then(r => r.json());
  // step marks (Figma progress frame): 12 px ring, filled when done
  const MARK = '<svg class="m" viewBox="0 0 12 12" aria-hidden="true"><circle vector-effect="non-scaling-stroke" cx="6" cy="6" r="4.5"/><rect vector-effect="non-scaling-stroke" x="1.5" y="1.5" width="9" height="9" rx="1"/></svg>';   // square = failed

  // module marks for the progress count (Figma 16:2474): six 8 px shapes in ink, one per module found, in this order
  // (rounded square, triangle, circle, leaf, flower, diamond), repeating; the paths are Figma's, each shown in its own 8 px box
  const SHAPES = [["0 .17", '<rect y=".17" width="8" height="8" rx="2"/>'],
    ["12 .17", '<path d="M17.2673 7.37157C16.704 8.43824 15.296 8.43824 14.7327 7.37157L12.1982 2.57157C11.635 1.50491 12.339 .171573 13.4655 .171573H18.5345C19.661 .171573 20.365 1.50491 19.8018 2.57157L17.2673 7.37157Z"/>'],
    ["24 .17", '<rect x="24" y=".17" width="8" height="8" rx="4"/>'],
    ["36 .17", '<path d="M36 4.17157C36 1.96243 37.7909 .171574 40 .171574H42C43.1046 .171574 44 1.067 44 2.17157V4.17157C44 6.38071 42.2091 8.17157 40 8.17157H38C36.8954 8.17157 36 7.27614 36 6.17157V4.17157Z"/>'],
    ["48 .17", '<path d="M55.7017 2.97108C56.7661 3.43122 56.7661 4.91193 55.7017 5.37207C55.168 5.60279 54.8482 6.14587 54.9113 6.71439C55.037 7.84823 53.7291 8.58858 52.7905 7.91489C52.3198 7.57709 51.6802 7.57709 51.2095 7.91489C50.2709 8.58858 48.963 7.84823 49.0888 6.71439C49.1518 6.14587 48.832 5.60279 48.2983 5.37207C47.2339 4.91193 47.2339 3.43122 48.2983 2.97108C48.832 2.74036 49.1518 2.19728 49.0888 1.62875C48.963 .494918 50.2709 -.245434 51.2095 .428259C51.6802 .766061 52.3198 .766061 52.7905 .428259C53.7291 -.245434 55.037 .494919 54.9113 1.62875C54.8482 2.19728 55.168 2.74036 55.7017 2.97108Z"/>'],
    ["60 .17", '<path d="M62.5858 .585786C63.3668 -.195263 64.6332 -.195261 65.4142 .585787L67.5858 2.75736C68.3668 3.53841 68.3668 4.80474 67.5858 5.58579L65.4142 7.75736C64.6332 8.53841 63.3668 8.53841 62.5858 7.75736L60.4142 5.58579C59.6332 4.80474 59.6332 3.53841 60.4142 2.75736L62.5858 .585786Z"/>']];
  const FINISHED = new Set(["done", "skip", "later"]);
  const MARKS_MAX = 12;   // 12 marks = 140 px; more modules still count in the number
  const marks = n => Array.from({ length: Math.min(n, MARKS_MAX) }, (_, i) => { const [o, d] = SHAPES[i % SHAPES.length];
    return `<svg viewBox="${o} 8 8" aria-hidden="true">${d}</svg>`; }).join("");

  // The work layer covers everything right of the left column (Figma "start" and "progress"): a black START panel that
  // is the one key, and a grey PROGRESS panel — steps on top, a fill in a module colour from the left, what the step
  // found (bottom left) and the count (bottom right). CANCEL is the x key in the left column (the page owns it).
  // Progress (Figma 15:1860, 2026-10-04): grey panel, radius 12, padding 8 / 8 / 4; six steps on top (12 px mark, 8,
  // label); bottom row 32 high: left the big module count (Spline Sans 27) + "modules" over the module marks, right the
  // big seconds + "sec". The content is drawn twice: in the theme's text colour on the panel, and in ink inside the
  // fill (clipped to it), so every Live theme reads on both — Figma's black on the module colour, the theme's text on grey.
  // Finished (Figma has no such frame, so its own language): every mark filled, the fill full, and when BUILD changed
  // the set the right number counts the changes instead of the seconds ("30 changes").
  const CONTENT = `<div class="steps">${STEPS.map(s => `<span class="st" data-step="${s.id}">${MARK}<span class="vb">${s.verb}</span></span>`).join("")}</div>
    <div class="foot"><span class="found"></span>
      <span class="mods" hidden><b class="n"></b><span class="mu"><span class="u">modules</span><span class="mk"></span></span></span>
      <span class="count"><b class="n"></b><span class="u">sec</span></span></div>`;
  function layer() {
    const w = el(`<div class="work"><button class="go ring" type="button"></button>
      <div class="prog" hidden><i class="fill"></i><div class="pc">${CONTENT}</div><div class="pc over" aria-hidden="true">${CONTENT}</div></div></div>`);
    const key = w.querySelector(".go"), prog = w.querySelector(".prog"), fill = prog.querySelector(".fill");
    const views = [...prog.querySelectorAll(".pc")].map(v => ({ rows: [...v.querySelectorAll(".st")], found: v.querySelector(".found"),
      count: v.querySelector(".count"), mods: v.querySelector(".mods") }));
    const rows = views[0].rows, count = views[0].count;
    let shown = -1;
    const api = {
      el: w, key, prog, rows,
      // the START panel: icon + one line (LET'S START · RETRY · a short message)
      setKey(kind, label) {
        key.dataset.kind = kind; prog.hidden = true; key.hidden = false;
        key.innerHTML = `${kind === "retry" ? ICON.refresh : ICON.recording}<span class="kl"></span>`;
        key.querySelector(".kl").textContent = label || (kind === "retry" ? "retry" : "let\u2019s start");
      },
      // draw one status from the bridge: marks, the fill (first module's colour once known), the finding and the count
      draw(st) {
        key.hidden = true; prog.hidden = false;
        let last = "";
        // a step is "finished" whatever its result (done · skip = planned only · later = measured on the next play):
        // the mark fills, like Figma's done steps; only fail (square), cur (breathing) and pending (ring) differ
        const mark = m => FINISHED.has(m) ? "done " + m : m;
        st.steps.forEach((s, i) => { views.forEach(v => { v.rows[i].className = "st " + mark(s.mark); }); if (s.text && s.mark !== "pending") last = s.text; });
        const cur = st.step;
        if (cur != null && st.steps[cur].text) last = st.steps[cur].text;
        const at = cur != null ? cur : st.steps.filter(s => s.mark !== "pending").length - 1;
        const done = WEIGHT.slice(0, Math.max(0, at)).reduce((a, b) => a + b, 0) + (cur != null ? WEIGHT[cur] * (st.steps[cur].frac || 0) : WEIGHT[Math.max(0, at)]);
        const finished = st.state === "done";
        prog.style.setProperty("--p", finished ? 100 : Math.min(100, done / WSUM * 100).toFixed(1));
        const m0 = st.modules && st.modules[0];   // the page may know the set's own colour for it (Live look: Flow.colorOf)
        fill.style.background = m0 ? (Flow.colorOf && Flow.colorOf(m0)) || colorsFor(["master", ...st.modules])[m0] : "var(--c-drums)";
        // bottom row (Figma progress 15:2180): once ROLES knows the modules, a big count with a row of module marks
        // (left); before that what the step found so far ("13/14 tracks"). Seconds since the start, big (right).
        // A finished run that applied BUILD counts the changes it made in the set on the right ("30 changes").
        const sm = finished && st.summary && st.summary.applied ? st.summary : null;
        const n = st.modules ? st.modules.length : 0, secs = Math.round(st.elapsed_s);
        views.forEach(v => {
          v.found.textContent = last; v.found.hidden = n > 0; v.mods.hidden = !n;
          if (n !== shown) { v.mods.querySelector(".n").textContent = n; v.mods.querySelector(".mk").innerHTML = marks(n);
            v.mods.querySelector(".u").textContent = n === 1 ? "module" : "modules"; }
          v.count.querySelector(".n").textContent = sm ? sm.changes : secs;
          v.count.querySelector(".u").textContent = sm ? (sm.changes === 1 ? "change" : "changes") : "sec";
          v.count.classList.toggle("chg", !!sm);
        });
        shown = n;
        count.setAttribute("aria-label", sm ? `done, ${sm.changes} change${sm.changes === 1 ? "" : "s"} applied to the set`
          : `step ${Math.min(6, (cur ?? at) + 1)} of 6, ${secs} seconds`);
      } };
    return api;
  }

  // the Info View line for the state the device is in right now (shown whenever nothing is hovered)
  function stepInfo(st, delta) {
    const i = st.step; if (i == null) return null;
    const text = st.build_mode !== "apply" && STEPS[i].plan || STEPS[i].info;
    return [`${delta ? "Re-analyze" : "Analyze"} · ${i + 1}/6 ${STEPS[i].verb}`, text];
  }

  // poll the bridge while a run is going; onStatus gets every reading, the promise resolves with the last one
  function follow(onStatus, every = 250) {
    return new Promise(resolve => {
      const tick = () => status().then(st => { onStatus(st); if (st.state === "running") setTimeout(tick, every); else resolve(st); })
        .catch(() => setTimeout(tick, 1000));
      tick();
    });
  }
  const start = from => post("/analyze", from ? { from } : {});
  const cancel = () => post("/analyze/cancel");
  const changes = () => fetch("/analyze/changes").then(r => r.json()).catch(() => ({ changed: false }));
  // "undo all": the bridge puts back every change BUILD made, from its journal (build.py Builder.undo_all)
  const undo = () => post("/undo");
  return { STEPS, layer, stepInfo, follow, start, cancel, status, changes, undo, colorOf: null };
})();
