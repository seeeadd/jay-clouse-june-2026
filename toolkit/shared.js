/* ===== Summit Toolkit · shared state + sync (every page loads this after toolkit-config.js) ===== */
/* Review mode: open any page with ?review=1 — seeds a filled demo copy, opens every lock,
   and never syncs. For Jay + team review. Exit via the ribbon (or ?review=0). */
(function(){const q=new URLSearchParams(location.search);
  if(q.get("review")==="1")sessionStorage.setItem("ms_review","1");
  if(q.get("review")==="0")sessionStorage.removeItem("ms_review");})();
const REVIEW=sessionStorage.getItem("ms_review")==="1";
const KEY=REVIEW?"ms_toolkit_review":"ms_toolkit_v1";
if(REVIEW&&!localStorage.getItem(KEY)){
  localStorage.setItem(KEY,JSON.stringify({
    name:"Jay",email:"demo@membershipsummit.com",cid:"review-demo",
    audit:{stage:"Launched \u2014 struggling with retention",months:"7\u201312 months",audience:"25\u2013100K",
      sells:"A course and a paid newsletter",revenue:"$1\u20135K",
      blocker:"People join for the content and drift after month two. I can't tell what would make them stay.",
      wheel:true,logged:true,notes:""},
    diag:{scores:{"Promise":3,"Friend-Making":3,"Onboarding":2,"Small Group Experiences":4,"Optionality":4,"Pricing":3},weakest:"Onboarding",logged:true},
    pricing:{value:"a working onboarding system and five real peers",month9:"A room that runs its own rituals",members:"50",price:"49",renew:"Not sure",startMo:"49",tiers:"1"},
    roadmap:{arch:"Recently Launched"},
    retention:{checks:[true,false,true,false,false,true,false,false,false,false,true]}
  }));
}
const store = {
  all() { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch (e) { return {} } },
  set(k, v) { const s = this.all(); s[k] = Object.assign({}, s[k], v); localStorage.setItem(KEY, JSON.stringify(s)); flag(); syncSoon() },
  top(k, v) { const s = this.all(); s[k] = v; localStorage.setItem(KEY, JSON.stringify(s)); flag(); syncSoon() }
};

/* sync to the team sheet. No-op until MS.SYNC_URL is set in toolkit-config.js */
let st_;
function syncSoon() { if (REVIEW) return; if (!(window.MS && MS.SYNC_URL)) return; clearTimeout(st_); st_ = setTimeout(syncNow, 2500) }
function syncNow() {
  if (REVIEW) return;
  if (!(window.MS && MS.SYNC_URL)) return;
  const s = store.all();
  if (!s.cid) { s.cid = (crypto.randomUUID ? crypto.randomUUID() : "id" + Date.now() + Math.random().toString(36).slice(2)); localStorage.setItem(KEY, JSON.stringify(s)) }
  const body = JSON.stringify({ cid: s.cid, email: s.email || "", name: s.name || "", state: s, ts: new Date().toISOString() });
  try { if (!(navigator.sendBeacon && navigator.sendBeacon(MS.SYNC_URL, body))) fetch(MS.SYNC_URL, { method: "POST", mode: "no-cors", keepalive: true, body }) } catch (e) {}
}
addEventListener("pagehide", syncNow);
/* loaded at the end of body, so the element already exists */
if (window.MS && MS.SYNC_URL) {
  const pv = document.getElementById("privacy");
  if (pv) pv.textContent = "Autosaves in this browser and comes to me and the team as you type. It\u2019s how I shape the sessions around where the room actually is.";
}

/* review ribbon */
if (REVIEW) {
  const pv = document.getElementById("privacy");
  if (pv) pv.textContent = "Review copy. Demo answers, every lock open, nothing syncs anywhere.";
  const rb = document.createElement("div");
  rb.innerHTML = '<style>.rvbar{position:fixed;bottom:18px;left:18px;z-index:70;display:flex;align-items:center;gap:10px;background:#1E1E1E;color:#FFFCF7;border-radius:4px;padding:9px 12px;font-family:"Space Mono",monospace;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border:1.5px solid #1E1E1E}.rvbar .sq{width:8px;height:8px;background:#FF4F14}.rvbar a{color:#FFFCF7;text-decoration:underline;text-underline-offset:2px;cursor:pointer}</style>' +
    '<div class="rvbar"><span class="sq"></span>Review copy \u00b7 nothing syncs<a id="rvEmpty">Empty it</a><a id="rvFill">Refill demo</a><a id="rvExit">Exit</a></div>';
  document.body.appendChild(rb);
  document.getElementById("rvEmpty").onclick = () => { localStorage.setItem(KEY, "{}"); location.reload() };
  document.getElementById("rvFill").onclick = () => { localStorage.removeItem(KEY); location.reload() };
  document.getElementById("rvExit").onclick = () => { sessionStorage.removeItem("ms_review"); location.href = location.pathname };
}

/* saved-in-browser flag (pages without one just no-op) */
let ft;
function flag() { const f = document.getElementById("saveflag"); if (!f) return; f.classList.add("on"); clearTimeout(ft); ft = setTimeout(() => f.classList.remove("on"), 1100) }

/* archetype mapping. Reads the verbatim form strings, never display copy */
const ARCH = (stage, sells, months) => {
  if (!stage) return null;
  if (stage.indexOf("No membership yet") === 0) return /course/i.test(sells || "") ? "Pivoting From Courses" : "Just Starting";
  if (stage.indexOf("Launched") === 0) return "Recently Launched";
  /* sustainable-or-better but running under ~12 months still reads as Recently Launched */
  if (/^(0\u20133|4\u20136|7\u201312)/.test(months || "")) return "Recently Launched";
  return "Scaling";
};

/* ---- drip unlock: fixed ET timestamps, forward-only, never re-lock ---- */
if (new URLSearchParams(location.search).get("preview") === "1") localStorage.setItem("ms_drip_bypass", "1");
function dripState(tool) {
  if (REVIEW) return { locked: false };
  const D = (window.MS && MS.DRIP) || null;
  if (!D || !D.enabled || !D[tool]) return { locked: false };
  if (localStorage.getItem("ms_drip_bypass") === "1") return { locked: false };
  const when = new Date(D[tool]).getTime();
  return { locked: Date.now() < when, when };
}
function dripLabel(when) {
  return new Date(when).toLocaleString(undefined, { weekday: "long", hour: "numeric", minute: "2-digit" });
}
function dripCountdown(when) {
  const ms = when - Date.now();
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3600000), m = Math.ceil((ms % 3600000) / 60000);
  return (h ? h + "h " : "") + m + "m";
}

/* ---- drip gate card: pages call mountDrip(tool, bodyId, line) after their own setup ---- */
function mountDrip(tool, bodyId, line) {
  const st = dripState(tool);
  if (!st.locked) return false;
  const body = document.getElementById(bodyId);
  if (!body) return false;
  body.style.display = "none";
  const card = document.createElement("div");
  card.className = "dripgate card blue-edge";
  card.innerHTML = '<div class="dg-k">Locked, on purpose</div><div class="dg-t">' + line + '</div>' +
    '<div class="dg-when">Opens ' + dripLabel(st.when) + ' your time · in <span class="dg-cd">' + dripCountdown(st.when) + '</span></div>' +
    '<div class="dg-s">Once it opens, it stays open. Nothing to catch up on, nothing expires.</div>';
  body.parentNode.insertBefore(card, body);
  const t = setInterval(() => {
    if (!dripState(tool).locked) { clearInterval(t); card.remove(); body.style.display = ""; }
    else card.querySelector(".dg-cd").textContent = dripCountdown(st.when);
  }, 30000);
  return true;
}

/* ---- page capture: CAPTURE "page" = logging happens here, one tap, no forms ---- */
function pageCapture() {
  if (!(window.MS && MS.CAPTURE === "page")) return;
  document.querySelectorAll('a.btn[href*="membershipsummit.com/lab-audit"]').forEach(a => { a.href = "lab-audit.html"; a.removeAttribute("target"); });
  document.querySelectorAll('a.btn[href*="membershipsummit.com/diagnostic"]').forEach(a => { a.href = "mechanics-diagnostic.html"; a.removeAttribute("target"); });
  const logBtn = document.getElementById("logBtn");
  const form = /lab-audit/.test(location.pathname) ? "audit" : (/mechanics-diagnostic/.test(location.pathname) ? "diag" : null);
  if (!logBtn || !form) return;
  const chk = document.getElementById("logged");
  if (chk) { const l = chk.closest("label"); if (l) l.style.display = "none"; }
  const msg = document.createElement("div");
  msg.className = "logmsg";
  logBtn.closest(".actions").after(msg);
  const key = form === "audit" ? "audit" : "diag";
  const paintLog = () => {
    const logged = !!((store.all()[key] || {}).logged);
    logBtn.textContent = logged ? "Logged ✓" : (form === "audit" ? "Log input #1" : "Log input #2");
    logBtn.classList.toggle("ghost", logged);
    msg.classList.remove("bad");
    msg.innerHTML = logged ? 'That\u2019s in. I have it. Changed something? Log it again, your latest answers count. <a href="#" class="unlog">Undo</a>' : "";
    const u = msg.querySelector(".unlog");
    if (u) u.onclick = e => { e.preventDefault(); store.set(key, { logged: false }); syncNow(); if (chk) chk.checked = false; paintLog(); paintNav(); };
  };
  const wireUndo = () => { const u = msg.querySelector(".unlog"); if (u) u.onclick = e => { e.preventDefault(); store.set(key, { logged: false }); syncNow(); if (chk) chk.checked = false; paintLog(); paintNav(); }; };
  logBtn.addEventListener("click", e => {
    e.preventDefault(); e.stopImmediatePropagation();
    const s = store.all();
    const wasLogged = !!((s[key] || {}).logged);
    if (form === "audit") {
      if (!((s.audit || {}).stage)) { msg.textContent = "Mark your rung on the ladder first."; msg.classList.add("bad"); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s.email || "").trim())) { msg.textContent = "Add your email up top first. The wheel and your roadmap both key off it."; msg.classList.add("bad"); return; }
    } else {
      if (!((s.diag || {}).weakest)) { msg.textContent = "Score all six first. Your weakest mechanic is the answer."; msg.classList.add("bad"); return; }
    }
    store.set(key, { logged: true });
    syncNow();
    if (chk) chk.checked = true;
    paintLog(); paintNav();
    if (wasLogged) { msg.innerHTML = 'Logged again. Your latest answers count. <a href="#" class="unlog">Undo</a>'; wireUndo(); }
  }, true);
  paintLog();
}
pageCapture();

/* progress per tool, for the nav squares */
function statuses() {
  const s = store.all(), a = s.audit || {}, d = s.diag || {}, p = s.pricing || {}, r = s.roadmap || {}, c = s.retention || {};
  const dn = Object.keys(d.scores || {}).length;
  const rf = Object.values(r.fields || {}).filter(v => v && String(v).trim()).length;
  const cn = (c.checks || []).filter(Boolean).length;
  return {
    audit: (a.stage && a.audience && a.sells && a.revenue && a.blocker) ? "full" : (Object.values(a).some(v => v) ? "part" : ""),
    diag: dn >= 6 ? "full" : (dn ? "part" : ""),
    pricing: (p.value && (p.startMo || p.startYr)) ? "full" : (Object.values(p).some(v => v) ? "part" : ""),
    roadmap: (a.logged && d.logged) ? "full" : ((r.arch || rf || Object.keys(r.checks || {}).length) ? "part" : ""),
    retention: cn >= 11 ? "full" : (cn ? "part" : "")
  };
}
function paintNav() {
  const st = statuses();
  document.querySelectorAll(".tk-links a").forEach(a => {
    const d = a.querySelector(".dot");
    if (d) d.className = "dot " + (st[a.dataset.tool] || "");
  });
}
