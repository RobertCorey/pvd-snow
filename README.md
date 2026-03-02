# PVD Snow

**This project has been sunset.** The website at [pvdsnow.org](https://pvdsnow.org) now shows a thank-you page. To report snow issues in Providence, use the official portal at [311.providenceri.gov](https://311.providenceri.gov).

---

PVD Snow was a community app for reporting unplowed streets and unshoveled sidewalks in Providence, RI. It was not affiliated with the City of Providence.

Residents opened [pvdsnow.org](https://pvdsnow.org), picked the issue, snapped a photo, and confirmed the location. Reports landed in Firestore, and a Playwright-based automation engine forwarded them to the city's official 311 portal.

## How it worked

1. **Resident** opens pvdsnow.org, picks the issue, snaps a photo, confirms the location
2. **Report** lands in Firestore with status `pending`
3. **Operator** opens the local dashboard, reviews the report, hits Submit
4. **Automation** logs into the city's 311 portal via Playwright and fills out the submission wizard

## Stack

| Layer | Tech |
|---|---|
| PWA | Vanilla JS, Firebase Hosting, Firestore |
| Shared types | TypeScript (`shared/types.ts`) |
| Automation | Playwright, Firebase Admin SDK, Node HTTP server |
| Target | Providence 311 portal (Power Pages / Dynamics 365) |

## Project structure

```
public/          PWA (index.html, app.js, style.css, sw.js)
shared/          TypeScript types shared between PWA and automation
automation/      Playwright automation + dashboard server
  src/
    index.ts     HTTP server + dashboard
    portal.ts    Playwright 311 portal submitter
    firestore.ts Firebase Admin SDK helpers
    config.ts    Environment config
    dashboard.html Dashboard UI
scripts/         Portal research notes
```
