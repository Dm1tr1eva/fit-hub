import { createClient } from "@supabase/supabase-js"

// Hit by a Vercel Cron on a schedule (see vercel.json) so Supabase always sees
// recent activity and never auto-pauses the project for being idle.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const client = createClient(config.public.supabase.url, config.public.supabase.key)

  try {
    // Result/error intentionally ignored — even a permission-denied response
    // still reaches Postgres, which is all that's needed to reset the clock.
    await client.from("profiles").select("id").limit(1)
  } catch {}

  return { ok: true, pingedAt: new Date().toISOString() }
})
