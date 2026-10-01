export default defineNuxtConfig({
  devtools: { enabled: true },
  future: { compatibilityVersion: 4 },
  compatibilityDate: "2026-05-30",
  modules: [
    "@pinia/nuxt",
    "@nuxtjs/supabase",
    "@vite-pwa/nuxt",
    "@nuxt/ui",
  ],
  css: ["~/assets/css/main.css"],
  // Link-preview meta (Open Graph / Twitter). Crawlers need an absolute image URL.
  app: {
    head: {
      title: "Fit Hub — AI Calorie Tracker",
      meta: [
        { name: "description", content: "AI-powered calorie & macro tracker. Describe what you ate in plain words — AI logs the calories, protein, fat and carbs." },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Fit Hub" },
        { property: "og:url", content: "https://fit-hub-one-rouge.vercel.app" },
        { property: "og:title", content: "Fit Hub — AI Calorie Tracker" },
        { property: "og:description", content: "Describe what you ate in plain words — AI logs the calories, protein, fat and carbs." },
        { property: "og:image", content: "https://fit-hub-one-rouge.vercel.app/og-image.png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "Fit Hub — AI-powered calorie & macro tracker" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Fit Hub — AI Calorie Tracker" },
        { name: "twitter:description", content: "Describe what you ate in plain words — AI logs the calories, protein, fat and carbs." },
        { name: "twitter:image", content: "https://fit-hub-one-rouge.vercel.app/og-image.png" },
      ],
    },
  },
  colorMode: {
    preference: "dark",
  },
  runtimeConfig: {
    public: {
      siteUrl: process.env.SITE_URL || "http://localhost:3000",
      supabase: {
        url: process.env.SUPABASE_URL || "",
        key: process.env.SUPABASE_KEY || "",
      },
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
      theme_color: "#0a0a0f",
      background_color: "#0a0a0f",
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
