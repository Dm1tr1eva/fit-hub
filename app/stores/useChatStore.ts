export type FoodItem = {
  food_name: string
  grams?: number | null
  calories: number
  protein_g?: number
  fat_g?: number
  carb_g?: number
  assumption?: string | null
}

export type ChatRow = {
  id: string
  role: "user" | "assistant"
  content: string
  items: FoodItem[] | null
  created_at: string
}

export const useChatStore = defineStore("chat", () => {
  // Cached chat history — kept across navigation (stale-while-revalidate).
  const messages = ref<ChatRow[]>([])
  const loaded = ref(false)
  let inflight: Promise<void> | null = null

  async function loadHistory(userId: string) {
    if (inflight) return inflight

    inflight = (async () => {
      const client = useSupabaseClient()
      const { data } = await client
        .from("chat_messages")
        .select("id, role, content, items, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(500)

      if (data) messages.value = data as ChatRow[]
      loaded.value = true
    })().finally(() => {
      inflight = null
    })

    return inflight
  }

  /** Append a message locally (optimistic) — it's already persisted server-side. */
  function append(row: ChatRow) {
    messages.value.push(row)
  }

  return { messages, loaded, loadHistory, append }
})
