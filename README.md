# PVD Snow

Report unplowed streets and unshoveled sidewalks in Providence — takes 30 seconds.

**This is a community project, not affiliated with the City of Providence.**

Reports submitted through PVD Snow are forwarded to the city's official 311 system via automation.

## How it works

1. **Resident** opens [pvdsnow.org](https://pvdsnow.org), picks the issue, snaps a photo, confirms the location
2. **Report** lands in Firestore with status `pending`
3. **Operator** opens the local dashboard (`localhost:3311`), reviews the report, hits Submit
4. **Automation** logs into the city's 311 portal via Playwright and fills out the 3-step wizard

## Stack

| Layer | Tech |
|---|---|
| PWA | Vanilla JS, Firebase Hosting, Firestore |
| Shared types | TypeScript (`shared/types.ts`) |
| Automation | Playwright, Firebase Admin SDK, Node HTTP server |
| Target | Providence 311 portal (Power Pages / Dynamics 365) |

## Setup

### PWA

Already deployed to Firebase Hosting. To redeploy:

```bash
firebase deploy --only hosting
```

### Automation

```bash
cd automation
cp .env.example .env   # fill in credentials
npm install
npx playwright install chromium
npm run dev            # builds + starts dashboard at localhost:3311
```

Required env vars:
- `FIREBASE_SERVICE_ACCOUNT_PATH` — path to Firebase service account key JSON
- `PORTAL_EMAIL` — PVD 311 portal login email
- `PORTAL_PASSWORD` — PVD 311 portal login password

### Dashboard

The dashboard at `localhost:3311` shows all reports with status filtering. For each pending report you can:
- **Dry Run** — walks through the entire 311 wizard but stops before submitting
- **Submit to 311** — submits for real, returns a case ID
- **Reset** — moves failed/submitted reports back to pending

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
