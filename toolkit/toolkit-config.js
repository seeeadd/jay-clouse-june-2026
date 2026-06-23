/* ===== SUMMIT TOOLKIT — the ONE config file. Every page reads this. Fill the blanks here. ===== */
window.MS = {

  /* Capture mode for the two "Log it" inputs.
     "page"   = the Jun 10 pivot (current): logging happens IN the toolkit, one tap.
                The passive sync writes the row server-side (Audit tab: stage, email,
                wheel opt-in, logged flag) — that is the wheel's capture. Re-logging is allowed
     and expected ("fill it again with the box checked"); the WheelPool and Buckets
     tabs dedupe to latest-per-email. Forms 1+2 retired from the attendee path.
     "forms"  = legacy: Log It opens the Google Form (prefilled if FORM1/FORM2 are set).
     "native" = legacy experiment: in-toolkit submit with 6-digit email verification. */
  CAPTURE: "page",

  /* Drip unlock — fixed ET timestamps (UTC here; shown to attendees in their local time).
     Tools unlock forward and never re-lock. Membership Audit + 30/60/90 + One-Pager have no
     calendar lock (the 30/60/90 gates on the two inputs instead).
     Team preview: open any page with ?preview=1 once to bypass locks in that browser. */
  DRIP: {
    enabled: true,   /* LIVE for attendees: drip schedule below is in effect. (For your own review, open any page with ?preview=1 or ?review=1 to bypass locks.) */
    diag:      "2026-06-24T20:00:00Z",   /* Wed Jun 24 · 4:00pm ET, after the Day 2 teaching */
    pricing:   "2026-06-24T20:00:00Z",   /* Wed Jun 24 · 4:00pm ET */
    retention: "2026-06-25T19:15:00Z"    /* Thu Jun 25 · 3:15pm ET, after the Day 3 close */
  },

  /* Response capture (Jay's data). Paste the Apps Script web-app /exec URL from
     apps-script-Code.gs deployment. Empty = capture off, toolkit stays browser-only
     and the privacy line says so. With a URL set, every page syncs answers to the
     "Summit Toolkit Responses" sheet as people type, and the privacy line updates. */
  SYNC_URL: "https://script.google.com/macros/s/AKfycbxBmBJjqXCDWP6U-488_XyEXZcBCgUkGGv0OXW0qXzy7WxESasdgYaIPeLxhF1fmwNZtg/exec",

  /* Form 1 prefill (Membership Audit) — LEGACY, inert while CAPTURE is "page".
     NOTE: Form 3, the Build Plan buyer intake, is deliberately NOT in this file.
     It stays a Google Form in the BUYER path (confirmation-email link), gated by
     its own accepting-responses toggle. Never link it from the toolkit. */
  FORM1: {
    base: "",
    entries: { first:"", stage:"", months:"", audience:"", sells:"", revenue:"", blocker:"", wheel:"" },
    wheelOption: "Want a shot at one of the four live audits on Day 3? Jay picks live — wheel spin, no pre-curation. Pool locks Thu 12pm ET."
  },

  /* Form 2 prefill (Diagnostic) — legacy, same deal. */
  FORM2: {
    base: "",
    entries: { weakest:"" }
  },

  /* VIP strip on the hub. SHOW_VIP true = strip visible. Empty link = "lands here
     after Day X" placeholder shows. Leave VIP_TG empty on any public copy — the
     two-way VIP Telegram invite is a paid perk. */
  VIP: {
    SHOW_VIP: false,
    REPLAY_D1: "",
    REPLAY_D2: "",
    REPLAY_D3: "",
    VIP_QA: "",
    VIP_TG: ""
  }
};
