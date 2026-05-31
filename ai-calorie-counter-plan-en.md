# Implementation Plan: AI Calorie Counter (pet project)

> Handoff document for an implementation agent (e.g. Claude Code).
> Contains stack, architecture, DB schema, prompts, key snippets, and a phased plan.

---

## 1. Product overview

A web app for calorie counting where **food parsing and macro calculation are done by an LLM**. The user types (or dictates) what they ate; the AI recognizes the foods, estimates calories/macros, and subtracts them from the daily goal.

Three tabs:
1. **Progress** — daily goal (e.g. 2000 kcal) and a progress bar that decreases as calories are logged. Plus macros (P/F/C) and history.
2. **Profile** — user data (sex, age, height, weight, activity, goal). Daily goal is derived from this.
3. **AI chat** — text or voice input. Example: "ate 100g of rice" → bot: "≈300 kcal" → progress shows 1700 of 2000 remaining.

---

## 2. Key assumptions (fixed, but changeable)

- **Single user / lightweight auth.** Use Supabase Auth (email magic-link); architecture also works single-user. Auth lets progress and profile persist across devices and days.
- **Daily goal is computed with a formula (Mifflin-St Jeor), not the AI.** Deterministic and reliable. The AI is used only where it adds value — parsing free-text food descriptions and estimating calories. (Could be delegated to the AI, but not recommended.)
- **User timezone** — Europe/Berlin. "Day" is the user's local date (important for grouping logs).
- **UI and input language** — Russian (the AI must understand Russian food descriptions).
- **Non-commercial use** (matters due to Gemini free-tier restrictions in the EU).

---

## 3. Tech stack (all free)

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | **Nuxt 4 (Vue 3, `<script setup>`)** | Current stable version (latest); SSR/SPA, strong PWA support. Source under `app/`, `server/` at root |
| Backend | **Nitro server routes** (inside Nuxt, `server/api/*`) | No separate backend; Gemini key stays server-side |
| Styling | **Tailwind CSS** (`@nuxtjs/tailwindcss`) | Fast mobile-first layout |
| UI components | **@nuxt/ui** (optional) or plain Tailwind | Accessible ready-made components |
| State | **Pinia** (`@pinia/nuxt`) | Nuxt standard |
| DB + Auth | **Supabase** (Postgres + Auth + RLS), free tier | 500 MB DB, built-in auth; `@nuxtjs/supabase` module |
| LLM | **Google Gemini 2.5 Flash** (free tier) | Food parsing → structured JSON |
| Gemini SDK | **`@google/genai`** (official JS SDK) | Called **server-side only** |
| Voice input | **Web Speech API** (`SpeechRecognition`) | Native, free, supports `ru-RU` |
| Charts | SVG progress ring + **Chart.js** (`vue-chartjs`) for history | Lightweight, free |
| Hosting | **Vercel** or **Cloudflare Pages** | Free Nuxt deploy; Supabase separate |
| PWA | `@vite-pwa/nuxt` | Installable, offline shell cache |

---

## 4. LLM choice & Gemini free-tier notes

- **Model:** `gemini-2.5-flash`.
- **Free-tier limits (2026):** 10 req/min, 250 req/day, context up to 1M tokens. More than enough for personal use.
- **Structured output:** use `responseMimeType: "application/json"` + `responseSchema` so the AI always returns valid JSON.
- **429 handling:** implement exponential backoff (1s → 2s → 4s) server-side.
- **Privacy:** on the free tier, prompts may be used for training. Fine for a pet project; don't send sensitive data.
- **API key** in `.env` (`GEMINI_API_KEY`), used **only** in `server/` routes. Never expose it client-side.

---

## 5. Architecture

```
[ Browser / PWA (Nuxt SPA) ]
   │  ├─ Progress tab (reads today's aggregates)
   │  ├─ Profile tab (profile CRUD)
   │  └─ Chat tab (text/voice input)
   │
   │  fetch POST /api/chat   (user text)
   ▼
[ Nitro server route /api/chat ]
   │  1. Verify auth session
   │  2. Call Gemini 2.5 Flash (structured output) → food JSON
   │  3. Save records to Supabase (food_logs)
   │  4. Return parsed items + updated aggregates
   ▼
[ Supabase Postgres (RLS) ]
   profiles, food_logs
```

Data flow for "ate 100g of rice":
1. Client → `POST /api/chat { message }`.
2. Server → Gemini with system prompt → `{ items: [{name, grams, calories, protein, carbs, fat, assumption}], reply }`.
3. Server writes each item to `food_logs` (with `user_id`, `date`).
4. Server recomputes today's totals and returns them.
5. Client updates progress bar: `remaining = daily_goal − consumed_today`.

---

## 6. DB schema (Supabase / Postgres)

```sql
-- User profile
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  sex text check (sex in ('male','female')),
  age int check (age between 5 and 120),
  height_cm numeric check (height_cm between 50 and 260),
  weight_kg numeric check (weight_kg between 20 and 400),
  activity_level text check (activity_level in
    ('sedentary','light','moderate','active','very_active')),
  goal text check (goal in ('lose','maintain','gain')),
  -- cached computed goals (recomputed when profile is saved):
  daily_calorie_goal int,
  daily_protein_g int,
  daily_fat_g int,
  daily_carb_g int,
  timezone text default 'Europe/Berlin',
  updated_at timestamptz default now()
);

-- Food log (one row = one recognized food item)
create table food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,                -- user's local date
  raw_message text,                      -- what the user typed
  food_name text not null,
  grams numeric,
  calories numeric not null,
  protein_g numeric default 0,
  carb_g numeric default 0,
  fat_g numeric default 0,
  assumption text,                       -- AI's assumption (if portion unspecified)
  created_at timestamptz default now()
);

create index on food_logs (user_id, log_date);

-- Row Level Security: each user sees only their own data
alter table profiles  enable row level security;
alter table food_logs enable row level security;

create policy "own profile"  on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own logs"     on food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Daily aggregate via query (or RPC function):
```sql
select coalesce(sum(calories),0) as kcal,
       coalesce(sum(protein_g),0) as protein,
       coalesce(sum(carb_g),0)   as carb,
       coalesce(sum(fat_g),0)    as fat
from food_logs
where user_id = auth.uid() and log_date = current_date;
```

---

## 7. Daily goal calculation (formula, client/server)

**Mifflin-St Jeor (BMR):**
- Men: `BMR = 10*weight(kg) + 6.25*height(cm) − 5*age + 5`
- Women: `BMR = 10*weight + 6.25*height − 5*age − 161`

**TDEE = BMR × activity factor:**
| activity_level | factor |
|---|---|
| sedentary | 1.2 |
| light | 1.375 |
| moderate | 1.55 |
| active | 1.725 |
| very_active | 1.9 |

**Goal adjustment:**
- `lose` → −500 kcal
- `maintain` → 0
- `gain` → +400 kcal

**Macros (defaults):** protein `1.8 g/kg`, fat `25%` of calories (`/9`), carbs — remainder (`/4`).

```ts
// server/utils/nutrition.ts
export function calcDailyGoals(p: {
  sex: 'male'|'female'; age: number; height_cm: number;
  weight_kg: number; activity_level: string; goal: string;
}) {
  const af: Record<string, number> = {
    sedentary:1.2, light:1.375, moderate:1.55, active:1.725, very_active:1.9 };
  const bmr = 10*p.weight_kg + 6.25*p.height_cm - 5*p.age + (p.sex==='male'?5:-161);
  let kcal = bmr * (af[p.activity_level] ?? 1.2);
  kcal += p.goal==='lose' ? -500 : p.goal==='gain' ? 400 : 0;
  kcal = Math.round(kcal);
  const protein = Math.round(p.weight_kg * 1.8);
  const fat = Math.round((kcal * 0.25) / 9);
  const carb = Math.round((kcal - protein*4 - fat*9) / 4);
  return { daily_calorie_goal: kcal, daily_protein_g: protein,
           daily_fat_g: fat, daily_carb_g: carb };
}
```
Recompute on every profile save and store into `profiles`.

---

## 8. Gemini integration (app core)

### System prompt (example)
```
You are a nutrition assistant. The user writes in Russian what they ate/drank.
Tasks:
1. Identify all foods and their quantities.
2. If portion/grams are unspecified, assume a standard portion and state it in "assumption".
3. Estimate calories and macros (protein, fat, carbs) for each food.
4. Return strictly JSON matching the given schema, no text outside the JSON.
5. In "reply", give a short friendly Russian response with the total calories.
If the message is not about food, return empty items and a polite reply.
```

### Structured output (responseSchema)
```ts
const schema = {
  type: "object",
  properties: {
    reply: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          food_name: { type: "string" },
          grams:     { type: "number" },
          calories:  { type: "number" },
          protein_g: { type: "number" },
          carb_g:    { type: "number" },
          fat_g:     { type: "number" },
          assumption:{ type: "string" }
        },
        required: ["food_name","calories"]
      }
    }
  },
  required: ["reply","items"]
};
```

### Server route (simplified)
```ts
// server/api/chat.post.ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default defineEventHandler(async (event) => {
  const { message } = await readBody(event);
  const user = await serverSupabaseUser(event);        // from @nuxtjs/supabase
  if (!user) throw createError({ statusCode: 401 });

  const result = await withBackoff(() => ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: message,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  }));

  const data = JSON.parse(result.text);               // { reply, items }

  // save to food_logs (user's local date)
  const client = serverSupabaseClient(event);
  const today = todayInTz(profile.timezone);
  for (const it of data.items) {
    await client.from("food_logs").insert({
      user_id: user.id, log_date: today, raw_message: message,
      food_name: it.food_name, grams: it.grams ?? null,
      calories: it.calories, protein_g: it.protein_g ?? 0,
      carb_g: it.carb_g ?? 0, fat_g: it.fat_g ?? 0,
      assumption: it.assumption ?? null,
    });
  }

  const totals = await getTodayTotals(client, user.id, today);
  return { reply: data.reply, items: data.items, totals };
});

// exponential backoff on 429
async function withBackoff<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e: any) {
      if (e?.status === 429 && i < tries-1)
        await new Promise(r => setTimeout(r, 1000 * 2**i));
      else throw e;
    }
  }
  throw new Error("unreachable");
}
```

---

## 9. Speech recognition (Web Speech API)

Native and free. Support: Chrome (Android/desktop) — great; Safari iOS 14.5+ — present but less stable. Implement as **progressive enhancement**: show the mic button only when the API is available.

```ts
// app/composables/useSpeech.ts  (in Nuxt 4 composables live under app/)
export function useSpeech(onResult: (text: string) => void) {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const supported = !!SR;
  let rec: any;
  const listening = ref(false);
  function start() {
    if (!supported) return;
    rec = new SR();
    rec.lang = "ru-RU";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => onResult(e.results[0][0].transcript);
    rec.onend = () => (listening.value = false);
    rec.start();
    listening.value = true;
  }
  function stop() { rec?.stop(); }
  return { supported, listening, start, stop };
}
```
The recognized text is inserted into the chat input, then sent to `/api/chat` as usual. (Fallback for iOS reliability: send audio to Gemini as multimodal input — more complex, defer.)

---

## 10. Tabs (UI), mobile-first

Bottom navigation with 3 icons (native-app style): **Progress / Chat / Profile**.

### Progress
- Large **circular progress ring** (SVG): "1700 / 2000 kcal remaining".
- Three mini-bars below: Protein / Fat / Carbs (consumed vs goal).
- List of today's meals (from `food_logs`), each showing `assumption` if any.
- Bottom: weekly calorie chart (Chart.js).
- Reactively updates after a chat reply (shared Pinia store).

### Chat
- Message feed (user / AI).
- Input field + send button + mic button (if `supported`).
- Loading state, error handling (incl. 429 → "too frequent, try again in a minute").
- After reply: show recognized foods as cards with calories.

### Profile
- Form: name, sex, age, height, weight, activity level, goal.
- On save → recompute goals (`calcDailyGoals`) → write to `profiles`.
- Display computed daily goal and macros.

---

## 11. PWA & mobile adaptation

- `@vite-pwa/nuxt`: manifest (icons, `display: standalone`, theme-color), service worker for shell cache.
- Viewport meta, `safe-area-inset` for the bottom nav (iPhone notch).
- Touch targets ≥ 44px, large fonts, `inputmode="decimal"` for numeric fields.
- Test in Chrome DevTools (device toolbar) + on a real phone.

---

## 12. Security

- `GEMINI_API_KEY` and Supabase service keys — server environment only (`.env`, host env vars).
- Send only the Supabase **anon** key to the client (public by design + RLS).
- RLS enabled on all tables (see §6) — users see only their own data.
- Validate inputs server-side (message length, profile numeric bounds).
- App-side rate limit on `/api/chat` (protect against accidental spam and save Gemini quota).

---

## 13. Phased implementation plan (for the executor)

**Phase 0 — Scaffold**
- [ ] `npx nuxi init` (scaffolds Nuxt 4: source under `app/`, `server/` at root), add `@nuxtjs/tailwindcss`, `@pinia/nuxt`, `@nuxtjs/supabase`, `@vite-pwa/nuxt`, `@google/genai`.
- [ ] Bottom navigation + 3 empty tab pages.
- [ ] `.env`: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`.

**Phase 1 — Supabase + Auth**
- [ ] Create Supabase project, run SQL from §6 (tables + RLS).
- [ ] Wire up `@nuxtjs/supabase`, set up magic-link auth.
- [ ] Middleware: redirect unauthenticated users to login.

**Phase 2 — Profile + goal**
- [ ] Profile form, save to `profiles`.
- [ ] `calcDailyGoals` server-side, store computed goals.

**Phase 3 — Chat + Gemini (core)**
- [ ] `server/api/chat.post.ts`: Gemini call with structured output + backoff.
- [ ] Save `food_logs`, return `reply` + `items` + `totals`.
- [ ] Chat UI, Pinia store for daily aggregates.

**Phase 4 — Progress**
- [ ] Circular ring + macro bars, today's meals list.
- [ ] Weekly chart (Chart.js).
- [ ] Reactive sync with chat.

**Phase 5 — Voice**
- [ ] `useSpeech`, mic button (only when supported).

**Phase 6 — PWA + polish**
- [ ] Manifest, service worker, icons.
- [ ] Safe-area, touch targets, test on phone.
- [ ] Error and empty states.

**Phase 7 — Deploy**
- [ ] Deploy to Vercel/Cloudflare Pages, set env vars.
- [ ] Verify in production (auth, chat, progress, voice).

---

## 14. Possible improvements (post-MVP)

- Edit/delete a logged meal (if the AI got grams wrong).
- Clarifying questions from the AI on ambiguous portions.
- Weekly/monthly history, weight trend.
- Cache for frequent foods (fewer Gemini calls → save quota).
- Food photo → recognition via Gemini multimodal input.
- Data export (CSV).
- Group meals as breakfast/lunch/dinner.

---

## Appendix: start commands

```bash
npx nuxi init ai-calorie-counter
cd ai-calorie-counter
npm i @nuxtjs/tailwindcss @pinia/nuxt @nuxtjs/supabase @vite-pwa/nuxt @google/genai vue-chartjs chart.js
# .env:
# GEMINI_API_KEY=...
# SUPABASE_URL=...
# SUPABASE_KEY=...(anon)
npm run dev
```
