# Admin guide

Everything needed to run **gyaldemsocialclub.com/admin**. Ladies Night lives under its own tab, with its own menu: **Shows, Series, Clients, Approvals, Artists, Venues, Guests, Results, Bingo decks**.

Ladies Night runs as **series**: An Ode To Her (Gyal Dem's own, with a guest artist each show) and Please! A Ladies Night (presented by Where's Jeanie at Mangrove). Each series has its own page, logos, colors, and switches for what it uses. `/ladies-night` is the hub that lists them all.

## Before each show: the checklist

Work through this in order. Most steps take a minute once the venue and artist are set up.

1. **Series ready.** In **Series**, the series has its logos, cover photo, usual venue, and the right switches on.
2. **Venue ready.** In **Venues**, the restaurant has its **full address**, logo, website or Instagram, and OpenTable widget code.
3. **Artist ready** (People's Choice series only). In **Artists**, the artist is invited and their profile is **Approved**. Profile changes wait in **Approvals**.
4. **Create the show.** In **Shows**, click **+ New show** and pick the series (from a series tab it's picked for you). The show starts from the series' defaults; set the date, theme, sign-in page copy, and timing (see below).
5. **Set RSVP opens.** Until it's set and reached, the series page shows a countdown and no one can RSVP.
6. **Songs and ballot** (People's Choice only). The artist submits at least 10 songs; **publish the ballot** before voting opens.
7. **VIP.** Check **Offer VIP** if you're selling passes, set when sales close, and confirm the green "Stripe is live" note.
8. **Reminder email.** On by default. Check its status line says "Scheduled in Kit" in the week before the show.
9. **Bingo.** With **Bingo tonight** checked, the show needs a **Bingo deck**, or the host can't go live. Export the cards for Canva (see Bingo decks).
10. **Run of show.** Shows on the live page. Leave it blank to use the series' master run of show.
11. **Show-night staff.** Door and host logins invited from **Tools → Staff Tools**. A host login can be tied to one series.
12. **Table placards.** Printed once per series from **Series → Print table placard**; the QR never changes.

On show night, open **Door check-in ↗** and **Host console ↗** from the right side of the Ladies Night menu, or have your door and host staff log in on their own phones.

After the show, the client's **recap email** goes out on its own the next day (see Recap). For People's Choice shows, check that the **results email** went out in **Results**.

## Logging in and staff

Everyone logs in at **gyaldemsocialclub.com/admin** with their own email and password. What they see depends on their role:

| Role | Sees |
|---|---|
| **Admin** | All of Ladies Night, Events, and The Room. Can invite artist, door, and host logins |
| **Artist** | Their own Propose, Profile, and Results tabs |
| **Door** | Only the check-in screen, on show night |
| **Host** | Only the host console (live page, bingo, guest list), on show night. A host tied to a series sees only that series |

**Inviting staff:** open **Tools → Staff Tools**, enter their email and name, pick a role (and for a host, optionally the series), and click **Send Invite**. They get an email to set their password. Artists can also be invited from **Ladies Night → Artists**.

**Admins** can invite artist, door, and host logins.
<!-- - Only **super admins** can invite or change admins and super admins. An admin who enters the email of an existing admin gets a message instead of changing them. -->

**Forgot password:** send the invite again from Staff Tools. Someone who already has a login gets a password-reset email instead.

## Shows

The list on the left shows every show by date, series, and artist or theme, with its stage. The tabs above it filter by series.

| Stage | Means |
|---|---|
| **Coming soon** | RSVP hasn't opened (or no RSVP time is set) |
| **RSVP open** | Guests can RSVP (on series without voting, until the night is over) |
| **Voting open** | Guests can vote, once the ballot is published |
| **Voting closed** | Voting is over; the show is still ahead or tonight |
| **Past** / **Archived** | Done, or hidden |

Each series page (like `/ladies-night/an-ode-to-her` or `/ladies-night/please`) always shows that series' **next upcoming show** that isn't archived. A later show takes over the page the day after the current one. A series can have only one show per date.

### The side panel

The same for every series, and it stays in view while you scroll the editor:

- **Sign-in page:** the real page guests get, in a phone frame, drawn from what's in the editor right now. "Unsaved" shows next to it until you save.
- **Ready for the night:** a checklist (date and times, RSVP opens, venue address and logo, artist and ballot on People's Choice series, bingo deck, run of show, OpenTable, Stripe for VIP, the Kit reminder). ✕ needs fixing; ! is worth a look.
- **Links:** open the page and the live page, copy the share link, print the table placard.
- **Door QR:** on series with door check-in, the show's door QR to print ahead. It only works on the night.

### The show

- **Series:** which series the show belongs to. It can move to another series until someone RSVPs.
- **DJ / Music by** and **Theme:** optional. Shown on the sign-in page ("Music by …"), the summary, and the hub.
- **Artist** (People's Choice series): only active artists appear. You can book an artist whose profile isn't approved yet, but the ballot can't be published until it is. Changing the artist removes any songs the previous artist proposed for this show, and you'll be asked first. Once the ballot is published, the artist can't change the set.
- **Venue:** picks the restaurant. New shows start on the series' usual venue.
- **Date, Starts, Ends:** all times are **Eastern**.

### Sign-in page

The **Headline** and **Description** guests see on the sign-in page.

- **Cover photo (this show):** a photo just for this show, behind the RSVP form. Empty uses the artist's cover (People's Choice) or the series' cover. Create the show first, then upload.
- **Colors:** uncheck **Use the series' colors** to give one show its own main and accent colors (orange and black for Spooky Szn, say). The sign-in page, live page, hub card, and link preview all use them.
- **Flyer:** the same flyer as the show's Events page entry. Replacing it in either place replaces it in both. Saved with the show. Its focal point is set from the Events tab.

 The preview on the right uses the series' logos, cover photo, and colors (or the artist's, on People's Choice series) with this show's details.

### Timing (Eastern)

- **RSVP opens:** when the sign-in form appears. Before then, guests see a countdown.
- **Voting opens / Voting closes:** the People's Choice window. Leave them blank on a new show to use the suggested window.

If voting opens before you've published the ballot, guests can still RSVP but see no ballot, and the editor shows a red note until you publish.

### Show night

- **Bingo tonight:** 3 rounds, any line. When it's checked, pick the **Bingo deck** the host calls from. Until there's a deck, a red note shows here and the host's **We're live** button stays off. Unchecking it removes the deck from the show.
- **Run of show:** one item per line, with a 24-hour time in front if you like ("21:30 Bingo, round 1"). **Use the series default** copies the series' master run of show. Left blank, the live page uses the master. The host can change it and mark what's on now from the console.
- **Photo gallery link:** shown on the live page's recap after the night.

### OpenTable

Each show uses its **venue's** OpenTable widget automatically. Paste a code into this box only if one show needs its own, such as a special-event reservation. Clear the box to go back to the venue's.

### VIP

- **Offer VIP** turns the VIP step on for guests.
- **Price per pass**, **Total cap** (default 24), and **Perks** (shown as a checklist, separated by commas).
- Guests can buy up to **5 passes** per RSVP. Sales close at **Sales close** if you set it, otherwise **48 hours before the show**, or when the cap sells out. Payments go to Gyal Dem's Stripe for every series. Passes in an unpaid checkout are held for about 30 minutes, then released.
- The note under the VIP settings says whether Stripe is **live** (real payments), in **test mode**, or not set up. Never share the link while it says test mode.
- Stripe emails receipts. To refund, use the Stripe dashboard. A **full** refund marks the order refunded here automatically.

### Reminder email

One reminder per show, sent through Kit to everyone RSVP'd to that show.

- **On by default.** Uncheck it to skip this show's reminder.
- **Sends:** leave blank for **6 PM Eastern the evening before**, or pick another time.
- **Subject and Message** start with the default template. These fill in automatically: `{series}`, `{artist}`, `{dj}`, `{date}`, `{time}`, `{venue}`, `{link}` (the series page), and `{live}` (the live page). Kit's own `{{ subscriber.first_name }}` fills in each guest's first name. Leave a blank line between paragraphs. **Reset to the default template** undoes your edits.
- In the **week before** it sends, the reminder is handed to Kit and the status line reads **Scheduled in Kit**. Edits after that update Kit's copy within the hour. Unchecking it cancels the scheduled email.
- If the status line shows a reason instead, such as no guests tagged yet, it fixes itself once guests RSVP.

### Ballot

- Shows the artist's proposed songs in their order, with a count toward the **10** needed.
- **Copy from artist's last show** fills the ballot from their previous show.
- **Publish ballot** locks the list. It needs an approved artist, the artist change saved, and at least 10 songs. When it can't publish yet, the reason is shown under the button.
- After publishing, vote counts appear next to each song.

### Recap

Early the day after each show, the series' client gets a recap email (to the client's **Recap email**, copied to hello@gyaldemsocialclub.com): page visits, RSVPs, VIP passes, tables, check-ins, live page visits, and the bingo winners. The same numbers are at the top of the show in Shows ("Current stats" until the night is over). **Page visits** counts each phone or computer that opened the series page while this was the upcoming show, once per device, so it's people rather than reloads; compare it with RSVPs to see how many visitors signed up. Visits from before Oct 15, 2026 weren't counted. For Gyal Dem's own series it goes to hello@gyaldemsocialclub.com only.

### Archive

**Archive** hides a show from `/ladies-night` and the artist's dashboard. **Unarchive** brings it back.

### The Events page

Each Ladies Night show also appears on the site's **Events** page. Its title, description, date, and venue come from the show, so **make those edits in Ladies Night → Shows**. Edits made directly in the Events tab are replaced the next time the show is saved.

**Title, description, and flyer** are shared both ways: edit them in Shows or in the Events tab and the other updates. The date, venue, and RSVP link always come from the show.

**Flyer focal point:** in the Events tab, open the event and tap **Focal point** under the flyer. Click the part that should stay in view when the Events page crops it (wide card, phone card, past events thumbnail), then **Save focal point** and save the event. A new flyer starts centered. The Ladies Night sign-in cover is full-bleed and has no focal point.

The Events entry stays a **draft** until it's listed: People's Choice shows when you publish the ballot, other series on their own once RSVP opens (checked hourly, and whenever you save the show). To list it earlier, set its status to **Upcoming** in the Events tab; that status isn't overwritten.

## Approvals

Artists' profile changes wait here, and the Ladies Night tab shows a red count while any are waiting.

Each submission shows only what changed (old and new side by side) plus previews of the sign-in page and ballot as they'll look after approval.

- **Approve:** goes live right away.
- **Edit, then approve:** fix text or colors yourself, then approve. Photos and logos are changed from **Artists**.
- **Reject:** sends it back. Anything in the **Note** box is shown to the artist.

## Artists

Every artist with their login email, profile status, and upcoming bookings.

- **+ Invite artist:** sends the invite and creates their profile.
- **Edit profile:** change anything, including photos, logo, website, and colors. Your edits go live immediately and skip Approvals.
- **Changes waiting for review** links to Approvals.
- **Deactivate:** they can't log in or be booked; past shows and results stay. You'll be warned if they're still booked on an upcoming show, so you can reassign it in Shows.

## Venues

Restaurants that host Ladies Night. Venues don't log in; you manage them here.

- **Name:** shown to guests everywhere, including calendar invites.
- **Address:** enter the full street address. It's the location on guests' calendar invites ("Mangrove, 103 NW 1st Ave, Miami, FL 33128") and places the Google Maps pin when guests tap the venue.
- **Website / Instagram:** the venue's footer logo on the ballot page links to the website, or to Instagram if there's no website.
- **OpenTable widget code:** paste the code OpenTable gives the restaurant, or a link containing its restaurant ID. Every show at this venue uses it unless the show sets its own. The list shows **Widget saved** once it's in.
- **Logo:** save the venue first, then upload. PNG or WebP with a transparent background, up to 2 MB. It's shown in the footer of the dark guest pages, so light or white logos work best.
- **Hide** keeps a venue out of new shows without changing existing ones.

## Guests

Pick a show to see everyone RSVP'd, with totals: RSVPs, voted, tables reserved, VIP passes sold, sharing with the artist, and checked in.

| Column | Means |
|---|---|
| **Arrived via** | Gate (online), Door QR, or Door, typed in |
| **Voted** | Submitted People's Choice picks |
| **Table** | "Party of 4 · 7:30 PM" when booked through OpenTable on our page; "Reserved" when the guest tapped "I've reserved my table" |
| **VIP** | Paid passes |
| **Shares** | Agreed to share their name and email with the artist |
| **Checked in** | Time they arrived |

- **Export RSVPs (CSV)** includes party size, table time, and the OpenTable confirmation number.
- **Export VIP list** is the wristband list.

## Results

People's Choice results per show, with guests who voted, turnout, and average picks.

- While voting is open, results refresh every 15 seconds.
- Artists see their own results only after voting closes. Guests never see vote counts.
- **Results email:** within an hour after voting closes, the artist gets the top 10, with hello@gyaldemsocialclub.com copied. The status line shows when it was sent. **Send now** / **Resend** sends it again.
- **Export results (CSV)** downloads the full ranking.

## Series

Each series has its own page at `/ladies-night/<link>` and its own live page at `/ladies-night/<link>/live`.

- **Name, Link, Presented by** (a client, or Gyal Dem), **Usual venue**, tagline, and **Schedule note** (shown on the hub when there's no date yet).
- **What this series uses:** People's Choice + artist, VIP, OpenTable, Door check-in, Live page, Reminder email.
- **Bingo call delay:** seconds between the host tapping Called and guests seeing the line (5 by default).
- **Show defaults:** start and end times, bingo deck, and the **master run of show**. Every new show in the series starts with them; change them per show in Shows. A show with no run of show of its own uses the master on the live page.
- **Loading animation:** what guests see while the series' pages load: the spinning record (default) or the rose. On bingo nights the live page uses the bingo balls instead, and the bingo card shows them while guests wait for the first call and between rounds. Gyal Dem's own series (no client) also open with a curtain intro the first time a guest visits: the Gyal Dem logo, "presents", then the show's title, fading into the sign-in page. A tap skips it.
- **Order on the hub** and **Live on the site** (unchecked hides the series from the hub and its page).
- **Title logo, "Presents" line, Cover photo:** save the series first, then upload. Logos white on transparent PNG.
- **Print table placard ↗:** four QR placards per page, pointing at the series' live page.

Changing a link breaks any QR or post already shared, so set it once.

## Clients

Who presents a series, like Where's Jeanie.

- **Recap email** gets the numbers after each show.
- **Website / Instagram:** their footer logo links here.
- **Brand logo:** their own logo (not an event logo), white on transparent. Sits in the footer with the venue and Gyal Dem.

## Bingo decks

A shared library of decks. Any show in any series can use any deck.

- **Type:** **Match** (the host reads the phrase, and the same phrase is on the card) or **Callout → Answer** (the host reads a callout; the card shows the answer). Callout decks keep **song** and **artist** separately; **On the card** picks "Song by Artist" or "Artist only".
- **Add** lines one at a time, paste several, or **Import spreadsheet (CSV)**: phrases for Match decks; callout, song, artist for Callout decks. A header row is fine and lines already in the deck are skipped.
- **Switch off** keeps a line out of games without deleting it. Lines already called can't be deleted, only switched off.
- A 5×5 card needs at least **24 different squares**; the counter turns red below that.
- **Export for Canva:** pick how many cards (up to 300). Each row is one card with columns `card_no`, `r1c1`…`r5c5` (no center square; that's the logo) and `theme`. In Canva, open the card design, go to **Apps → Bulk create**, upload the file, and connect each square's text box to its column once.
- **Copy list** copies the numbered list for a "Bingo list" page. **Export deck** downloads everything.
- **Hide deck** keeps it out of the show picker.

## Staff Tools

Under **Tools** in the admin header:

- **Invite Staff:** see Logging in and staff above.
- **Sync Staff Metadata** (super admins): pushes names and roles to everyone's login profile in Supabase. Run it if a name or role looks out of date there.

The **Railway** and **Supabase** links in Tools appear for super admins only.

## Staff (super admins)

The **Staff** tab lists everyone with a staff login: their role, and when they last signed in, or **Invited, hasn't signed in yet**.

- **Change a role** with the dropdown. You'll be asked to confirm.
- **Remove access:** their login stops opening any staff screen right away. Removing an artist also deactivates their profile so they can't be booked; their past shows and results stay. To bring someone back, invite them again.
- Nobody can change or remove their own account, and the **last super admin can't be demoted or removed**. To hand over super admin, make someone else a super admin first.
