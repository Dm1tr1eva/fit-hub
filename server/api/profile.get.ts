export default defineEventHandler(async (event) => {
  const user = await getServerUser(event)
  if (!user) throw createError({ statusCode: 401 })

  const client = await getAuthedClient(event)
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!data) {
    const { data: newProfile, error: insertError } = await client
      .from("profiles")
      .insert({ id: user.id })
      .select()
      .maybeSingle()
    if (insertError) throw createError({ statusCode: 500, message: insertError.message })
    return newProfile
  }
  return data
})
