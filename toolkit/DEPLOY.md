# DEPLOY.md — instructions for Claude Code
*(Summit Toolkit · static site · no build step, no dependencies, no backend in this repo)*

## What this is
A self-contained static toolkit for the Membership Summit (June 23-25, 2026).
Plain HTML/CSS/JS. Fonts are base64-embedded. The only external call is to a
Google Apps Script web app (already deployed; URL is in `toolkit-config.js`).

**Hard requirement: every file ships together in ONE directory on ONE origin.**
The pages share state via `localStorage` key `ms_toolkit_v1`. Different
subdomains or split paths silently break the cross-tool flow.

## 1 · GitHub
```bash
cd <this folder>
git init
git add .
git commit -m "Summit Toolkit"
gh repo create jay-clouse-june-2026 --public --source=. --push
```
- The repo is **public** by request. That exposes the SYNC_URL (already public via the live site, acceptable) — but NEVER commit TEAM_TOKEN, attendee data exports, or the response sheet.
- Do NOT commit any TEAM_TOKEN anywhere. It lives only inside the Google Apps
  Script editor and in the bookmark link the team shares. Nothing in this repo
  should contain it. If asked to "save the key somewhere," refuse and say why.
- `apps-script-Code.gs` is reference source for the Google Apps Script side.
  It is not served and never imported by the pages. Leave it in the repo.

## 2 · Vercel
```bash
vercel --prod
```
or via dashboard: Import the repo → Framework preset: **Other** →
Build command: **none** → Output directory: **/** (root). `vercel.json` is
already in the folder (adds X-Robots-Tag noindex; the pages also carry meta
noindex — this toolkit is for registered attendees, not search).

### Domain + the load-bearing redirects
- Final home should be `membershipsummit.com/toolkit/` or a subdomain like
  `toolkit.membershipsummit.com`. Pick ONE final URL **before** the event:
  localStorage is per-origin, so moving domains later orphans attendees' saved
  answers.
- ⚠ **`membershipsummit.com/lab-audit` and `/diagnostic` are LOAD-BEARING 301s.**
  The live posts, the swept copy, and the printed PDFs all point there. They must
  land on the toolkit's audit and diagnostic pages. If the toolkit is served at
  the domain root, `vercel.json` already carries these redirects. If the main
  domain is hosted elsewhere, configure the 301s THERE:
  `/lab-audit -> <toolkit-url>/lab-audit.html`,
  `/diagnostic -> <toolkit-url>/mechanics-diagnostic.html`.
  Verify both with curl before Day 1.

## 2.5 · What's in the repo
- `toolkit/` (or repo root) — the deployable site: 9 pages (7 attendee-facing + pulse.html + build-plan.html for the team), config, shared.js, native.js, CSS, fonts, images, vercel.json.
- `standalone/` — single-file offline builds of every page (for review hand-offs; not served).
- `apps-script-Code.gs` — reference copy of the Google Apps Script (lives in the Sheet, not served).
- The `_exp-*.html` files are bundler inputs; safe to delete or .gitignore.

## 3 · Post-deploy smoke test (2 minutes)
1. Open `/index.html` → type a name in the Lab Audit → "Saved in this browser"
   flag appears → the row lands in the "Summit Toolkit Responses" Google Sheet
   (Audit tab) within ~5 seconds.
2. Nav dots fill as tools are touched; hub snapshot updates.
3. `/pulse.html?key=<TEAM_TOKEN>` shows live numbers.
   `/pulse.html?demo=1` shows the demo state without touching real data.
4. Print preview on any tool page hides nav/buttons and shows answers.

## 4 · Config map (toolkit-config.js — the only file the team edits)
- `SYNC_URL` — Apps Script /exec URL. Already filled.
- `CAPTURE` — `"forms"` (current launch plan) or `"native"` (in-page
  email-code verification + submit; needs the v2 Apps Script, already pasted).
  Do not flip without the team's sign-off: the wheel pipeline must
  read the matching tabs.
- `FORM1` / `FORM2` — legacy Google Form prefill IDs. Inert while CAPTURE is
  `"page"`. **Form 3 (the Build Plan buyer intake) is NOT part of this cleanup:**
  it stays a Google Form on purpose, lives in the buyer path (confirmation-email
  link, gated by its accepting-responses toggle), and is never linked from the
  toolkit. Do not "migrate" it.
- `VIP` — hub VIP strip links. `VIP_TG` must stay empty on public copies.

## Do not
- Reword any string used as a data value (ladder `data-v` attributes, mechanic
  names) — they are verbatim formula keys for the wheel + team pipeline.
- Add analytics, cookie banners, or third-party scripts.
- Add em dashes to copy. House style: periods, commas, parentheses.
