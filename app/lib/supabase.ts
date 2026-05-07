import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Event = {
    id: string;
    name: string;
    description: string | null;
    date: string;
    end_date: string | null;
    location: string | null;
    rsvp_link: string | null;
    flyer_url: string | null;
    event_type: "ladies-night" | "cultural-experience" | "community" | "installation" | "other";
    status: "draft" | "upcoming" | "past";
    created_at: string;
    updated_at: string;
};