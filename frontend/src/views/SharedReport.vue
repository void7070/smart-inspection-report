<script setup>
// 공유 링크 리포트 (비인증). 만료 없음, 이름 마스킹 없음.
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { apiFetch } from '../lib/api.js';
import ReportSnapshotView from '../components/ReportSnapshotView.vue';

const route = useRoute();
const snapshot = ref(null);
const error = ref('');
const loading = ref(true);

onMounted(async () => {
  try {
    snapshot.value = (await apiFetch(`/api/share/${route.params.token}`)).report;
  } catch {
    error.value = '유효하지 않거나 만료된 공유 링크입니다.';
  } finally {
    loading.value = false;
  }
});

function printReport() {
  window.print();
}
</script>

<template>
  <section class="space-y-4">
    <p v-if="loading" class="text-slate-500">불러오는 중…</p>
    <p v-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

    <template v-if="snapshot">
      <div class="flex items-center justify-between print:hidden">
        <p class="text-sm text-slate-500">공유된 리포트</p>
        <button class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100" @click="printReport">
          PDF 저장 (인쇄)
        </button>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-5">
        <ReportSnapshotView :snapshot="snapshot" />
      </div>
    </template>
  </section>
</template>
