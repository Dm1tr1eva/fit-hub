<script setup lang="ts">
const favoritesOpen = useState<boolean>("favoritesOpen", () => false)
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <main class="flex-1 pb-24">
      <slot />
    </main>

    <ChatWidget />
    <FavoritesSheet />
    <FavoritesRail />

    <nav
      class="fixed bottom-0 inset-x-0 z-30 h-16 border-t border-gray-200 bg-white safe-area-bottom"
    >
      <div class="mx-auto flex h-full max-w-md items-center justify-around px-4">
        <!-- Favorites (hidden on desktop — the always-on FavoritesRail replaces it) -->
        <button
          type="button"
          class="flex w-16 flex-col items-center justify-center gap-0.5 text-xs transition-colors lg:invisible"
          :class="favoritesOpen ? 'text-yellow-500' : 'text-gray-500 hover:text-gray-900'"
          @click="favoritesOpen = !favoritesOpen"
        >
          <UIcon name="i-lucide-star" class="h-5 w-5" />
          <span>Favorites</span>
        </button>

        <!-- Progress — raised primary "home" -->
        <NuxtLink to="/" class="group -mt-8 flex w-16 flex-col items-center">
          <span
            class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-4 ring-gray-50 transition-transform group-active:scale-95"
          >
            <UIcon name="i-lucide-chart-no-axes-combined" class="h-7 w-7" />
          </span>
          <span class="mt-1 text-[11px] font-medium text-gray-600">Progress</span>
        </NuxtLink>

        <!-- Profile -->
        <NuxtLink
          to="/profile"
          class="flex w-16 flex-col items-center justify-center gap-0.5 text-xs text-gray-500 transition-colors hover:text-gray-900"
          active-class="text-blue-600"
        >
          <UIcon name="i-lucide-user-round" class="h-5 w-5" />
          <span>Profile</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<style>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
