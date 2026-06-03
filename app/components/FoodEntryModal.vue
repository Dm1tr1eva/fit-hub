<script setup lang="ts">
type FoodEntry = {
  id?: string
  food_name?: string | null
  grams?: number | null
  calories?: number | null
  protein_g?: number | null
  fat_g?: number | null
  carb_g?: number | null
}

const props = withDefaults(
  defineProps<{
    open: boolean
    entry: FoodEntry | null
    kind?: "log" | "favorite"
  }>(),
  { kind: "log" },
)

const emit = defineEmits<{
  "update:open": [boolean]
  submit: [Form]
}>()

type Form = {
  food_name: string
  grams: number | null
  calories: number | null
  protein_g: number | null
  fat_g: number | null
  carb_g: number | null
}

function emptyForm(): Form {
  return {
    food_name: "",
    grams: null,
    calories: null,
    protein_g: null,
    fat_g: null,
    carb_g: null,
  }
}

const form = ref<Form>(emptyForm())

const isEdit = computed(() => props.kind === "log" && !!props.entry?.id)

const title = computed(() =>
  props.kind === "favorite"
    ? "New card"
    : isEdit.value
      ? "Edit"
      : "Add product",
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const e = props.entry
    form.value = e
      ? {
          food_name: e.food_name ?? "",
          grams: e.grams ?? null,
          calories: e.calories ?? null,
          protein_g: e.protein_g ?? null,
          fat_g: e.fat_g ?? null,
          carb_g: e.carb_g ?? null,
        }
      : emptyForm()
  },
)

const canSave = computed(
  () =>
    form.value.food_name.trim() !== "" &&
    Number.isFinite(form.value.calories) &&
    (form.value.calories as number) >= 0,
)

function close() {
  emit("update:open", false)
}

// Closes immediately and hands the values to the parent, which persists them
// optimistically (and rolls back on failure).
function save() {
  if (!canSave.value) return
  emit("submit", { ...form.value })
  emit("update:open", false)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center"
        @click.self="close"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-6 opacity-0 sm:scale-95"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="translate-y-6 opacity-0 sm:scale-95"
          appear
        >
          <div class="neon-panel glow-cyan w-full max-w-sm rounded-2xl p-5">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-100">{{ title }}</h2>
              <button
                type="button"
                class="text-gray-500 hover:text-gray-200"
                aria-label="Close"
                @click="close"
              >
                <UIcon name="i-lucide-x" class="h-5 w-5" />
              </button>
            </div>

            <form class="space-y-3" @submit.prevent="save">
              <div>
                <label class="mb-1 block text-sm text-gray-400">Name</label>
                <input
                  v-model="form.food_name"
                  type="text"
                  placeholder="e.g. oatmeal"
                  class="w-full rounded-xl neon-input px-4 py-2"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-sm text-gray-400">Grams</label>
                  <input
                    v-model.number="form.grams"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="—"
                    class="w-full rounded-xl neon-input px-4 py-2"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-gray-400">Calories *</label>
                  <input
                    v-model.number="form.calories"
                    type="number"
                    min="0"
                    step="any"
                    class="w-full rounded-xl neon-input px-4 py-2"
                  />
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="mb-1 block text-sm text-gray-400">Protein</label>
                  <input
                    v-model.number="form.protein_g"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    class="w-full rounded-xl neon-input px-3 py-2"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-gray-400">Fat</label>
                  <input
                    v-model.number="form.fat_g"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    class="w-full rounded-xl neon-input px-3 py-2"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-gray-400">Carbs</label>
                  <input
                    v-model.number="form.carb_g"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    class="w-full rounded-xl neon-input px-3 py-2"
                  />
                </div>
              </div>

              <div class="flex gap-2 pt-2">
                <button
                  type="button"
                  class="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 font-medium text-gray-300 hover:bg-white/10"
                  @click="close"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn-neon flex-1 rounded-xl py-3 font-medium disabled:opacity-50 disabled:shadow-none"
                  :disabled="!canSave"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
