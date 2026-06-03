<script setup lang="ts">
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

onMounted(() => {
  if (user.value?.sub) favoritesStore.loadAll(user.value.sub)
})
</script>

<template>
  <!-- Desktop only: a persistent quick-add rail in the right gutter. -->
  <aside
    class="neon-panel fixed right-6 top-24 z-30 hidden max-h-[70vh] w-60 flex-col overflow-hidden rounded-2xl ring-1 ring-white/10 lg:flex"
  >
    <header class="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-star" class="h-4 w-4 text-amber-300" />
        <h2 class="text-sm font-semibold text-gray-200">Quick add</h2>
      </div>
      <button
        type="button"
        class="text-gray-500 hover:text-cyan-400"
        aria-label="Create card"
        @click="createOpen = true"
      >
        <UIcon name="i-lucide-plus" class="h-4 w-4" />
      </button>
    </header>

    <p v-if="flash" class="px-3 pt-1 text-xs font-medium text-emerald-400">{{ flash }}</p>

    <div class="min-h-0 flex-1 overflow-y-auto p-2">
      <section v-for="group in groups" :key="group.title" class="mb-3 last:mb-0">
        <p class="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {{ group.title }}
        </p>
        <div
          v-for="card in group.cards"
          :key="cardKey(card)"
          class="group flex items-center rounded-xl hover:bg-white/5"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2 p-2 text-left"
            @click="quickAdd(card, $event.currentTarget)"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-gray-100">{{ card.food_name }}</p>
              <p class="truncate text-xs text-gray-500">
                {{ card.calories }} kcal<template v-if="card.grams"> · {{ card.grams }}g</template>
              </p>
            </div>
            <UIcon name="i-lucide-plus" class="h-4 w-4 shrink-0 text-gray-600" />
          </button>

          <button
            v-if="card.source === 'favorite'"
            type="button"
            class="mr-1 shrink-0 p-1 text-gray-600 hover:text-rose-400 lg:opacity-0 lg:group-hover:opacity-100"
            aria-label="Remove from favorites"
            @click="removeFavorite(card)"
          >
            <UIcon name="i-lucide-x" class="h-4 w-4" />
          </button>
          <button
            v-else
            type="button"
            class="mr-1 shrink-0 p-1 text-gray-600 hover:text-amber-300 lg:opacity-0 lg:group-hover:opacity-100"
            aria-label="Save to favorites"
            @click="saveFavorite(card)"
          >
            <UIcon name="i-lucide-star" class="h-4 w-4" />
          </button>
        </div>
      </section>

      <p v-if="!groups.length" class="px-2 py-6 text-center text-xs text-gray-500">
        No favorites yet. Tap + to create one, or star a meal from your log.
      </p>
    </div>

    <FoodEntryModal v-model:open="createOpen" kind="favorite" :entry="null" @submit="saveFavorite" />
  </aside>
</template>
