// lib/ln/mailer.ts
//
// Sends site email (results emails) through Google Workspace SMTP, the
// same account Supabase uses for invites.
//
// Env:
//   SMTP_HOST   smtp.gmail.com
//   SMTP_PORT   587
//   SMTP_USER   the Workspace login the app password belongs to
//   SMTP_PASS   that account's app password
//   SMTP_FROM   e.g.  Gyal Dem Social Club <hello@gyaldemsocialclub.com>
//               (must be that account or a verified "Send mail as" alias)

import nodemailer from "nodemailer";

type Mail = { to: string[]; cc?: string[]; subject: string; html: string; text: string };

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;

export function mailerConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}

export async function sendMail(mail: Mail): Promise<void> {
  if (!mailerConfigured()) throw new Error("SMTP settings are missing (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM)");
  const port = Number(process.env.SMTP_PORT ?? 587);
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: mail.to,
    cc: mail.cc,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
}
