<script setup lang="ts">
const store = useCalorieStore()
const favoritesStore = useFavoritesStore()
const user = useSupabaseUser()

// Stale-while-revalidate: cached store data shows instantly, these refresh it
// in the background on every visit.
onMounted(() => {
  if (!user.value?.sub) return
  store.loadToday(user.value.sub)
  store.loadWeek(user.value.sub)
  favoritesStore.loadAll(user.value.sub)
})

// Day selected in the week chart (shared between WeekChart and DayMeals).
const today = todayKey()
const selectedDate = ref(today)
</script>

<template>
  <div class="p-4 max-w-md mx-auto space-y-6">
    <CalorieSummary :date="selectedDate" />
    <WeekChart v-model="selectedDate" />
    <DayMeals :date="selectedDate" @back="selectedDate = today" />
  </div>
</template>
