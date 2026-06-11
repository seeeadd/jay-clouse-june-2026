/* ===== Summit Toolkit · shared state + sync (every page loads this after toolkit-config.js) ===== */
const KEY = "ms_toolkit_v1";
const store = {
  all() { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch (e) { return {} } },
  set(k, v) { const s = this.all(); s[k] = Object.assign({}, s[k], v); localStorage.setItem(KEY, JSON.stringify(s)); flag(); syncSoon() },
  top(k, v) { const s = this.all(); s[k] = v; localStorage.setItem(KEY, JSON.stringify(s)); flag(); syncSoon() }
};

/* sync to the team sheet. No-op until MS.SYNC_URL is set in toolkit-config.js */
let st_;
function syncSoon() { if (!(window.MS && MS.SYNC_URL)) return; clearTimeout(st_); st_ = setTimeout(syncNow, 2500) }
function syncNow() {
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
  if (pv) pv.textContent = "Autosaves in this browser and syncs to the Summit team as you type, so Jay can shape the sessions around where the room actually is.";
}

/* saved-in-browser flag (pages without one just no-op) */
let ft;
function flag() { const f = document.getElementById("saveflag"); if (!f) return; f.classList.add("on"); clearTimeout(ft); ft = setTimeout(() => f.classList.remove("on"), 1100) }

/* archetype mapping. Reads the verbatim form strings, never display copy */
const ARCH = (stage, sells) => {
  if (!stage) return null;
  if (stage.indexOf("Launched") === 0) return "Recently Launched";
  if (stage.indexOf("No membership yet") === 0) return /course/i.test(sells || "") ? "Pivoting From Courses" : "Just Starting";
  return "Scaling";
};

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
    roadmap: rf >= 3 ? "full" : ((rf || r.arch) ? "part" : ""),
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
