<script setup lang="ts">
const tabs = [
  { name: "progress", label: "Прогресс", icon: "i-lucide-chart-no-axes-combined" },
  { name: "profile", label: "Профиль", icon: "i-lucide-user-round" },
];
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <main class="flex-1 pb-16">
      <slot />
    </main>

    <ChatWidget />

    <nav
      class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 safe-area-bottom"
    >
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="tab.name === 'progress' ? '/' : `/${tab.name}`"
        class="flex flex-col items-center justify-center w-full h-full text-xs text-gray-500 hover:text-gray-900 transition-colors"
        active-class="text-blue-600"
      >
        <UIcon :name="tab.icon" class="w-5 h-5" />
        <span>{{ tab.label }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<style>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
