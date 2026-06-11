/* ===== Summit Toolkit · native capture lane (dormant unless MS.CAPTURE==="native") =====
   Replaces the Google-Form "Log it" step with an in-page flow:
   email -> 6-digit code -> verify -> submit. Talks to apps-script-Code.gs v2. */
(function () {
  if (!(window.MS && MS.CAPTURE === "native")) return;

  /* hub + roadmap: point the log buttons at the tool pages instead of the form links */
  document.querySelectorAll('a.btn[href*="membershipsummit.com/lab-audit"]').forEach(a => { a.href = "lab-audit.html"; a.removeAttribute("target"); });
  document.querySelectorAll('a.btn[href*="membershipsummit.com/diagnostic"]').forEach(a => { a.href = "mechanics-diagnostic.html"; a.removeAttribute("target"); });

  const path = location.pathname;
  const form = /lab-audit/.test(path) ? "audit" : (/mechanics-diagnostic/.test(path) ? "diag" : null);
  const logBtn = document.getElementById("logBtn");
  if (!form || !logBtn) return;

  if (!MS.SYNC_URL) return; /* native needs the web app deployed; otherwise leave forms alone */

  const cid = () => {
    const s = store.all();
    if (!s.cid) { s.cid = (crypto.randomUUID ? crypto.randomUUID() : "id" + Date.now() + Math.random().toString(36).slice(2)); localStorage.setItem(KEY, JSON.stringify(s)); }
    return s.cid;
  };
  const api = p => fetch(MS.SYNC_URL, { method: "POST", body: JSON.stringify(p) }).then(r => r.json()).catch(() => ({ ok: false, error: "network" }));

  /* swap the form button for the in-page panel */
  logBtn.style.display = "none";
  const hintP = document.querySelector(".actions + .hint");
  if (hintP) hintP.textContent = form === "audit"
    ? "No form needed. Verify your email below and submit. Your roadmap unlocks the moment input #2 is logged too."
    : "No form needed. One submit below, 30 seconds. That's input #2.";

  const panel = document.createElement("div");
  panel.className = "nlog card paper";
  panel.innerHTML =
    '<div class="nl-t">Log input ' + (form === "audit" ? "#1" : "#2") + ' here</div>' +
    '<div class="nl-s" id="nlStep"></div>' +
    '<div class="row" id="nlRow"></div>' +
    '<div class="nl-msg" id="nlMsg"></div>';
  document.querySelector(".actions").after(panel);

  const S = () => store.all();
  const setMsg = (t, bad) => { const m = panel.querySelector("#nlMsg"); m.textContent = t || ""; m.className = "nl-msg" + (bad ? " bad" : ""); };
  const ERR = { bad_email: "That email doesn't look right. Check it and try again.", slow_down: "Code already sent. Give it a minute, check spam too.", expired: "That code expired. Send a fresh one.", wrong_code: "Not that one. Check the email and try again.", too_many_tries: "Five misses. Send a fresh code.", not_verified: "Your verification lapsed. Send a fresh code.", network: "Couldn't reach the Summit team's capture. Try again in a moment.", missing: "Add your email first." };

  function render() {
    const s = S(), step = panel.querySelector("#nlStep"), row = panel.querySelector("#nlRow");
    const email = (s.email || "").trim().toLowerCase();
    const logged = !!((s[form === "audit" ? "audit" : "diag"] || {}).logged);
    if (logged) {
      step.textContent = "Logged. You're set.";
      row.innerHTML = '<span class="nl-ok">Submitted as ' + (s.verifiedEmail || email) + '. ' + (form === "audit" ? "Your roadmap reads this." : "That's input #2 done.") + '</span>';
      return;
    }
    if (s.verifiedEmail && s.verifiedEmail === email && email) {
      step.textContent = "Email verified: " + email;
      row.innerHTML = '<button class="btn" id="nlSubmit">Submit input ' + (form === "audit" ? "#1" : "#2") + '</button>';
      row.querySelector("#nlSubmit").onclick = doSubmit;
      return;
    }
    if (s.codeSentTo && s.codeSentTo === email && email) {
      step.textContent = "Code sent to " + email + ". Type it here.";
      row.innerHTML = '<input type="text" id="nlCode" inputmode="numeric" maxlength="6" placeholder="6-digit code" style="max-width:160px;text-align:center"><button class="btn" id="nlVerify">Verify</button><button class="btn ghost" id="nlResend">Resend</button>';
      row.querySelector("#nlVerify").onclick = doVerify;
      row.querySelector("#nlResend").onclick = doSend;
      return;
    }
    step.textContent = "Step 1 of 2: verify the email your roadmap should go to.";
    row.innerHTML = '<input type="text" id="nlEmail" inputmode="email" placeholder="you@example.com" value="' + (s.email || "").replace(/"/g, "&quot;") + '" style="max-width:280px"><button class="btn" id="nlSend">Email me a code</button>';
    row.querySelector("#nlSend").onclick = doSend;
  }

  async function doSend() {
    const inp = panel.querySelector("#nlEmail");
    const email = ((inp ? inp.value : S().email) || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMsg(ERR.bad_email, true); return; }
    store.top("email", email);
    setMsg("Sending…");
    const r = await api({ action: "send_code", email, cid: cid() });
    if (r.ok) { store.top("codeSentTo", email); setMsg("Sent. Check your inbox (and spam, once)."); }
    else setMsg(ERR[r.error] || "Hm, that didn't go through. Try again.", true);
    render();
  }
  async function doVerify() {
    const code = (panel.querySelector("#nlCode").value || "").trim();
    const email = (S().email || "").trim().toLowerCase();
    setMsg("Checking…");
    const r = await api({ action: "verify_code", email, code, cid: cid() });
    if (r.ok) { store.top("verifiedEmail", email); setMsg("Verified."); }
    else setMsg(ERR[r.error] || "That didn't check out.", true);
    render();
  }
  async function doSubmit() {
    const s = S(), email = s.verifiedEmail;
    let payload;
    if (form === "audit") {
      const a = s.audit || {};
      if (!a.stage) { setMsg("Mark your rung on the ladder first.", true); return; }
      payload = { action: "submit", form: "audit", cid: cid(), email, name: s.name || "", stage: a.stage || "", months: a.months || "", audience: a.audience || "", sells: a.sells || "", revenue: a.revenue || "", blocker: a.blocker || "", wheel: !!a.wheel };
    } else {
      const d = s.diag || {};
      if (!d.weakest) { setMsg("Score all six first. Your weakest mechanic is the answer.", true); return; }
      payload = { action: "submit", form: "diag", cid: cid(), email, name: s.name || "", weakest: d.weakest };
    }
    setMsg("Submitting…");
    const r = await api(payload);
    if (r.ok) {
      store.set(form === "audit" ? "audit" : "diag", { logged: true });
      setMsg(r.wheel_locked ? "Logged. The wheel pool had already locked (Thu 12pm ET), so the audit checkbox didn't make it in. Everything else did." : "");
      const chk = document.getElementById("logged"); if (chk) chk.checked = true;
      paintNav();
    } else if (r.error === "not_verified") { store.top("verifiedEmail", ""); setMsg(ERR.not_verified, true); }
    else setMsg(ERR[r.error] || "That didn't go through. Try again.", true);
    render();
  }

  render();
})();
