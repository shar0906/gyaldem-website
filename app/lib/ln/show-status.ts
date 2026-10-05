// lib/ln/show-status.ts
//
// One place that decides what stage a show is in, so the admin list, the
// ballot page, and check-in all agree.

import { todayEastern } from "./dates";

export type ShowStage =
  | "archived"
  | "past"
  | "coming_soon" // RSVP hasn't opened (or no RSVP time set yet)
  | "rsvp_open" // RSVP open, voting not open yet
  | "voting_open"
  | "voting_closed"; // voting over, show still upcoming or today

export type StageInput = {
  archived: boolean;
  event_date: string;
  rsvp_opens_at: string | null;
  voting_opens_at: string;
  voting_closes_at: string;
};

export function showStage(show: StageInput, now: Date = new Date()): ShowStage {
  if (show.archived) return "archived";
  if (show.event_date < todayEastern(now)) return "past";
  const t = now.getTime();
  if (!show.rsvp_opens_at || t < new Date(show.rsvp_opens_at).getTime()) return "coming_soon";
  if (t < new Date(show.voting_opens_at).getTime()) return "rsvp_open";
  if (t < new Date(show.voting_closes_at).getTime()) return "voting_open";
  return "voting_closed";
}
