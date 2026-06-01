<script setup>
import { ref } from 'vue';
import {
  PHOTO_KINDS,
  MAX_IMAGES_PER_REPORT,
  isWithinSize,
  canAddMore,
  fileToDataUrl,
  fromInspectionImages,
} from '../lib/image.js';

const props = defineProps({
  initialImages: { type: Array, default: () => [] },
});
const emit = defineEmits(['save']);

const images = ref(fromInspectionImages(props.initialImages));
const error = ref('');

async function onSelect(event) {
  error.value = '';
  const files = Array.from(event.target.files ?? []);
  let added = false;
  for (const file of files) {
    if (!isWithinSize(file)) {
      error.value = `"${file.name}" 은 10MB를 초과합니다.`;
      continue;
    }
    if (!canAddMore(images.value.length)) {
      error.value = `이미지는 리포트당 최대 ${MAX_IMAGES_PER_REPORT}장입니다.`;
      break;
    }
    const dataBase64 = await fileToDataUrl(file);
    images.value.push({ dataBase64, kind: '', caption: '' });
    added = true;
  }
  event.target.value = ''; // 같은 파일 재선택 허용
  // 추가 즉시 저장: '사진 저장'을 깜빡하고 제출해도 사진이 유실되지 않도록 자동 저장한다.
  if (added) save();
}

function remove(i) {
  images.value.splice(i, 1);
  save(); // 삭제도 즉시 반영
}

function save() {
  emit('save', images.value);
}
</script>

<template>
  <div class="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
    <div class="flex items-center justify-between">
      <h3 class="font-medium">사진 첨부 <span class="text-xs text-slate-400">({{ images.length }}/{{ MAX_IMAGES_PER_REPORT }})</span></h3>
      <div class="flex items-center gap-2">
        <label class="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
          파일 선택
          <input type="file" accept="image/*" multiple class="hidden" @change="onSelect" />
        </label>
        <button type="button" class="text-xs text-slate-700 hover:underline" @click="save">사진 저장</button>
      </div>
    </div>

    <p v-if="error" class="rounded-md bg-red-50 p-2 text-xs text-red-600">{{ error }}</p>
    <p v-if="!images.length" class="text-sm text-slate-400">첨부된 사진이 없습니다.</p>

    <div class="grid gap-3 sm:grid-cols-2">
      <div v-for="(img, i) in images" :key="i" class="space-y-2 rounded-md border border-slate-200 p-2">
        <div class="relative">
          <img :src="img.dataBase64" alt="" class="h-32 w-full rounded object-cover" />
          <button
            type="button"
            class="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-xs text-white"
            @click="remove(i)"
          >
            ×
          </button>
        </div>
        <select v-model="img.kind" @change="save" class="w-full rounded-md border border-slate-300 px-2 py-1 text-xs">
          <option value="">사진 유형</option>
          <option v-for="k in PHOTO_KINDS" :key="k" :value="k">{{ k }}</option>
        </select>
        <input
          v-model="img.caption"
          @blur="save"
          placeholder="사진 설명"
          class="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
    </div>
  </div>
</template>
