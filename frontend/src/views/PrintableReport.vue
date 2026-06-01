<script setup>
// 인쇄용 리포트 템플릿. @media print(=Tailwind print:)로 버튼/내비를 숨긴다.
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
    snapshot.value = (await apiFetch(`/api/reports/${route.params.id}`)).report;
  } catch (e) {
    error.value = e.message;
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
      <div class="flex justify-end print:hidden">
        <button class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700" @click="printReport">
          인쇄하기
        </button>
      </div>
      <ReportSnapshotView :snapshot="snapshot" />
    </template>
  </section>
</template>
