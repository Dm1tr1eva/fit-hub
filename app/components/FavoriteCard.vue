<script setup lang="ts">
import type { FavoriteCard } from "~/stores/useFavoritesStore"

const props = defineProps<{ card: FavoriteCard }>()

// `add` carries the clicked element so the caller can fly a comet from it to
// the calorie ring. `toggle` saves a frequent card / removes a favourite.
const emit = defineEmits<{
  add: [el: HTMLElement]
  edit: []
  toggle: []
}>()

const avatar = computed(() => foodAvatar(props.card.food_name))
const isFavorite = computed(() => props.card.source === "favorite")
</script>

<template>
  <div
    class="group relative flex cursor-pointer items-center gap-3 rounded-xl bg-white/[0.03] p-2.5 ring-1 ring-white/5 transition hover:bg-white/[0.06] hover:ring-cyan-400/25"
    role="button"
    :aria-label="`Add ${card.food_name}`"
    @click="emit('add', $event.currentTarget as HTMLElement)"
  >
    <!-- Icon slot: a derived colour/initial for now; a stored icon later. -->
    <span
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
      :style="{
        color: avatar.color,
        background: avatar.background,
        boxShadow: `${avatar.glow}, ${avatar.ring}`,
      }"
    >
      {{ avatar.char }}
    </span>

    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium text-gray-100">{{ card.food_name }}</p>
      <p class="truncate text-xs text-gray-500">
        {{ card.calories }} kcal<template v-if="card.grams"> · {{ card.grams }}g</template>
      </p>
      <p class="truncate text-[11px] text-gray-600">
        P {{ card.protein_g }} · F {{ card.fat_g }} · C {{ card.carb_g }}
      </p>
    </div>

    <!-- Actions, hidden until hover. Favourite → edit + remove; frequent → save. -->
    <div class="flex shrink-0 items-center gap-0.5 lg:opacity-0 lg:group-hover:opacity-100">
      <button
        v-if="isFavorite"
        type="button"
        class="rounded-md p-1 text-gray-500 transition hover:text-cyan-400"
        aria-label="Edit card"
        @click.stop="emit('edit')"
      >
        <UIcon name="i-lucide-pencil" class="h-4 w-4" />
      </button>
      <button
        type="button"
        class="rounded-md p-1 text-gray-500 transition"
        :class="isFavorite ? 'hover:text-rose-400' : 'hover:text-amber-300'"
        :aria-label="isFavorite ? 'Remove from favorites' : 'Save to favorites'"
        @click.stop="emit('toggle')"
      >
        <UIcon :name="isFavorite ? 'i-lucide-x' : 'i-lucide-star'" class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
