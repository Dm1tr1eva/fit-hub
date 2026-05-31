export default defineNuxtConfig({
  devtools: { enabled: true },
  future: { compatibilityVersion: 4 },
  compatibilityDate: "2026-05-30",
  modules: [
    "@nuxtjs/tailwindcss",
    "@pinia/nuxt",
    "@nuxtjs/supabase",
    "@vite-pwa/nuxt",
  ],
  runtimeConfig: {
    public: {
      siteUrl: process.env.SITE_URL || "http://localhost:3000",
      supabase: {
        url: process.env.SUPABASE_URL || "",
        key: process.env.SUPABASE_KEY || "",
      },
    },
  },
  nitro: {
    routeRules: {
      "/confirm": { ssr: false },
    },
  },
  supabase: {
    redirect: false,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  },
  pwa: {
    registerType: "autoUpdate",
    manifest: {
      name: "Fit Hub",
      short_name: "FitHub",
      description: "AI трекер калорий",
      theme_color: "#3b82f6",
      background_color: "#ffffff",
      display: "standalone",
      orientation: "portrait",
      icons: [
        { src: "/icons/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
        { src: "/icons/icon-512x512.svg", sizes: "512x512", type: "image/svg+xml" },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
    },
  },
})
