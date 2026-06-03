<script setup lang="ts">
definePageMeta({
  layout: false,
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const email = ref("")
const password = ref("")
const loading = ref(false)
const error = ref("")
const isRegister = ref(false)

// The supabase plugin sets the user asynchronously (onAuthStateChange →
// getClaims), so right after sign-in `useSupabaseUser()` is still null. If we
// navigate immediately the route middleware sees no user and bounces back to
// /login — which is why it used to take two clicks. Wait for the user state
// (the exact thing the middleware checks) before navigating.
function waitForUser(timeout = 3000): Promise<void> {
  if (user.value) return Promise.resolve()
  return new Promise((resolve) => {
    const stop = watch(user, (v) => {
      if (v) {
        stop()
        clearTimeout(timer)
        resolve()
      }
    })
    const timer = setTimeout(() => {
      stop()
      resolve()
    }, timeout)
  })
}

async function submit() {
  loading.value = true
  error.value = ""

  const { data, error: err } = await (isRegister.value
    ? supabase.auth.signUp({ email: email.value, password: password.value })
    : supabase.auth.signInWithPassword({ email: email.value, password: password.value }))

  if (err) {
    error.value = err.message
    loading.value = false
    return
  }

  // Registration with email confirmation enabled returns a user but no session.
  if (isRegister.value && !data.session) {
    error.value = "Check your email to confirm your registration"
    loading.value = false
    return
  }

  await waitForUser()
  loading.value = false
  navigateTo("/")
}

function toggleMode() {
  isRegister.value = !isRegister.value
  error.value = ""
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div class="max-w-sm w-full bg-white rounded-2xl shadow-sm p-8">
      <h1 class="text-2xl font-bold text-center mb-2">Fit Hub</h1>
      <p class="text-gray-500 text-center mb-6">AI calorie tracker</p>

      <form @submit.prevent="submit" class="space-y-4">
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          class="w-full px-4 py-3 border border-gray-300 rounded-xl text-center"
          :disabled="loading"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          class="w-full px-4 py-3 border border-gray-300 rounded-xl text-center"
          :disabled="loading"
        />
        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
          :disabled="loading || !email || !password"
        >
          {{ loading ? "Loading..." : isRegister ? "Sign up" : "Sign in" }}
        </button>
      </form>

      <p v-if="error" class="text-red-600 text-center mt-4 text-sm">{{ error }}</p>

      <p class="text-center mt-4 text-sm text-gray-500">
        <button class="text-blue-600 underline" @click="toggleMode">
          {{ isRegister ? "Already have an account? Sign in" : "No account? Sign up" }}
        </button>
      </p>
    </div>
  </div>
</template>
