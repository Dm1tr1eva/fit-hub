export default defineNuxtRouteMiddleware((to) => {
  if (process.server) return
  if (to.path.startsWith("/api/")) return

  const user = useSupabaseUser()

  if (!user.value && to.path !== "/login") {
    return navigateTo("/login")
  }

  if (user.value && to.path === "/login") {
    return navigateTo("/")
  }
})
