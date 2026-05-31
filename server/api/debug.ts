export default defineEventHandler(async (event) => {
  const user = await getServerUser(event)
  const client = await getAuthedClient(event)

  let profileResult = null
  let tablesResult = null
  if (user) {
    const r1 = await client.from("profiles").select("*").eq("id", user.id).maybeSingle()
    profileResult = { data: r1.data, error: r1.error?.message, code: r1.error?.code }

    // try also food_logs
    const r2 = await client.from("food_logs").select("count").limit(1)
    tablesResult = { error: r2.error?.message, code: r2.error?.code }
  }

  return {
    hasUser: !!user,
    userId: user?.id,
    profileResult,
    tablesResult,
  }
})
