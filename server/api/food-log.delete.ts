export default defineEventHandler(async (event) => {
  const user = await getServerUser(event)
  if (!user) throw createError({ statusCode: 401 })

  const body = await readBody(event)
  const id = body?.id
  if (!id) throw createError({ statusCode: 400, message: "id is required" })

  const client = await getAuthedClient(event)
  const { error } = await client
    .from("food_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { success: true }
})
