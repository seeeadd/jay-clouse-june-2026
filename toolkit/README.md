# Summit Toolkit · Membership Summit (June 23–25, 2026)

The interactive toolkit for Jay Clouse's Membership Summit. Plain HTML/CSS/JS,
no build step. Fonts embedded. Creator Science brand throughout.

- **Attendee pages:** index (hub) · lab-audit · mechanics-diagnostic · pricing-worksheet · roadmap (the 30/60/90 result engine) · retention-checklist · review (one-pager)
- **Team pages (do not link publicly):** pulse.html (live monitor, needs ?key=TEAM_TOKEN) · build-plan.html (the live-buyer Build Plan builder)
- **Review mode:** any page + `?review=1` = filled demo copy, all locks open, nothing syncs.
- **standalone/** — single-file offline builds of every page, for review hand-offs.
- **Deploy:** see DEPLOY.md (Vercel, no build, domain + redirect rules).

Config lives in `toolkit-config.js`. The Google Apps Script backend is `apps-script-Code.gs`
(paste into the response sheet's Apps Script editor; never commit TEAM_TOKEN).
