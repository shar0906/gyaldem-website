# Technical

How the site is put together, where every setting lives, and what to check when something breaks. Super admins only.

## The pieces

| Service | Does | Where to manage it |
|---|---|---|
| **Railway** | Hosts the site; holds all secret settings | railway.com project → service → Variables |
| **Supabase** | Database, logins, photo storage, scheduled jobs | supabase.com, project `xuobimjrtzstgwvumckt` |
| **Cloudflare** | Domain and DNS, including the www redirect | Cloudflare → gyaldemsocialclub.com |
| **Stripe** | VIP payments, receipts, refunds | Stripe dashboard (Sandbox and live) |
| **Kit** | Mailing list, guest tags, reminder emails | app.kit.com |
| **Google Workspace** | Sends invites, password resets, and results emails | Google Admin; app passwords per service |
| **OpenTable** | Table reservations | Owned by each restaurant |

## Railway variables

Set in Railway → service → **Variables**. After changing any, Railway redeploys. Never paste these values anywhere else.

| Variable | What it's for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Connect the site to Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side database access. Full access; guard it |
| `NEXT_PUBLIC_SITE_URL` | `https://gyaldemsocialclub.com`, used in links, QR codes, and emails |
| `LN_GUEST_SECRET` | Signs the "remembered device" cookie. Changing it logs every guest's phone out (their RSVPs stay) |
| `CRON_SECRET` | Lets the Supabase scheduled jobs call the site. Must match the secret stored in Supabase Vault |
| `STRIPE_MODE` | `test` or `live`: which key new checkouts use |
| `STRIPE_SECRET_KEY_TEST`, `STRIPE_SECRET_KEY_LIVE` | Stripe secret keys |
| `STRIPE_WEBHOOK_SECRET_TEST`, `STRIPE_WEBHOOK_SECRET_LIVE` | Signing secrets of the Sandbox and live webhook endpoints |
| `KIT_API_KEY`, `KIT_API_SECRET` | Kit V3: newsletter signup and guest tagging |
| `KIT_FORM_ID`, `KIT_MEMBERSHIP_FORM_ID` | Kit forms for the newsletter and membership applications |
| `GOOGLE_SHEETS_WEBHOOK_URL` | Sends brand and membership form responses to the Google Sheet |
| `KIT_API_KEY_V4` | Kit V4: schedules reminder emails. Without it, reminders skip quietly |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Google Workspace sending for results emails. `smtp.gmail.com`, `587`, the Workspace login, its app password, and `Gyal Dem Social Club <hello@gyaldemsocialclub.com>` |
| `RESULTS_RECORD_EMAIL` | Optional. Who's copied on results emails; defaults to hello@gyaldemsocialclub.com |
| `ADMIN_PASSWORD` | No longer used (logins replaced the shared password). Safe to delete |

## Stripe

**Test vs live.** Both sets of keys sit in Railway at once. `STRIPE_MODE` picks which one new checkouts use. Webhooks from both endpoints are always accepted, so test refunds still update test orders after you go live. Admin → Shows → VIP shows which mode is on.

**Webhook endpoints.** One in Sandbox and one in live mode, both at `https://gyaldemsocialclub.com/api/stripe/webhook`, each with these events:
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`.

**Testing.** In test mode, pay with card `4242 4242 4242 4242`, any future date, any CVC. The order should show as paid within seconds.

**Refunds.** Refund in the Stripe dashboard. A full refund marks the order refunded on the site; a partial refund keeps the passes.

**Clearing test orders** before launch, in the Supabase SQL Editor (only touches Sandbox checkouts):

```sql
delete from ln_vip_orders where stripe_checkout_session_id like 'cs_test_%';
```

## Scheduled jobs

Two hourly jobs run in Supabase (Integrations → Cron):

| Job | When | Does |
|---|---|---|
| `ln-kit-worker` | Top of each hour | Tags new guests in Kit, then schedules or updates show reminders |
| `ln-results-mail` | 5 past each hour | Emails results for shows whose voting just closed (looks back 2 weeks) |

**Run one now:** Supabase → Integrations → Cron → the job → **Run now**. Useful right before a Kit broadcast so the latest RSVPs are tagged.

**Check they're working:**

```sql
select status_code, content, created from net._http_response order by created desc limit 5;
```

`200` is good. `401` means `CRON_SECRET` in Railway doesn't match the one in Supabase Vault. `404` means the site doesn't have the latest code deployed.

## Kit

Every RSVP gets three tags, so you can email exactly the right people:

| Tag | Who |
|---|---|
| `Ladies Night` | Everyone who's ever RSVP'd |
| `Ladies Night 2026-11-04` | That show's guests (the reminder goes here) |
| `Ladies Night artist: Kayland` | That artist's audience |

Tags are added within the hour. Failed sends retry with growing waits for about a day.

Reminder emails are created in Kit as scheduled broadcasts; you'll see them under Broadcasts. Edit them from Ladies Night → Shows, not in Kit, or the site will overwrite your Kit edits.

## Supabase

**Database changes**, in the order they were run. A fresh copy of the site needs all of them, in this order:

1. `2026-10-04_ln_multi_artist_phase1.sql`
2. `2026-10-05_ln_phase1b_bingo_caller.sql`
3. `2026-10-05_ln_phase1c_results_email.sql`
4. `2026-10-05_ln_phase2_cleanup.sql`
5. `2026-10-06_ln_phase3_venues_logos.sql`
6. `2026-10-06_ln_phase4_reminders.sql`
7. `2026-10-06_ln_phase5_opentable_details.sql`
8. `2026-10-05_ln_cron_schedule_v2.sql` (needs pg_cron and pg_net turned on under Database → Extensions)
9. `2026-10-08_ln_phase6_super_admin.sql` (with your login email filled in)

**Photo storage:** artist photos and logos in the `artist-photos` bucket; venue logos in `ln-brand`. Both are public to read; uploads only go through the site.

**Security:** every Ladies Night table is locked to the server. The public key can't read guests, votes, or orders.

**Roles** live in the `ln_staff` table. The database refuses to demote or delete the last super admin. If you're ever locked out of the super admin role, promote yourself in the SQL Editor:

```sql
update ln_staff set role = 'super_admin' where email = 'you@example.com';
```

## Email

- Invites and password resets come from Supabase's email settings (Authentication → SMTP), using a Google Workspace app password.
- Results emails come from the site, using the `SMTP_*` variables and a **separate** app password. Revoking one doesn't stop the other.
- App passwords are only shown once. If one's lost, create a new one at myaccount.google.com/apppasswords and update wherever it's used.
- The domain's SPF, DKIM, and DMARC records are in Cloudflare DNS. Keep one DMARC record only.

## Domain

Cloudflare → Rules → Redirect Rules → **www redirect** sends `www.` to the bare domain while keeping the rest of the address:

- Hostname equals `www.gyaldemsocialclub.com`
- Dynamic redirect to `concat("https://gyaldemsocialclub.com", http.request.uri.path)`, status 301, preserve query string on.

The `www` DNS record must be **Proxied** (orange cloud) for the rule to run.

## OpenTable

- The restaurant ID sits inside the venue's OpenTable widget code (`rid=…`). The site reads it from there.
- Booking opens OpenTable's own booking page over `/ladies-night`, pre-set to the show's date, start time, and party size.
- When a guest books, OpenTable tells the page (a `reservation-made` message with the confirmation number, party size, and time). The site trusts it only from opentable.com, for the venue's restaurant ID, and on the show's date.
- An OpenTable "Access Denied" page comes from their bot protection, usually after many searches in a short time. It clears on its own. Guests can always use **Open OpenTable instead**.

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| `/ladies-night` shows "coming soon" | No RSVP opens time, or it's in the future | Set it in Shows |
| No ballot while voting is open | Ballot not published | Publish it in Shows |
| VIP missing | Within 48 hours of the show, sold out, or Offer VIP off | Expected; or check the show's VIP settings |
| VIP order stuck on pending | Stripe webhook not reaching the site | Stripe → Webhooks → the endpoint → Event deliveries; fix the URL or secret, then Resend |
| Guest back on the sign-in page after paying | Paid on a different address (www vs bare) | Signing in with "Already RSVP'd?" finishes it; keep the www redirect in place |
| Reminder not scheduled | More than a week out, no guests tagged yet, or `KIT_API_KEY_V4` missing | Read the status line in Shows |
| Results email didn't send | `SMTP_*` settings missing or app password revoked | Results shows the error; fix it, then Resend |
| Events page shows two dates | Older save | Open the show in Shows and Save once |
| Scheduled job `401` / `404` | Secret mismatch / old code | See Scheduled jobs |
| Many guests suddenly "logged out" | `LN_GUEST_SECRET` changed | Expected; they use "Already RSVP'd?" |

## Going live checklist

1. `STRIPE_MODE` set to `live`, with the live key and live webhook secret in Railway. Shows → VIP says "Stripe is live."
2. Test VIP orders deleted (query above) and your test RSVPs removed.
3. Test artist deactivated in Artists.
4. Venue has its OpenTable code; the show's reserve step opens on the right date.
5. Both scheduled jobs returning `200`.
6. Reminder status reads "Scheduled in Kit" in the week before the show.
