export const useCalorieStore = defineStore("calories", () => {
  const totals = ref<{
    kcal: number
    protein: number
    carb: number
    fat: number
  } | null>(null)

  const dailyGoal = ref<number | null>(null)
  const dailyProtein = ref<number>(0)
  const dailyFat = ref<number>(0)
  const dailyCarb = ref<number>(0)
  const todayMeals = ref<any[]>([])
  const weekData = ref<{ date: string; kcal: number }[]>([])
  // Meals for a non-today day selected from the week chart.
  const dayMeals = ref<any[]>([])

  // Whether each dataset has loaded at least once (for first-paint skeletons).
  const todayLoaded = ref(false)
  const weekLoaded = ref(false)

  // In-flight promises so concurrent calls share one request (stale-while-revalidate:
  // we never clear existing state — it stays visible while a refresh runs in the
  // background and is overwritten only on success).
  let todayInflight: Promise<void> | null = null
  let weekInflight: Promise<void> | null = null

  async function loadToday(userId: string) {
    if (todayInflight) return todayInflight

    todayInflight = (async () => {
      const client = useSupabaseClient()
      const today = new Date().toISOString().split("T")[0]

      const [logsRes, profileRes] = await Promise.all([
        client
          .from("food_logs")
          .select("*")
          .eq("user_id", userId)
          .eq("log_date", today)
          .order("created_at", { ascending: false }),
        client
          .from("profiles")
          .select("daily_calorie_goal, daily_protein_g, daily_fat_g, daily_carb_g")
          .eq("id", userId)
          .maybeSingle(),
      ])

      if (logsRes.data) {
        todayMeals.value = logsRes.data
        totals.value = {
          kcal: logsRes.data.reduce((s: number, r: any) => s + (r.calories ?? 0), 0),
          protein: logsRes.data.reduce((s: number, r: any) => s + (r.protein_g ?? 0), 0),
          carb: logsRes.data.reduce((s: number, r: any) => s + (r.carb_g ?? 0), 0),
          fat: logsRes.data.reduce((s: number, r: any) => s + (r.fat_g ?? 0), 0),
        }
      }
      if (profileRes.data) {
        dailyGoal.value = profileRes.data.daily_calorie_goal
        dailyProtein.value = profileRes.data.daily_protein_g ?? 0
        dailyFat.value = profileRes.data.daily_fat_g ?? 0
        dailyCarb.value = profileRes.data.daily_carb_g ?? 0
      }
      todayLoaded.value = true
    })().finally(() => {
      todayInflight = null
    })

    return todayInflight
  }

  async function loadWeek(userId: string) {
    if (weekInflight) return weekInflight

    weekInflight = (async () => {
      const client = useSupabaseClient()
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 6)
      const weekAgoStr = weekAgo.toISOString().split("T")[0]

      const { data } = await client
        .from("food_logs")
        .select("log_date, calories")
        .eq("user_id", userId)
        .gte("log_date", weekAgoStr)
        .order("log_date")

      if (data) {
        const grouped: Record<string, number> = {}
        for (const row of data) {
          grouped[row.log_date] = (grouped[row.log_date] ?? 0) + (row.calories ?? 0)
        }
        weekData.value = Object.entries(grouped).map(([date, kcal]) => ({ date, kcal }))
      }
      weekLoaded.value = true
    })().finally(() => {
      weekInflight = null
    })

    return weekInflight
  }

  /** Load meals for a specific day (for browsing past days in the week chart). */
  async function loadDay(userId: string, date: string) {
    const client = useSupabaseClient()
    const { data } = await client
      .from("food_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("log_date", date)
      .order("created_at", { ascending: false })
    dayMeals.value = data ?? []
  }

  /** Refresh everything that can change after logging food. */
  function updateAfterChat(userId: string) {
    loadToday(userId)
    loadWeek(userId)
  }

  return {
    totals,
    dailyGoal,
    dailyProtein,
    dailyFat,
    dailyCarb,
    todayMeals,
    weekData,
    dayMeals,
    todayLoaded,
    weekLoaded,
    loadToday,
    loadWeek,
    loadDay,
    updateAfterChat,
  }
})
