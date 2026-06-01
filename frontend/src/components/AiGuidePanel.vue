<script setup>
// 표현 전용 컴포넌트. AI 호출은 부모가 수행하고, 여기서는 결과만 렌더한다.
defineProps({
  guide: { type: Object, default: null },
  fallback: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
});
const emit = defineEmits(['request', 'apply']);
</script>

<template>
  <div class="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
    <div class="flex items-center justify-between">
      <h3 class="font-medium">AI 점검 도우미</h3>
      <button
        type="button"
        data-test="request"
        class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
        :disabled="loading"
        @click="emit('request')"
      >
        {{ loading ? '생성 중…' : 'AI 도우미 호출' }}
      </button>
    </div>

    <p v-if="fallback" class="rounded-md bg-amber-50 p-2 text-xs text-amber-700">
      AI 응답을 받지 못해 기본 안내를 표시합니다. 의견은 직접 작성할 수 있습니다.
    </p>

    <template v-if="guide">
      <p class="text-sm text-slate-700" data-test="summary">{{ guide.summary }}</p>

      <div v-if="guide.actionCards?.length" class="grid gap-2 sm:grid-cols-2">
        <div v-for="(c, i) in guide.actionCards" :key="i" class="rounded-md bg-slate-50 p-2">
          <div class="text-sm font-medium">{{ c.title }}</div>
          <div class="text-xs text-slate-500">{{ c.detail }}</div>
        </div>
      </div>

      <div v-if="guide.requiredDocuments?.length">
        <h4 class="text-xs font-medium text-slate-500">필요 자료</h4>
        <ul class="list-inside list-disc text-sm text-slate-700">
          <li v-for="(d, i) in guide.requiredDocuments" :key="i">{{ d }}</li>
        </ul>
      </div>

      <div v-if="guide.cautionPhrases?.length">
        <h4 class="text-xs font-medium text-slate-500">표현 주의</h4>
        <ul class="list-inside list-disc text-sm text-slate-700">
          <li v-for="(p, i) in guide.cautionPhrases" :key="i">{{ p }}</li>
        </ul>
      </div>

      <div v-if="guide.opinionDraft" class="rounded-md border border-slate-200 p-2">
        <div class="mb-1 flex items-center justify-between">
          <h4 class="text-xs font-medium text-slate-500">의견 초안</h4>
          <button
            type="button"
            data-test="apply"
            class="text-xs text-slate-700 hover:underline"
            @click="emit('apply', guide.opinionDraft)"
          >
            최종 의견에 적용
          </button>
        </div>
        <p class="text-sm text-slate-700">{{ guide.opinionDraft }}</p>
      </div>
    </template>
  </div>
</template>
