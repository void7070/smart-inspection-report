<script setup>
import { ref } from 'vue';
import { ISSUE_FIELDS, ISSUE_SEVERITIES, OBSERVATION_VALUES, itemsForField } from '../domain/issueFields.js';
import { fromInspection, buildSavePayload, newIssueItem, newObservation } from '../lib/issueInspection.js';

const props = defineProps({
  initialItems: { type: Array, default: () => [] },
  initialObservations: { type: Array, default: () => [] },
});
const emit = defineEmits(['save']);

const restored = fromInspection(props.initialItems, props.initialObservations);
const items = ref(restored.length ? restored : [newIssueItem()]);

function addItem() {
  items.value.push(newIssueItem());
}
function removeItem(idx) {
  items.value.splice(idx, 1);
}
function onFieldChange(item) {
  // 분야가 바뀌면 항목 목록이 달라지므로 선택 초기화
  if (!itemsForField(item.category).includes(item.name)) item.name = '';
}
function addObservation(item) {
  item.observations.push(newObservation());
}
function removeObservation(item, oi) {
  item.observations.splice(oi, 1);
}
function save() {
  emit('save', buildSavePayload(items.value));
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="(item, idx) in items"
      :key="idx"
      class="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
    >
      <div class="flex items-center justify-between">
        <h3 class="font-medium">문제 항목 {{ idx + 1 }}</h3>
        <button type="button" class="text-xs text-red-600 hover:underline" @click="removeItem(idx)">삭제</button>
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        <select v-model="item.category" class="rounded-md border border-slate-300 px-2 py-1.5 text-sm" @change="onFieldChange(item)">
          <option value="" disabled>분야 선택</option>
          <option v-for="f in ISSUE_FIELDS" :key="f.field" :value="f.field">{{ f.field }}</option>
        </select>
        <select v-model="item.name" class="rounded-md border border-slate-300 px-2 py-1.5 text-sm" :disabled="!item.category">
          <option value="" disabled>문제 항목 선택</option>
          <option v-for="name in itemsForField(item.category)" :key="name" :value="name">{{ name }}</option>
        </select>
      </div>

      <div class="flex flex-wrap gap-1">
        <button
          v-for="s in ISSUE_SEVERITIES"
          :key="s.code"
          type="button"
          class="rounded-md border px-2.5 py-1 text-xs"
          :class="item.state === s.code ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'"
          @click="item.state = s.code"
        >
          {{ s.label }}
        </button>
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        <input v-model="item.location" placeholder="위치 (예: 안방 천장)" class="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        <input v-model="item.description" placeholder="증상 설명" class="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      </div>

      <!-- 현장 확인 항목 -->
      <div class="space-y-2 rounded-md bg-slate-50 p-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-slate-600">현장 확인 항목</span>
          <button type="button" class="text-xs text-slate-600 hover:underline" @click="addObservation(item)">+ 추가</button>
        </div>
        <p v-if="!item.observations.length" class="text-xs text-slate-400">필요 시 확인 항목을 추가하세요.</p>
        <div v-for="(obs, oi) in item.observations" :key="oi" class="flex flex-wrap items-center gap-2">
          <input v-model="obs.label" placeholder="확인 항목 (예: 곰팡이 흔적)" class="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm" />
          <div class="flex gap-1">
            <button
              v-for="v in OBSERVATION_VALUES"
              :key="v.code"
              type="button"
              class="rounded-md border px-2 py-1 text-xs"
              :class="obs.value === v.code ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'"
              @click="obs.value = v.code"
            >
              {{ v.label }}
            </button>
          </div>
          <button type="button" class="text-xs text-red-600 hover:underline" @click="removeObservation(item, oi)">×</button>
        </div>
      </div>
    </div>

    <button type="button" class="w-full rounded-md border border-dashed border-slate-300 py-2 text-sm text-slate-600 hover:border-slate-400" @click="addItem">
      + 문제 항목 추가
    </button>

    <div class="sticky bottom-0 flex justify-end bg-slate-50/80 py-3 backdrop-blur">
      <button type="button" class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700" @click="save">
        저장
      </button>
    </div>
  </div>
</template>
