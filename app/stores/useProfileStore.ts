export type Profile = {
  name: string | null
  sex: "male" | "female" | null
  age: number | null
  height_cm: number | null
  weight_kg: number | null
  activity_level: string | null
  goal: string | null
  daily_calorie_goal: number | null
  daily_protein_g: number | null
  daily_fat_g: number | null
  daily_carb_g: number | null
}

export const useProfileStore = defineStore("profile", () => {
  // Cached profile — kept across navigation so the page paints instantly and
  // refreshes in the background (stale-while-revalidate).
  const profile = ref<Profile | null>(null)
  const loaded = ref(false)
  let inflight: Promise<void> | null = null

  async function loadProfile() {
    if (inflight) return inflight

    inflight = (async () => {
      try {
        const data = await $fetch<Profile>("/api/profile")
        if (data) profile.value = data
      } catch {
        // profile might not exist yet — keep whatever we had
      } finally {
        loaded.value = true
      }
    })().finally(() => {
      inflight = null
    })

    return inflight
  }

  async function saveProfile(form: Partial<Profile>) {
    const data = await $fetch<Profile>("/api/profile", { method: "PUT", body: form })
    profile.value = data
    return data
  }

  return { profile, loaded, loadProfile, saveProfile }
})
