// Desk glyphs v3 — one family on one grid.
// Grid: 150×150 viewBox, centre (75,75), safe circle R=60 (120 px), lattice pitch 24 (half-pitch 12).
// Primitives: dot (solid disc), ring (1 px circle), line (1 px path), solid (filled polygon), outline (1 px polygon).
// Grammar: SOLID = direct sound / attack / energy; 1 px OUTLINE = sustain, space, reflections.
//          "spacious" = echo outlines outward (echoes); "wide" = horizontal spread; "upfront/level" = core size.
// glyph(kind, a, b [, m]) — a, b: knob positions 0..1; optional m = {beat: 0..1 phase since last beat, lvl: 0..1 meter}.
// Deterministic: same (a,b,m) → same picture. Pure black ink; white only inside master's solid disc.
function glyph(kind, a, b, m) {
  const NS = "http://www.w3.org/2000/svg", C = 75, R = 60, INK = "#000";
  const E = (t, at) => { const e = document.createElementNS(NS, t); for (const k in at) e.setAttribute(k, at[k]); return e; };
  const s = E("svg", { viewBox: "0 0 150 150", "aria-hidden": "true" });
  const add = e => (s.append(e), e);
  const L = (x, y, t) => x + (y - x) * t;
  const f = n => +n.toFixed(2);
  const lineAttr = { fill: "none", stroke: INK, "stroke-width": 1, "vector-effect": "non-scaling-stroke", "stroke-linejoin": "round" };
  const dot = (x, y, r, fill = INK) => add(E("circle", { cx: f(x), cy: f(y), r: f(Math.max(0, r)), fill }));
  const ring = (x, y, r, stroke = INK) => add(E("circle", { cx: f(x), cy: f(y), r: f(r), ...lineAttr, stroke }));
  const path = (d, solid) => add(E("path", solid ? { d, fill: INK } : { d, ...lineAttr }));
  const poly = (pts, solid) => path("M" + pts.map(p => f(p[0]) + " " + f(p[1])).join("L") + "Z", solid);
  const chord = y => Math.sqrt(Math.max(0, R * R - (y - C) * (y - C))); // half-width of the safe circle at height y
  // shared "spacious" grammar: echo offsets from 0 (dry) out to `room`; an echo appears only once it clears
  // the previous one by 3 px, and gaps widen outward like a reverb tail (continuous, no jumps).
  const echoes = (t, room) => { const out = []; let last = 0;
    for (let i = 1; i <= 4; i++) { const o = room * t * Math.pow(i / 4, 1.35); if (o - last >= 3) { out.push(o); last = o; } } return out; };
  m = m || {};
  const env = m.beat == null ? 0 : Math.exp(-6 * m.beat); // one-sided decay after each beat: no overshoot
  const lvl = m.lvl || 0;

  if (kind === "dots") { // DRUMS · a soft↔pumping · b dark↔bright   (Braun T3 speaker grid, EP-133 grille)
    const P = [];
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const d = Math.hypot(i, j) * 24; if (d <= 54) P.push([C + i * 24, C + j * 24, d]); }
    P.forEach(([x, y, d]) => {
      let r = L(3, 4, a) + 4 * a * (1 - d / 60);        // pumping = bigger, centre-heavy (kick dominates)
      r *= d === 0 ? 1 + 0.18 * a * env : 1 - 0.22 * a * env; // kick swells, the rest ducks, then recovers
      dot(x, y, r);
    });
    const S = []; for (const i of [-36, -12, 12, 36]) for (const j of [-36, -12, 12, 36]) S.push([C + i, C + j, Math.hypot(i, j)]);
    S.sort((p, q) => q[2] - p[2] || p[0] - q[0] || p[1] - q[1]);   // bright fills in fine specks from the edge inward
    S.slice(0, Math.round(16 * b)).forEach(([x, y]) => dot(x, y, 1.25));
  }
  else if (kind === "stripes") { // BASS · a round↔growl · b heavy↔clear   (Braun SK 4 slots, RT 20 slatted grille)
    const h = L(16, 6, b) * (1 + 0.08 * lvl), amp = L(0, h * 0.42, a), tooth = 8;
    for (let k = -2; k <= 2; k++) {
      const yc = C + k * 24, hw = chord(yc) - 4, top = [], bot = [];
      for (let x = -hw; x <= hw + 0.01; x += 2) {
        const saw = amp * (((x + hw) % tooth) / tooth - 0.5);    // sawtooth edge = added harmonics
        top.push([C + x, yc - h / 2 + saw]); bot.push([C + x, yc + h / 2 - saw]);
      }
      poly(top.concat(bot.reverse()), true);
    }
  }
  else if (kind === "rings") { // VOCAL · a close↔spacious · b soft↔upfront   (ET66 key as core, AB 1 dial rings)
    const core = L(12, 26, b) + 1.5 * lvl;
    dot(C, C, core);
    echoes(a, R - core - 2).forEach(o => ring(C, C, core + 2 + o));
  }
  else if (kind === "twins") { // BACKING · a in the mix↔upfront · b narrow↔wide   (two ET66 keys, TX-6 pairs)
    const r = L(11, 20, a) * (1 + 0.05 * lvl), dx = b * (R - r);
    dot(C - dx, C, r); dot(C + dx, C, r);                     // narrow = they merge into one mono disc
  }
  else if (kind === "waves") { // GUITARS · a straight↔trippy · b narrow↔wide   (OP-1 screen line art)
    const ph = (m.beat || 0) * 2 * Math.PI * a;
    for (let k = -2; k <= 2; k++) {
      const y0 = C + k * 12, hw = L(16, chord(y0) - 4, b), A = 6 * a, lam = L(48, 22, a);
      let d = "";
      for (let x = -hw; x <= hw + 0.01; x += 2)
        d += (d ? "L" : "M") + f(C + x) + " " + f(y0 + A * Math.sin(2 * Math.PI * x / lam + k * 1.3 * a + ph));
      path(d, false);
    }
  }
  else if (kind === "clouds") { // PAD · a dry↔spacious · b narrow↔wide   (all outline: no attack, only sustain)
    const sx = L(0, 20, b), rx = L(16, 22, b), ry = 16 + 1.5 * lvl;
    const room = Math.min(R - sx - rx, R - ry) - 1;
    for (const cx of [C - sx, C, C + sx]) {
      add(E("ellipse", { cx: f(cx), cy: C, rx: f(rx), ry: f(ry), ...lineAttr }));
    }
    echoes(a, room).forEach(o => add(E("ellipse", { cx: C, cy: C, rx: f(sx + rx + o), ry: f(ry + o), ...lineAttr })));
  }
  else if (kind === "triangles") { // BRASS · a dry↔spacious · b dark↔wobbly   (TE transport pictograms ▲)
    const half = 9, h = L(9, 14, b);                            // dark = squat, blunt; wobbly = taller, edgier
    const det = L(0, 4, b) * (m.beat == null ? 1 : Math.cos(m.beat * 2 * Math.PI)); // chorus = detuned copy
    const tri = (cx, cy, ox, solid) => poly([[cx + ox, cy - h * 2 / 3], [cx + ox + half, cy + h / 3], [cx + ox - half, cy + h / 3]], solid);
    for (let r = 0; r < 3; r++) for (let c = 0; c <= r; c++) {
      const cx = C + (c - r / 2) * 22, cy = C - 18 + r * 20;
      tri(cx, cy, 0, true);
      if (b > 0.05) tri(cx, cy, det, false);
    }
    // space: echo outlines of the whole pyramid (equilateral, centred), from just outside it to the safe edge
    const rho0 = 46;
    echoes(a, R - rho0).forEach(o => { const p = rho0 + o;
      poly([[C, C - p], [C + p * 0.866, C + p / 2], [C - p * 0.866, C + p / 2]], false); });
  }
  else { // MASTER "disc" · a quiet↔loud · b warm↔airy   (Braun AB 1 clock face: outer ring = 0 dBFS ceiling)
    ring(C, C, R);                                              // ceiling
    const r = L(30, 56, a) + 1 * lvl;                          // loud = disc grows, headroom gap shrinks
    dot(C, C, r);
    const n = Math.round(4 * b);                                // airy = fine white rings at the disc edge (top detail)
    for (let i = 1; i <= n; i++) ring(C, C, r - 3 * i, "#fff");
  }
  return s;
}
