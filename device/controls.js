// Desk controls — one behaviour for knobs, the master XY pad and the keys, shared by the device (compact.html)
// and the full view (v2.html). Pages build their own markup and state; this file owns how things feel.
const Desk = (() => {
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = v => Math.max(0, Math.min(1, v));

  // ── press physics: the module under your finger sinks a little and tilts in space toward the point you press
  function towards(el, x, y) {
    const r = el.getBoundingClientRect();
    return [Math.max(-1, Math.min(1, (x - (r.left + r.width / 2)) / (r.width / 2))), Math.max(-1, Math.min(1, (y - (r.top + r.height / 2)) / (r.height / 2)))];
  }
  function tiltOn(el, nx, ny, deg, s) {
    if (!el || RM) return;
    el.dataset.tz = 1;  // marks a tilting element: edge smoothing in design.css ([data-tz]); its transform timing lives in that element's own CSS
    el.style.transform = `perspective(520px) rotateX(${(-ny * deg).toFixed(2)}deg) rotateY(${(nx * deg).toFixed(2)}deg) scale(${s})`;
  }
  function tiltOff(el) { if (el) el.style.transform = ""; }

  // ── quiet focus: a mouse press focuses the control (arrow keys keep working) without the keyboard ring, which
  // only Tab or a key press shows; the press itself shows the ring through .active. Chromium makes a scripted
  // focus() :focus-visible, so the press ring stayed on after release. data-quiet hides the ring until a key.
  // Not focus({focusVisible:false}): where Chromium reads it, a later arrow key does not bring the ring back.
  function focusQuiet(el) { el.setAttribute("data-quiet", ""); el.focus({ preventScroll: true }); }
  const QUIET_KEYS = new Set(["Shift", "Control", "Alt", "Meta", " "]);  // Space is Live's play key: no ring for it
  // ?. : the unit tests load this file with a bare document stub
  document.addEventListener?.("keydown", e => { if (!QUIET_KEYS.has(e.key)) document.activeElement?.removeAttribute?.("data-quiet"); }, true);
  document.addEventListener?.("focusout", e => e.target.removeAttribute?.("data-quiet"), true);

  // ── knob drawing: the dot rides on a real child (.arm) turned with `rotate` (works in every engine)
  function angle(dial, deg) { const a = dial.querySelector(".arm"); if (a) a.style.rotate = deg + "deg"; }
  // iOS-style rubber band past an end: diminishing returns, the dial stretches a little, eases back on release
  const rubber = over => Math.sign(over) * (1 - 1 / (Math.abs(over) * 4 + 1));
  function rubberShow(d, base, over) {
    const r = rubber(over);
    d.classList.remove("rubber-back");
    angle(d, base + r * 30);
    d.style.scale = r ? `${(1 - .04 * Math.abs(r)).toFixed(3)} ${(1 + .06 * Math.abs(r)).toFixed(3)}` : "";
  }
  function rubberRelease(d, base) {
    d.classList.remove("rubbing");
    d.classList.add("rubber-back");
    angle(d, base); d.style.scale = "";
    setTimeout(() => d.classList.remove("rubber-back"), 280);
  }

  // centre detent: ±0.03 of travel sticks to MINE; outside it the scale is stretched so nothing jumps
  const W = .03;
  const toX = r => { const d = r - .5; return Math.abs(d) < W ? .5 : .5 + Math.sign(d) * (Math.abs(d) - W) * (.5 / (.5 - W)); };
  const toRaw = x => { const d = x - .5; return d === 0 ? .5 : .5 + Math.sign(d) * (Math.abs(d) * (.5 - W) / .5 + W); };
  let lastBuzz = 0;
  const buzz = ms => { const t = performance.now(); if (t - lastBuzz > 80 && navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) { navigator.vibrate(ms); lastBuzz = t; } };

  /* knob({ el, dial, get, set, host?, tilt?, locked?, onSnap?, onStart?, onHold?, onRelease?, badge? })  badge: false = never show the value (it replaces the MINE star while changing)
     el: pointer target · dial: the black disc · get()/set(x): value 0..1 · host(): element that tilts (module)
     tilt: {deg, scale} · locked(): true while MINE holds the knobs · onSnap(): landed on centre
     onHold() / onRelease(changed): one gesture begins / ends — a pointer drag (down → up), a wheel turn (ends 140 ms
     after the last notch), a key step or double-click glide (ends when the glide lands). changed = set() ran in it.
     The page closes its undo step on release and keeps pushed state off a control while it is held. */
  function knob(o) {
    const { el, dial } = o, deg = o.tilt?.deg ?? 4, sc = o.tilt?.scale ?? .975;
    const base = () => -135 + o.get() * 270;
    const feel = (x, prev) => {
      if (x === .5 && prev !== .5) { o.onSnap?.(); buzz(8); }
      if ((x === 0 || x === 1) && prev !== x) buzz(12);
    };
    // one gesture at a time: a drag that interrupts a glide continues the same hold; release reports whether it moved
    let held = false, moved = false;
    const hold = () => { if (held) return; held = true; moved = false; o.onHold?.(); };
    const release = () => { if (!held) return; held = false; o.onRelease?.(moved); };
    // glide for double-click and keys (no easing while dragging: the knob must stay under the finger)
    let tw = 0;
    const glide = to => {
      cancelAnimationFrame(tw); hold();
      const from = o.get(), t0 = performance.now(), D = RM ? 0 : 260;
      const step = now => { const p = D ? Math.min(1, (now - t0) / D) : 1, e = 1 - Math.pow(1 - p, 3); o.set(from + (to - from) * e);
        if (p < 1) tw = requestAnimationFrame(step); else { feel(to, from); if (y0 === null) release(); } };
      tw = requestAnimationFrame(step);
    };
    let y0 = null, raw0 = 0, live = false, host = null, kc = [0, 0];
    el.addEventListener("pointerdown", e => {
      if (e.button || o.locked?.()) return;
      e.preventDefault(); cancelAnimationFrame(tw); hold();
      el.classList.add("turning", "active"); document.body.classList.add("turning");
      y0 = e.clientY; raw0 = toRaw(o.get()); live = false;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      focusQuiet(dial);
      host = o.host?.() || null;
      if (host) { const r = dial.getBoundingClientRect(); kc = towards(host, r.left + r.width / 2, r.top + r.height / 2); tiltOn(host, kc[0], kc[1], deg, sc); }
      o.onStart?.();
    });
    el.addEventListener("pointermove", e => {
      if (y0 === null) return;
      const dy = y0 - e.clientY;
      if (!live) { if (Math.abs(dy) < 3) return; live = true; y0 = e.clientY; return; } // 3 px dead start: a click never nudges
      const prev = o.get(), rawU = raw0 + dy / (e.shiftKey ? 1000 : 200), raw = Math.max(toRaw(0), Math.min(toRaw(1), rawU)), x = toX(raw);
      if (x !== prev) { o.set(x); feel(x, prev); }
      const r = rubber(rawU - raw);
      // past an end stop the bottom corner on the side of the turn sinks (min → left, max → right)
      if (host) tiltOn(host, Math.max(-1, Math.min(1, kc[0] + r * 1.2)), Math.max(-1, Math.min(1, kc[1] + (1 - kc[1]) * Math.abs(r))),
        deg + Math.min(2, Math.abs(dy) / 80) + Math.abs(r) * 4, sc);
      if (rawU !== raw) { dial.classList.add("rubbing"); rubberShow(dial, base(), rawU - raw); }
      else if (dial.classList.contains("rubbing")) { dial.classList.remove("rubbing"); rubberShow(dial, base(), 0); }
    });
    const end = () => {
      if (y0 === null) return;
      y0 = null; el.classList.remove("turning", "active"); document.body.classList.remove("turning");
      tiltOff(host); host = null;
      if (dial.classList.contains("rubbing")) rubberRelease(dial, base());
      release();
    };
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(v => el.addEventListener(v, end));
    // wheel / trackpad: same detent; overscroll past an end stretches and eases back when the gesture stops
    let wo = 0, wt = 0;
    el.addEventListener("wheel", e => {
      if (o.locked?.()) return;
      e.preventDefault(); hold();
      const d = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : -e.deltaX) * (e.deltaMode === 1 ? 16 : 1), prev = o.get();
      const rawU = toRaw(prev) + wo - d / (e.shiftKey ? 2500 : 500), raw = Math.max(toRaw(0), Math.min(toRaw(1), rawU)), x = toX(raw);
      if (x !== prev) { o.set(x); feel(x, prev); }
      wo = rawU - raw;
      if (wo) { dial.classList.add("rubbing"); rubberShow(dial, base(), wo); }
      clearTimeout(wt);
      wt = setTimeout(() => { if (wo) { wo = 0; rubberRelease(dial, base()); } if (y0 === null) release(); }, 140);
    }, { passive: false });
    el.addEventListener("dblclick", () => { if (!o.locked?.()) glide(.5); });
    dial.addEventListener("keydown", e => {
      const s = { ArrowUp: .05, ArrowRight: .05, ArrowDown: -.05, ArrowLeft: -.05 }[e.key];
      if (!s || o.locked?.()) return;
      e.preventDefault();
      const x = o.get(), t = x + (e.shiftKey ? s / 5 : s);
      glide(Math.abs(t - .5) < .026 || (x - .5) * (t - .5) < 0 ? .5 : clamp(t)); // keys stop on centre when they cross it
    });
    const api = { glide, el, dial, locked: () => !!o.locked?.(), get: o.get };
    const set0 = o.set; o.set = x => { moved = true; set0(x); infoRefresh(el); if (o.badge !== false) showTyped(api, x); };  // value in place of the star (off in the mini view)
    KNOBS.push(api);
    return api;
  }

  /* values are read relative to MINE on a unitless scale, like hardware detents: −10 (left pole) … 0 (MINE) … +10
     (right pole); whole steps, 0.1 with Shift. No "%": a meaning knob moves several parameters on their own curves, so
     it is not a share of anything; the pole word gives the meaning, Info View the real units.
     rel(x) → "MINE" | "+4" | "−7.5" (typographic minus) */
  const KNOBS = [];
  let shiftDown = false;
  // Shift switches every readout to 0.1 at once, Info View included (re-read on press and release)
  addEventListener("keydown", e => { if (e.key === "Shift" && !shiftDown) { shiftDown = true; if (infoEl) infoShow(infoEl); } });
  addEventListener("keyup", e => { if (e.key === "Shift") { shiftDown = false; if (infoEl) infoShow(infoEl); } });
  addEventListener("blur", () => { shiftDown = false; });
  const relN = (x, fine) => { const d = (x - .5) * 20; return fine ? Math.round(d * 10) / 10 : Math.round(d); };
  const rel = (x, fine = shiftDown) => { const r = relN(x, fine); return r === 0 ? "MINE" : (r > 0 ? "+" : "−") + Math.abs(r); };
  // the value takes the MINE star's place above the knob while it changes; at MINE the star itself stays
  const showTyped = (k, x) => {
    const mk = k.dial.querySelector(".mk"); if (!mk) return;
    let v = mk.querySelector(".v"); if (!v) { v = document.createElement("span"); v.className = "v"; mk.appendChild(v); }
    const t = rel(x); clearTimeout(mk._t);
    if (t === "MINE") { mk.classList.remove("sv"); return; }
    v.textContent = t; mk.classList.add("sv"); mk._t = setTimeout(() => mk.classList.remove("sv"), 400);
  };

  /* Shift + digits set the knob under the mouse (or the focused one) on the same −10 … +10 scale it shows: a digit is
     its own value toward the right pole (Shift 4 = +4), a minus first goes toward the left pole (Shift − 4 = −4),
     Shift 0 = MINE. Keys typed quickly (each within 400 ms, 800 ms after a decimal point) make one value to 0.1:
     1 0 = +10 (the right end), − 7 . 5 = −7.5; a key that would pass 10 starts a new number. Point = . or , (main
     keys or keypad); minus = − key or keypad −. e.code: Shift turns these keys into symbols. */
  let typed = "", typedFor = null, typedAt = 0;
  /* typeKey(typed, key, gapMs) → { typed, x } — the pure rule behind Shift + digits (unit-tested in tests/unit):
     key is "0"…"9", "." or "-"; typed is what was typed for this knob so far; gapMs the time since the last key.
     x is the knob position to glide to, or null while a lone "-" or "." waits for its digits. */
  function typeKey(typed, key, gapMs) {
    const gap = typed.includes(".") ? 800 : 400, body = typed.replace("-", "");
    const done = /\.\d$/.test(typed);                      // one decimal (0.1) completes a number
    if (gapMs > gap || key === "-" || done || (key === "." && typed.includes(".")) || parseFloat("0" + body + key) > 10) typed = "";
    typed += key;
    const digits = typed.replace("-", "");
    if (!digits || digits === ".") return { typed, x: null };
    const sign = typed.startsWith("-") ? -1 : 1, n = Math.min(10, Math.round(parseFloat(digits) * 10) / 10);
    return { typed, x: .5 + sign * n / 20 };              // Shift 0 = MINE
  }
  addEventListener("keydown", e => {
    const m = /^(?:Digit|Numpad)(\d)$/.exec(e.code), pt = /^(Period|Comma|NumpadDecimal)$/.test(e.code), neg = /^(Minus|NumpadSubtract)$/.test(e.code);
    if (!(m || pt || neg) || !e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
    for (let i = KNOBS.length - 1; i >= 0; i--) if (!KNOBS[i].el.isConnected) KNOBS.splice(i, 1);  // knobs from earlier renders
    const k = KNOBS.find(k => k.el.isConnected && k.el.matches(":hover")) || KNOBS.find(k => k.dial === document.activeElement);
    if (!k || k.locked()) return;
    e.preventDefault();
    if (e.repeat) return;
    const now = performance.now(), r = typeKey(typedFor === k ? typed : "", neg ? "-" : pt ? "." : m[1], now - typedAt);
    typed = r.typed; typedFor = k; typedAt = now;
    if (r.x !== null) k.glide(r.x);
  });

  /* xyPad({ pad, puck, inset, get, set, host?, tilt?, locked?, onHold?, onRelease? })
     get(): [x, y] · set(x, y) · inset: px from the pad edge to the puck centre (3 px ring + 4 px safe zone + puck radius) · .active while pressed
     onHold() / onRelease(changed): as knob() — a pointer drag, or one arrow key / double-click (a gesture of its own) */
  function xyPad(o) {
    const { pad, puck, inset } = o;
    const draw = () => {
      const [x, y] = o.get();
      puck.style.left = `calc(${inset}px + (100% - ${2 * inset}px) * ${x.toFixed(4)})`;
      puck.style.top = `calc(${inset}px + (100% - ${2 * inset}px) * ${(1 - y).toFixed(4)})`;
    };
    const at = e => { const r = pad.getBoundingClientRect(); o.set(clamp((e.clientX - r.left - inset) / (r.width - 2 * inset)), clamp(1 - (e.clientY - r.top - inset) / (r.height - 2 * inset))); };
    const deg = o.tilt?.deg ?? 5, sc = o.tilt?.scale ?? .98;  // a big card (full view) leans less
    const lean = e => { const h = o.host?.(); if (h) { const [nx, ny] = towards(h, e.clientX, e.clientY); tiltOn(h, nx, ny, deg, sc); } };
    let dn = false;
    const once = fn => { o.onHold?.(); fn(); o.onRelease?.(true); };
    pad.addEventListener("pointerdown", e => {
      if (e.button || o.locked?.()) return;
      e.preventDefault(); dn = true; o.onHold?.();
      try { pad.setPointerCapture(e.pointerId); } catch (_) {}
      pad.classList.add("active"); focusQuiet(pad); at(e); lean(e);
    });
    pad.addEventListener("pointermove", e => { if (dn) { at(e); lean(e); } });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(v => pad.addEventListener(v, () => { if (dn) { dn = false; pad.classList.remove("active"); tiltOff(o.host?.()); o.onRelease?.(true); } }));
    pad.addEventListener("dblclick", () => { if (!o.locked?.()) once(() => o.set(.5, .5)); });
    pad.addEventListener("keydown", e => {
      if (o.locked?.()) return;
      const s = e.shiftKey ? .01 : .05, d = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, s], ArrowDown: [0, -s] }[e.key];
      if (!d) return;
      e.preventDefault();
      const [x, y] = o.get(); once(() => o.set(clamp(x + d[0]), clamp(y + d[1])));
    });
    return { draw };
  }

  /* pressToggle(button, isOn, set): hold (≥ 300 ms) = hear it only while held; a short click switches it on and it
     stays; when on, any click switches it off. Pointer capture + cancel, so a release outside never leaves it stuck;
     Enter / Space toggle from the keyboard. */
  function pressToggle(b, isOn, set) {
    let t0 = 0, wasOff = false, down = false;
    b.addEventListener("pointerdown", e => {
      if (e.button) return;
      e.preventDefault(); down = true; t0 = performance.now(); wasOff = !isOn();
      try { b.setPointerCapture(e.pointerId); } catch (_) {}
      if (wasOff) set(true);
    });
    b.addEventListener("pointerup", () => { if (!down) return; down = false; if (!wasOff || performance.now() - t0 >= 300) set(false); });
    b.addEventListener("pointercancel", () => { if (down && wasOff) set(false); down = false; });
    b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set(!isOn()); } });
  }
  /* Levels: more modules than one row holds (cap per level) are stacked in levels; the device shows one level at a
     time and the neighbours peek at its edge. Pure rules, unit-tested in tests/unit:
     levelsFrom(list, saved, cap) → levels (arrays of module names): the saved layout (levels, or an old flat order)
     wins for modules that still exist; new modules fill the last level with room, then open a new level.
     moveLevel(levels, name, to, idx, cap) → { levels, at }: put a module into level `to` at slot idx; if that level is
     full, the module in that slot swaps into the moved one's old place. Empty levels close; `at` = the level it is on. */
  function levelsFrom(list, saved, cap) {
    const known = new Set(list), seen = new Set(), keep = s => known.has(s) && !seen.has(s) && !!seen.add(s);
    const chunk = l => { const o = []; for (let i = 0; i < l.length; i += cap) o.push(l.slice(i, i + cap)); return o; };
    const nested = Array.isArray(saved) && saved.length > 0 && saved.every(Array.isArray);
    const lv = nested ? saved.flatMap(l => chunk(l.filter(keep))) : chunk(Array.isArray(saved) ? saved.filter(keep) : []);
    for (const s of list) if (!seen.has(s)) { seen.add(s); const last = lv[lv.length - 1]; if (last && last.length < cap) last.push(s); else lv.push([s]); }
    return lv.filter(l => l.length);
  }
  function moveLevel(levels, name, to, idx, cap) {
    const lv = levels.map(l => l.slice()), from = lv.findIndex(l => l.includes(name));
    if (from < 0 || !lv[to]) return { levels: lv, at: from };
    const i0 = lv[from].indexOf(name);
    lv[from].splice(i0, 1);
    idx = Math.max(0, Math.min(idx, lv[to].length));
    if (from !== to && lv[to].length >= cap) {
      const j = Math.min(idx, lv[to].length - 1), [out] = lv[to].splice(j, 1, name);
      lv[from].splice(i0, 0, out);
    } else lv[to].splice(idx, 0, name);
    const at = lv.filter((l, k) => l.length && k < to).length;
    return { levels: lv.filter(l => l.length), at };
  }

  // a key answers a press like a module: sinks to 94 % and tilts toward the finger
  function pressable(b) {
    b.addEventListener("pointerdown", e => { const [nx, ny] = towards(b, e.clientX, e.clientY); tiltOn(b, nx, ny, 8, .94); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(v => b.addEventListener(v, () => tiltOff(b)));
  }

  /* Info View: hovering any control describes it — title + one or two sentences — the way Live's own Info View does.
     Desk.info(el, () => [title, text]) registers a control (the function runs on every show, so values are live);
     Desk.infoRefresh(el) re-reads it while it changes (a knob being turned). Where the text goes is the transport's
     job: Desk.infoOut(title, text) — in Live it will go to Live's Info View (to verify in the M4L spike); in the
     browser prototype a small panel at the bottom left stands in for it. Empty title = back to the default text. */
  const INFO = new WeakMap();
  let infoEl = null;
  const INFO_IDLE = ["Desk", "Hover any control to see what it does."];
  let infoDefault = INFO_IDLE;
  let infoPanel = null;
  // the stand-in panel is hidden by default; show it with ?info in the address or the I key (remembered per browser)
  // Never inside the device (?embed): there the text goes to Live's own Info View only (the patch replaces
  // Desk.infoApi.out); nothing is drawn over the device, not even with ?info, a remembered I or a test hook.
  const EMBED = /[?&]embed\b/.test(location.search) || !!(document.documentElement && document.documentElement.classList.contains("embed"));
  let infoOn = !EMBED && /[?&]info\b/.test(location.search);
  try { infoOn = !EMBED && (infoOn || localStorage.getItem("desk.info") === "1"); } catch (_) {}
  addEventListener("keydown", e => {
    if (EMBED || e.code !== "KeyI" || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || /input|textarea/i.test(e.target.tagName)) return;
    infoOn = !infoOn; try { localStorage.setItem("desk.info", infoOn ? "1" : "0"); } catch (_) {}
    if (infoPanel) infoPanel.hidden = !infoOn; else if (infoOn) infoOut("", "");
  });
  const infoOut = (t, x) => {
    if (EMBED) return;
    if (!infoPanel) { infoPanel = document.createElement("div"); infoPanel.className = "infov"; infoPanel.innerHTML = "<b></b><p></p>"; infoPanel.hidden = !infoOn; document.body.appendChild(infoPanel); }
    infoPanel.firstChild.textContent = t || infoDefault[0]; infoPanel.lastChild.textContent = t ? x : infoDefault[1];
  };
  const api = { out: infoOut };
  function info(el, fn) { INFO.set(el, fn); }
  function infoShow(el) { infoEl = el; const [t, x] = el ? INFO.get(el)() : ["", ""]; api.out(t, x); }
  function infoRefresh(el) { if (el && el === infoEl) infoShow(el); }
  // what the device says while nothing is hovered: the state it is in (an analysis step, an error, READY…)
  function infoState(t, x) { infoDefault = t ? [t, x] : INFO_IDLE; if (!infoEl) api.out("", ""); }
  addEventListener("pointerover", e => {
    if (document.body.matches(".dragx,.dragging")) return;   // keep describing the carried thing, not what passes under it
    let n = e.target; while (n && n.nodeType === 1 && !INFO.has(n)) n = n.parentElement;
    const el = n && n.nodeType === 1 ? n : null;
    if (el !== infoEl) infoShow(el);
  });
  addEventListener("focusin", e => { let n = e.target; while (n && n.nodeType === 1 && !INFO.has(n)) n = n.parentElement; if (n && n.nodeType === 1) infoShow(n); });

  // the device never scrolls and is never cut: when its box (the jweb in Live, or the page column) is narrower than the
  // device, the whole device scales down to fit, from its top-left corner, and the box takes the scaled height.
  // At full size it is not scaled at all (whole pixels). Returns the scale; drag code divides pointer moves by it.
  function fit(host, box) {
    box = box || host.parentElement; host.style.scale = ""; host.style.transformOrigin = "0 0";
    const w = host.offsetWidth, h = host.offsetHeight, room = box.clientWidth, s = w && room && room < w ? Math.max(.5, room / w) : 1;
    if (s < 1) { host.style.scale = s.toFixed(4); box.style.height = Math.floor(h * s) + "px"; box.style.overflow = "hidden"; }
    else box.style.height = box.style.overflow = "";
    host.dataset.scale = s.toFixed(4); return s;
  }

  return { RM, clamp, towards, tiltOn, tiltOff, angle, knob, xyPad, pressToggle, pressable, info, infoRefresh, infoState, infoApi: api, rel, relN, typeKey, levelsFrom, moveLevel, fit };
})();
