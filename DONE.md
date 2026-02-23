# PVD Snow — Completed Work

## Domain (verified Tue Feb 25)

- pvdsnow.org DNS resolving (A record 199.36.158.100 + TXT hosting-site=pvd-snow-report)
- www.pvdsnow.org CNAME → pvd-snow-report.web.app
- HTTPS works on both pvdsnow.org and www.pvdsnow.org (200, SSL valid)
- Latest deploy confirmed live

## Privacy / transparency (Tue Feb 25)

- Public record notice added to review step: "Your report (photo, location,
  description) will be submitted as a public record to the City of Providence
  311 system"
- Contact fields stay collapsed and labeled as optional (verified)
- Portal privacy toggle confirmed default "No" (public) — automation doesn't
  touch it

## Branding (Tue Feb 25)

- Added header disclaimer: "Community project — not affiliated with the City
  of Providence"
- Removed "Snow Emergency Active" badge (too official-looking)
- Added footer "How it works": "PVD Snow is a volunteer project. We forward
  your reports to the city's official 311 system on your behalf."
- Footer links to official 311 portal (311.providenceri.gov)

## Service worker (Tue Feb 25)

- Replaced cache-first SW with no-op that clears old caches. App is too small
  and too network-dependent to benefit from offline caching. SW still registers
  so it can replace any previously cached version.

## Location accuracy (Tue Feb 25)

- Replaced Nominatim reverse geocode with ArcGIS (same geocoder the city's 311
  portal uses) — address format now matches what the portal expects
- Automation sets portal hidden fields directly (cop_latitude, cop_longitude,
  cop_street1, cop_city, etc.) instead of typing into autocomplete and hoping
  the first suggestion matches
- Exact GPS coordinates included in description as a Google Maps link so the
  city can see the precise spot
