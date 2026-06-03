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
    <h2 class="font-semibold mb-2 text-gray-200">Week</h2>
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
                  ? 'bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.85)]'
                  : 'bg-white/20'
                : day.kcal > 0
                  ? 'bg-cyan-500/70 shadow-[0_0_8px_rgba(34,211,238,0.45)]'
                  : 'bg-white/10'
            "
            :style="{
              height: day.kcal > 0 ? Math.max(4, (day.kcal / maxWeekKcal) * 100) + '%' : '4px',
            }"
            :title="`${day.date}: ${day.kcal} kcal`"
          />
        </div>
        <span
          class="mt-1 text-[10px] capitalize"
          :class="day.date === selected ? 'font-semibold text-cyan-300' : 'text-gray-500'"
        >
          {{ day.label }}
        </span>
      </button>
    </div>
  </div>
</template>
