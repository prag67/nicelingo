// Ad tags for nicelingo.com — ALL DISABLED as of 2026-10-13: the launch
// is ad-free (decided after the Monetag/Adsterra trial). Nothing in the
// site loads any of these snippets; they are kept only so re-enabling a
// network later is a wiring change, not a dashboard archaeology dig.
// Monetag zones created 2026-10-13: In-Page Push 12021049, Vignette
// 12021056. Adsterra: native-banner placement cc566a16ba326b9eae73df4cd7bd6cce
// (adult categories off). The Monetag verification meta tag also remains
// in the page heads (src/routes/shell.ts, lesson.ts) — it loads nothing.
export const INPAGE_PUSH_ZONE = "12021049";
export const VIGNETTE_ZONE = "12021056";

export const INPAGE_PUSH_SNIPPET = `<script>(function(s){s.dataset.zone='${INPAGE_PUSH_ZONE}',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>`;

// Adsterra Native Banner (2:2 widget) on the course page. Unlike the
// network-triggered formats, this is a fixed slot: the container is on
// the page between units whether or not an advertiser fills it. Adult
// categories stay off in the Adsterra dashboard (no age gate on site).
export const ADSTERRA_NATIVE_CONTAINER_ID = "container-cc566a16ba326b9eae73df4cd7bd6cce";
export const ADSTERRA_NATIVE_SNIPPET = `<script async="async" data-cfasync="false" src="https://bicea.org/21/cc566a16ba326b9eae73df4cd7bd6cce"></script><div id="${ADSTERRA_NATIVE_CONTAINER_ID}"></div>`;

// Loaded only on the course page (the between-lessons hub): Monetag's
// vignette triggers on a following navigation click — e.g. tapping the
// next lesson — so it can appear between lessons but never during one.
// The player also injects it on the lesson-complete screen as a backup.
export const VIGNETTE_SNIPPET = `<script>(function(s){s.dataset.zone='${VIGNETTE_ZONE}',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>`;
