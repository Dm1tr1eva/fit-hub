export const SYSTEM_PROMPT = `You are a nutrition assistant. The user writes in Russian what they ate/drank.
Tasks:
1. Identify all foods and their quantities.
2. If portion/grams are unspecified, assume a standard portion and state it in "assumption".
3. Estimate calories and macros (protein, fat, carbs) for each food.
4. Return strictly JSON matching the given schema, no text outside the JSON.
5. In "reply", give a short friendly Russian response with the total calories.
If the message is not about food, return empty items and a polite reply.`

export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          food_name: { type: "string" },
          grams: { type: "number" },
          calories: { type: "number" },
          protein_g: { type: "number" },
          carb_g: { type: "number" },
          fat_g: { type: "number" },
          assumption: { type: "string" },
        },
        required: ["food_name", "calories"],
      },
    },
  },
  required: ["reply", "items"],
}
