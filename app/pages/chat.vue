<script setup lang="ts">
const user = useSupabaseUser()

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  parts: { type: "text"; text: string }[]
  items?: any[]
}

const messages = ref<ChatMessage[]>([])
const input = ref("")
const loading = ref(false)
const chatError = ref("")

const {
  supported: voiceSupported,
  listening,
  start: startVoice,
  stop: stopVoice,
} = useSpeech((text) => {
  input.value = text
  send()
})

async function send() {
  const msg = input.value.trim()
  if (!msg || loading.value) return

  messages.value.push({ id: String(Date.now()), role: "user", content: msg, parts: [{ type: "text", text: msg }] })
  input.value = ""
  loading.value = true
  chatError.value = ""

  try {
    const data = await $fetch("/api/chat", {
      method: "POST",
      body: { message: msg },
    })

    const store = useCalorieStore()
    if (user.value?.sub) store.updateAfterChat(user.value.sub)

    messages.value.push({
      id: String(Date.now()),
      role: "assistant",
      content: data.reply,
      parts: [{ type: "text", text: data.reply }],
      items: data.items,
    })
  } catch (e: any) {
    if (e?.status === 429) {
      chatError.value = "Слишком частые запросы, попробуйте через минуту"
    } else {
      chatError.value = "Ошибка при обработке запроса"
    }
  }

  loading.value = false
}

function toggleVoice() {
  if (listening.value) stopVoice()
  else startVoice()
}
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-8rem)] p-4 max-w-md mx-auto">
    <h1 class="text-2xl font-bold mb-4">AI Чат</h1>

    <UChatMessages
      :messages="messages"
      :status="loading ? 'submitted' : 'ready'"
      should-auto-scroll
      should-scroll-to-bottom
      :user="{ side: 'right', variant: 'soft' }"
      :assistant="{ side: 'left', variant: 'naked' }"
    >
      <template #content="{ message }">
        <p>{{ message.content }}</p>
        <div v-if="message.items?.length" class="mt-2 space-y-2">
          <div
            v-for="(item, j) in message.items"
            :key="j"
            class="bg-gray-50 rounded-xl p-3 text-sm"
          >
            <p class="font-medium">{{ item.food_name }}</p>
            <p class="text-gray-500">
              {{ item.grams ? `${item.grams} г` : "" }}
              • {{ item.calories }} ккал (Б: {{ item.protein_g ?? 0 }} Ж:
              {{ item.fat_g ?? 0 }} У: {{ item.carb_g ?? 0 }})
            </p>
            <p v-if="item.assumption" class="text-xs text-gray-400 italic">
              {{ item.assumption }}
            </p>
          </div>
        </div>
      </template>
    </UChatMessages>

    <UChatPrompt
      v-model="input"
      placeholder="Например: съел 100г риса и куриную грудку"
      :loading="loading"
      :error="chatError ? new Error(chatError) : undefined"
      @submit="send"
      class="mt-4"
    >
      <template #leading>
        <UButton
          v-if="voiceSupported"
          icon="i-lucide-mic"
          :color="listening ? 'error' : 'neutral'"
          variant="ghost"
          size="sm"
          @click="toggleVoice"
        />
      </template>
      <template #trailing>
        <UButton
          icon="i-lucide-send"
          color="primary"
          variant="solid"
          size="sm"
          type="submit"
          :disabled="loading || !input.trim()"
        />
      </template>
    </UChatPrompt>
  </div>
</template>
