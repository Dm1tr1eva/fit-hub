<script setup lang="ts">
definePageMeta({
  layout: false,
})

const supabase = useSupabaseClient()
const email = ref("")
const password = ref("")
const loading = ref(false)
const error = ref("")
const isRegister = ref(false)

async function submit() {
  loading.value = true
  error.value = ""

  const fn = isRegister.value
    ? supabase.auth.signUp({ email: email.value, password: password.value })
    : supabase.auth.signInWithPassword({ email: email.value, password: password.value })

  const { data, error: err } = await fn
  if (err) {
    error.value = err.message
  } else if (data?.user) {
    navigateTo("/")
  }
  loading.value = false
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
      <p class="text-gray-500 text-center mb-6">Трекер калорий с AI</p>

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
          placeholder="Пароль"
          class="w-full px-4 py-3 border border-gray-300 rounded-xl text-center"
          :disabled="loading"
        />
        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
          :disabled="loading || !email || !password"
        >
          {{ loading ? "Загрузка..." : isRegister ? "Зарегистрироваться" : "Войти" }}
        </button>
      </form>

      <p v-if="error" class="text-red-600 text-center mt-4 text-sm">{{ error }}</p>

      <p class="text-center mt-4 text-sm text-gray-500">
        <button class="text-blue-600 underline" @click="toggleMode">
          {{ isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться" }}
        </button>
      </p>
    </div>
  </div>
</template>
