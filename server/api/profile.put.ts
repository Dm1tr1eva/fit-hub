export default defineEventHandler(async (event) => {
  const user = await getServerUser(event)
  if (!user) throw createError({ statusCode: 401 })

  const body = await readBody(event)
  const goals = body.daily_calorie_goal && body.daily_calorie_goal > 0
    ? {
        daily_calorie_goal: body.daily_calorie_goal,
        daily_protein_g: body.daily_protein_g ?? Math.round(body.weight_kg * 1.8),
        daily_fat_g: body.daily_fat_g ?? Math.round((body.daily_calorie_goal * 0.25) / 9),
        daily_carb_g: body.daily_carb_g ?? 0,
      }
    : calcDailyGoals(body)

  const client = await getAuthedClient(event)
  const { data, error } = await client
    .from("profiles")
    .upsert({
      id: user.id,
      ...body,
      ...goals,
      updated_at: new Date().toISOString(),
    })
    .select()
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
