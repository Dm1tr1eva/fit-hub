<script setup lang="ts">
const user = useSupabaseUser();
const messages = ref<{ role: "user" | "ai"; text: string; items?: any[] }[]>(
  [],
);
const input = ref("");
const loading = ref(false);
const error = ref("");

const {
  supported: voiceSupported,
  listening,
  start: startVoice,
  stop: stopVoice,
} = useSpeech((text) => {
  input.value = text;
  send();
});

async function send() {
  const msg = input.value.trim();
  if (!msg || loading.value) return;

  messages.value.push({ role: "user", text: msg });
  input.value = "";
  loading.value = true;
  error.value = "";

  try {
    const data = await $fetch("/api/chat", {
      method: "POST",
      body: { message: msg },
    });

    const store = useCalorieStore();
    if (user.value?.sub) store.updateAfterChat(user.value.sub);

    messages.value.push({
      role: "ai",
      text: data.reply,
      items: data.items,
    });
  } catch (e: any) {
    if (e?.status === 429) {
      error.value = "Слишком частые запросы, попробуйте через минуту";
    } else {
      error.value = "Ошибка при обработке запроса";
    }
  }

  loading.value = false;
}

function toggleVoice() {
  if (listening.value) stopVoice();
  else startVoice();
}
</script>

<template>
  <div class="p-4 max-w-md mx-auto flex flex-col h-[calc(100vh-8rem)]">
    <h1 class="text-2xl font-bold mb-4">AI Чат</h1>

    <div class="flex-1 overflow-y-auto space-y-3 mb-4">
      <div v-for="(msg, i) in messages" :key="i">
        <div
          class="rounded-2xl px-4 py-3 max-w-[85%]"
          :class="
            msg.role === 'user'
              ? 'bg-blue-600 text-white ml-auto'
              : 'bg-white border border-gray-200'
          "
        >
          <p>{{ msg.text }}</p>
        </div>

        <div v-if="msg.items?.length" class="mt-2 space-y-2">
          <div
            v-for="(item, j) in msg.items"
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
      </div>

      <div v-if="loading" class="text-gray-400 text-sm">Думаю...</div>
      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
    </div>

    <div class="flex gap-2">
      <button
        v-if="voiceSupported"
        class="px-4 py-3 rounded-xl border border-gray-300 text-lg"
        :class="listening ? 'bg-red-100 border-red-400' : ''"
        @click="toggleVoice"
      >
        🎤
      </button>
      <textarea
        v-model="input"
        placeholder="Например: съел 100г риса и куриную грудку"
        class="flex-1 px-4 py-3 border border-gray-300 rounded-xl resize-none"
        rows="1"
        @keydown.enter.exact.prevent="send"
        @input="$event.target.style.height = 'auto'; $event.target.style.height = $event.target.scrollHeight + 'px'"
        :disabled="loading"
      />
      <button
        class="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50"
        :disabled="loading || !input.trim()"
        @click="send"
      >
        ➤
      </button>
    </div>
  </div>
</template>


