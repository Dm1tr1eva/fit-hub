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
        class="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
        @click.self="close"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-6 opacity-0 sm:scale-95"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="translate-y-6 opacity-0 sm:scale-95"
          appear
        >
          <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold">{{ title }}</h2>
              <button
                type="button"
                class="text-gray-400 hover:text-gray-700"
                aria-label="Close"
                @click="close"
              >
                <UIcon name="i-lucide-x" class="h-5 w-5" />
              </button>
            </div>

            <form class="space-y-3" @submit.prevent="save">
              <div>
                <label class="mb-1 block text-sm text-gray-600">Name</label>
                <input
                  v-model="form.food_name"
                  type="text"
                  placeholder="e.g. oatmeal"
                  class="w-full rounded-xl border border-gray-300 px-4 py-2"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-sm text-gray-600">Grams</label>
                  <input
                    v-model.number="form.grams"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="—"
                    class="w-full rounded-xl border border-gray-300 px-4 py-2"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-gray-600">Calories *</label>
                  <input
                    v-model.number="form.calories"
                    type="number"
                    min="0"
                    step="any"
                    class="w-full rounded-xl border border-gray-300 px-4 py-2"
                  />
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="mb-1 block text-sm text-gray-600">Protein</label>
                  <input
                    v-model.number="form.protein_g"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    class="w-full rounded-xl border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-gray-600">Fat</label>
                  <input
                    v-model.number="form.fat_g"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    class="w-full rounded-xl border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-gray-600">Carbs</label>
                  <input
                    v-model.number="form.carb_g"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    class="w-full rounded-xl border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              <div class="flex gap-2 pt-2">
                <button
                  type="button"
                  class="flex-1 rounded-xl bg-gray-100 py-3 font-medium text-gray-700 hover:bg-gray-200"
                  @click="close"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="flex-1 rounded-xl bg-blue-600 py-3 font-medium text-white disabled:opacity-50"
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
