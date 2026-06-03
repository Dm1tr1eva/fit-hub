import { GoogleGenAI } from "@google/genai"

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Browser speech recognition (Web Speech API) only works in real Google Chrome
// and fails with a "network" error elsewhere. We transcribe server-side with
// Gemini instead, so voice input works in any browser.
export default defineEventHandler(async (event) => {
  const user = await getServerUser(event)
  if (!user) throw createError({ statusCode: 401 })

  const { audio, mimeType } = await readBody(event)
  if (!audio || typeof audio !== "string") {
    throw createError({ statusCode: 400, message: "audio is required" })
  }

  const result = await withBackoff(() =>
    ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "Transcribe the speech in this audio. Return only the transcribed " +
                "text in the language that is spoken — no quotes, comments, or " +
                "formatting. If there is no speech, return an empty string.",
            },
            { inlineData: { mimeType: mimeType || "audio/wav", data: audio } },
          ],
        },
      ],
    }),
  )

  return { text: (result.text ?? "").trim() }
})
