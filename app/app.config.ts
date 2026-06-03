export default defineAppConfig({
  ui: {
    // Cyan drives every `color="primary"` Nuxt UI component (chat send button,
    // prompt, etc.); zinc neutrals read well on the near-black background.
    colors: {
      primary: "cyan",
      neutral: "zinc",
    },
  },
})
