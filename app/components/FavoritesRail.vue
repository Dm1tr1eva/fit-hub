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

// Exclusive accordion: at most one section open at a time. Defaults to
// Favorites, falling back to whichever group exists if that one is empty.
const openGroup = ref("Favorites")
const effectiveOpen = computed(() =>
  groups.value.some((g) => g.title === openGroup.value)
    ? openGroup.value
    : (groups.value[0]?.title ?? ""),
)
const isOpen = (title: string) => effectiveOpen.value === title
function toggleGroup(title: string) {
  openGroup.value = effectiveOpen.value === title ? "" : title
}

onMounted(() => {
  if (user.value?.sub) favoritesStore.loadAll(user.value.sub)
})
</script>

<template>
  <!-- Desktop only: a borderless quick-add panel in the right gutter.
       Exclusive accordion — one section open at a time; the open list scrolls
       inside its own bounded area so it never pushes the other off-screen. -->
  <aside
    class="fixed right-3 top-24 z-30 hidden max-h-[calc(100dvh-9rem)] w-64 flex-col overflow-x-hidden overflow-y-auto pb-2 lg:flex"
  >
    <header class="flex items-center justify-between px-1.5 py-1">
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

    <p v-if="flash" class="px-1.5 pb-1 text-xs font-medium text-rose-400">{{ flash }}</p>

    <section v-for="group in groups" :key="group.title">
      <!-- Accordion header: chevron + title + count; click toggles this section. -->
      <button
        type="button"
        class="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left transition hover:bg-white/[0.03]"
        :aria-expanded="isOpen(group.title)"
        @click="toggleGroup(group.title)"
      >
        <UIcon
          name="i-lucide-chevron-right"
          class="h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform duration-200"
          :class="isOpen(group.title) ? 'rotate-90' : ''"
        />
        <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {{ group.title }}
        </span>
        <span class="ml-auto rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
          {{ group.cards.length }}
        </span>
      </button>

      <!-- Body: grid-rows 0fr↔1fr animates the collapse; the inner div caps the
           height + scrolls so a long open list stays inside the rail. -->
      <div
        class="grid transition-[grid-template-rows] duration-300 ease-out"
        :class="isOpen(group.title) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
      >
        <div class="min-h-0 overflow-hidden">
          <div class="max-h-[58vh] overflow-x-hidden overflow-y-auto px-1.5 pb-1.5 pt-0.5">
            <TransitionGroup name="meal" tag="div" class="relative flex flex-col gap-2">
              <FavoriteCard
                v-for="card in group.cards"
                :key="cardKey(card)"
                :card="card"
                @add="(el) => quickAdd(card, el)"
                @edit="openEdit(card)"
                @toggle="card.source === 'favorite' ? removeFavorite(card) : saveFavorite(card)"
              />
            </TransitionGroup>
          </div>
        </div>
      </div>
    </section>

    <p v-if="!groups.length" class="px-1.5 py-6 text-center text-xs text-gray-500">
      No favorites yet. Tap + to create one, or star a meal from your log.
    </p>

    <FoodEntryModal v-model:open="modalOpen" kind="favorite" :entry="editingCard" @submit="onSubmit" />
  </aside>
</template>
