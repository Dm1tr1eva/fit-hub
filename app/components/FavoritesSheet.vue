<script setup lang="ts">
import type { FavoriteCard as FavoriteCardType } from "~/stores/useFavoritesStore"

// Shared with the bottom-nav "Favorites" button (mobile/tablet only).
const open = useState<boolean>("favoritesOpen", () => false)

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

// Mobile uses a segmented toggle instead of stacked sections — one list shown
// at a time, switched by the slider.
const tab = ref<"favorites" | "recommended">("favorites")
const activeCards = computed(() =>
  tab.value === "favorites"
    ? favoritesStore.favoriteCards
    : favoritesStore.recommendedCards,
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
                <h2 class="font-semibold text-gray-200">Quick add</h2>
                <span v-if="flash" class="text-xs font-medium text-rose-400">{{ flash }}</span>
              </div>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="p-1 text-gray-500 hover:text-cyan-400"
                  aria-label="Create card"
                  @click="openCreate"
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

            <!-- Segmented toggle with a sliding neon highlight. -->
            <div class="shrink-0 px-4 pt-3">
              <div class="relative flex rounded-xl bg-white/5 p-1 text-sm font-medium">
                <span
                  class="absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-lg bg-gradient-to-br from-cyan-400 to-sky-500 shadow-[0_0_12px_rgba(34,211,238,0.5)] transition-transform duration-300 ease-out"
                  :class="tab === 'recommended' ? 'translate-x-[100%]' : 'translate-x-0'"
                />
                <button
                  type="button"
                  class="relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 transition-colors"
                  :class="tab === 'favorites' ? 'text-[#04141c]' : 'text-gray-400'"
                  @click="tab = 'favorites'"
                >
                  Favorites
                  <span class="text-[11px] opacity-70">{{ favoritesStore.favoriteCards.length }}</span>
                </button>
                <button
                  type="button"
                  class="relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 transition-colors"
                  :class="tab === 'recommended' ? 'text-[#04141c]' : 'text-gray-400'"
                  @click="tab = 'recommended'"
                >
                  Recommended
                  <span class="text-[11px] opacity-70">{{ favoritesStore.recommendedCards.length }}</span>
                </button>
              </div>
            </div>

            <!-- Active list (cross-fades on tab switch). -->
            <div class="min-h-0 flex-1 overflow-y-auto p-4">
              <Transition
                mode="out-in"
                enter-active-class="transition-opacity duration-150"
                enter-from-class="opacity-0"
                leave-active-class="transition-opacity duration-150"
                leave-to-class="opacity-0"
              >
                <div :key="tab">
                  <TransitionGroup
                    v-if="activeCards.length"
                    name="fav"
                    tag="div"
                    class="grid grid-cols-2 gap-3"
                  >
                    <div v-for="card in activeCards" :key="cardKey(card)" class="relative">
                      <button
                        type="button"
                        class="neon-card neon-hover flex min-h-[72px] w-full flex-col justify-center rounded-xl p-3 text-left transition-colors"
                        @click="quickAdd(card, $event.currentTarget)"
                      >
                        <p
                          class="truncate text-sm font-medium text-gray-100"
                          :class="card.source === 'favorite' ? 'pr-12' : 'pr-4'"
                        >
                          {{ card.food_name }}
                        </p>
                        <p class="truncate text-xs text-gray-500">
                          {{ card.calories }} kcal<template v-if="card.grams"> · {{ card.grams }}g</template>
                        </p>
                        <p class="truncate text-[11px] text-gray-600">
                          P {{ card.protein_g }} · F {{ card.fat_g }} · C {{ card.carb_g }}
                        </p>
                      </button>

                      <!-- Favourite → edit + remove; frequent suggestion → save. -->
                      <div
                        v-if="card.source === 'favorite'"
                        class="absolute right-1 top-1 flex items-center gap-1"
                      >
                        <button
                          type="button"
                          class="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-gray-400 hover:bg-cyan-500/20 hover:text-cyan-300"
                          aria-label="Edit card"
                          @click="openEdit(card)"
                        >
                          <UIcon name="i-lucide-pencil" class="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          class="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-gray-400 hover:bg-rose-500/20 hover:text-rose-300"
                          aria-label="Remove from favorites"
                          @click="removeFavorite(card)"
                        >
                          <UIcon name="i-lucide-x" class="h-3 w-3" />
                        </button>
                      </div>
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
                  </TransitionGroup>

                  <p v-else class="py-10 text-center text-sm text-gray-500">
                    {{
                      tab === "favorites"
                        ? "No favorites yet. Tap + above or star ⭐ a meal from your log."
                        : "No suggestions yet — log a few meals and they’ll appear here."
                    }}
                  </p>
                </div>
              </Transition>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <FoodEntryModal
      v-model:open="modalOpen"
      kind="favorite"
      :entry="editingCard"
      @submit="onSubmit"
    />
  </Teleport>
</template>
