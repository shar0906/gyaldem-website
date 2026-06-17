import { supabase } from "../lib/supabase";
import type { Event } from "../lib/supabase";
import EventsClient from "./EventsClient";

export const revalidate = 60;

export default async function EventsPage() {
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .in("status", ["upcoming", "past"])
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching events:", error);
  }

  const upcoming = (events || [])
    .filter((e: Event) => e.status === "upcoming")
    .sort((a: Event, b: Event) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const past = (events || [])
    .filter((e: Event) => e.status === "past")
    .sort((a: Event, b: Event) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return <EventsClient upcoming={upcoming} past={past} />;
}