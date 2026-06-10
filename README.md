# Fit Hub

AI-powered calorie tracker. Describe what you ate in plain words — Gemini parses the food and logs the macros. Track your daily progress, browse your week history, and manage favourite meals.

## Features

- **AI chat** — type anything ("had a bowl of borscht and a glass of kefir"), Gemini identifies the food and calories
- **Voice input** — Web Speech API in Chrome/Edge, Gemini transcription as a fallback
- **Calorie ring** — visual progress toward your daily goal with a protein/fat/carb breakdown
- **Week chart** — 7-day bar chart; click any day to see its meals and update the ring accordingly
- **Favourites** — save frequent meals for quick re-logging
- **Profile** — gender, age, height, weight, activity level, goal → automatic calorie and macro targets

## Stack

| Layer | Technologies |
|---|---|
| Framework | Nuxt 4, Vue 3 (Composition API) |
| UI | @nuxt/ui, Tailwind CSS v4, Lucide icons |
| State | Pinia |
| Database + Auth | Supabase (PostgreSQL + Auth) |
| AI | Google Gemini 2.5 Flash |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```env
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_KEY=<anon-public-key>
GEMINI_API_KEY=<google-ai-studio-key>

# Optional — used for OAuth redirects (defaults to http://localhost:3000)
SITE_URL=https://yourdomain.com
```

### 3. Database

Run the migration in the Supabase SQL Editor:

```
server/db/001_initial.sql
```

This creates the `profiles` and `food_logs` tables, enables Row Level Security, and adds a trigger that auto-creates a profile on sign-up.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev       # development server
npm run build     # production build
npm run preview   # preview production build
```

## Project Structure

```
app/
├── pages/
│   ├── index.vue        # Progress dashboard (home)
│   ├── chat.vue         # AI chat for logging food
│   └── profile.vue      # Profile and goals
├── components/
│   ├── CalorieSummary.vue   # Calorie ring + macros
│   ├── WeekChart.vue        # 7-day bar chart
│   ├── DayMeals.vue         # Meal list for a selected day
│   ├── FoodEntryModal.vue   # Add / edit meal form
│   ├── ChatWidget.vue       # Floating AI chat widget
│   └── FavoritesSheet.vue   # Favourites panel
├── stores/
│   ├── useCalorieStore.ts   # Meals, goals, week data
│   └── useFavoritesStore.ts # Favourites and frequent foods
server/
├── api/
│   ├── chat.post.ts         # Gemini: parse food from text
│   ├── transcribe.post.ts   # Gemini: voice transcription
│   ├── food-log.ts          # Food log CRUD
│   └── profile.ts           # User profile
└── db/
    └── 001_initial.sql      # Database schema
```

## Database

**`profiles`** — user parameters and calculated daily targets (calories, protein, fat, carbs).

**`food_logs`** — one row per recognised food item: date, name, grams, calories, macros.

Row Level Security is enabled on both tables — users can only access their own data.
