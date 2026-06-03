export type FavoriteCard = {
  id: string | null // set for explicit favorites, null for frequency-derived
  food_name: string
  grams: number | null
  calories: number
  protein_g: number
  fat_g: number
  carb_g: number
  source: "favorite" | "frequent"
  count?: number
}

type FavoriteValues = {
  food_name: string
  grams?: number | null
  calories: number
  protein_g?: number
  fat_g?: number
  carb_g?: number
}

const FREQUENT_LIMIT = 8

export const useFavoritesStore = defineStore("favorites", () => {
  const favorites = ref<any[]>([]) // explicit, from favorite_foods
  const frequent = ref<FavoriteCard[]>([]) // derived from food_logs
  const loaded = ref(false)
  let inflight: Promise<void> | null = null

  /** Explicit favorites first, then frequent suggestions not already favorited. */
  const cards = computed<FavoriteCard[]>(() => {
    const fav: FavoriteCard[] = favorites.value.map((f) => ({
      id: f.id,
      food_name: f.food_name,
      grams: f.grams ?? null,
      calories: f.calories ?? 0,
      protein_g: f.protein_g ?? 0,
      fat_g: f.fat_g ?? 0,
      carb_g: f.carb_g ?? 0,
      source: "favorite",
    }))
    const taken = new Set(fav.map((f) => f.food_name.toLowerCase()))
    const freq = frequent.value.filter((f) => !taken.has(f.food_name.toLowerCase()))
    return [...fav, ...freq]
  })

  async function loadAll(userId: string) {
    if (inflight) return inflight

    inflight = (async () => {
      const client = useSupabaseClient()

      const [favRes, logRes] = await Promise.all([
        client
          .from("favorite_foods")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        client
          .from("food_logs")
          .select("food_name, grams, calories, protein_g, fat_g, carb_g, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(300),
      ])

      if (favRes.data) favorites.value = favRes.data

      // Build frequent cards: group recent logs by name, count, keep latest values.
      if (logRes.data) {
        const map = new Map<string, FavoriteCard>()
        for (const row of logRes.data as any[]) {
          const name = (row.food_name ?? "").trim()
          if (!name) continue
          const key = name.toLowerCase()
          const existing = map.get(key)
          if (existing) {
            existing.count = (existing.count ?? 1) + 1
          } else {
            // rows are newest-first, so the first seen is the latest entry
            map.set(key, {
              id: null,
              food_name: name,
              grams: row.grams ?? null,
              calories: row.calories ?? 0,
              protein_g: row.protein_g ?? 0,
              fat_g: row.fat_g ?? 0,
              carb_g: row.carb_g ?? 0,
              source: "frequent",
              count: 1,
            })
          }
        }
        frequent.value = [...map.values()]
          .filter((c) => (c.count ?? 0) >= 2) // only things logged more than once
          .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
          .slice(0, FREQUENT_LIMIT)
      }

      loaded.value = true
    })().finally(() => {
      inflight = null
    })

    return inflight
  }

  async function add(values: FavoriteValues) {
    const data = await $fetch<any>("/api/favorite", { method: "POST", body: values })
    favorites.value = [data, ...favorites.value]
    return data
  }

  async function remove(id: string) {
    await $fetch("/api/favorite", { method: "DELETE", body: { id } })
    favorites.value = favorites.value.filter((f) => f.id !== id)
  }

  return { favorites, frequent, cards, loaded, loadAll, add, remove }
})
