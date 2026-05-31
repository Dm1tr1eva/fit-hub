<script setup lang="ts">
definePageMeta({
  layout: false,
})

const supabase = useSupabaseClient()
const email = ref("")
const loading = ref(false)
const sent = ref(false)
const error = ref("")

async function signIn() {
  loading.value = true
  error.value = ""
  sent.value = false
  const { error: err } = await supabase.auth.signInWithOtp({
    email: email.value,
    options: {
      redirectTo: window.location.origin + "/confirm",
    },
  })
  if (err) {
    error.value = err.message
  } else {
    sent.value = true
  }
  loading.value = false
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div class="max-w-sm w-full bg-white rounded-2xl shadow-sm p-8">
      <h1 class="text-2xl font-bold text-center mb-2">Fit Hub</h1>
      <p class="text-gray-500 text-center mb-6">Трекер калорий с AI</p>

      <form @submit.prevent="signIn">
        <input
          v-model="email"
          type="email"
          placeholder="your@email.com"
          class="w-full px-4 py-3 border border-gray-300 rounded-xl mb-4 text-center"
          :disabled="loading"
        />
        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
          :disabled="loading || !email"
        >
          {{ loading ? "Отправка..." : "Отправить magic-link" }}
        </button>
      </form>

      <p v-if="sent" class="text-green-600 text-center mt-4 text-sm">
        Ссылка для входа отправлена на почту
      </p>
      <p v-if="error" class="text-red-600 text-center mt-4 text-sm">{{ error }}</p>
    </div>
  </div>
</template>
