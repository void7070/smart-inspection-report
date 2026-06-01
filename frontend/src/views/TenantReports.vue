<script setup>
import { ref, onMounted } from 'vue';
import { apiFetch } from '../lib/api.js';
import ReportListCards from '../components/ReportListCards.vue';

const reports = ref([]);
const error = ref('');
const loading = ref(true);

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
    <h2 class="text-xl font-semibold">임차인 리포트</h2>
    <p class="text-sm text-slate-500">본인 거주 호실의 리포트입니다.</p>
    <p v-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="loading" class="text-slate-500">불러오는 중…</p>

    <ReportListCards :reports="reports" base-path="/tenant/reports" />
  </section>
</template>
