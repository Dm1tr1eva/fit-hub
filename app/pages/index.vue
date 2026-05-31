<script setup lang="ts">
const store = useCalorieStore()
const user = useSupabaseUser()

onMounted(() => {
  if (user.value?.sub) store.loadToday(user.value.sub)
})

const radius = 90
const circumference = 2 * Math.PI * radius

const remaining = computed(() => {
  if (!store.dailyGoal || !store.totals) return store.dailyGoal ?? 0
  return Math.max(0, store.dailyGoal - store.totals.kcal)
})

const progress = computed(() => {
  if (!store.dailyGoal || !store.totals) return 0
  return Math.min(1, store.totals.kcal / store.dailyGoal)
})

const dashOffset = computed(() => circumference * (1 - progress.value))

const macroDetails = computed(() => {
  if (!store.totals || !store.dailyGoal) return []
  return [
    {
      label: "Белки",
      current: store.totals.protein,
      goal: store.dailyProtein,
      color: "bg-blue-500",
    },
    {
      label: "Жиры",
      current: store.totals.fat,
      goal: store.dailyFat,
      color: "bg-yellow-500",
    },
    {
      label: "Углеводы",
      current: store.totals.carb,
      goal: store.dailyCarb,
      color: "bg-green-500",
    },
  ]
})

const weekData = ref<{ date: string; kcal: number }[]>([])
const supabase = useSupabaseClient()

async function loadWeek() {
  if (!user.value?.sub) return
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 6)
  const weekAgoStr = weekAgo.toISOString().split("T")[0]

  const { data } = await supabase
    .from("food_logs")
    .select("log_date, calories")
    .eq("user_id", user.value.sub)
    .gte("log_date", weekAgoStr)
    .order("log_date")

  if (data) {
    const grouped: Record<string, number> = {}
    for (const row of data) {
      grouped[row.log_date] = (grouped[row.log_date] ?? 0) + (row.calories ?? 0)
    }
    weekData.value = Object.entries(grouped).map(([date, kcal]) => ({
      date,
      kcal,
    }))
  }
}

async function deleteMeal(id: string) {
  const supabase = useSupabaseClient()
  await supabase.from("food_logs").delete().eq("id", id)
  if (user.value?.sub) store.loadToday(user.value.sub)
  loadWeek()
}

onMounted(loadWeek)

const maxWeekKcal = computed(() => Math.max(...weekData.value.map((d) => d.kcal), 1))
</script>

<template>
  <div class="p-4 max-w-md mx-auto space-y-6">
    <h1 class="text-2xl font-bold">Прогресс</h1>

    <div class="flex flex-col items-center">
      <svg width="220" height="220" class="-rotate-90">
        <circle
          cx="110" cy="110" :r="radius"
          fill="none" stroke="#e5e7eb" stroke-width="12"
        />
        <circle
          cx="110" cy="110" :r="radius"
          fill="none" stroke="#3b82f6" stroke-width="12"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
          class="transition-all duration-500"
        />
      </svg>
      <div class="absolute mt-20 text-center">
        <p class="text-3xl font-bold">{{ remaining }}</p>
        <p class="text-gray-500">из {{ store.dailyGoal ?? 0 }} ккал</p>
      </div>
    </div>

    <div class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <div v-for="macro in macroDetails" :key="macro.label">
        <div class="flex justify-between text-sm mb-1">
          <span>{{ macro.label }}</span>
          <span>{{ macro.current }} / {{ macro.goal }} г</span>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-3">
          <div
            class="h-3 rounded-full transition-all"
            :class="macro.color"
            :style="{ width: Math.min(100, (macro.current / macro.goal) * 100) + '%' }"
          />
        </div>
      </div>
    </div>

    <div>
      <h2 class="font-semibold mb-2">Сегодня</h2>
      <div v-if="store.todayMeals.length === 0" class="text-gray-400 text-sm">
        Пока ничего не съедено
      </div>
      <div v-for="meal in store.todayMeals" :key="meal.id" class="bg-white rounded-xl p-3 mb-2 shadow-sm flex justify-between items-start">
        <div>
          <p class="font-medium">{{ meal.food_name }}</p>
          <p class="text-sm text-gray-500">
            {{ meal.grams ? `${meal.grams} г · ` : "" }}{{ meal.calories }} ккал
          </p>
          <p v-if="meal.assumption" class="text-xs text-gray-400 italic">{{ meal.assumption }}</p>
        </div>
        <button
          class="text-red-400 hover:text-red-600 text-lg ml-2"
          @click="deleteMeal(meal.id)"
        >
          ×
        </button>
      </div>
    </div>

    <div>
      <h2 class="font-semibold mb-2">Неделя</h2>
      <div v-if="weekData.length === 0" class="text-gray-400 text-sm">
        Нет данных за неделю
      </div>
      <div v-else class="flex items-end gap-2 h-32">
        <div
          v-for="day in weekData"
          :key="day.date"
          class="flex-1 bg-blue-500 rounded-t-md transition-all"
          :style="{ height: (day.kcal / maxWeekKcal) * 100 + '%' }"
          :title="`${day.date}: ${day.kcal} ккал`"
        />
      </div>
    </div>
  </div>
</template>
