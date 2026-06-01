<script setup>
// 리포트 스냅샷 표현 전용 컴포넌트. F08 인쇄 템플릿에서도 재사용한다.
import { gradeClass, stateLabel, observationValueLabel } from '../lib/reportView.js';

defineProps({
  snapshot: { type: Object, required: true },
});
</script>

<template>
  <article class="space-y-5">
    <!-- 헤더 -->
    <header class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-xl font-semibold">{{ snapshot.unit.building }} {{ snapshot.unit.name }}</h2>
        <p class="text-sm text-slate-500">{{ snapshot.inspection.typeLabel }} · {{ snapshot.generatedAt }}</p>
      </div>
      <span :class="['rounded-md px-3 py-1 text-lg font-bold', gradeClass(snapshot.grade)]">
        {{ snapshot.grade }}등급
      </span>
    </header>

    <!-- 당사자 -->
    <section class="grid gap-2 rounded-md bg-slate-50 p-3 text-sm sm:grid-cols-3">
      <div><span class="text-slate-400">시공업자</span> {{ snapshot.parties.contractor?.name }}</div>
      <div><span class="text-slate-400">임대인</span> {{ snapshot.parties.owner?.name ?? '-' }}</div>
      <div><span class="text-slate-400">임차인</span> {{ snapshot.parties.tenant?.name ?? '-' }}</div>
    </section>

    <!-- 점검 항목 -->
    <section v-if="snapshot.items?.length">
      <h3 class="mb-2 text-sm font-medium text-slate-500">점검 항목</h3>
      <ul class="divide-y divide-slate-100 rounded-md border border-slate-200">
        <li v-for="(it, i) in snapshot.items" :key="i" class="flex flex-wrap items-center gap-2 p-2 text-sm">
          <span class="font-medium">{{ it.category }} · {{ it.name }}</span>
          <span class="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{{ stateLabel(it.state) }}</span>
          <span v-if="it.location" class="text-xs text-slate-500">{{ it.location }}</span>
          <span v-if="it.description" class="text-xs text-slate-500">— {{ it.description }}</span>
        </li>
      </ul>
    </section>

    <!-- 현장 확인 항목 -->
    <section v-if="snapshot.observations?.length">
      <h3 class="mb-2 text-sm font-medium text-slate-500">현장 확인 항목</h3>
      <ul class="space-y-1 text-sm">
        <li v-for="(o, i) in snapshot.observations" :key="i">
          {{ o.label }} — <span class="text-slate-600">{{ observationValueLabel(o.value) }}</span>
        </li>
      </ul>
    </section>

    <!-- 사진 -->
    <section v-if="snapshot.images?.length">
      <h3 class="mb-2 text-sm font-medium text-slate-500">사진</h3>
      <div class="grid gap-2 sm:grid-cols-3">
        <figure v-for="(img, i) in snapshot.images" :key="i" class="space-y-1">
          <img :src="img.data_base64" alt="" class="h-32 w-full rounded object-cover" />
          <figcaption class="text-xs text-slate-500">{{ img.kind }} {{ img.caption }}</figcaption>
        </figure>
      </div>
    </section>

    <!-- AI 가이드 (요약/주의만 노출) -->
    <section v-if="snapshot.aiGuide" class="rounded-md bg-slate-50 p-3">
      <h3 class="mb-1 text-sm font-medium text-slate-500">AI 점검 도우미</h3>
      <p class="text-sm text-slate-700">{{ snapshot.aiGuide.summary }}</p>
    </section>

    <!-- 최종 의견 -->
    <section v-if="snapshot.finalOpinion">
      <h3 class="mb-1 text-sm font-medium text-slate-500">시공업자 최종 의견</h3>
      <p class="whitespace-pre-line text-sm text-slate-800">{{ snapshot.finalOpinion }}</p>
    </section>

    <p class="border-t border-slate-200 pt-3 text-xs text-slate-400">{{ snapshot.caution }}</p>
  </article>
</template>
