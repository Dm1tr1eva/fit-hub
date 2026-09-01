# Backlog

## Account switching (profile page)

Let a user switch between multiple logged-in accounts without fully signing out and back in each time.

Not quick — skipped for now. Why: the Supabase client (`useSupabaseClient()`) holds one active session at a time, and this app currently doesn't store more than that. A real switcher needs:
- A place to keep multiple accounts' sessions client-side (e.g. an array of `{ email, refresh_token }` in local storage), and a decision on how comfortable that is security-wise
- Swapping the active one via `supabase.auth.setSession()` instead of a fresh login
- UI for listing/adding/removing accounts on the profile page
- Handling a stored session whose refresh token has since expired

Reasonable next step when picked up: start with the simplest version — remember just the *email* of previously-used accounts (not tokens) to prefill the login form faster, before building full no-relogin switching.
