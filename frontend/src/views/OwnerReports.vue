<script setup>
import { ref, computed, onMounted } from 'vue';
import { apiFetch } from '../lib/api.js';
import ReportListCards from '../components/ReportListCards.vue';

const reports = ref([]);
const error = ref('');
const loading = ref(true);

const fUnit = ref('');
const fType = ref('');
const fConfirmed = ref('');

const units = computed(() => [...new Set(reports.value.map((r) => r.unitName))]);
const types = computed(() => [...new Set(reports.value.map((r) => r.typeLabel))]);

const filtered = computed(() =>
  reports.value.filter((r) => {
    if (fUnit.value && r.unitName !== fUnit.value) return false;
    if (fType.value && r.typeLabel !== fType.value) return false;
    if (fConfirmed.value === 'yes' && !r.confirmed) return false;
    if (fConfirmed.value === 'no' && r.confirmed) return false;
    return true;
  })
);

onMounted(async () => {
  try {
    reports.value = (await apiFetch('/api/reports')).reports;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">임대인 리포트</h2>
      <RouterLink to="/owner/compare" class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
        리포트 비교
      </RouterLink>
    </div>
    <p v-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="loading" class="text-slate-500">불러오는 중…</p>

    <div class="flex flex-wrap gap-2">
      <select v-model="fUnit" class="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
        <option value="">전체 호실</option>
        <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
      </select>
      <select v-model="fType" class="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
        <option value="">전체 유형</option>
        <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
      </select>
      <select v-model="fConfirmed" class="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
        <option value="">확인 상태 전체</option>
        <option value="yes">확인 완료</option>
        <option value="no">미확인</option>
      </select>
    </div>

    <ReportListCards :reports="filtered" base-path="/owner/reports" />
  </section>
</template>
