# PVD Snow — Remaining TODO

## End-to-end real test

- [x] Open pvdsnow.org on phone
- [x] Take a real photo of an unshoveled sidewalk
- [x] Confirm EXIF GPS is extracted and address auto-populates (now via ArcGIS)
- [x] Submit the report
- [x] Open dashboard (localhost:3311), see the report appear
- [x] Dry run it first, watch Playwright walk through the portal
- [x] Submit it for real, confirm case ID comes back
- [x] Check 311.providenceri.gov/my-requests/ to verify the case
- [x] Test with real photos: does phone EXIF GPS give accurate enough coords
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

## Analytics

- [ ] Set up Microsoft Clarity for session recording & heatmaps (free, unlimited)

## Monitor (ongoing)

- [ ] Watch dashboard for incoming reports
- [ ] Submit them in batches via the dashboard
- [ ] Watch for automation failures and fix selectors if the portal changed
