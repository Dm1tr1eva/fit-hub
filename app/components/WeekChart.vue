<script setup lang="ts">
// Selected day (YYYY-MM-DD), two-way bound with the parent.
const selected = defineModel<string>({ required: true })

const store = useCalorieStore()

// Always render 7 day-slots (last 7 days). Days without data show as gray stubs.
const weekBars = computed(() => {
  const byDate = new Map(store.weekData.map((d) => [d.date, d.kcal]))
  const today = new Date()
  const days: { date: string; kcal: number; label: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = localDateKey(d)
    days.push({
      date: key,
      kcal: byDate.get(key) ?? 0,
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
    })
  }
  return days
})

const maxWeekKcal = computed(() => Math.max(...weekBars.value.map((d) => d.kcal), 1))
</script>

<template>
  <div>
    <h2 class="font-semibold mb-2">Week</h2>
    <div class="flex gap-2">
      <button
        v-for="day in weekBars"
        :key="day.date"
        type="button"
        class="flex flex-1 flex-col items-center"
        @click="selected = day.date"
      >
        <div class="flex h-32 w-full items-end">
          <div
            class="w-full rounded-t-md transition-all"
            :class="
              day.date === selected
                ? day.kcal > 0
                  ? 'bg-blue-700'
                  : 'bg-gray-300'
                : day.kcal > 0
                  ? 'bg-blue-500'
                  : 'bg-gray-200'
            "
            :style="{
              height: day.kcal > 0 ? Math.max(4, (day.kcal / maxWeekKcal) * 100) + '%' : '4px',
            }"
            :title="`${day.date}: ${day.kcal} kcal`"
          />
        </div>
        <span
          class="mt-1 text-[10px] capitalize"
          :class="day.date === selected ? 'font-semibold text-blue-700' : 'text-gray-400'"
        >
          {{ day.label }}
        </span>
      </button>
    </div>
  </div>
</template>
