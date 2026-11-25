// Tags for data kept in Next's data cache between requests (unstable_cache),
// so the server actions that change that data can drop the cached copy with
// updateTag() and the next page shows the change straight away.
//
// Only data that changes rarely and is the same for everyone belongs here:
// every cached read saves a round trip from the Singapore functions to the
// Tokyo database.
export const CACHE_TAGS = {
  // Ticker notices and pop-up ads, read by the layouts on every page.
  announcements: "announcements",
  // Grade and subject names, the options on most admin forms.
  masterData: "master-data",
} as const;
