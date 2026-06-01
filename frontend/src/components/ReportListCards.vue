<script setup>
import { gradeClass } from '../lib/reportView.js';

defineProps({
  reports: { type: Array, default: () => [] },
  basePath: { type: String, required: true }, // 예: '/owner/reports'
});
</script>

<template>
  <div>
    <p v-if="!reports.length" class="text-sm text-slate-400">표시할 리포트가 없습니다.</p>
    <div class="grid gap-3 sm:grid-cols-2">
      <RouterLink
        v-for="r in reports"
        :key="r.id"
        :to="`${basePath}/${r.id}`"
        class="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400"
      >
        <div class="flex items-center justify-between">
          <span class="font-medium">{{ r.building }} {{ r.unitName }}</span>
          <span :class="['rounded px-2 py-0.5 text-sm font-bold', gradeClass(r.grade)]">{{ r.grade }}</span>
        </div>
        <div class="mt-1 flex items-center gap-2 text-sm text-slate-500">
          <span>{{ r.typeLabel }}</span>
          <span
            v-if="r.confirmed"
            class="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700"
          >확인 완료</span>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
