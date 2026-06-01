<script setup>
import { ref, onMounted, computed } from 'vue';
import { apiFetch } from '../lib/api.js';

const inspections = ref([]);
const error = ref('');
const loading = ref(true);

const STATUS_LABEL = { draft: '작성 중', submitted: '제출 대기', reported: '리포트 완료' };

const drafts = computed(() => inspections.value.filter((i) => i.status === 'draft'));
const submitted = computed(() => inspections.value.filter((i) => i.status === 'submitted'));

onMounted(async () => {
  try {
    const data = await apiFetch('/api/inspections');
    inspections.value = data.inspections;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">시공업자 홈</h2>
      <RouterLink
        to="/contractor/inspections/new"
        class="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
      >
        새 점검 시작
      </RouterLink>
    </div>

    <p v-if="loading" class="text-slate-500">불러오는 중…</p>
    <p v-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

    <div class="space-y-3">
      <h3 class="text-sm font-medium text-slate-500">작성 중 ({{ drafts.length }})</h3>
      <p v-if="!drafts.length" class="text-sm text-slate-400">작성 중인 점검이 없습니다.</p>
      <ul class="space-y-2">
        <RouterLink
          v-for="i in drafts"
          :key="i.id"
          :to="`/contractor/inspections/${i.id}`"
          class="block rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-400"
        >
          <div class="font-medium">{{ i.building_name }} {{ i.unit_name }}</div>
          <div class="text-sm text-slate-500">{{ i.typeLabel }} · {{ STATUS_LABEL[i.status] }}</div>
        </RouterLink>
      </ul>
    </div>

    <div class="space-y-3">
      <h3 class="text-sm font-medium text-slate-500">제출 대기 ({{ submitted.length }})</h3>
      <p v-if="!submitted.length" class="text-sm text-slate-400">제출 대기 중인 점검이 없습니다.</p>
      <ul class="space-y-2">
        <RouterLink
          v-for="i in submitted"
          :key="i.id"
          :to="`/contractor/inspections/${i.id}`"
          class="block rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-400"
        >
          <div class="font-medium">{{ i.building_name }} {{ i.unit_name }}</div>
          <div class="text-sm text-slate-500">{{ i.typeLabel }} · {{ STATUS_LABEL[i.status] }}</div>
        </RouterLink>
      </ul>
    </div>
  </section>
</template>
