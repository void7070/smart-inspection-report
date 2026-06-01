<script setup>
import { ref, onMounted } from 'vue';
import { apiFetch } from '../lib/api.js';
import ReportSnapshotView from '../components/ReportSnapshotView.vue';

const reports = ref([]);
const leftId = ref('');
const rightId = ref('');
const result = ref(null);
const error = ref('');
const loading = ref(false);

onMounted(async () => {
  try {
    reports.value = (await apiFetch('/api/reports')).reports;
  } catch (e) {
    error.value = e.message;
  }
});

async function compare() {
  error.value = '';
  result.value = null;
  if (!leftId.value || !rightId.value) {
    error.value = '비교할 리포트 2개를 선택하세요.';
    return;
  }
  loading.value = true;
  try {
    result.value = await apiFetch(`/api/reports/compare?leftId=${leftId.value}&rightId=${rightId.value}`);
  } catch (e) {
    error.value = e.message; // 같은 호실/유형 아님 등 백엔드 메시지
  } finally {
    loading.value = false;
  }
}

const optionLabel = (r) => `${r.building} ${r.unitName} · ${r.typeLabel} (${r.grade})`;
</script>

<template>
  <section class="space-y-4">
    <h2 class="text-xl font-semibold">리포트 비교</h2>
    <p class="text-sm text-slate-500">같은 호실 + 같은 점검 유형 2개를 비교합니다. (수리 전/후는 예외 허용)</p>

    <div class="flex flex-wrap items-center gap-2">
      <select v-model="leftId" class="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
        <option value="">왼쪽 리포트</option>
        <option v-for="r in reports" :key="r.id" :value="r.id">{{ optionLabel(r) }}</option>
      </select>
      <span class="text-slate-400">vs</span>
      <select v-model="rightId" class="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
        <option value="">오른쪽 리포트</option>
        <option v-for="r in reports" :key="r.id" :value="r.id">{{ optionLabel(r) }}</option>
      </select>
      <button
        class="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
        :disabled="loading"
        @click="compare"
      >
        비교
      </button>
    </div>

    <p v-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

    <div v-if="result" class="space-y-3">
      <p v-if="result.compareMeta.isRepairBeforeAfter" class="rounded-md bg-blue-50 p-2 text-sm text-blue-700">
        수리 전/후 비교입니다.
      </p>
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-lg border border-slate-200 bg-white p-4">
          <ReportSnapshotView :snapshot="result.left" />
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-4">
          <ReportSnapshotView :snapshot="result.right" />
        </div>
      </div>
    </div>
  </section>
</template>
