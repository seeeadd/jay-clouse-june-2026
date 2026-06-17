/** SUMMIT TOOLKIT CAPTURE — Google Apps Script web app (v2: sync + native submissions)
 *
 * TWO LANES, ONE SCRIPT:
 *  Lane 1 · SYNC (passive). The toolkit autosyncs everything anyone types.
 *    One row per attendee per tool, latest wins. Jay's live ammo + chase list.
 *  Lane 2 · NATIVE SUBMIT (optional, off by default). If toolkit-config.js sets
 *    CAPTURE:"native", the "Log it" buttons submit IN the toolkit instead of
 *    opening Google Forms: email code verification -> deliberate submit ->
 *    lands in the "Sub Audit" / "Sub Diagnostic" tabs. Point WheelPool and
 *    synthesize.mjs at those tabs only if you flip that switch.
 *
 * Setup (5 minutes, Thea):
 *  1. New Google Sheet "Summit Toolkit Responses" (NOT the form sheet).
 *  2. Extensions -> Apps Script -> paste this whole file.
 *  3. Fill TEAM_TOKEN below (any long random string) to enable the Pulse
 *     dashboard endpoint (pulse.html asks for the same token).
 *  4. Run setup() once -> authorize (Sheets + Mail).
 *  5. Deploy -> New deployment -> Web app -> Execute as Me / access: Anyone.
 *  6. Copy the /exec URL into SYNC_URL in toolkit-config.js.
 *
 * Email quota for verification codes: ~1,500/day on Workspace, 100/day on
 * a plain Gmail account. Deploy from the Workspace account.
 */

var TEAM_TOKEN = "";                              // <- fill to enable pulse.html (long random string)
var WHEEL_LOCK_ISO = "2026-06-25T16:00:00Z";      // Thu Jun 25, 12pm ET (EDT = UTC-4)
var CODE_FROM_NAME = "Jay Clouse · Membership Summit";

var TABS = {
  Audit:      ["CID","Email","Name","Stage","Months","Audience","Sells","Revenue","Blocker","Wheel opt-in","Logged form","Notes","Updated","Link","Wants me to look at","Offer now","Tried (didn't work)","Promise"],
  Diagnostic: ["CID","Email","Name","Promise","Friend-Making","Onboarding","Masterminds","Design Constraints","Pricing","Weakest","Logged form","Updated"],
  Pricing:    ["CID","Email","Name","Value sentence","Month 9","Members","Price","MRR","Launch net","Launch weeks","Renewal test","Start $/mo","Start $/yr","Tiers","Updated"],
  Roadmap:    ["CID","Email","Name","Archetype","Fields filled","Fields JSON","Updated"],
  Retention:  ["CID","Email","Name","Score /11","Checked items","Updated"],
  "Sub Audit":      ["CID","Email","Verified","First name","Stage","Months","Audience","Sells","Revenue","Blocker","Wheel opt-in","Submitted at"],
  "Sub Diagnostic": ["CID","Email","Verified","First name","Weakest mechanic","Submitted at"]
};

function setup() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(TABS).forEach(function (n) {
    var sh = ss.getSheetByName(n) || ss.insertSheet(n);
    sh.getRange(1, 1, 1, TABS[n].length).setValues([TABS[n]]).setFontWeight("bold");
    sh.setFrozenRows(1);
  });
  var p = ss.getSheetByName("Pulse") || ss.insertSheet("Pulse", 0);
  buildWheelAndBuckets(ss);
  p.clear();
  var rows = [
    ["PULSE — live room snapshot (auto-updates)", ""],
    ["", ""],
    ["Toolkit users (any tool)", "=COUNTA(Audit!A2:A)+COUNTIF(Diagnostic!A2:A,\"<>\")-SUMPRODUCT(COUNTIF(Audit!A2:A,Diagnostic!A2:A))"],
    ["Filled the Lab Audit", "=COUNTIF(Audit!D2:D,\"<>\")"],
    ["…and logged Form 1", "=COUNTIF(Audit!K2:K,TRUE)"],
    ["Filled the Diagnostic", "=COUNTIF(Diagnostic!J2:J,\"<>\")"],
    ["…and logged Form 2", "=COUNTIF(Diagnostic!K2:K,TRUE)"],
    ["⚠ Filled audit, did NOT log Form 1 (chase list)", "=COUNTIFS(Audit!D2:D,\"<>\",Audit!K2:K,FALSE)"],
    ["", ""],
    ["NATIVE SUBMISSIONS (only if CAPTURE:\"native\")", ""],
    ["Audit submitted in-toolkit", "=COUNTA('Sub Audit'!A2:A)"],
    ["Diagnostic submitted in-toolkit", "=COUNTA('Sub Diagnostic'!A2:A)"],
    ["Wheel pool (native)", "=COUNTIF('Sub Audit'!K2:K,TRUE)"],
    ["", ""],
    ["WEAKEST MECHANIC — the room", ""],
    ["Promise", "=COUNTIF(Diagnostic!J2:J,\"Promise\")"],
    ["Friend-Making", "=COUNTIF(Diagnostic!J2:J,\"Friend-Making\")"],
    ["Onboarding", "=COUNTIF(Diagnostic!J2:J,\"Onboarding\")"],
    ["Masterminds", "=COUNTIF(Diagnostic!J2:J,\"Masterminds\")"],
    ["Design Constraints", "=COUNTIF(Diagnostic!J2:J,\"Design Constraints\")"],
    ["Pricing", "=COUNTIF(Diagnostic!J2:J,\"Pricing\")"],
    ["", ""],
    ["WHERE THE ROOM IS — lifecycle", ""],
    ["No membership yet — considering one", "=COUNTIF(Audit!D2:D,\"No membership yet — considering one\")"],
    ["Launched — struggling with retention", "=COUNTIF(Audit!D2:D,\"Launched — struggling with retention\")"],
    ["Sustainable — working on growth", "=COUNTIF(Audit!D2:D,\"Sustainable — working on growth\")"],
    ["Scaling — multi-tier or multi-cohort", "=COUNTIF(Audit!D2:D,\"Scaling — multi-tier or multi-cohort\")"],
    ["Mature — looking at next-decade questions", "=COUNTIF(Audit!D2:D,\"Mature — looking at next-decade questions\")"],
    ["", ""],
    ["Average retention pre-flight score", "=IFERROR(ROUND(AVERAGE(Retention!D2:D),1),\"—\")"],
    ["Average starting price $/mo", "=IFERROR(ROUND(AVERAGE(Pricing!L2:L),0),\"—\")"]
  ];
  p.getRange(1, 1, rows.length, 2).setValues(rows);
  p.getRange("A1").setFontWeight("bold");
  p.setColumnWidth(1, 340);
}

/* WheelPool + Buckets tabs: live formulas over the Audit tab.
   - Dedupe: latest row PER EMAIL wins (people can re-log; cross-browser fills make a
     second CID row — the email dedupe resolves both). Same option strings as the audit page.
   - Thu 12pm ET freeze: duplicate the WheelPool tab -> Edit > Paste special > Values only.
     Same procedure as the form era, just a different source tab. */
function buildWheelAndBuckets(ss) {
  var w = ss.getSheetByName("WheelPool") || ss.insertSheet("WheelPool");
  w.clear();
  w.getRange("A1:C1").setValues([["Name", "Email", "Updated"]]).setFontWeight("bold");
  w.getRange("A2").setFormula(
    '=IFERROR(SORTN(SORT(FILTER({Audit!C2:C,Audit!B2:B,Audit!M2:M},Audit!J2:J=TRUE,Audit!K2:K=TRUE,Audit!B2:B<>""),3,FALSE),9^9,2,2,TRUE),"")');
  w.setFrozenRows(1);

  var b = ss.getSheetByName("Buckets") || ss.insertSheet("Buckets");
  b.clear();
  b.getRange("A1:G1").setValues([["Email", "Name", "Stage", "Sells", "Wheel", "Updated", "Bucket"]]).setFontWeight("bold");
  /* logged rows only, deduped latest-per-email */
  b.getRange("A2").setFormula(
    '=IFERROR(SORTN(SORT(FILTER({Audit!B2:B,Audit!C2:C,Audit!D2:D,Audit!G2:G,Audit!J2:J,Audit!M2:M},Audit!K2:K=TRUE,Audit!B2:B<>""),6,FALSE),9^9,2,1,TRUE),"")');
  /* bucket mapping: stage string + what-you-sell, verbatim option strings */
  b.getRange("G2").setFormula(
    '=ARRAYFORMULA(IF(A2:A="","",IF(LEFT(C2:C,16)="No membership ye",IF(ISNUMBER(SEARCH("course",D2:D)),"Course Pivot","Pre-Launch"),IF(LEFT(C2:C,8)="Launched","Recently Launched","Scaling"))))');
  b.getRange("I1:J5").setValues([
    ["BUCKET COUNTS", ""],
    ["Pre-Launch", "=COUNTIF(G2:G,\"Pre-Launch\")"],
    ["Recently Launched", "=COUNTIF(G2:G,\"Recently Launched\")"],
    ["Scaling", "=COUNTIF(G2:G,\"Scaling\")"],
    ["Course Pivot", "=COUNTIF(G2:G,\"Course Pivot\")"]
  ]);
  b.getRange("I1").setFontWeight("bold");
  b.setFrozenRows(1);
}

/* ============ POST: sync (default) + native actions ============ */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (d.action === "send_code")   return sendCode(d);
    if (d.action === "verify_code") return verifyCode(d);
    if (d.action === "submit")      return nativeSubmit(d);
    return syncState(d); /* no action = the passive autosync */
  } catch (err) {
    return outJson({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function syncState(d) {
  if (!d.cid) return out("no cid");
  var s = d.state || {};
  var ts = d.ts || new Date().toISOString();
  var a = s.audit || {}, dg = s.diag || {}, p = s.pricing || {}, r = s.roadmap || {}, c = s.retention || {};

  if (hasAny(a, ["stage", "audience", "sells", "revenue", "blocker", "link"]))
    upsert("Audit", d.cid, [d.cid, d.email || "", d.name || "", a.stage || "", a.months || "", a.audience || "",
      a.sells || "", a.revenue || "", a.blocker || "", !!a.wheel, !!a.logged, a.notes || "", ts,
      a.link || "", a.wheelLook || "", a.offerNow || "", a.tried || "", a.promise || ""]);

  if ((dg.scores && Object.keys(dg.scores).length) || dg.weakest) {
    var sc = dg.scores || {};
    upsert("Diagnostic", d.cid, [d.cid, d.email || "", d.name || "", sc["Promise"] || "", sc["Friend-Making"] || "",
      sc["Onboarding"] || "", sc["Masterminds"] || "", sc["Design Constraints"] || "", sc["Pricing"] || "",
      dg.weakest || "", !!dg.logged, ts]);
  }

  if (hasAny(p, ["value", "month9", "members", "price", "startMo", "startYr", "renew"])) {
    var mrr = (num(p.members) && num(p.price)) ? num(p.members) * num(p.price) : "";
    upsert("Pricing", d.cid, [d.cid, d.email || "", d.name || "", p.value || "", p.month9 || "", p.members || "",
      p.price || "", mrr, p.launchNet || "", p.launchWeeks || "", p.renew || "", p.startMo || "", p.startYr || "",
      p.tiers || "", ts]);
  }

  var rf = r.fields || {};
  var filled = Object.keys(rf).filter(function (k) { return rf[k] && String(rf[k]).trim(); });
  if (r.arch || filled.length)
    upsert("Roadmap", d.cid, [d.cid, d.email || "", d.name || "", r.arch || "", filled.length, JSON.stringify(rf), ts]);

  if (c.checks && c.checks.some(Boolean)) {
    var idx = [];
    c.checks.forEach(function (v, i) { if (v) idx.push(i + 1); });
    upsert("Retention", d.cid, [d.cid, d.email || "", d.name || "", idx.length, idx.join(","), ts]);
  }
  return out("ok");
}

/* ---- native lane: email code verification ---- */
function sendCode(d) {
  var email = String(d.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return outJson({ ok: false, error: "bad_email" });
  var cache = CacheService.getScriptCache();
  if (cache.get("r_" + email)) return outJson({ ok: false, error: "slow_down" });
  var code = String(Math.floor(100000 + Math.random() * 900000));
  cache.put("c_" + email, JSON.stringify({ code: code, tries: 0 }), 900); /* 15 min */
  cache.put("r_" + email, "1", 60); /* 1 send per minute per address */
  MailApp.sendEmail({
    to: email,
    name: CODE_FROM_NAME,
    subject: "Your Summit Toolkit code: " + code,
    body: "Hello, my friend.\n\nYour code is " + code + ". It works for 15 minutes.\n\nType it into the toolkit to verify your email, then submit.\n\n— Jay"
  });
  return outJson({ ok: true });
}

function verifyCode(d) {
  var email = String(d.email || "").trim().toLowerCase();
  var cache = CacheService.getScriptCache();
  var raw = cache.get("c_" + email);
  if (!raw) return outJson({ ok: false, error: "expired" });
  var rec = JSON.parse(raw);
  if (rec.tries >= 5) { cache.remove("c_" + email); return outJson({ ok: false, error: "too_many_tries" }); }
  if (String(d.code || "").trim() !== rec.code) {
    rec.tries++; cache.put("c_" + email, JSON.stringify(rec), 900);
    return outJson({ ok: false, error: "wrong_code" });
  }
  cache.remove("c_" + email);
  cache.put("v_" + d.cid + "_" + email, "1", 21600); /* verified for 6 h */
  return outJson({ ok: true });
}

function nativeSubmit(d) {
  var email = String(d.email || "").trim().toLowerCase();
  if (!d.cid || !email) return outJson({ ok: false, error: "missing" });
  var verified = !!CacheService.getScriptCache().get("v_" + d.cid + "_" + email);
  if (!verified) return outJson({ ok: false, error: "not_verified" });
  var ts = new Date().toISOString();
  if (d.form === "audit") {
    var wheel = !!d.wheel, late = false;
    if (wheel && new Date() > new Date(WHEEL_LOCK_ISO)) { wheel = false; late = true; }
    upsert("Sub Audit", d.cid, [d.cid, email, true, d.name || "", d.stage || "", d.months || "", d.audience || "",
      d.sells || "", d.revenue || "", d.blocker || "", wheel, ts]);
    return outJson({ ok: true, wheel_locked: late });
  }
  if (d.form === "diag") {
    upsert("Sub Diagnostic", d.cid, [d.cid, email, true, d.name || "", d.weakest || "", ts]);
    return outJson({ ok: true });
  }
  return outJson({ ok: false, error: "bad_form" });
}

/* ============ GET: pulse JSON for the team monitor page ============ */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!TEAM_TOKEN || p.token !== TEAM_TOKEN) return outJson({ ok: false, error: "no_access" });
  if (p.email) return personLookup(String(p.email).trim().toLowerCase());
  var ss = SpreadsheetApp.getActive();
  var audit = vals(ss, "Audit"), diag = vals(ss, "Diagnostic");
  var subA = vals(ss, "Sub Audit"), subD = vals(ss, "Sub Diagnostic");
  var weakest = {}, lifecycle = {};
  diag.forEach(function (r) { if (r[9]) weakest[r[9]] = (weakest[r[9]] || 0) + 1; });
  audit.forEach(function (r) { if (r[3]) lifecycle[r[3]] = (lifecycle[r[3]] || 0) + 1; });
  var chase = audit.filter(function (r) { return r[3] && r[10] !== true; })
    .map(function (r) { return { name: r[2], email: r[1] }; });
  var recent = subA.map(function (r) { return { form: "Audit", name: r[3], email: r[1], at: r[11] }; })
    .concat(subD.map(function (r) { return { form: "Diagnostic", name: r[3], email: r[1], at: r[5] }; }))
    .sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }).slice(0, 12);
  return outJson({
    ok: true, ts: new Date().toISOString(),
    wheelLock: WHEEL_LOCK_ISO, wheelLocked: new Date() > new Date(WHEEL_LOCK_ISO),
    sync: {
      users: audit.length + diag.filter(function (r) { return audit.map(function (a2) { return a2[0]; }).indexOf(r[0]) < 0; }).length,
      auditFilled: audit.filter(function (r) { return r[3]; }).length,
      auditLogged: audit.filter(function (r) { return r[10] === true; }).length,
      diagFilled: diag.filter(function (r) { return r[9]; }).length,
      diagLogged: diag.filter(function (r) { return r[10] === true; }).length,
      chaseCount: chase.length
    },
    native: {
      auditSubmitted: subA.length,
      diagSubmitted: subD.length,
      wheelPool: subA.filter(function (r) { return r[10] === true; }).length
    },
    weakest: weakest, lifecycle: lifecycle, chase: chase.slice(0, 25), recent: recent
  });
}

/* full-context lookup for one attendee: every tab's row, labeled by header */
function personLookup(email) {
  var ss = SpreadsheetApp.getActive();
  var result = { ok: true, email: email, tools: {} };
  var cids = {};
  Object.keys(TABS).forEach(function (tab) {
    var sh = ss.getSheetByName(tab);
    if (!sh || sh.getLastRow() < 2) return;
    var data = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
    var head = data[0];
    for (var i = 1; i < data.length; i++) {
      var rowEmail = String(data[i][1] || "").trim().toLowerCase();
      if (rowEmail === email || (data[i][0] && cids[data[i][0]])) {
        if (data[i][0]) cids[data[i][0]] = true;
        var obj = {};
        head.forEach(function (h, j) { if (h !== "CID" && data[i][j] !== "" && data[i][j] !== null) obj[h] = data[i][j]; });
        result.tools[tab] = obj;
        break;
      }
    }
  });
  if (!Object.keys(result.tools).length) return outJson({ ok: false, error: "not_found" });
  return outJson(result);
}

function vals(ss, tab) {
  var sh = ss.getSheetByName(tab);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}
function upsert(tab, cid, row) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(tab) || ss.insertSheet(tab);
  if (sh.getLastRow() === 0) sh.appendRow(TABS[tab]);
  var hit = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).createTextFinder(cid).matchEntireCell(true).findNext();
  if (hit) sh.getRange(hit.getRow(), 1, 1, row.length).setValues([row]);
  else sh.appendRow(row);
}
function hasAny(obj, keys) { return keys.some(function (k) { return obj[k] && String(obj[k]).trim(); }); }
function num(v) { var n = parseFloat(String(v || "").replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : n; }
function out(t) { return ContentService.createTextOutput(t); }
function outJson(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
