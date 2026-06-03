<script setup lang="ts">
import type { ChatRow, FoodItem } from "~/stores/useChatStore"

const user = useSupabaseUser()
const chatStore = useChatStore()

const { style: panelStyle, dragging, ensureInit, startDrag, startResize } = useDragResize()

type ChatResponse = {
  reply: string
  items?: FoodItem[]
  totals?: unknown
}

const open = ref(false)
const input = ref("")
const loading = ref(false)
const chatError = ref("")
const scrollEl = ref<HTMLElement | null>(null)
let historyLoaded = false

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

// ---- history rendering: day separators + per-message time ----
const today = new Date()

function dayLabel(d: Date): string {
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

type RenderItem =
  | { type: "sep"; id: string; label: string }
  | { type: "msg"; id: string; msg: ChatRow }

const rendered = computed<RenderItem[]>(() => {
  const out: RenderItem[] = []
  let lastDay = ""
  for (const m of chatStore.messages) {
    const d = new Date(m.created_at)
    const key = d.toDateString()
    if (key !== lastDay) {
      out.push({ type: "sep", id: `sep-${key}`, label: dayLabel(d) })
      lastDay = key
    }
    out.push({ type: "msg", id: m.id, msg: m })
  }
  return out
})

function scrollToBottom() {
  const el = scrollEl.value
  if (el) el.scrollTop = el.scrollHeight
}
const scrollSoon = () => nextTick(scrollToBottom)

async function toggle() {
  if (open.value) {
    open.value = false
    return
  }

  ensureInit() // restore saved position/size (or center a default) before showing
  open.value = true

  // Lazy-load history on first open so we don't hit the DB on app start.
  if (!historyLoaded && user.value?.sub) {
    historyLoaded = true
    await chatStore.loadHistory(user.value.sub)
  }
  scrollSoon()
}

async function send() {
  const msg = input.value.trim()
  if (!msg || loading.value) return

  const now = Date.now()
  chatStore.append({
    id: `local-${now}`,
    role: "user",
    content: msg,
    items: null,
    created_at: new Date(now).toISOString(),
  })
  input.value = ""
  loading.value = true
  chatError.value = ""
  scrollSoon()

  try {
    const data = await $fetch<ChatResponse>("/api/chat", {
      method: "POST",
      body: { message: msg },
    })

    if (user.value?.sub) useCalorieStore().updateAfterChat(user.value.sub)

    chatStore.append({
      id: `local-${Date.now()}`,
      role: "assistant",
      content: data.reply,
      items: data.items?.length ? data.items : null,
      created_at: new Date().toISOString(),
    })
    scrollSoon()
  } catch (e: any) {
    chatError.value =
      e?.status === 429
        ? "Too many requests, try again in a minute"
        : "Something went wrong"
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- Launcher button (hidden while the panel is open) -->
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 scale-75"
    leave-active-class="transition duration-100 ease-in"
    leave-to-class="opacity-0 scale-75"
  >
    <button
      v-if="!open"
      type="button"
      aria-label="Open AI chat"
      class="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-colors hover:bg-blue-700 active:scale-95"
      @click="toggle"
    >
      <UIcon name="i-lucide-message-circle" class="h-6 w-6" />
    </button>
  </Transition>

  <!-- Floating chat window -->
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-4 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-4 scale-95"
  >
    <div
      v-if="open"
      :style="panelStyle"
      class="fixed z-40 flex origin-bottom flex-col overflow-hidden rounded-2xl bg-gray-50 shadow-2xl ring-1 ring-gray-200"
      :class="{ 'select-none': dragging }"
    >
      <!-- Header doubles as the drag handle -->
      <header
        class="flex shrink-0 cursor-move touch-none select-none items-center justify-between border-b border-gray-200 bg-white px-4 py-3"
        @pointerdown="startDrag"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-sparkles" class="h-5 w-5 text-blue-600" />
          <h2 class="font-semibold">AI Chat</h2>
        </div>
        <button
          type="button"
          data-no-drag
          aria-label="Close"
          class="text-gray-400 hover:text-gray-700"
          @click="toggle"
        >
          <UIcon name="i-lucide-x" class="h-5 w-5" />
        </button>
      </header>

      <!-- Scrollable conversation -->
      <div
        ref="scrollEl"
        class="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-2"
      >
        <template v-for="row in rendered" :key="row.id">
          <!-- Day separator -->
          <div
            v-if="row.type === 'sep'"
            class="my-1 flex items-center gap-3 text-xs text-gray-400"
          >
            <span class="h-px flex-1 bg-gray-200" />
            {{ row.label }}
            <span class="h-px flex-1 bg-gray-200" />
          </div>

          <!-- Message bubble -->
          <div
            v-else
            class="flex"
            :class="row.msg.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[82%] rounded-2xl px-3 py-2"
              :class="
                row.msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 shadow-sm'
              "
            >
              <p v-if="row.msg.content" class="whitespace-pre-wrap break-words">
                {{ row.msg.content }}
              </p>

              <div v-if="row.msg.items?.length" class="mt-2 space-y-2">
                <div
                  v-for="(item, j) in row.msg.items"
                  :key="j"
                  class="rounded-xl bg-gray-50 p-3 text-sm text-gray-800"
                >
                  <p class="font-medium">{{ item.food_name }}</p>
                  <p class="text-gray-500">
                    {{ item.grams ? `${item.grams} g · ` : "" }}{{ item.calories }} kcal
                    (P: {{ item.protein_g ?? 0 }} · F: {{ item.fat_g ?? 0 }} · C:
                    {{ item.carb_g ?? 0 }})
                  </p>
                  <p v-if="item.assumption" class="mt-0.5 text-xs italic text-gray-400">
                    {{ item.assumption }}
                  </p>
                </div>
              </div>

              <p
                class="mt-1 text-[10px] leading-none"
                :class="row.msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'"
              >
                {{ formatTime(row.msg.created_at) }}
              </p>
            </div>
          </div>
        </template>

        <!-- Typing indicator -->
        <div v-if="loading" class="flex justify-start">
          <div class="flex gap-1 rounded-2xl bg-white px-4 py-3 shadow-sm">
            <span class="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:0ms]" />
            <span class="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:150ms]" />
            <span class="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:300ms]" />
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="!chatStore.messages.length && !loading"
          class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center"
        >
          <UIcon name="i-lucide-message-square-text" class="h-10 w-10 text-gray-300" />
          <p class="text-sm text-gray-400">
            Describe what you ate — I'll count the calories and macros.
          </p>
          <p class="text-xs text-gray-300">e.g. "ate 100 g of rice and a chicken breast"</p>
        </div>
      </div>

      <!-- Prompt -->
      <div class="shrink-0 border-t border-gray-200 bg-white px-3 pt-2 pb-3">
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
            aria-label="Cancel recording"
            @click="cancelVoice"
          />

          <div class="flex min-h-[44px] min-w-0 flex-1 flex-col justify-center gap-1">
            <div v-if="voiceMode === 'speech'" class="flex items-center gap-2">
              <span class="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
              <p class="line-clamp-2 text-sm text-gray-700">
                {{ input || "Listening…" }}
              </p>
            </div>

            <template v-else>
              <div class="flex h-7 items-center justify-between">
                <span
                  v-for="(lvl, i) in voiceLevels"
                  :key="i"
                  class="w-[3px] rounded-full bg-red-500 transition-[height] duration-75"
                  :style="{ height: `${Math.max(3, Math.round(lvl * 28))}px` }"
                />
              </div>
              <p class="text-xs text-gray-500">Speak… tap ✓ when done</p>
            </template>
          </div>

          <UButton
            icon="i-lucide-check"
            color="primary"
            variant="solid"
            size="sm"
            aria-label="Done"
            @click="voiceStop"
          />
        </div>

        <!-- Transcribing -->
        <div
          v-else-if="transcribing"
          class="flex h-[58px] items-center justify-center gap-2 rounded-lg bg-gray-100 text-sm text-gray-500"
        >
          <UIcon name="i-lucide-loader-circle" class="h-4 w-4 animate-spin" />
          Transcribing…
        </div>

        <UChatPrompt
          v-else
          v-model="input"
          :placeholder="loading ? 'Processing…' : 'e.g. ate 100g of rice'"
          :autofocus="false"
          :maxrows="5"
          @submit="send"
        >
          <template #footer>
            <ClientOnly>
              <UButton
                v-if="voiceSupported"
                icon="i-lucide-mic"
                color="neutral"
                variant="ghost"
                size="sm"
                :disabled="loading"
                aria-label="Voice input"
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

      <!-- Resize handle (bottom-right corner) -->
      <div
        class="absolute bottom-1.5 right-1.5 z-20 h-4 w-4 cursor-nwse-resize touch-none"
        aria-label="Resize window"
        @pointerdown="startResize"
      >
        <span class="absolute bottom-0 right-0 h-2.5 w-2.5 border-b-2 border-r-2 border-gray-400" />
      </div>
    </div>
  </Transition>
</template>
