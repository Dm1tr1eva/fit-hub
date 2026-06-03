<script setup lang="ts">
const props = defineProps<{ date: string }>()
const emit = defineEmits<{ back: [] }>()

const store = useCalorieStore()
const favoritesStore = useFavoritesStore()
const user = useSupabaseUser()

const isToday = computed(() => props.date === todayKey())
const selectedMeals = computed(() => (isToday.value ? store.todayMeals : store.dayMeals))
const scope = computed<"today" | "day">(() => (isToday.value ? "today" : "day"))

// Load a past day's meals when the selection changes (today is already loaded).
watch(
  () => props.date,
  (date) => {
    if (date !== todayKey() && user.value?.sub) store.loadDay(user.value.sub, date)
  },
)

// Reload whichever day is currently being viewed (+ the week chart).
function refreshSelected() {
  if (!user.value?.sub) return
  if (isToday.value) store.loadToday(user.value.sub)
  else store.loadDay(user.value.sub, props.date)
  store.loadWeek(user.value.sub)
}

async function deleteMeal(id: string) {
  store.removeLocalMeal(id, scope.value) // optimistic
  try {
    const supabase = useSupabaseClient()
    const { error } = await supabase.from("food_logs").delete().eq("id", id)
    if (error) throw error
    if (user.value?.sub) store.loadWeek(user.value.sub)
  } catch {
    refreshSelected() // rollback by reloading
    flashMsg("Couldn't delete")
  }
}

// Add / edit modal
const modalOpen = ref(false)
const editingEntry = ref<any | null>(null)

function openAdd() {
  editingEntry.value = null
  modalOpen.value = true
}

function openEdit(meal: any) {
  editingEntry.value = meal
  modalOpen.value = true
}

// Modal emits form values; persist optimistically. Manual add goes to "today"
// (the Add button only shows on today); edit stays on the viewed day.
function onSubmit(values: any) {
  if (editingEntry.value?.id) editEntry(editingEntry.value.id, values)
  else addEntry(values)
}

async function addEntry(values: any) {
  const tempId = `temp-${crypto.randomUUID()}`
  store.addLocalMeal(
    { id: tempId, log_date: todayKey(), assumption: null, created_at: new Date().toISOString(), ...values },
    "today",
  )
  try {
    const row = await $fetch<any>("/api/food-log", { method: "POST", body: values })
    store.replaceLocalMeal(tempId, row, "today")
    if (user.value?.sub) store.loadWeek(user.value.sub)
  } catch {
    store.removeLocalMeal(tempId, "today")
    flashMsg("Couldn't add")
  }
}

async function editEntry(id: string, values: any) {
  const sc = scope.value
  store.updateLocalMeal(id, values, sc)
  try {
    await $fetch("/api/food-log", { method: "PATCH", body: { id, ...values } })
    if (user.value?.sub) store.loadWeek(user.value.sub)
  } catch {
    refreshSelected()
    flashMsg("Couldn't save")
  }
}

// Star a meal into favorites
const flash = ref("")
let flashTimer: ReturnType<typeof setTimeout> | undefined
function flashMsg(text: string) {
  flash.value = text
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flash.value = ""), 1800)
}

function isFavorite(meal: any) {
  const name = (meal.food_name ?? "").toLowerCase()
  return favoritesStore.favorites.some((f) => (f.food_name ?? "").toLowerCase() === name)
}

async function favoriteMeal(meal: any) {
  if (isFavorite(meal)) {
    flashMsg("Already in favorites")
    return
  }
  try {
    await favoritesStore.add({
      food_name: meal.food_name,
      grams: meal.grams,
      calories: meal.calories,
      protein_g: meal.protein_g,
      fat_g: meal.fat_g,
      carb_g: meal.carb_g,
    })
    flashMsg("Added to favorites")
  } catch {
    flashMsg("Couldn't save")
  }
}
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h2 class="font-semibold capitalize text-gray-200">{{ dayHeading(date) }}</h2>
        <button
          v-if="!isToday"
          type="button"
          class="flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300"
          @click="emit('back')"
        >
          <UIcon name="i-lucide-rotate-ccw" class="h-3.5 w-3.5" /> Today
        </button>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="flash" class="text-xs font-medium text-emerald-400">{{ flash }}</span>
        <button
          v-if="isToday"
          class="flex items-center gap-1 text-sm font-medium text-cyan-400 hover:text-cyan-300"
          @click="openAdd"
        >
          <UIcon name="i-lucide-plus" class="h-4 w-4" /> Add
        </button>
      </div>
    </div>

    <div v-if="selectedMeals.length === 0" class="text-gray-500 text-sm">
      {{ isToday ? "Nothing logged yet" : "Nothing logged that day" }}
    </div>

    <TransitionGroup name="meal" tag="div" class="relative">
      <div
        v-for="meal in selectedMeals"
        :key="meal._key ?? meal.id"
        class="neon-card rounded-xl p-3 mb-2 flex justify-between items-start"
      >
        <div>
          <p class="font-medium text-gray-100">{{ meal.food_name }}</p>
          <p class="text-sm text-gray-400">
            {{ meal.grams ? `${meal.grams} g · ` : "" }}{{ meal.calories }} kcal
          </p>
          <p class="text-xs text-gray-500">
            P {{ meal.protein_g ?? 0 }} · F {{ meal.fat_g ?? 0 }} · C {{ meal.carb_g ?? 0 }}
          </p>
          <p v-if="meal.assumption" class="text-xs text-gray-500 italic">{{ meal.assumption }}</p>
        </div>
        <div class="ml-2 flex shrink-0 items-center gap-1">
          <button
            class="p-1 hover:text-amber-300"
            :class="isFavorite(meal) ? 'text-amber-300 drop-shadow-[0_0_5px_rgba(251,191,36,0.7)]' : 'text-gray-500'"
            :aria-label="isFavorite(meal) ? 'In favorites' : 'Add to favorites'"
            @click="favoriteMeal(meal)"
          >
            <UIcon name="i-lucide-star" class="h-4 w-4" />
          </button>
          <button
            class="p-1 text-gray-500 hover:text-cyan-400"
            aria-label="Edit"
            @click="openEdit(meal)"
          >
            <UIcon name="i-lucide-pencil" class="h-4 w-4" />
          </button>
          <button
            class="p-1 text-gray-500 hover:text-rose-400"
            aria-label="Delete"
            @click="deleteMeal(meal.id)"
          >
            <UIcon name="i-lucide-trash-2" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </TransitionGroup>

    <FoodEntryModal v-model:open="modalOpen" :entry="editingEntry" @submit="onSubmit" />
  </div>
</template>
