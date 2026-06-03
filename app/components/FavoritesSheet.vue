<script setup lang="ts">
import type { FavoriteCard } from "~/stores/useFavoritesStore"

// Shared with the bottom-nav "Favorites" button.
const open = useState<boolean>("favoritesOpen", () => false)

const user = useSupabaseUser()
const favoritesStore = useFavoritesStore()
const calorieStore = useCalorieStore()

const createOpen = ref(false)
const addingKey = ref<string | null>(null)
const flash = ref("")
let flashTimer: ReturnType<typeof setTimeout> | undefined
function flashMsg(text: string) {
  flash.value = text
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flash.value = ""), 1800)
}

const cardKey = (c: FavoriteCard) => c.id ?? c.food_name

// Refresh favorites/frequent whenever the sheet is opened.
watch(open, (v) => {
  if (v && user.value?.sub) favoritesStore.loadAll(user.value.sub)
})

function close() {
  open.value = false
}

async function quickAdd(card: FavoriteCard) {
  if (addingKey.value) return
  addingKey.value = cardKey(card)
  try {
    await $fetch("/api/food-log", {
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
    if (user.value?.sub) {
      calorieStore.loadToday(user.value.sub)
      calorieStore.loadWeek(user.value.sub)
    }
    flashMsg(`Added: ${card.food_name}`)
  } catch {
    flashMsg("Couldn't add")
  } finally {
    addingKey.value = null
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
    flashMsg("Added to favorites")
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

function onCreated() {
  if (user.value?.sub) favoritesStore.loadAll(user.value.sub)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 flex items-end" @click.self="close">
        <div class="absolute inset-0 bg-black/40" @click="close" />

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-full"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="translate-y-full"
          appear
        >
          <div
            v-if="open"
            class="relative mx-auto flex max-h-[75dvh] w-full max-w-md flex-col rounded-t-2xl bg-gray-50 shadow-2xl"
          >
            <header class="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white rounded-t-2xl px-4 py-3">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-star" class="h-5 w-5 text-yellow-500" />
                <h2 class="font-semibold">Favorites</h2>
                <span v-if="flash" class="text-xs font-medium text-green-600">{{ flash }}</span>
              </div>
              <button
                type="button"
                class="text-gray-400 hover:text-gray-700"
                aria-label="Close"
                @click="close"
              >
                <UIcon name="i-lucide-x" class="h-5 w-5" />
              </button>
            </header>

            <div class="min-h-0 flex-1 overflow-y-auto p-4">
              <div class="grid grid-cols-2 gap-3">
                <button
                  class="flex h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500"
                  @click="createOpen = true"
                >
                  <UIcon name="i-lucide-plus" class="h-5 w-5" />
                  <span class="text-xs">Create</span>
                </button>

                <div v-for="card in favoritesStore.cards" :key="cardKey(card)" class="relative">
                  <button
                    class="flex h-[72px] w-full flex-col justify-center rounded-xl bg-white p-3 text-left shadow-sm transition-shadow hover:shadow disabled:opacity-50"
                    :disabled="addingKey === cardKey(card)"
                    @click="quickAdd(card)"
                  >
                    <p class="truncate pr-4 text-sm font-medium">{{ card.food_name }}</p>
                    <p class="truncate text-xs text-gray-500">
                      {{ card.calories }} kcal<template v-if="card.grams"> · {{ card.grams }}g</template>
                    </p>
                  </button>

                  <button
                    v-if="card.source === 'favorite'"
                    class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600"
                    aria-label="Remove from favorites"
                    @click.stop="removeFavorite(card)"
                  >
                    <UIcon name="i-lucide-x" class="h-3 w-3" />
                  </button>
                  <button
                    v-else
                    class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-yellow-100 hover:text-yellow-600"
                    aria-label="Add to favorites"
                    @click.stop="saveFavorite(card)"
                  >
                    <UIcon name="i-lucide-star" class="h-3 w-3" />
                  </button>
                </div>
              </div>

              <p
                v-if="favoritesStore.cards.length === 0"
                class="mt-4 text-center text-sm text-gray-400"
              >
                Empty for now. Create a card or star ⭐ a meal from your log.
              </p>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <FoodEntryModal
      v-model:open="createOpen"
      kind="favorite"
      :entry="null"
      @saved="onCreated"
    />
  </Teleport>
</template>
