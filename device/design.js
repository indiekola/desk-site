// Desk by Volume Attack — design rules for scripts, shared by the device (compact.html) and the full view (v2.html).
// Colours mirror design.css; glyph kinds are drawn by glyphs.js.
// Volume Attack mark (lightning bolt), drawn in the current text colour
const LOGO='<svg class="logo" viewBox="0 0 192 192" aria-label="Volume Attack"><path d="M126 86.7097H95.9992L118.499 0L60 105.29H89.9986L67.4991 192L126 86.7097Z" fill="currentColor"/></svg>';
// Module colours. Roles are generated per project by the AI, so any set of modules must get distinct colours:
// well-known roles keep a fixed colour; any other role takes the first free colour of the ring below,
// starting from a slot derived from its name (the same module gets the same colour every time).
// drums, bass, vocal, pad, lead and fx come from the Figma file (product/figma/SPEC.md); the rest keep their tones
const PALETTE={master:"#c8c8c8",drums:"#ffd200",bass:"#2b6cff",vocal:"#ff4800",backing:"#ffaad4",guitars:"#00b67a",pad:"#add5ff",brass:"#ff9b00",
  keys:"#c9a7ff",lead:"#ff6390",synth:"#8f7bff",fx:"#54e3d0",perc:"#9be15d",strings:"#e0c08a",choir:"#6fb8ff",piano:"#ff8a65"};
// 16 flat tones, all readable with black ink (master grey is reserved)
const RING=["#ffd400","#ff9b00","#ff5a1f","#ff6f91","#ffaad4","#c9a7ff","#8f7bff","#3d6bff","#6fb8ff","#b5d4ff","#7fe0d0","#00b67a","#9be15d","#e0c08a","#ff8a65","#f2e85c"];
function hashOf(t){let h=0;for(const c of t)h=(h*31+c.charCodeAt(0))>>>0;return h;}
function colorsFor(roles){const out={},used=new Set();
  roles.forEach(r=>{if(PALETTE[r]&&!used.has(PALETTE[r])){out[r]=PALETTE[r];used.add(out[r]);}});
  roles.forEach(r=>{if(out[r])return;const start=hashOf(r)%RING.length;
    for(let i=0;i<RING.length;i++){const c=RING[(start+i)%RING.length];if(!used.has(c)){out[r]=c;used.add(c);return;}}
    out[r]=RING[start];});              // more than 16 modules: colours repeat (the device shows at most 8 anyway)
  return out;}
// glyph family per role; unknown roles borrow the family of the closest known one by name
const GLYPH_OF={master:"disc",drums:"dots",perc:"dots",bass:"stripes",vocal:"rings",lead:"rings",choir:"twins",backing:"twins",
  guitars:"waves",strings:"waves",pad:"clouds",keys:"clouds",synth:"clouds",piano:"stripes",fx:"clouds",brass:"triangles"};
const glyphOf=r=>GLYPH_OF[r]||(/drum|kick|snare|hat|perc|beat/i.test(r)?"dots":/bass|sub|808/i.test(r)?"stripes":/vox|voc|sing|lead/i.test(r)?"rings":
  /back|harm|choir|doub/i.test(r)?"twins":/gtr|guit|string|violin|cello/i.test(r)?"waves":/brass|horn|trump|sax|flute|wind/i.test(r)?"triangles":"clouds");
// icons (from the Volume Attack Figma file, frame 594:400; cleaned: no frame fill, currentColor strokes;
// the two bypass states are merged into one icon whose bar turns)
const ICON={"bypass-big": "<svg viewBox=\"0 0 20 20\" fill=\"none\" aria-hidden=\"true\"><circle vector-effect=\"non-scaling-stroke\" cx=\"10\" cy=\"10\" r=\"8\" stroke=\"currentColor\"/><path class=\"bar\" vector-effect=\"non-scaling-stroke\" d=\"M10 6L10 14\" stroke=\"currentColor\" stroke-linecap=\"round\"/></svg>", "bypass-sml": "<svg viewBox=\"0 0 12 12\" fill=\"none\" aria-hidden=\"true\"><circle vector-effect=\"non-scaling-stroke\" cx=\"6\" cy=\"6\" r=\"5\" stroke=\"currentColor\"/><path class=\"bar\" vector-effect=\"non-scaling-stroke\" d=\"M6 3L6 9\" stroke=\"currentColor\" stroke-linecap=\"round\"/></svg>", "drag": "<svg viewBox=\"0 0 12 12\" fill=\"none\" aria-hidden=\"true\"><path vector-effect=\"non-scaling-stroke\" d=\"M4 6H4.00833M4 9.75H4.00833M4 2.25H4.00833\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path vector-effect=\"non-scaling-stroke\" d=\"M8 6H8.00833M8 9.75H8.00833M8 2.25H8.00833\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>", "full": "<svg viewBox=\"0 0 20 20\" fill=\"none\" aria-hidden=\"true\"><path class=\"fl\" vector-effect=\"non-scaling-stroke\" d=\"M14.2778 5.72222L5.72222 5.72222\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path class=\"frame\" vector-effect=\"non-scaling-stroke\" d=\"M6.73333 3H13.2667C14.5735 3 15.2269 3 15.726 3.25432C16.165 3.47802 16.522 3.83498 16.7457 4.27402C17 4.77315 17 5.42654 17 6.73333V13.2667C17 14.5735 17 15.2269 16.7457 15.726C16.522 16.165 16.165 16.522 15.726 16.7457C15.2269 17 14.5735 17 13.2667 17H6.73333C5.42654 17 4.77315 17 4.27402 16.7457C3.83498 16.522 3.47802 16.165 3.25432 15.726C3 15.2269 3 14.5735 3 13.2667V6.73333C3 5.42654 3 4.77315 3.25432 4.27402C3.47802 3.83498 3.83498 3.47802 4.27402 3.25432C4.77315 3 5.42654 3 6.73333 3Z\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>", "mine": "<svg viewBox=\"0 0 20 20\" fill=\"none\" aria-hidden=\"true\"><path vector-effect=\"non-scaling-stroke\" d=\"M10 3V17M4 6.5L16 13.5\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path class=\"ray\" vector-effect=\"non-scaling-stroke\" d=\"M16 6.5L4 13.5\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>", "mine-sml": "<svg viewBox=\"0 0 12 12\" fill=\"none\" aria-hidden=\"true\"><path vector-effect=\"non-scaling-stroke\" d=\"M6 1.5V10.5M2 3.75L10 8.25M10 3.75L2 8.25\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"};
// key pictograms: MINE = six-ray asterisk, FULL = window with a title bar, BYPASS = circle with a bar (tilted / = processing on,
// upright | = bypassed; one icon, the bar turns — see .bar in design.css)
// left column of the mini view: level arrows and re-analyze, 12 px, 1 px strokes like the other small marks
ICON.up='<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path vector-effect="non-scaling-stroke" d="M3 7.5L6 4.5L9 7.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>';
ICON.down='<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path vector-effect="non-scaling-stroke" d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>';
ICON.again='<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path vector-effect="non-scaling-stroke" d="M9.9 6.9A4 4 0 1 1 8.8 3.2M9 1.5V3.5H7" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PIC={rel:ICON.mine,brd:ICON.full,byp:ICON['bypass-big']};
// Figma icons (product/figma/SPEC.md): the bolt disc tops the left column; refresh = re-analyze; recording = start;
// x-close = cancel; chevrons 16 px cells (8 × 4 path); bypass small/big off (slash) and on (bar)
ICON.bolt='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect width="24" height="24" rx="12" fill="var(--key)"/><path d="M15.5 11.125H12L13.3125 5L8.5 12.875H12L10.6875 19L15.5 11.125Z" fill="currentColor"/></svg>';
ICON.refresh='<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path vector-effect="non-scaling-stroke" d="M1 5C1 5 2.00249 3.63411 2.81692 2.81912C3.63134 2.00413 4.7568 1.5 6 1.5C8.48528 1.5 10.5 3.51472 10.5 6C10.5 8.48528 8.48528 10.5 6 10.5C3.94845 10.5 2.21756 9.12714 1.67588 7.25M4 5H1V2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>';
ICON.recording='<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path vector-effect="non-scaling-stroke" d="M2.5 8.33333L2.5 11.6667M6.25 9.16667V10.8333M10 5V15M13.75 2.5V17.5M17.5 8.33333V11.6667" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>';
ICON.close='<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path vector-effect="non-scaling-stroke" d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>';
ICON.up='<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path vector-effect="non-scaling-stroke" d="M12 8.5L8 4.5L4 8.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 1.5)"/></svg>';
ICON.down='<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path vector-effect="non-scaling-stroke" d="M4 6L8 10L12 6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>';
ICON["bypass-off-sml"]='<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle vector-effect="non-scaling-stroke" cx="6" cy="6" r="5" stroke="currentColor"/><path vector-effect="non-scaling-stroke" d="M8 4L4 8" stroke="currentColor" stroke-linecap="round"/></svg>';
ICON["bypass-on-sml"]='<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle vector-effect="non-scaling-stroke" cx="6" cy="6" r="5" stroke="currentColor"/><path vector-effect="non-scaling-stroke" d="M6 3L6 9" stroke="currentColor" stroke-linecap="round"/></svg>';
ICON["bypass-off-big"]='<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle vector-effect="non-scaling-stroke" cx="10" cy="10" r="8" stroke="currentColor"/><path vector-effect="non-scaling-stroke" d="M13 7L7 13" stroke="currentColor" stroke-linecap="round"/></svg>';
ICON["bypass-on-big"]='<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle vector-effect="non-scaling-stroke" cx="10" cy="10" r="8" stroke="currentColor"/><path vector-effect="non-scaling-stroke" d="M10 6L10 14" stroke="currentColor" stroke-linecap="round"/></svg>';
// motion for scripts: the same three durations and two curves as design.css (--m-fast / --m / --m-slow, --e-out / --e-io)
const MOTION={fast:160,base:260,slow:460,out:"cubic-bezier(.2,.8,.2,1)",io:"cubic-bezier(.45,0,.2,1)"};
// loudness: generic streaming reference (−14 LUFS) and the estimate from the master's quiet↔loud position
const STREAM_REF=-14,CR_LUFS=-11.0;
function lufsEst(y){return y<=.5?CR_LUFS-2.6*(.5-y)/.5:CR_LUFS+.88*(y-.5)/.5;}

// plugin-support card: hover (mouse) or tap (touch) on a support dot lists what the knob moves and how well
// each device is supported; the dot gets a 24 × 24 px hit zone via the .hit class (design.css)
function tipFor(dot,devices){if(!dot)return;dot.classList.add("hit");let tip=null;
  // never while something is being carried or turned: the cursor only passes over the dot
  const busy=()=>document.body.matches(".dragx,.turning,.dragging");
  const show=()=>{if(tip||busy())return;tip=document.createElement("div");tip.className="tip";
    const seen=new Set(),rows=devices.filter(d=>{const key=d.name;if(seen.has(key))return false;seen.add(key);return true;});
    // plain language: what this knob moves, how well each part is controlled, and whether you need to do anything
    const worst=dot.classList.contains("none")?"none":"partial",nm=d=>d.name==="mixer"?"Track volume, pan and sends":d.name+(d.kind==="stock"?"":" ("+d.kind+")");
    const weak=rows.filter(d=>d.support!=="full");
    // status dots in the card, same shapes as on the knob (inverted for the dark card): ring = full, half = partial, solid = none
    const sd=lv=>`<i class="sd ${lv}"></i>`,how={full:"full control",partial:"within safe limits",none:"can't move it"};
    const why=worst==="none"
      ? `<p>${weak.map(nm).join(", ")} hides its settings from Live, so this knob can't reach it.</p><p class="do">To fix: open the plugin in Live, click ⚙ Configure, touch the settings you want, then reload Desk.</p>`
      : `<p>${weak.map(nm).join(", ")} gives Live bare numbers without units (no dB, no ms), so Desk moves it only within a range we measured as safe.</p><p class="do">Nothing to do.</p>`;
    tip.innerHTML=`<div class="hd">${sd(worst)}${worst==="none"?(rows.every(d=>d.support==="none")?"Doesn't work yet":"Partly works"):"Works, within safe limits"}</div><p>This knob moves:</p>`+
      `<div class="ls">${rows.map(d=>`<div>${sd(d.support)}<span>${nm(d)} — ${how[d.support]||how.partial}</span></div>`).join("")}</div>${why}`;
    document.body.appendChild(tip);const r=dot.getBoundingClientRect(),w=tip.offsetWidth;
    tip.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+"px";tip.style.top=(r.bottom+8)+"px";};
  const hide=()=>{if(tip){tip.remove();tip=null;}};
  dot.addEventListener("pointerenter",e=>{if(e.pointerType==="mouse")show();});
  dot.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse")hide();});
  dot.addEventListener("pointerdown",e=>{e.stopPropagation();e.preventDefault();if(e.pointerType!=="mouse"){tip?hide():show();}});
  addEventListener("scroll",hide,{passive:true});}

// while a control turns, its module title shows one word instead of the module name: the nearer pole (one word per
// pole, from the design), or MINE around the centre; the name comes back 700 ms after the last change. Both views.
const pole=(k,x)=>Math.abs(x-.5)<.03?"mine":x<.5?k.l:k.r;
function showWord(node,name,w){if(!node)return;node.textContent=w;clearTimeout(node._back);node._back=setTimeout(()=>node.textContent=name,700);}

// what a knob really does inside the devices, for Info View: "Glue Compressor · Threshold −14 dB → −17.2 dB" (MINE → now).
// unitsFor(id, x, refresh) returns the cached text or "" and fetches it once (the bridge's /detail), then calls
// refresh() so Info View re-reads. Same targets on several tracks are listed once with their tracks. Both views.
const UNITS={};
function unitsFor(id,x,refresh){const key=id+"@"+x.toFixed(3);if(key in UNITS)return UNITS[key];UNITS[key]="";
  fetch(`/detail?id=${encodeURIComponent(id)}&x=${x.toFixed(4)}`).then(r=>r.ok?r.json():null).then(j=>{if(!j)return;
    const rows=new Map();for(const t of j.targets){const k=`${t.device==="mixer"?"Mixer":t.device} · ${t.param}`,v=`${t.mine} → ${t.now}${t.exact?"":" (≈)"}`,
      r=rows.get(k+v)||{k,v,tracks:[]};r.tracks.push(t.track);rows.set(k+v,r);}
    const list=[...rows.values()],shown=list.slice(0,5).map(r=>`${r.k} ${r.v}`);
    UNITS[key]=shown.join("\n")+(list.length>5?`\n+${list.length-5} more`:"");refresh&&refresh();}).catch(()=>{});
  return "";}

// look: two modes. "live" (the default, founder 2026-10-04) = follow Ableton: Live's theme for the interface, the set's
// track colours for the modules. "desk" = Desk's own palette and light/dark themes, for marketing (landing, promo,
// screenshots): ?mode=desk (or ?look=desk). In the browser L switches the mode, T the theme within it (remembered per
// browser once chosen with a key). In the device Live's real theme colours arrive through liveTheme() below.
const MODES={desk:["desk-light","desk-dark"],live:["light","mid-light","mid-dark","dark"]};
const store=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}};
const QS=new URLSearchParams(location.search);
let MODE=QS.get("mode")||QS.get("look")||store("desk.mode");if(!MODES[MODE])MODE="live";
function setTheme(t){if(!MODES[MODE].includes(t))t=MODES[MODE][0];document.documentElement.dataset.theme=t;store("desk.theme."+MODE,t);applyLive();return t;}
// Live's theme in the device: the Max patch reads live.colors and hands them to the page, either as
// window.deskTheme({surface_bg:"#rrggbb", …}) (jweb executejavascript) or as a message {type:"desk-theme", colors:{…}}.
// The nearest preset (by the surface's lightness) sets everything Live doesn't send; the colours Live sends override
// it as CSS variables. Only in the Live look: the Desk look ignores them (and keeps them for when L switches back).
const LIVE_VARS={surface_bg:["--dev","--page"],lcd_bg:["--knob"],lcd_control_fg:["--dot"],selection:["--ring"],control_fg:["--fg"],control_fg_off:["--grey"],surface_highlight:["--pill"]};
const LIVE_PRESET_DEV={light:"#c4c4c4","mid-light":"#afafaf","mid-dark":"#4a4a4a",dark:"#2b2b2b"};
let LIVE_THEME=null;
function applyLive(){const r=document.documentElement.style;Object.values(LIVE_VARS).flat().forEach(v=>r.removeProperty(v));
  if(MODE!=="live"||!LIVE_THEME)return;
  for(const k in LIVE_THEME){const v=LIVE_THEME[k];if(LIVE_VARS[k]&&/^#[0-9a-f]{6}$/i.test(v))LIVE_VARS[k].forEach(n=>r.setProperty(n,v));}}
function liveTheme(colors){if(!colors||typeof colors!=="object")return;LIVE_THEME=colors;
  const s=colors.surface_bg;if(MODE==="live"&&/^#[0-9a-f]{6}$/i.test(s||"")){const L=lum(s);
    const near=Object.keys(LIVE_PRESET_DEV).reduce((a,b)=>Math.abs(lum(LIVE_PRESET_DEV[b])-L)<Math.abs(lum(LIVE_PRESET_DEV[a])-L)?b:a);
    document.documentElement.dataset.theme=near;}
  applyLive();}
window.deskTheme=liveTheme;
addEventListener("message",e=>{if(e.data&&e.data.type==="desk-theme")liveTheme(e.data.colors);});
// Tell the device the page is up so it sends Live's colours at once (it also repeats them while the page may be loading).
addEventListener("load",()=>{try{if(window.max&&window.max.outlet)window.max.outlet("desk_ready");}catch(e){/* not in jweb */}});
setTheme(new URLSearchParams(location.search).get("theme")||store("desk.theme."+MODE));
addEventListener("keydown",e=>{if(e.metaKey||e.ctrlKey||e.altKey||e.shiftKey||/input|textarea/i.test(e.target.tagName))return;
  if(e.code==="KeyT"){const l=MODES[MODE];setTheme(l[(l.indexOf(document.documentElement.dataset.theme)+1)%l.length]);}
  if(e.code==="KeyL"){MODE=MODE==="desk"?"live":"desk";store("desk.mode",MODE);setTheme(store("desk.theme."+MODE));if(MODE==="live"&&LIVE_THEME)liveTheme(LIVE_THEME);dispatchEvent(new Event("desk-mode"));}});

// module colours: Desk's palette ("desk") or the colours of the tracks in the user's Live set ("live", from the bridge's
// /colors: a module takes its most used clip colour). C key or ?colors=. Live's palette is loud, so deskTone() keeps
// the track's hue but brings saturation and lightness into Desk's flat range — recognisable, and still Desk.
const rgbOf=hex=>{const n=parseInt(hex.slice(1),16);return [n>>16&255,n>>8&255,n&255];};
function lum(hex){const c=rgbOf(hex).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*c[0]+.7152*c[1]+.0722*c[2];}
// black ink unless it falls below WCAG AA (4.5 : 1) on this colour
const isDark=hex=>(lum(hex)+.05)/.05<4.5;
function deskTone(hex){let [r,g,b]=rgbOf(hex).map(v=>v/255);const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;
  if(d){h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;if(h<0)h+=360;}
  const s=Math.min(.85,d/(1-Math.abs(mx+mn-1)||1)),l=Math.max(.6,Math.min(.72,(mx+mn)/2));
  const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
  const [R,G,B]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return "#"+[R,G,B].map(v=>Math.round((v+m)*255).toString(16).padStart(2,"0")).join("");}
const colorsMode=()=>MODE;   // module colours follow the mode: Desk palette in Desk mode, the set's track colours in Live mode

// native feel (CLAUDE.md "no web artifacts inside the device"), the script half of the block in design.css: no context
// menu, no page zoom (ctrl/cmd + − 0, ctrl+wheel and trackpad pinch, Safari's gesture events), no drag ghosts of
// images, links or text. Runs on every page that loads design.js: the mini view, ?embed and the labs.
const EDITABLE=t=>t&&t.closest&&!!t.closest("input,textarea,[contenteditable='true']");
(function native(){
  addEventListener("contextmenu",e=>{if(!EDITABLE(e.target))e.preventDefault();});
  addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&/^(Equal|Minus|Digit0|NumpadAdd|NumpadSubtract|Numpad0)$/.test(e.code))e.preventDefault();});
  // pinch on a trackpad arrives as ctrl+wheel; a knob under the pointer still gets the event (only the page zoom is stopped)
  addEventListener("wheel",e=>{if(e.ctrlKey)e.preventDefault();},{passive:false});
  ["gesturestart","gesturechange","gestureend"].forEach(t=>addEventListener(t,e=>e.preventDefault(),{passive:false}));
  addEventListener("dragstart",e=>{if(!EDITABLE(e.target))e.preventDefault();});
  // a double or triple click never selects words, even where a page forgot user-select
  addEventListener("mousedown",e=>{if(e.detail>1&&!EDITABLE(e.target))e.preventDefault();});
  // no pinch zoom on touch screens either: the viewport may not scale
  const vp=document.querySelector('meta[name="viewport"]');if(vp&&!/user-scalable/.test(vp.content))vp.content+=",maximum-scale=1,user-scalable=no";
})();

