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
    : { reply: "Не удалось распознать еду.", items: [] }

  if (raw.items?.length > 0) {
    const client = await getAuthedClient(event)
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

    const totals = await getTodayTotals(client, user.id, today)
    return { reply: raw.reply, items: raw.items, totals }
  }

  return { reply: raw.reply, items: [], totals: null }
})
