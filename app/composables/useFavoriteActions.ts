import type { FavoriteCard, FavoriteValues } from "~/stores/useFavoritesStore"

/**
 * Shared logic for the favorites surfaces (desktop rail + mobile sheet):
 * one-tap quick-add (with the fly-to-ring animation), save, remove.
 * Each caller gets its own flash/addingKey state.
 */
export function useFavoriteActions() {
  const user = useSupabaseUser()
  const calorieStore = useCalorieStore()
  const favoritesStore = useFavoritesStore()

  // Error-only flash. Success is silent on purpose: the comet + the card
  // appearing in the list already confirm the add, and a success line here
  // would shift the list every time (it "jumps").
  const flash = ref("")
  let flashTimer: ReturnType<typeof setTimeout> | undefined
  function flashMsg(text: string) {
    flash.value = text
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => (flash.value = ""), 1800)
  }

  const cardKey = (c: FavoriteCard) => c._key ?? c.id ?? c.food_name

  // Optimistic: add to the list immediately, sync with the server in the
  // background, roll back only if it fails. Lets you tap several in a row.
  async function quickAdd(card: FavoriteCard, from?: EventTarget | null) {
    flyToRing(from as HTMLElement | null)

    const tempId = `temp-${crypto.randomUUID()}`
    calorieStore.addLocalMeal({
      id: tempId,
      log_date: todayKey(),
      food_name: card.food_name,
      grams: card.grams ?? null,
      calories: card.calories,
      protein_g: card.protein_g ?? 0,
      fat_g: card.fat_g ?? 0,
      carb_g: card.carb_g ?? 0,
      assumption: null,
      created_at: new Date().toISOString(),
    })

    try {
      const row = await $fetch<any>("/api/food-log", {
        method: "POST",
        body: {
          food_name: card.food_name,
          grams: card.grams,
          calories: card.calories,
          protein_g: card.protein_g,
          fat_g: card.fat_g,
          carb_g: card.carb_g,
        },
      })
      calorieStore.replaceLocalMeal(tempId, row) // swap temp for the real DB row
      if (user.value?.sub) calorieStore.loadWeek(user.value.sub)
    } catch {
      calorieStore.removeLocalMeal(tempId) // roll back
      flashMsg("Couldn't add — undone")
    }
  }

  async function saveFavorite(card: FavoriteCard) {
    try {
      await favoritesStore.add({
        food_name: card.food_name,
        grams: card.grams,
        calories: card.calories,
        protein_g: card.protein_g,
        fat_g: card.fat_g,
        carb_g: card.carb_g,
      })
    } catch {
      flashMsg("Couldn't save")
    }
  }

  async function updateFavorite(id: string, values: FavoriteValues) {
    try {
      await favoritesStore.update(id, values)
    } catch {
      flashMsg("Couldn't save")
    }
  }

  async function removeFavorite(card: FavoriteCard) {
    if (!card.id) return
    try {
      await favoritesStore.remove(card.id)
    } catch {
      flashMsg("Couldn't delete")
    }
  }

  return { flash, cardKey, quickAdd, saveFavorite, updateFavorite, removeFavorite }
}
