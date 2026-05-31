<script setup lang="ts">
const user = useSupabaseUser()

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

const goals = ref<{
  daily_calorie_goal: number
  daily_protein_g: number
  daily_fat_g: number
  daily_carb_g: number
} | null>(null)

const saving = ref(false)
const saved = ref(false)

async function loadProfile() {
  if (!user.value) return
  try {
    const data = await $fetch("/api/profile")
    if (data) {
      form.value.name = data.name ?? ""
      form.value.sex = data.sex ?? "male"
      form.value.age = data.age ?? 30
      form.value.height_cm = data.height_cm ?? 170
      form.value.weight_kg = data.weight_kg ?? 70
      form.value.activity_level = data.activity_level ?? "moderate"
      form.value.goal = data.goal ?? "maintain"
      goals.value = {
        daily_calorie_goal: data.daily_calorie_goal,
        daily_protein_g: data.daily_protein_g,
        daily_fat_g: data.daily_fat_g,
        daily_carb_g: data.daily_carb_g,
      }
    }
  } catch {
    // profile might not exist yet
  }
}

const manualCalories = computed(() => form.value.daily_calorie_goal !== null && form.value.daily_calorie_goal > 0)

function toggleManualCalories() {
  if (manualCalories.value) {
    form.value.daily_calorie_goal = null
  } else {
    form.value.daily_calorie_goal = goals.value?.daily_calorie_goal ?? 2000
  }
}

onMounted(loadProfile)

async function save() {
  saving.value = true
  saved.value = false

  try {
    const data = await $fetch("/api/profile", {
      method: "PUT",
      body: form.value,
    })
    goals.value = {
      daily_calorie_goal: data.daily_calorie_goal,
      daily_protein_g: data.daily_protein_g,
      daily_fat_g: data.daily_fat_g,
      daily_carb_g: data.daily_carb_g,
    }
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

      <div class="border-t pt-4">
        <label class="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <input type="checkbox" :checked="manualCalories" @change="toggleManualCalories" />
          Указать калории вручную
        </label>
        <input
          v-if="manualCalories"
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
      <p>🔥 {{ goals.daily_calorie_goal }} ккал</p>
      <p>🥩 {{ goals.daily_protein_g }} г белка</p>
      <p>🧈 {{ goals.daily_fat_g }} г жиров</p>
      <p>🍚 {{ goals.daily_carb_g }} г углеводов</p>
    </div>

    <button
      class="w-full bg-red-50 text-red-600 py-3 rounded-xl font-medium hover:bg-red-100 transition-colors"
      @click="logout"
    >
      Выйти
    </button>
  </div>
</template>
