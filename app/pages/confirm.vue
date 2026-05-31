<script setup lang="ts">
const supabase = useSupabaseClient()
const router = useRouter()

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  if (data?.session) {
    router.push("/")
  } else {
    router.push("/login")
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <p class="text-gray-500">Подтверждение входа...</p>
  </div>
</template>
