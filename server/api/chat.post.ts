import { GoogleGenAI } from "@google/genai"

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export default defineEventHandler(async (event) => {
  const user = await getServerUser(event)
  if (!user) throw createError({ statusCode: 401 })

  const { message } = await readBody(event)
  if (!message || typeof message !== "string") {
    throw createError({ statusCode: 400, message: "message is required" })
  }

  const result = await withBackoff(() =>
    ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  )

  const raw = result.text
    ? JSON.parse(result.text)
    : { reply: "Sorry, I couldn't read that.", items: [] }

  const client = await getAuthedClient(event)

  let totals = null
  if (raw.items?.length > 0) {
    const profile = await client
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .maybeSingle()

    const timezone = profile.data?.timezone ?? "Europe/Berlin"
    const today = todayInTz(timezone)

    for (const it of raw.items) {
      await client.from("food_logs").insert({
        user_id: user.id,
        log_date: today,
        raw_message: message,
        food_name: it.food_name,
        grams: it.grams ?? null,
        calories: it.calories,
        protein_g: it.protein_g ?? 0,
        carb_g: it.carb_g ?? 0,
        fat_g: it.fat_g ?? 0,
        assumption: it.assumption ?? null,
      })
    }

    totals = await getTodayTotals(client, user.id, today)
  }

  // Persist the conversation (both sides, including non-food messages). The 1ms
  // offset keeps the assistant reply sorting after the user message.
  const ts = Date.now()
  await client.from("chat_messages").insert([
    {
      user_id: user.id,
      role: "user",
      content: message,
      items: null,
      created_at: new Date(ts).toISOString(),
    },
    {
      user_id: user.id,
      role: "assistant",
      content: raw.reply,
      items: raw.items?.length ? raw.items : null,
      created_at: new Date(ts + 1).toISOString(),
    },
  ])

  return { reply: raw.reply, items: raw.items ?? [], totals }
})
