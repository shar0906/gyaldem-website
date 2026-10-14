// app/api/admin/ladies-night/series/[id]/placard/route.ts
//
// GET -> a printable table placard for a series: its logos and a QR code
// to its live page (/ladies-night/<slug>/live). The link never changes,
// so placards are printed once and reused every night. Admin-only. Opens
// as a page; print it from the browser (four per letter sheet).

import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../../lib/admin/staff-auth";
import { getClient, getSeriesById, livePath } from "../../../../../../lib/ln/series";
import { siteUrl } from "../../../../../../lib/ln/site";

type Params = { params: Promise<{ id: string }> };

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;
  const db = serviceClient();
  const series = await getSeriesById(db, id);
  if (!series) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const client = await getClient(db, series.client_id);
  const { data: venue } = series.default_venue_id
    ? await db.from("ln_venues").select("name, logo_url").eq("id", series.default_venue_id).maybeSingle<{ name: string; logo_url: string | null }>()
    : { data: null };

  const url = `${siteUrl()}${livePath(series.slug)}`;
  const qr = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#0A0A0A", light: "#FFFFFF" } });
  const deep = series.primary_color ?? "#6E1420";
  const title = series.title_logo_url
    ? `<img class="title" src="${esc(series.title_logo_url)}" alt="${esc(series.name)}">`
    : `<div class="title-text">${esc(series.name)}</div>`;
  const presents = series.presents_logo_url ? `<img class="presents" src="${esc(series.presents_logo_url)}" alt="">` : "";
  const brands = [
    client?.logo_url ? `<img src="${esc(client.logo_url)}" alt="${esc(client.name)}">` : "",
    venue?.logo_url ? `<img src="${esc(venue.logo_url)}" alt="${esc(venue.name)}">` : "",
    `<img src="/gyaldem_red_wl_transparent.png" alt="Gyal Dem">`].join("");

  const card = `
    <section class="card">
      ${presents}
      ${title}
      <div class="qr">${qr}</div>
      <p class="lead">Scan for tonight&rsquo;s live page</p>
      <p class="sub">Bingo calls, updates, and winners</p>
      <div class="brands">${brands}</div>
    </section>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(series.name)} placard</title>
<style>
  @page { size: letter; margin: 0.4in; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; background: #ddd; }
  .bar { padding: 12px 16px; background: #0A0A0A; color: #fff; display: flex; gap: 12px; align-items: center; font-size: 14px; }
  .bar button { background: #8B1A1A; color: #fff; border: 0; padding: 10px 14px; letter-spacing: .1em; text-transform: uppercase; font-size: 11px; cursor: pointer; }
  .sheet { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3in; padding: 0.3in; max-width: 8.5in; margin: 0 auto; background: #fff; }
  .card { background: ${esc(deep)}; color: #FBF3EC; border-radius: 14px; padding: 0.25in; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; break-inside: avoid; height: 4.6in; justify-content: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .presents { height: 16px; max-width: 80%; object-fit: contain; }
  .title { height: 0.95in; max-width: 90%; object-fit: contain; }
  .title-text { font-family: Georgia, serif; font-style: italic; font-weight: 700; font-size: 24px; }
  .qr { background: #fff; padding: 8px; border-radius: 10px; width: 1.9in; height: 1.9in; margin-top: 6px; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .lead { margin: 6px 0 0; font-family: Georgia, serif; font-style: italic; font-size: 17px; font-weight: 700; }
  .sub { margin: 0; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; opacity: .85; }
  .brands { display: flex; gap: 14px; align-items: center; margin-top: 6px; }
  .brands img { height: 26px; max-width: 90px; object-fit: contain; }
  @media print { body { background: #fff; } .bar { display: none; } .sheet { padding: 0; } }
</style></head><body>
<div class="bar"><button onclick="window.print()">Print</button><span>${esc(url)}</span></div>
<div class="sheet">${card}${card}${card}${card}</div>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
}
