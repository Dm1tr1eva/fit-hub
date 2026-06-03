<script setup lang="ts">
// Shared with the bottom-nav "Favorites" button (mobile/tablet only).
const open = useState<boolean>("favoritesOpen", () => false)

const user = useSupabaseUser()
const favoritesStore = useFavoritesStore()
const { flash, cardKey, quickAdd, saveFavorite, removeFavorite } = useFavoriteActions()

const createOpen = ref(false)

// Two visually distinct sections; empty ones are dropped.
const groups = computed(() =>
  [
    { title: "Favorites", cards: favoritesStore.favoriteCards },
    { title: "Recommended", cards: favoritesStore.recommendedCards },
  ].filter((g) => g.cards.length),
)

// Refresh favorites/frequent whenever the sheet is opened.
watch(open, (v) => {
  if (v && user.value?.sub) favoritesStore.loadAll(user.value.sub)
})

function close() {
  open.value = false
}
</script>

<template>
  <Teleport to="body">
    <!-- Half-height sheet + light backdrop so the calorie ring stays visible
         (and the fly-to-ring animation reads). Mobile/tablet only — desktop
         uses the always-visible FavoritesRail. -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-40 flex items-end lg:hidden" @click.self="close">
        <div class="absolute inset-0 bg-black/60" @click="close" />

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-full"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="translate-y-full"
          appear
        >
          <div
            v-if="open"
            class="neon-panel relative mx-auto flex max-h-[60dvh] w-full max-w-md flex-col rounded-t-2xl shadow-2xl"
          >
            <header class="flex shrink-0 items-center justify-between rounded-t-2xl border-b border-white/10 px-4 py-3">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-star" class="h-5 w-5 text-amber-300" />
                <h2 class="font-semibold text-gray-200">Favorites</h2>
                <span v-if="flash" class="text-xs font-medium text-emerald-400">{{ flash }}</span>
              </div>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="p-1 text-gray-500 hover:text-cyan-400"
                  aria-label="Create card"
                  @click="createOpen = true"
                >
                  <UIcon name="i-lucide-plus" class="h-5 w-5" />
                </button>
                <button
                  type="button"
                  class="p-1 text-gray-500 hover:text-gray-200"
                  aria-label="Close"
                  @click="close"
                >
                  <UIcon name="i-lucide-x" class="h-5 w-5" />
                </button>
              </div>
            </header>

            <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <section v-for="group in groups" :key="group.title">
                <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {{ group.title }}
                </p>
                <div class="grid grid-cols-2 gap-3">
                  <div v-for="card in group.cards" :key="cardKey(card)" class="relative">
                    <button
                      type="button"
                      class="neon-card neon-hover flex h-[72px] w-full flex-col justify-center rounded-xl p-3 text-left transition-colors"
                      @click="quickAdd(card, $event.currentTarget)"
                    >
                      <p class="truncate pr-4 text-sm font-medium text-gray-100">{{ card.food_name }}</p>
                      <p class="truncate text-xs text-gray-500">
                        {{ card.calories }} kcal<template v-if="card.grams"> · {{ card.grams }}g</template>
                      </p>
                    </button>

                    <button
                      v-if="card.source === 'favorite'"
                      type="button"
                      class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-gray-400 hover:bg-rose-500/20 hover:text-rose-300"
                      aria-label="Remove from favorites"
                      @click="removeFavorite(card)"
                    >
                      <UIcon name="i-lucide-x" class="h-3 w-3" />
                    </button>
                    <button
                      v-else
                      type="button"
                      class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-gray-400 hover:bg-amber-400/20 hover:text-amber-300"
                      aria-label="Save to favorites"
                      @click="saveFavorite(card)"
                    >
                      <UIcon name="i-lucide-star" class="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </section>

              <p v-if="!groups.length" class="text-center text-sm text-gray-500">
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
      @submit="saveFavorite"
    />
  </Teleport>
</template>
