// Single source of truth for Join/Apply form copy.
// Used by both JoinBanner (app/events, app/gallery) and JoinTheClub (homepage).
// Update copy here — both components will pick it up automatically.

export const joinCopy = {
  headline: "the room is better with you in it.",
  subhead:
    "Pick your path in. Join the Guest List for the open stuff, or put your name in for membership and ambassador roles — we'll reach out when a spot opens.",

  paths: {
    mailing: {
      label: "The Guest List",
      description:
        "Community updates and open event invites, straight to your inbox.",
    },
    membership: {
      label: "Membership Interest",
      description:
        "Get on the list — we'll follow up when membership applications open.",
    },
    ambassador: {
      label: "Brand Ambassador",
      description:
        "You're already putting us on in your circle — let's make it official. No pressure, just love.",
    },
  },

  buttons: {
    mailingIdle: "Join List",
    mailingIdleLong: "Join the Guest List",
    defaultIdle: "Count Me In",
    loading: "...",
    loadingLong: "Registering...",
  },

  success: {
    heading: "you're in. ✓",
    mailing: "Welcome to the Guest List. Check your inbox shortly for our community welcome email.",
    mailingShort: "Welcome to the Guest List.",
    other: "Your request is in. Check your inbox in a few to confirm your email — we'll follow up from there.",
    otherShort: "Check your inbox in a few — we'll follow up from there.",
  },

  error: "Something went wrong. Email us at hello@gyaldemsocialclub.com",
};

export type PublicChoice = keyof typeof joinCopy.paths;