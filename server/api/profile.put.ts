export default defineEventHandler(async (event) => {
  const user = await getServerUser(event)
  if (!user) throw createError({ statusCode: 401 })

  const body = await readBody(event)
  const goals = body.daily_calorie_goal && body.daily_calorie_goal > 0
    ? (() => {
        const kcal = body.daily_calorie_goal
        const protein = body.daily_protein_g ?? Math.round(body.weight_kg * 1.8)
        const fat = body.daily_fat_g ?? Math.round((kcal * 0.25) / 9)
        const carb = body.daily_carb_g ?? Math.round((kcal - protein * 4 - fat * 9) / 4)
        return { daily_calorie_goal: kcal, daily_protein_g: protein, daily_fat_g: fat, daily_carb_g: carb }
      })()
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
