export function todayInTz(timezone: string): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatter.format(now)
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  tries = 3,
): Promise<T> {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (e: any) {
      if (e?.status === 429 && i < tries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** i))
      } else {
        throw e
      }
    }
  }
  throw new Error("unreachable")
}

export async function getTodayTotals(
  client: any,
  userId: string,
  date: string,
) {
  const { data } = await client
    .from("food_logs")
    .select("calories, protein_g, carb_g, fat_g")
    .eq("user_id", userId)
    .eq("log_date", date)

  return {
    kcal: Math.round((data ?? []).reduce((s: number, r: any) => s + (r.calories ?? 0), 0)),
    protein: Math.round((data ?? []).reduce((s: number, r: any) => s + (r.protein_g ?? 0), 0)),
    carb: Math.round((data ?? []).reduce((s: number, r: any) => s + (r.carb_g ?? 0), 0)),
    fat: Math.round((data ?? []).reduce((s: number, r: any) => s + (r.fat_g ?? 0), 0)),
  }
}
