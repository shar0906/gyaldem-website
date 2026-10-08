# Admin guide

Everything needed to run **gyaldemsocialclub.com/admin**. Ladies Night lives under its own tab, with its own menu: **Shows, Approvals, Artists, Venues, Guests, Results, Bingo deck**.

## Before each show: the checklist

Work through this in order. Most steps take a minute once the venue and artist are set up.

1. **Venue ready.** In **Venues**, the restaurant has its logo, website or Instagram, and OpenTable widget code.
2. **Artist ready.** In **Artists**, the artist is invited and their profile is **Approved**. Profile changes wait in **Approvals**.
3. **Create the show.** In **Shows**, click **+ New show** and set the artist, venue, date, times, sign-in page copy, and timing (see below).
4. **Set RSVP opens.** Until it's set and reached, `/ladies-night` shows a "coming soon" page and no one can RSVP.
5. **Artist proposes songs.** The artist submits at least 10 from their dashboard. You can also click **Copy from artist's last show** to start from their previous ballot.
6. **Publish the ballot** before voting opens. Publishing also makes the show visible on the site's Events page.
7. **VIP.** Check **Offer VIP** if you're selling passes, and confirm the green "Stripe is live" note.
8. **Reminder email.** It's on by default. Check its status line says "Scheduled in Kit" in the week before the show.
9. **Bingo deck.** At least 24 different artists switched on, and the artist list exported for the cards.
10. **Show-night staff.** Door and host logins invited from **Tools → Staff Tools**.

On show night, open **Door check-in ↗** and **Bingo caller ↗** from the right side of the Ladies Night menu, or have your door and host staff log in on their own phones.

After the show, check that the **results email** went out in **Results**, and export the guest list from **Guests** if you need it.

## Logging in and staff

Everyone logs in at **gyaldemsocialclub.com/admin** with their own email and password. What they see depends on their role:

| Role | Sees |
|---|---|
| **Admin** | Everything, including this whole manual |
| **Artist** | Their own Propose, Profile, and Results tabs |
| **Door** | Only the check-in screen, on show night |
| **Host** | Only the bingo caller, on show night |

**Inviting staff:** open **Tools → Staff Tools**, enter their email and name, pick a role, and click **Send Invite**. They get an email to set their password. Artists can also be invited from **Ladies Night → Artists**.

**Forgot password:** send the invite again from Staff Tools. Someone who already has a login gets a password-reset email instead.

## Shows

The list on the left shows every show by date and artist, with its stage:

| Stage | Means |
|---|---|
| **Coming soon** | RSVP hasn't opened (or no RSVP time is set) |
| **RSVP open** | Guests can RSVP; voting hasn't started |
| **Voting open** | Guests can vote, once the ballot is published |
| **Voting closed** | Voting is over; the show is still ahead or tonight |
| **Past** / **Archived** | Done, or hidden |

`/ladies-night` always shows the **next upcoming show** that isn't archived. If you create a later show, it takes over the page the day after the current one.

### The show

- **Artist:** only active artists appear. You can book an artist whose profile isn't approved yet, but the ballot can't be published until it is. Changing the artist removes any songs the previous artist proposed for this show, and you'll be asked first. Once the ballot is published, the artist can't change the set.
- **Venue:** picks the restaurant. New shows start on your only active venue automatically.
- **Date, Starts, Ends:** all times are **Eastern**.

### Sign-in page copy

The **Headline** and **Description** guests see on the sign-in page. The phone preview on the right updates as you type, using the artist's cover photo and colors.

### Timing (Eastern)

- **RSVP opens:** when the sign-in form appears. Before then, guests see a countdown.
- **Voting opens / Voting closes:** the People's Choice window. Leave them blank on a new show to use the suggested window.

If voting opens before you've published the ballot, guests can still RSVP but see no ballot, and the editor shows a red note until you publish.

### OpenTable

Each show uses its **venue's** OpenTable widget automatically. Paste a code into this box only if one show needs its own, such as a special-event reservation. Clear the box to go back to the venue's.

### VIP

- **Offer VIP** turns the VIP step on for guests.
- **Price per pass**, **Total cap** (default 24), and **Perks** (shown as a checklist, separated by commas).
- Guests can buy up to **5 passes** per RSVP. Sales close **48 hours before the show**, or when the cap sells out. Passes in an unpaid checkout are held for about 30 minutes, then released.
- The note under the VIP settings says whether Stripe is **live** (real payments), in **test mode**, or not set up. Never share the link while it says test mode.
- Stripe emails receipts. To refund, use the Stripe dashboard. A **full** refund marks the order refunded here automatically.

### Reminder email

One reminder per show, sent through Kit to everyone RSVP'd to that show.

- **On by default.** Uncheck it to skip this show's reminder.
- **Sends:** leave blank for **6 PM Eastern the evening before**, or pick another time.
- **Subject and Message** start with the default template. These fill in automatically: `{artist}`, `{date}`, `{time}`, `{venue}`, `{link}`. Kit's own `{{ subscriber.first_name }}` fills in each guest's first name. Leave a blank line between paragraphs. **Reset to the default template** undoes your edits.
- In the **week before** it sends, the reminder is handed to Kit and the status line reads **Scheduled in Kit**. Edits after that update Kit's copy within the hour. Unchecking it cancels the scheduled email.
- If the status line shows a reason instead, such as no guests tagged yet, it fixes itself once guests RSVP.

### Ballot

- Shows the artist's proposed songs in their order, with a count toward the **10** needed.
- **Copy from artist's last show** fills the ballot from their previous show.
- **Publish ballot** locks the list. It needs an approved artist, the artist change saved, and at least 10 songs. When it can't publish yet, the reason is shown under the button.
- After publishing, vote counts appear next to each song.

### Archive

**Archive** hides a show from `/ladies-night` and the artist's dashboard. **Unarchive** brings it back.

### The Events page

Each Ladies Night show also appears on the site's **Events** page. Its title, description, date, and venue come from the show, so **make those edits in Ladies Night → Shows**. Edits made directly in the Events tab are replaced the next time the show is saved.

The Events entry stays a **draft** until you publish the ballot. To list it earlier, set its status to **Upcoming** in the Events tab; that status isn't overwritten.

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
- **Address:** used only to place the Google Maps pin when guests tap the venue. Guests see the name, not the address.
- **Website / Instagram:** the venue's footer logo on the ballot page links to the website, or to Instagram if there's no website.
- **OpenTable widget code:** paste the code OpenTable gives the restaurant, or a link containing its restaurant ID. Every show at this venue uses it unless the show sets its own. The list shows **Widget saved** once it's in.
- **Logo:** save the venue first, then upload. PNG or WebP with a transparent background, up to 2 MB. It's shown on the dark ballot page, so light or white logos work best.
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

## Bingo deck

The lines the host reads aloud. Each line has the **song** and the **artist**, and the artist is the answer printed on the bingo cards.

- **Add** one line at a time, or **Import spreadsheet (CSV)** with three columns: line, song, artist. A header row is fine, lines already in the deck are skipped, and problem rows are listed by row number. Up to 500 rows per file.
- **Switch off** keeps a line out of games without deleting it. Lines already called in a game can't be deleted, only switched off.
- **Export artists for cards** gives your card printer the list of answers. A 5×5 card needs at least **24 different artists**; the counter turns red below that.
- **Export deck** downloads everything.

## Staff Tools

Under **Tools** in the admin header:

- **Invite Staff:** see Logging in and staff above.
- **Sync Staff Metadata:** pushes names and roles to everyone's login profile. Run it if a name or role looks out of date.
