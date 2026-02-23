# PVD Snow — Launch Strategy

## The opportunity

Providence got 20-27 inches of snow (Feb 22-24, 2026). Side streets are
unplowed, sidewalks are buried, and people are frustrated. The city's 311
portal exists but it's a multi-step desktop-optimized form that nobody wants
to fight on their phone while standing in a snowbank.

**PVD Snow makes reporting take 30 seconds.** Pick the issue, snap a photo, confirm
the address, done. We forward it to the city's 311 system on their behalf.

## Who are our users?

Providence residents who:
- Just experienced a major storm and are frustrated
- Want their street plowed or sidewalk shoveled
- Know the city *should* handle it but don't know how to make that happen
- Won't spend 10 minutes fighting a government form on their phone
- Will spend 30 seconds if it's easy

They're not civic tech enthusiasts. They're regular people who are cold and
annoyed. The app needs to feel effortless, not impressive.

## Distribution plan

We have no existing audience. We need to go where frustrated Providence
residents already are, right after the storm.

### Tuesday posts

**Reddit r/providence** — This is the highest-value channel. The Providence
subreddit is active, locals use it, and post-storm threads always blow up.

Post framing: "I built a thing." Honest, direct, not corporate. Something like:

> After the last storm I got frustrated trying to report my unplowed street
> through the city's 311 system. So I built pvdsnow.org — it takes 30 seconds
> to report an unplowed street or unshoveled sidewalk, and we forward it
> directly to the city's 311 system.
>
> It's a volunteer project, not affiliated with the city. Just trying to make
> it easier for people to report problems and hold the city accountable.
>
> pvdsnow.org

Key points for the Reddit post:
- Lead with the personal frustration — people relate to that
- Be transparent about what it does (forwards to 311)
- Be transparent about what it is (volunteer project, not the city)
- Don't oversell. Let the utility speak for itself
- Include the URL prominently
- Respond to every comment — this is a small community, engagement matters

**Nextdoor** — Post in Providence neighborhoods. Nextdoor skews older, more
homeowner-oriented. These people care about plowing. Short and practical:

> Buried streets and sidewalks after the storm? pvdsnow.org lets you report
> them in 30 seconds — forwarded directly to the city's 311 system. Free,
> volunteer-run.

**Facebook groups** — Providence Community, East Side of Providence, West End,
Federal Hill, etc. Similar to Nextdoor but more engagement-oriented. Post a
photo of a snowy street with the pitch.

**Twitter/X** — Tag @PVDCityHall, local reporters (@TedNesi, @DanMcGowan,
etc.). Less likely to go viral but good for credibility if a reporter picks
it up.

### Media tips

**GoLocalProv** — They love local civic tech stories. Send a tip via their site.
Frame it as "Providence resident builds app to make snow reporting easier."

**WPRI / Providence Journal** — Traditional media tip lines. Less likely to
bite on day one, but if the app gets traction on Reddit, they might follow up.

Don't chase media on launch day. Focus on Reddit and social media where you
control the message. Media is a bonus.

## Messaging principles

**Core pitch:** "Report unplowed streets and unshoveled sidewalks in Providence
— takes 30 seconds."

**Frame the problem, not the tech:**
- BAD: "I built a PWA that interfaces with the city's 311 API"
- GOOD: "The city's 311 system works but it's painful to use on your phone.
  This makes it easy."

**Be transparent:**
- This is a volunteer project, not affiliated with the city
- Reports go to the official 311 system — same place they'd go if you did it yourself
- We don't collect personal info unless you choose to add it
- Everything submitted becomes a public record (same as using 311 directly)

**Show the value:**
- More reports = more visibility = more accountability = your street gets plowed
- You're not just complaining, you're creating an official record
- The city tracks these — volume matters

**Don't overpromise:**
- We can't guarantee the city will respond faster
- We're making it easier to report, not solving the plowing problem
- The app is new — there might be bugs, and that's okay

## Operational plan (Tuesday+)

You're the only operator. The flow is:
1. Reports come in via the PWA and land in Firestore
2. You open the dashboard at localhost:3311
3. Review each report — check the photo, address, category make sense
4. Hit "Submit to 311" to send it through Playwright automation
5. Monitor for automation failures (selectors can break if the portal changes)

### Cadence

- Check the dashboard every 30-60 minutes during the day
- Submit reports in small batches (5-10 at a time)
- Don't let the backlog grow too large — people expect relatively quick action
  (even though they won't know when it actually hits 311)

### Failure modes

- **Portal login expires**: The automation saves auth state between sessions,
  but if it expires mid-batch, you'll see failures. Just restart and re-login.
- **Address mismatch**: If ArcGIS reverse geocode returns a weird address, the
  automation falls back to typing into autocomplete. Check the dashboard for
  any reports where the address looks off.
- **Portal is down**: The city's portal has downtime. If automation fails
  repeatedly, just wait and retry later.
- **Burst of reports**: If the app takes off, you might get more reports than
  you can process one-by-one. That's a good problem. Batch-submit and prioritize
  unshoveled sidewalks (accessibility issue) over missed plowing.

## Consider for v2

- Softer/friendlier design language (the government-blue is fine but the badge
  and overall feel lean too official)
- Show report count or recent activity to build social proof ("142 reports
  filed today")
- Let users see their own submitted reports

## Success metrics

For a volunteer project launched during one storm, realistic success looks like:

- **10+ reports** on day one = proof of concept, real people used it
- **50+ reports** over the storm = meaningful data, worth continuing
- **Reddit post gets engagement** = awareness is growing
- **One media mention** = credibility boost for next storm
- **Zero angry users** = the transparency and expectations were set right

## After the storm

If the app gets any usage at all:
- Write a brief post-mortem (what worked, what broke, how many reports)
- Keep the app live for future storms
- Consider expanding beyond snow — pothole reporting, trash collection, etc.
- Think about whether to talk to the city directly — they might be interested
  in (or upset about) a project that makes 311 submissions easier
