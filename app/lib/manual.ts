// lib/manual.ts
//
// The staff manual: Markdown files in content/manual, rendered to HTML on
// the server. Each role sees only its own sections; admins see all of
// them, and the Technical section additionally asks for their password.
// The Markdown is ours (it lives in the repo), so its HTML is trusted.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { Marked } from "marked";
import type { StaffRole } from "./admin/staff-auth";

export type ManualSectionId = "admin" | "guests" | "artist" | "door" | "host" | "technical";

export const SECTION_TITLES: Record<ManualSectionId, string> = {
  admin: "Admin guide",
  guests: "What guests see",
  artist: "Artist guide",
  door: "Door guide",
  host: "Host guide",
  technical: "Technical",
};

// What each role can open (Technical is unlocked separately).
export const SECTIONS_BY_ROLE: Record<StaffRole, ManualSectionId[]> = {
  admin: ["admin", "guests", "artist", "door", "host"],
  artist: ["artist"],
  door: ["door"],
  host: ["host"],
};

export type RenderedSection = {
  id: ManualSectionId;
  title: string;
  html: string;
  toc: { id: string; text: string }[];
};

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function renderSection(id: ManualSectionId): Promise<RenderedSection> {
  const file = path.join(process.cwd(), "content", "manual", `${id}.md`);
  const md = await readFile(file, "utf8");
  const toc: { id: string; text: string }[] = [];
  const seen = new Map<string, number>();

  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading(token) {
        const inner = this.parser.parseInline(token.tokens);
        let hid = `${id}-${slug(token.text)}`;
        const n = seen.get(hid) ?? 0;
        seen.set(hid, n + 1);
        if (n) hid = `${hid}-${n + 1}`;
        if (token.depth === 2) toc.push({ id: hid, text: token.text.replace(/[`*_]/g, "") });
        return `<h${token.depth} id="${hid}">${inner}</h${token.depth}>\n`;
      },
      // Links leave the manual in a new tab; tables scroll sideways on phones.
      link(token) {
        const inner = this.parser.parseInline(token.tokens);
        return `<a href="${token.href}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
      },
      table(token) {
        const head = token.header.map((c) => `<th>${this.parser.parseInline(c.tokens)}</th>`).join("");
        const rows = token.rows.map((r) => `<tr>${r.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join("")}</tr>`).join("");
        return `<div class="ln-table"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
      },
    },
  });

  const html = marked.parse(md, { async: false }) as string;
  return { id, title: SECTION_TITLES[id], html, toc };
}
