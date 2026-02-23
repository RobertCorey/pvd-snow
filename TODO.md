# PVD Snow — Launch TODO

## Storm timeline (Feb 22-24, 2026)

- **Sun night → Mon**: 9-13" overnight, another 10-14" Monday. Gusts to 55mph. Blizzard.
- **Mon evening (~7pm)**: Snow stops. Plows start working.
- **Tue**: Sunny, 32°F. People dig out, walk around, see the mess.
- **Tue night**: Possible light dusting, not significant.

Total: ~20-27 inches. This is the kind of storm where sidewalks won't be
shoveled for days and side streets won't get plowed for a while.

## Timing strategy

- **Monday**: Stay inside. Do all technical prep (domain, branding, e2e test,
  dry runs). Nobody is reporting snow during a blizzard.
- **Monday evening**: Final checks once snow stops. Everything ready to go.
- **Tuesday morning**: Launch. Post to Reddit/social media early. People wake
  up, try to walk somewhere, find sidewalks buried, and that's when they
  want to report it. The frustration window is Tuesday AM through Wednesday.

## Monday (storm day / prep)

### Domain
- [ ] Verify pvdsnow.org DNS is resolving (A record + TXT)
- [ ] Verify Firebase Console shows pvdsnow.org and www.pvdsnow.org as "Connected"
- [ ] Verify HTTPS works on both pvdsnow.org and www.pvdsnow.org
- [ ] Test that the PWA loads and works on pvdsnow.org

### Privacy / transparency with users
Reports are submitted to the city's 311 system as PUBLIC records (the portal's
"Private" toggle defaults to No, and we leave it that way so the city can share
and act on them). Users need to know this before they submit:
- [x] Add clear notice in the app: "Your report (photo, location, description)
      will be submitted as a public record to the City of Providence 311 system"
- [x] Do NOT collect name/email by default — keep the contact fields collapsed
      and clearly labeled as optional (verified: already the case)
- [ ] Verify the portal's privacy toggle stays set to "No" (public) during
      automation — currently we don't touch it, which leaves the default (public)

### Branding — NOT an official city app
- [x] Add a visible disclaimer: "Community project — not affiliated with the City of Providence"
- [x] Remove "Snow Emergency Active" badge (too official-looking)
- [x] Add "How it works" in footer explaining: you submit here, we forward
      to the city's 311 system on your behalf
- [x] Footer links to the real 311 portal for people who want to use it directly

### Service worker
- [x] Replaced cache-first SW with no-op that clears old caches (app is too
      small and too network-dependent to benefit from offline caching)

### End-to-end real test
- [ ] Open pvdsnow.org on phone
- [ ] Take a real photo of an unshoveled sidewalk
- [ ] Confirm EXIF GPS is extracted and address auto-populates
- [ ] Submit the report
- [ ] Open dashboard (localhost:3311), see the report appear
- [ ] Dry run it first, watch Playwright walk through the portal
- [ ] Submit it for real, confirm case ID comes back
- [ ] Check 311.providenceri.gov/my-requests/ to verify the case

### Location accuracy
The city needs a good address to dispatch crews. Current flow:
1. Photo EXIF GPS → lat/lng → reverse geocode via Nominatim → street address
2. Automation types that address into the portal's ArcGIS autocomplete

Potential improvements:
- [ ] The portal requires ArcGIS autocomplete flow (direct field injection causes
      500 errors per research). But we should verify: does the ArcGIS suggestion
      match what we reverse-geocoded? If not, the city gets a different address
      than what the user confirmed.
- [ ] Consider passing lat/lng in the description field as a fallback so the city
      has exact coordinates even if the address is approximate.
- [ ] Test with real photos: does phone EXIF GPS give us accurate enough coords
      for a good ArcGIS match?

## Tuesday (launch day)

### Marketing plan
Goal: get the app in front of Providence residents who are frustrated after the storm.

**Where to post:**
- [ ] Reddit r/providence — "I built a thing" post, honest and direct
- [ ] Nextdoor (Providence neighborhoods)
- [ ] Facebook groups: Providence Community, East Side, West End, etc.
- [ ] Twitter/X — tag @PVDCityHall, local reporters
- [ ] GoLocalProv tip line (they love civic tech stories)
- [ ] WPRI / Providence Journal tip lines

**Messaging:**
Core pitch: "Report unplowed streets and unshoveled sidewalks in Providence —
takes 30 seconds."
- Frame as: "the city's 311 system works but it's painful to use on your phone.
  This makes it easy."
- Be transparent: "this is a volunteer project that forwards your reports to
  the official 311 system"
- Show the value: "more reports = more accountability = your street gets plowed"
- Include the URL prominently: pvdsnow.org

**Flyer (for later):**
- [ ] Simple one-pager: QR code + pvdsnow.org + one-line pitch
- [ ] Post at bus stops, coffee shops, laundromats in affected neighborhoods

### Monitor
- [ ] Watch dashboard for incoming reports
- [ ] Submit them in batches via the dashboard
- [ ] Watch for automation failures and fix selectors if the portal changed
