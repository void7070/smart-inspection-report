<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch } from '../lib/api.js';
import { INSPECTION_TYPES } from '../domain/inspectionTypes.js';

const router = useRouter();
const units = ref([]);
const selectedUnitId = ref(null);
const selectedType = ref('move_in');
const error = ref('');
const submitting = ref(false);

onMounted(async () => {
  try {
    const data = await apiFetch('/api/units');
    units.value = data.units;
    if (units.value.length) selectedUnitId.value = units.value[0].id;
  } catch (e) {
    error.value = e.message;
  }
});

async function start() {
  error.value = '';
  if (!selectedUnitId.value) {
    error.value = '점검 대상 호실을 선택하세요.';
    return;
  }
  submitting.value = true;
  try {
    const data = await apiFetch('/api/inspections', {
      method: 'POST',
      body: JSON.stringify({ unitId: selectedUnitId.value, type: selectedType.value }),
    });
    router.push(`/contractor/inspections/${data.inspection.id}`);
  } catch (e) {
    error.value = e.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="space-y-6">
    <h2 class="text-xl font-semibold">새 점검 시작</h2>
    <p v-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

    <div class="space-y-2">
      <label class="block text-sm font-medium text-slate-600">점검 유형</label>
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="t in INSPECTION_TYPES"
          :key="t.code"
          type="button"
          class="rounded-md border px-3 py-2 text-sm"
          :class="selectedType === t.code ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white hover:border-slate-400'"
          @click="selectedType = t.code"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <label class="block text-sm font-medium text-slate-600">점검 대상 호실</label>
      <select v-model="selectedUnitId" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
        <option v-for="u in units" :key="u.id" :value="u.id">{{ u.building_name }} {{ u.name }}</option>
      </select>
    </div>

    <button
      class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      :disabled="submitting"
      @click="start"
    >
      점검 시작
    </button>
  </section>
</template>
