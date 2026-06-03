<script setup lang="ts">
import type { FavoriteCard as FavoriteCardType } from "~/stores/useFavoritesStore"

const user = useSupabaseUser()
const favoritesStore = useFavoritesStore()
const { flash, cardKey, quickAdd, saveFavorite, updateFavorite, removeFavorite } =
  useFavoriteActions()

// Same modal for create and edit: a null target means "new card".
const modalOpen = ref(false)
const editingCard = ref<FavoriteCardType | null>(null)

function openCreate() {
  editingCard.value = null
  modalOpen.value = true
}
function openEdit(card: FavoriteCardType) {
  editingCard.value = card
  modalOpen.value = true
}
function onSubmit(values: any) {
  if (editingCard.value?.id) updateFavorite(editingCard.value.id, values)
  else saveFavorite(values)
}

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
  <!-- Desktop only: a borderless quick-add list living in the right gutter.
       No widget chrome — just a heading and a stack of cards. -->
  <!-- px/pb give the cards' hover ring + avatar glow room so they aren't
       clipped by the scroll container (overflow-y-auto also clips the x-axis). -->
  <aside
    class="fixed right-3 top-24 z-30 hidden max-h-[calc(100dvh-9rem)] w-64 flex-col gap-3 overflow-y-auto px-1.5 pb-2 lg:flex"
  >
    <header class="flex items-center justify-between px-1">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-star" class="h-4 w-4 text-amber-300" />
        <h2 class="text-sm font-semibold text-gray-300">Quick add</h2>
      </div>
      <button
        type="button"
        class="rounded-md p-1 text-gray-500 transition hover:bg-white/5 hover:text-cyan-400"
        aria-label="Create card"
        @click="openCreate"
      >
        <UIcon name="i-lucide-plus" class="h-4 w-4" />
      </button>
    </header>

    <p v-if="flash" class="px-1 text-xs font-medium text-rose-400">{{ flash }}</p>

    <section v-for="group in groups" :key="group.title">
      <p class="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {{ group.title }}
      </p>
      <div class="flex flex-col gap-2">
        <FavoriteCard
          v-for="card in group.cards"
          :key="cardKey(card)"
          :card="card"
          @add="(el) => quickAdd(card, el)"
          @edit="openEdit(card)"
          @toggle="card.source === 'favorite' ? removeFavorite(card) : saveFavorite(card)"
        />
      </div>
    </section>

    <p v-if="!groups.length" class="px-1 py-6 text-center text-xs text-gray-500">
      No favorites yet. Tap + to create one, or star a meal from your log.
    </p>

    <FoodEntryModal v-model:open="modalOpen" kind="favorite" :entry="editingCard" @submit="onSubmit" />
  </aside>
</template>
