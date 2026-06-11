/* ===== SUMMIT TOOLKIT — the ONE config file. Every page reads this. Fill the blanks here. ===== */
window.MS = {

  /* Capture mode for the two "Log it" inputs.
     "forms"  = the locked launch plan: Log It opens the Google Form (prefilled if FORM1/FORM2 are set).
     "native" = no Google Forms: Log It verifies the attendee's email with a 6-digit code
                and submits inside the toolkit (needs SYNC_URL set + apps-script-Code.gs v2 deployed).
     Flip ONLY with the team's sign-off — the wheel + synthesis must read the matching tabs. */
  CAPTURE: "forms",

  /* Response capture (Jay's data). Paste the Apps Script web-app /exec URL from
     apps-script-Code.gs deployment. Empty = capture off, toolkit stays browser-only
     and the privacy line says so. With a URL set, every page syncs answers to the
     "Summit Toolkit Responses" sheet as people type, and the privacy line updates. */
  SYNC_URL: "https://script.google.com/macros/s/AKfycbxBmBJjqXCDWP6U-488_XyEXZcBCgUkGGv0OXW0qXzy7WxESasdgYaIPeLxhF1fmwNZtg/exec",

  /* Form 1 prefill (Lab Audit). Open the form → ⋮ → "Get pre-filled link" → answer
     everything with dummy text → copy link. Paste the docs.google.com/.../viewform
     part as base, and each entry.NNNNNNN number next to its field.
     Empty base = the Log It button opens the plain short link, same as the PDFs. */
  FORM1: {
    base: "",
    entries: { first:"", stage:"", months:"", audience:"", sells:"", revenue:"", blocker:"", wheel:"" },
    wheelOption: "Want a shot at one of the four live audits on Day 3? Jay picks live — wheel spin, no pre-curation. Pool locks Thu 12pm ET."
  },

  /* Form 2 prefill (Diagnostic) — same drill, one entry ID. */
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
