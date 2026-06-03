// Manually add a food entry (no AI). Mirrors the food_logs shape used by the chat.
export default defineEventHandler(async (event) => {
  const user = await getServerUser(event)
  if (!user) throw createError({ statusCode: 401 })

  const body = await readBody(event)

  const food_name = typeof body?.food_name === "string" ? body.food_name.trim() : ""
  if (!food_name) throw createError({ statusCode: 400, message: "food_name is required" })

  const num = (v: any) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null

  const calories = num(body?.calories)
  if (calories === null) {
    throw createError({ statusCode: 400, message: "calories must be a non-negative number" })
  }

  const client = await getAuthedClient(event)

  // log_date = today in the user's timezone, so manual entries land on the same
  // day as chat-logged ones.
  const profile = await client
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle()
  const today = todayInTz(profile.data?.timezone ?? "Europe/Berlin")

  const { data, error } = await client
    .from("food_logs")
    .insert({
      user_id: user.id,
      log_date: today,
      raw_message: null,
      food_name,
      grams: num(body?.grams),
      calories,
      protein_g: num(body?.protein_g) ?? 0,
      carb_g: num(body?.carb_g) ?? 0,
      fat_g: num(body?.fat_g) ?? 0,
      assumption: null,
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
