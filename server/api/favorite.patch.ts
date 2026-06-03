// Edit an existing favorite ("quick add") food card.
export default defineEventHandler(async (event) => {
  const user = await getServerUser(event)
  if (!user) throw createError({ statusCode: 401 })

  const body = await readBody(event)

  const id = typeof body?.id === "string" ? body.id : ""
  if (!id) throw createError({ statusCode: 400, message: "id is required" })

  const food_name = typeof body?.food_name === "string" ? body.food_name.trim() : ""
  if (!food_name) throw createError({ statusCode: 400, message: "food_name is required" })

  const num = (v: any) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null

  const calories = num(body?.calories)
  if (calories === null) {
    throw createError({ statusCode: 400, message: "calories must be a non-negative number" })
  }

  const client = await getAuthedClient(event)
  const { data, error } = await client
    .from("favorite_foods")
    .update({
      food_name,
      grams: num(body?.grams),
      calories,
      protein_g: num(body?.protein_g) ?? 0,
      fat_g: num(body?.fat_g) ?? 0,
      carb_g: num(body?.carb_g) ?? 0,
    })
    .eq("id", id)
    .eq("user_id", user.id) // ownership guard (RLS also enforces this)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
