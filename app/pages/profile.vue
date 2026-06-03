<script setup lang="ts">
import type { Profile } from "~/stores/useProfileStore"

const profileStore = useProfileStore()

const form = ref({
  name: "",
  sex: "male" as "male" | "female",
  age: 30,
  height_cm: 170,
  weight_kg: 70,
  activity_level: "moderate",
  goal: "maintain",
  daily_calorie_goal: null as number | null,
})

const saving = ref(false)
const saved = ref(false)

let formReady = false
function fillForm(p: Profile) {
  form.value = {
    name: p.name ?? "",
    sex: p.sex ?? "male",
    age: p.age ?? 30,
    height_cm: p.height_cm ?? 170,
    weight_kg: p.weight_kg ?? 70,
    activity_level: p.activity_level ?? "moderate",
    goal: p.goal ?? "maintain",
    daily_calorie_goal: p.daily_calorie_goal ?? null,
  }
  formReady = true
}

// Read-only goals card always reflects the cached/refreshed store profile.
const goals = computed(() => {
  const p = profileStore.profile
  if (!p) return null
  return {
    daily_calorie_goal: p.daily_calorie_goal,
    daily_protein_g: p.daily_protein_g,
    daily_fat_g: p.daily_fat_g,
    daily_carb_g: p.daily_carb_g,
  }
})

// Paint the form instantly from cache, then revalidate in the background.
if (profileStore.profile) fillForm(profileStore.profile)

onMounted(async () => {
  await profileStore.loadProfile()
  // Only fill from a background refresh if the form wasn't already populated
  // from cache — otherwise we'd clobber in-progress edits.
  if (!formReady && profileStore.profile) fillForm(profileStore.profile)
})

async function save() {
  saving.value = true
  saved.value = false

  try {
    await profileStore.saveProfile(form.value)
    saved.value = true
  } catch {
    // show error
  }

  saving.value = false
}

async function logout() {
  const supabase = useSupabaseClient()
  await supabase.auth.signOut()
  navigateTo("/login")
}

const activityOptions = [
  { value: "sedentary", label: "Сидячий" },
  { value: "light", label: "Легкая активность" },
  { value: "moderate", label: "Умеренная" },
  { value: "active", label: "Активный" },
  { value: "very_active", label: "Очень активный" },
]

const goalOptions = [
  { value: "lose", label: "Похудение" },
  { value: "maintain", label: "Поддержание" },
  { value: "gain", label: "Набор массы" },
]
</script>

<template>
  <div class="p-4 max-w-md mx-auto space-y-6">
    <h1 class="text-2xl font-bold">Профиль</h1>

    <form @submit.prevent="save" class="space-y-4">
      <div>
        <label class="block text-sm text-gray-600 mb-1">Имя</label>
        <input v-model="form.name" class="w-full px-4 py-2 border border-gray-300 rounded-xl" />
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Пол</label>
        <select v-model="form.sex" class="w-full px-4 py-2 border border-gray-300 rounded-xl">
          <option value="male">Мужской</option>
          <option value="female">Женский</option>
        </select>
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Возраст</label>
        <input v-model.number="form.age" type="number" min="5" max="120" class="w-full px-4 py-2 border border-gray-300 rounded-xl" />
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Рост (см)</label>
        <input v-model.number="form.height_cm" type="number" min="50" max="260" class="w-full px-4 py-2 border border-gray-300 rounded-xl" />
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Вес (кг)</label>
        <input v-model.number="form.weight_kg" type="number" min="20" max="400" step="0.1" class="w-full px-4 py-2 border border-gray-300 rounded-xl" />
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Активность</label>
        <select v-model="form.activity_level" class="w-full px-4 py-2 border border-gray-300 rounded-xl">
          <option v-for="opt in activityOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Цель</label>
        <select v-model="form.goal" class="w-full px-4 py-2 border border-gray-300 rounded-xl">
          <option v-for="opt in goalOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">Калории (оставьте пустым для авторасчета)</label>
        <input
          v-model.number="form.daily_calorie_goal"
          type="number"
          min="500"
          max="10000"
          class="w-full px-4 py-2 border border-gray-300 rounded-xl"
        />
      </div>

      <button
        type="submit"
        class="w-full bg-blue-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
        :disabled="saving"
      >
        {{ saving ? "Сохранение..." : "Сохранить" }}
      </button>

      <p v-if="saved" class="text-green-600 text-sm text-center">Сохранено!</p>
    </form>

    <div v-if="goals" class="bg-white rounded-2xl shadow-sm p-4 space-y-2">
      <h2 class="font-semibold text-lg">Дневная цель</h2>
      <p class="flex items-center gap-2"><UIcon name="i-lucide-flame"/> {{ goals.daily_calorie_goal }} ккал</p>
      <p class="flex items-center gap-2"><UIcon name="i-lucide-beef"/> {{ goals.daily_protein_g }} г белка</p>
      <p class="flex items-center gap-2"><UIcon name="i-lucide-hamburger"/> {{ goals.daily_fat_g }} г жиров</p>
      <p class="flex items-center gap-2"><UIcon name="i-lucide-croissant"/> {{ goals.daily_carb_g }} г углеводов</p>
    </div>

    <button
      class="w-full bg-red-50 text-red-600 py-3 rounded-xl font-medium hover:bg-red-100 transition-colors"
      @click="logout"
    >
      Выйти
    </button>
  </div>
</template>
