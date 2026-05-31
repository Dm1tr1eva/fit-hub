interface ProfileInput {
  sex: "male" | "female"
  age: number
  height_cm: number
  weight_kg: number
  activity_level: string
  goal: string
}

interface DailyGoals {
  daily_calorie_goal: number
  daily_protein_g: number
  daily_fat_g: number
  daily_carb_g: number
}

const activityFactors: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export function calcDailyGoals(p: ProfileInput): DailyGoals {
  const bmr =
    10 * p.weight_kg +
    6.25 * p.height_cm -
    5 * p.age +
    (p.sex === "male" ? 5 : -161)

  let kcal = bmr * (activityFactors[p.activity_level] ?? 1.2)
  kcal += p.goal === "lose" ? -500 : p.goal === "gain" ? 400 : 0
  kcal = Math.round(kcal)

  const protein = Math.round(p.weight_kg * 1.8)
  const fat = Math.round((kcal * 0.25) / 9)
  const carb = Math.round((kcal - protein * 4 - fat * 9) / 4)

  return {
    daily_calorie_goal: kcal,
    daily_protein_g: protein,
    daily_fat_g: fat,
    daily_carb_g: carb,
  }
}
