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

  async function loadToday(userId: string) {
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
  }

  function updateAfterChat(userId: string) {
    loadToday(userId)
  }

  return { totals, dailyGoal, dailyProtein, dailyFat, dailyCarb, todayMeals, loadToday, updateAfterChat }
})
