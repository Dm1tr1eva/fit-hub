<script setup lang="ts">
const favoritesOpen = useState<boolean>("favoritesOpen", () => false)
</script>

<template>
  <div class="min-h-screen flex flex-col text-gray-200">
    <main class="flex-1 pb-24">
      <slot />
    </main>

    <ChatWidget />
    <FavoritesSheet />
    <FavoritesRail />

    <nav
      class="neon-panel fixed bottom-0 inset-x-0 z-30 h-16 border-t border-white/10 safe-area-bottom"
    >
      <div class="mx-auto flex h-full max-w-md items-center justify-around px-4">
        <!-- Favorites (hidden on desktop — the always-on FavoritesRail replaces it) -->
        <button
          type="button"
          class="flex w-16 flex-col items-center justify-center gap-0.5 text-xs transition-colors lg:invisible"
          :class="favoritesOpen ? 'text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]' : 'text-gray-500 hover:text-gray-200'"
          @click="favoritesOpen = !favoritesOpen"
        >
          <UIcon name="i-lucide-star" class="h-5 w-5" />
          <span>Favorites</span>
        </button>

        <!-- Progress — raised primary "home" -->
        <NuxtLink to="/" class="group -mt-8 flex w-16 flex-col items-center">
          <span
            class="glow-cyan flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 text-[#04141c] ring-4 ring-[#0a0a0f] transition-transform group-active:scale-95"
          >
            <UIcon name="i-lucide-chart-no-axes-combined" class="h-7 w-7" />
          </span>
          <span class="mt-1 text-[11px] font-medium text-gray-400">Progress</span>
        </NuxtLink>

        <!-- Profile -->
        <NuxtLink
          to="/profile"
          class="flex w-16 flex-col items-center justify-center gap-0.5 text-xs text-gray-500 transition-colors hover:text-gray-200"
          active-class="!text-cyan-400"
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
