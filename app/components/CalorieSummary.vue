<script setup lang="ts">
const props = defineProps<{ date: string }>()

const store = useCalorieStore()

const isToday = computed(() => props.date === todayKey())

// For today use store.totals (includes optimistic local updates from the ring).
// For past days sum store.dayMeals, which DayMeals populates via store.loadDay().
const displayTotals = computed(() => {
  if (isToday.value) return store.totals
  return {
    kcal: Math.round(store.dayMeals.reduce((s: number, r: any) => s + (r.calories ?? 0), 0)),
    protein: Math.round(store.dayMeals.reduce((s: number, r: any) => s + (r.protein_g ?? 0), 0)),
    carb: Math.round(store.dayMeals.reduce((s: number, r: any) => s + (r.carb_g ?? 0), 0)),
    fat: Math.round(store.dayMeals.reduce((s: number, r: any) => s + (r.fat_g ?? 0), 0)),
  }
})

const radius = 56
const circumference = 2 * Math.PI * radius

const remaining = computed(() => {
  if (!store.dailyGoal) return store.dailyGoal ?? 0
  return Math.max(0, store.dailyGoal - displayTotals.value.kcal)
})

const progress = computed(() => {
  if (!store.dailyGoal) return 0
  return Math.min(1, displayTotals.value.kcal / store.dailyGoal)
})

const dashOffset = computed(() => circumference * (1 - progress.value))

const macroDetails = computed(() => {
  if (!store.dailyGoal) return []
  return [
    { short: "P", icon: "i-lucide-beef", current: displayTotals.value.protein, goal: store.dailyProtein, color: "fill-blue" },
    { short: "F", icon: "i-lucide-hamburger", current: displayTotals.value.fat, goal: store.dailyFat, color: "fill-amber" },
    { short: "C", icon: "i-lucide-croissant", current: displayTotals.value.carb, goal: store.dailyCarb, color: "fill-emerald" },
  ]
})
</script>

<template>
  <!-- Sticky so the ring + macros stay pinned and update live while scrolling.
       -mx-4 / -mt-4 assume this is the first child of the page's p-4 container. -->
  <div class="sticky top-4 z-10 rounded-2xl bg-[#0a0a0f]">
    <div class="neon-card glow-cyan flex items-center gap-4 rounded-2xl p-4">
      <div id="calorie-ring" class="relative h-32 w-32 shrink-0">
        <!-- overflow-visible so the progress arc's neon drop-shadow isn't
             clipped by the SVG viewport (the ring nearly fills the box). -->
        <svg viewBox="0 0 128 128" class="h-32 w-32 -rotate-90 overflow-visible">
          <circle cx="64" cy="64" :r="radius" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10" />
          <circle
            cx="64" cy="64" :r="radius"
            fill="none" stroke="#22d3ee" stroke-width="10"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
            class="transition-all duration-500"
            style="filter: drop-shadow(0 0 5px rgba(34, 211, 238, 0.9))"
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p class="glow-text text-2xl font-bold leading-none text-cyan-300">{{ remaining }}</p>
          <p class="mt-1 text-xs text-gray-500">of {{ store.dailyGoal ?? 0 }}</p>
        </div>
      </div>

      <div class="min-w-0 flex-1 space-y-2">
        <div
          v-for="macro in macroDetails"
          :key="macro.short"
          class="flex items-center gap-2"
        >
          <UIcon :name="macro.icon" class="h-4 w-4 shrink-0 text-gray-400" />
          <span class="w-3 shrink-0 text-sm font-semibold text-gray-300">{{ macro.short }}</span>
          <div class="h-2 min-w-0 flex-1 rounded-full bg-white/5">
            <div
              class="h-2 rounded-full transition-all"
              :class="macro.color"
              :style="{ width: Math.min(100, (macro.current / macro.goal) * 100) + '%' }"
            />
          </div>
          <span class="shrink-0 text-xs tabular-nums text-gray-500">
            {{ macro.current }}/{{ macro.goal }}
          </span>
        </div>
        <p v-if="macroDetails.length === 0" class="text-sm text-gray-400">
          Set a goal in your profile
        </p>
      </div>
    </div>
  </div>
</template>
