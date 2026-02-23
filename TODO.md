# PVD Snow — Remaining TODO

## End-to-end real test

- [ ] Open pvdsnow.org on phone
- [ ] Take a real photo of an unshoveled sidewalk
- [ ] Confirm EXIF GPS is extracted and address auto-populates (now via ArcGIS)
- [ ] Submit the report
- [ ] Open dashboard (localhost:3311), see the report appear
- [ ] Dry run it first, watch Playwright walk through the portal
- [ ] Submit it for real, confirm case ID comes back
- [ ] Check 311.providenceri.gov/my-requests/ to verify the case
- [ ] Test with real photos: does phone EXIF GPS give accurate enough coords
      for a good ArcGIS match?

## Marketing

Goal: get the app in front of Providence residents who are frustrated after
the storm. The frustration window is Tuesday AM through Wednesday.

**Where to post:**
- [ ] Reddit r/providence — "I built a thing" post, honest and direct
- [ ] Nextdoor (Providence neighborhoods)
- [ ] Facebook groups: Providence Community, East Side, West End, etc.
- [ ] Twitter/X — tag @PVDCityHall, local reporters
- [ ] GoLocalProv tip line (they love civic tech stories)
- [ ] WPRI / Providence Journal tip lines

**Flyer (stretch goal):**
- [ ] Simple one-pager: QR code + pvdsnow.org + one-line pitch
- [ ] Post at bus stops, coffee shops, laundromats in affected neighborhoods

## Monitor (ongoing)

- [ ] Watch dashboard for incoming reports
- [ ] Submit them in batches via the dashboard
- [ ] Watch for automation failures and fix selectors if the portal changed
