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
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Lightly active" },
  { value: "moderate", label: "Moderately active" },
  { value: "active", label: "Active" },
  { value: "very_active", label: "Very active" },
]

const goalOptions = [
  { value: "lose", label: "Lose weight" },
  { value: "maintain", label: "Maintain" },
  { value: "gain", label: "Gain weight" },
]
</script>

<template>
  <div class="p-4 max-w-md mx-auto space-y-6">
    <h1 class="text-2xl font-bold text-gray-100">Profile</h1>

    <form @submit.prevent="save" class="space-y-4">
      <div>
        <label class="block text-sm text-gray-400 mb-1">Name</label>
        <input v-model="form.name" class="w-full px-4 py-2 neon-input rounded-xl" />
      </div>

      <div>
        <label class="block text-sm text-gray-400 mb-1">Sex</label>
        <select v-model="form.sex" class="w-full px-4 py-2 neon-input rounded-xl">
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      <div>
        <label class="block text-sm text-gray-400 mb-1">Age</label>
        <input v-model.number="form.age" type="number" min="5" max="120" class="w-full px-4 py-2 neon-input rounded-xl" />
      </div>

      <div>
        <label class="block text-sm text-gray-400 mb-1">Height (cm)</label>
        <input v-model.number="form.height_cm" type="number" min="50" max="260" class="w-full px-4 py-2 neon-input rounded-xl" />
      </div>

      <div>
        <label class="block text-sm text-gray-400 mb-1">Weight (kg)</label>
        <input v-model.number="form.weight_kg" type="number" min="20" max="400" step="0.1" class="w-full px-4 py-2 neon-input rounded-xl" />
      </div>

      <div>
        <label class="block text-sm text-gray-400 mb-1">Activity</label>
        <select v-model="form.activity_level" class="w-full px-4 py-2 neon-input rounded-xl">
          <option v-for="opt in activityOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm text-gray-400 mb-1">Goal</label>
        <select v-model="form.goal" class="w-full px-4 py-2 neon-input rounded-xl">
          <option v-for="opt in goalOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm text-gray-400 mb-1">Calories (leave empty to auto-calculate)</label>
        <input
          v-model.number="form.daily_calorie_goal"
          type="number"
          min="500"
          max="10000"
          class="w-full px-4 py-2 neon-input rounded-xl"
        />
      </div>

      <button
        type="submit"
        class="btn-neon w-full py-3 rounded-xl font-medium disabled:opacity-50 disabled:shadow-none"
        :disabled="saving"
      >
        {{ saving ? "Saving..." : "Save" }}
      </button>

      <p v-if="saved" class="text-emerald-400 text-sm text-center">Saved!</p>
    </form>

    <div v-if="goals" class="neon-card rounded-2xl p-4 space-y-2">
      <h2 class="font-semibold text-lg text-gray-100">Daily goal</h2>
      <p class="flex items-center gap-2"><UIcon name="i-lucide-flame" class="text-cyan-400"/> {{ goals.daily_calorie_goal }} kcal</p>
      <p class="flex items-center gap-2"><UIcon name="i-lucide-beef" class="text-sky-400"/> {{ goals.daily_protein_g }} g protein</p>
      <p class="flex items-center gap-2"><UIcon name="i-lucide-hamburger" class="text-amber-400"/> {{ goals.daily_fat_g }} g fat</p>
      <p class="flex items-center gap-2"><UIcon name="i-lucide-croissant" class="text-emerald-400"/> {{ goals.daily_carb_g }} g carbs</p>
    </div>

    <button
      class="w-full rounded-xl border border-rose-500/20 bg-rose-500/10 py-3 font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
      @click="logout"
    >
      Log out
    </button>
  </div>
</template>
