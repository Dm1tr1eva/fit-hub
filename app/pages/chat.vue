<script setup lang="ts">
const user = useSupabaseUser()

type FoodItem = {
  food_name: string
  grams?: number | null
  calories: number
  protein_g?: number
  fat_g?: number
  carb_g?: number
  assumption?: string | null
}

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  parts: { type: "text"; text: string }[]
  items?: FoodItem[]
}

type ChatResponse = {
  reply: string
  items?: FoodItem[]
  totals?: unknown
}

const messages = ref<ChatMessage[]>([])
const input = ref("")
const loading = ref(false)
const chatError = ref("")

let seq = 0
const nextId = () => `${Date.now()}-${seq++}`

const {
  supported: voiceSupported,
  listening,
  transcribing,
  error: voiceError,
  mode: voiceMode,
  levels: voiceLevels,
  start: voiceStart,
  stop: voiceStop,
  cancel: voiceCancel,
} = useSpeech({
  // Live words as you speak (Web Speech path)…
  onPartial: (text) => {
    input.value = text
  },
  // …and the final transcript (both paths).
  onResult: (text) => {
    input.value = text
  },
})

const anyError = computed(() => chatError.value || voiceError.value)

function clearErrors() {
  chatError.value = ""
  voiceError.value = ""
}

function startVoice() {
  clearErrors()
  input.value = ""
  voiceStart()
}

function cancelVoice() {
  voiceCancel()
  input.value = ""
}

async function send() {
  const msg = input.value.trim()
  if (!msg || loading.value) return

  messages.value.push({
    id: nextId(),
    role: "user",
    content: msg,
    parts: [{ type: "text", text: msg }],
  })
  input.value = ""
  loading.value = true
  chatError.value = ""

  try {
    const data = await $fetch<ChatResponse>("/api/chat", {
      method: "POST",
      body: { message: msg },
    })

    if (user.value?.sub) {
      const store = useCalorieStore()
      store.updateAfterChat(user.value.sub)
    }

    messages.value.push({
      id: nextId(),
      role: "assistant",
      content: data.reply,
      parts: [{ type: "text", text: data.reply }],
      items: data.items,
    })
  } catch (e: any) {
    chatError.value =
      e?.status === 429
        ? "Слишком частые запросы, попробуйте через минуту"
        : "Ошибка при обработке запроса"
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- Fixed-height flex column: header / scrollable messages / pinned prompt.
       100dvh minus the 4rem bottom nav from the layout. -->
  <div class="mx-auto flex h-[calc(100dvh_-_4rem)] w-full max-w-md flex-col overflow-hidden">
    <header class="shrink-0 px-4 pt-4 pb-2">
      <h1 class="text-2xl font-bold">AI Чат</h1>
    </header>

    <!-- Scroll container. UChatMessages anchors its auto-scroll / spacing to
         this element, so it must be the one that scrolls (flex-1 + min-h-0). -->
    <div class="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-2">
      <UChatMessages
        :messages="messages"
        :status="loading ? 'submitted' : 'ready'"
        should-auto-scroll
        should-scroll-to-bottom
        :user="{ side: 'right', variant: 'soft' }"
        :assistant="{ side: 'left', variant: 'naked' }"
      >
        <template #content="{ message }">
          <p class="whitespace-pre-wrap break-words">{{ message.content }}</p>

          <div v-if="message.items?.length" class="mt-2 space-y-2">
            <div
              v-for="(item, j) in message.items"
              :key="j"
              class="rounded-xl bg-white p-3 text-sm shadow-sm"
            >
              <p class="font-medium">{{ item.food_name }}</p>
              <p class="text-gray-500">
                {{ item.grams ? `${item.grams} г · ` : "" }}{{ item.calories }} ккал
                (Б: {{ item.protein_g ?? 0 }} · Ж: {{ item.fat_g ?? 0 }} · У:
                {{ item.carb_g ?? 0 }})
              </p>
              <p v-if="item.assumption" class="mt-0.5 text-xs italic text-gray-400">
                {{ item.assumption }}
              </p>
            </div>
          </div>
        </template>
      </UChatMessages>

      <!-- Empty state, overlaid on the (empty) messages area -->
      <div
        v-if="messages.length === 0 && !loading"
        class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center"
      >
        <UIcon name="i-lucide-message-square-text" class="h-10 w-10 text-gray-300" />
        <p class="text-sm text-gray-400">
          Опишите, что вы съели — посчитаю калории и БЖУ.
        </p>
        <p class="text-xs text-gray-300">Например: «съел 100 г риса и куриную грудку»</p>
      </div>
    </div>

    <!-- Pinned prompt: shrink-0 so it never gets pushed off-screen -->
    <div class="shrink-0 border-t border-gray-200 px-4 pt-2 pb-3">
      <p
        v-if="anyError"
        class="mb-2 flex items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
      >
        <span>{{ anyError }}</span>
        <button
          type="button"
          class="shrink-0 text-red-400 hover:text-red-600"
          @click="clearErrors"
        >
          <UIcon name="i-lucide-x" class="h-4 w-4" />
        </button>
      </p>

      <!-- Recording: live transcript (Web Speech) or waveform (Gemini) -->
      <div
        v-if="listening"
        class="flex items-center gap-2 rounded-lg bg-red-50 px-2 py-2 ring-1 ring-red-200"
      >
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Отменить запись"
          @click="cancelVoice"
        />

        <div class="flex min-h-[44px] min-w-0 flex-1 flex-col justify-center gap-1">
          <!-- Web Speech: words appear live as you talk -->
          <div v-if="voiceMode === 'speech'" class="flex items-center gap-2">
            <span class="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
            <p class="line-clamp-2 text-sm text-gray-700">
              {{ input || "Слушаю… говорите" }}
            </p>
          </div>

          <!-- Gemini fallback: real waveform, transcript comes after ✓ -->
          <template v-else>
            <div class="flex h-7 items-center justify-between">
              <span
                v-for="(lvl, i) in voiceLevels"
                :key="i"
                class="w-[3px] rounded-full bg-red-500 transition-[height] duration-75"
                :style="{ height: `${Math.max(3, Math.round(lvl * 28))}px` }"
              />
            </div>
            <p class="text-xs text-gray-500">Говорите… нажмите ✓ когда закончите</p>
          </template>
        </div>

        <UButton
          icon="i-lucide-check"
          color="primary"
          variant="solid"
          size="sm"
          aria-label="Готово"
          @click="voiceStop"
        />
      </div>

      <!-- Transcribing: audio sent to the server, waiting for text -->
      <div
        v-else-if="transcribing"
        class="flex h-[58px] items-center justify-center gap-2 rounded-lg bg-gray-100 text-sm text-gray-500"
      >
        <UIcon name="i-lucide-loader-circle" class="h-4 w-4 animate-spin" />
        Распознаю речь…
      </div>

      <UChatPrompt
        v-else
        v-model="input"
        :placeholder="loading ? 'Обрабатываю…' : 'Например: съел 100г риса и куриную грудку'"
        :autofocus="false"
        :maxrows="6"
        @submit="send"
      >
        <!-- Buttons live in the footer toolbar, so a multi-line textarea
             grows above them instead of overlapping the icons. -->
        <template #footer>
          <!-- Voice is browser-only; ClientOnly keeps SSR/client markup in sync.
               The fallback span holds the left slot so Send stays right-aligned. -->
          <ClientOnly>
            <UButton
              v-if="voiceSupported"
              icon="i-lucide-mic"
              color="neutral"
              variant="ghost"
              size="sm"
              :disabled="loading"
              aria-label="Голосовой ввод"
              @click="startVoice"
            />
            <span v-else aria-hidden="true" />
            <template #fallback>
              <span aria-hidden="true" />
            </template>
          </ClientOnly>

          <UButton
            icon="i-lucide-send"
            color="primary"
            variant="solid"
            size="sm"
            type="submit"
            :loading="loading"
            :disabled="loading || !input.trim()"
          />
        </template>
      </UChatPrompt>
    </div>
  </div>
</template>
