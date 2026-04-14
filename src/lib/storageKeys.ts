// Centralized storage key constants.
// Every sessionStorage / localStorage key used by the app lives here
// so typos are caught at compile time and keys are easy to find/rename.

// ── localStorage ──────────────────────────────────────────────────
export const LS_ONBOARDING_DONE = 'sweetspots_onboarding_done';
export const LS_IMPORT_TIP_DISMISSED = 'sweetspots_import_tip_dismissed';
export const LS_LOCAL_TRIPS = 'sweetspots_local_trips';
export const LS_LOCAL_ITINERARIES = 'sweetspots_local_itineraries'; // legacy, migrated to LS_LOCAL_TRIPS

/** User-scoped onboarding key */
export const lsOnboardingKey = (userId: string) => `sweetspots_onboarding_done_${userId}`;

/** User-scoped recommendations cache key */
export const lsRecsCache = (userId: string) => `recs_cache_${userId}`;

// ── sessionStorage ────────────────────────────────────────────────
export const SS_FREE_ACTIONS = 'sweetspots_free_actions';
export const SS_CACHED_LOCATION = 'sweetspots_cached_location';
export const SS_SEARCH_CACHE = 'sweetspots_search_cache';
export const SS_SUMMARY_CACHE = 'sweetspots_summary_cache';
export const SS_FEEDBACK_SHOWN = 'sweetspots_feedback_shown';
export const SS_RESUME_TRIP = 'sweetspots_resume_trip';
export const SS_CACHE_VERSION = 'sweetspots_cache_version';
export const SS_CACHED_MOOD = 'sweetspots_cached_mood';
export const SS_BOARD_TO_TRIP = 'sweetspots_board_to_trip';
