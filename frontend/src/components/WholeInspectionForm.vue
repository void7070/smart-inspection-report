<script setup>
import { ref, computed } from 'vue';
import { SPACES, WHOLE_STATES } from '../domain/inspectionSpaces.js';
import { buildInitialItems } from '../lib/wholeInspection.js';

const props = defineProps({
  initialItems: { type: Array, default: () => [] },
});
const emit = defineEmits(['save']);

// 평평한 항목 배열을 만들고, 화면에서는 공간별로 그룹화해 보여준다.
const items = ref(buildInitialItems(props.initialItems));

const grouped = computed(() =>
  SPACES.map(({ space }) => ({
    space,
    entries: items.value.filter((i) => i.category === space),
  }))
);

const STATE_CLASS = {
  normal: 'border-emerald-500 bg-emerald-500 text-white',
  caution: 'border-amber-500 bg-amber-500 text-white',
  repair: 'border-red-500 bg-red-500 text-white',
};

function save() {
  emit('save', { items: items.value });
}
</script>

<template>
  <div class="space-y-6">
    <div v-for="group in grouped" :key="group.space" class="rounded-lg border border-slate-200 bg-white p-4">
      <h3 class="mb-3 font-medium">{{ group.space }}</h3>
      <div class="space-y-3">
        <div v-for="entry in group.entries" :key="entry.name" class="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm">{{ entry.name }}</span>
            <div class="flex gap-1">
              <button
                v-for="s in WHOLE_STATES"
                :key="s.code"
                type="button"
                class="rounded-md border px-2.5 py-1 text-xs"
                :class="entry.state === s.code ? STATE_CLASS[s.code] : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'"
                @click="entry.state = s.code"
              >
                {{ s.label }}
              </button>
            </div>
          </div>

          <!-- 주의/수리 필요만 상세 입력 -->
          <div v-if="entry.state !== 'normal'" class="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              v-model="entry.location"
              placeholder="위치 (예: 베란다측 창)"
              class="rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
            <input
              v-model="entry.description"
              placeholder="설명 (예: 실리콘 들뜸)"
              class="rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="sticky bottom-0 flex justify-end bg-slate-50/80 py-3 backdrop-blur">
      <button
        type="button"
        class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        @click="save"
      >
        저장
      </button>
    </div>
  </div>
</template>
