<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiFetch } from '../lib/api.js';
import { labelForType } from '../domain/inspectionTypes.js';
import WholeInspectionForm from '../components/WholeInspectionForm.vue';
import IssueInspectionForm from '../components/IssueInspectionForm.vue';
import PhotoUploader from '../components/PhotoUploader.vue';
import AiGuidePanel from '../components/AiGuidePanel.vue';

const route = useRoute();
const router = useRouter();
const inspection = ref(null);
const error = ref('');
const loading = ref(true);
const savedAt = ref('');

// 최종 의견
const finalOpinion = ref('');
// AI 가이드
const aiGuide = ref(null);
const aiFallback = ref(false);
const aiLoading = ref(false);
// 제출
const submitting = ref(false);
const submittedReportId = ref(null);

async function load() {
  loading.value = true;
  try {
    const data = await apiFetch(`/api/inspections/${route.params.id}`);
    inspection.value = data.inspection;
    finalOpinion.value = data.inspection.final_opinion ?? '';
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function onSave(payload) {
  error.value = '';
  try {
    const data = await apiFetch(`/api/inspections/${route.params.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    inspection.value = data.inspection;
    savedAt.value = new Date().toLocaleTimeString();
  } catch (e) {
    error.value = e.message;
  }
}

async function requestGuide() {
  aiLoading.value = true;
  error.value = '';
  try {
    const data = await apiFetch('/api/ai/inspection-guide', {
      method: 'POST',
      body: JSON.stringify({ inspectionId: Number(route.params.id) }),
    });
    aiGuide.value = data.guide;
    aiFallback.value = data.fallback;
  } catch (e) {
    error.value = e.message;
  } finally {
    aiLoading.value = false;
  }
}

function applyDraft(draft) {
  finalOpinion.value = draft;
}

async function onImagesSave(images) {
  await onSave({ images });
}

async function saveOpinion() {
  await onSave({ finalOpinion: finalOpinion.value });
}

async function submit() {
  submitting.value = true;
  error.value = '';
  try {
    // 제출 전 최종 의견을 먼저 저장
    await apiFetch(`/api/inspections/${route.params.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ finalOpinion: finalOpinion.value }),
    });
    const data = await apiFetch(`/api/inspections/${route.params.id}/submit`, { method: 'POST' });
    submittedReportId.value = data.reportId;
    inspection.value = { ...inspection.value, status: 'reported' };
  } catch (e) {
    error.value = e.message;
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="space-y-6">
    <p v-if="loading" class="text-slate-500">불러오는 중…</p>
    <p v-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

    <template v-if="inspection">
      <div>
        <h2 class="text-xl font-semibold">점검 작성</h2>
        <p class="text-sm text-slate-500">
          {{ labelForType(inspection.type) }} · {{ inspection.status }}
          <span v-if="savedAt" class="ml-2 text-green-600">저장됨 {{ savedAt }}</span>
        </p>
      </div>

      <!-- 제출 완료 상태 -->
      <div v-if="inspection.status === 'reported'" class="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4">
        <p class="text-sm text-green-800">
          점검이 제출되어 리포트가 생성되었습니다<span v-if="submittedReportId"> (#{{ submittedReportId }})</span>.
          생성 완료된 리포트는 수정/삭제할 수 없습니다.
        </p>
        <button class="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700" @click="router.push('/contractor')">
          홈으로
        </button>
      </div>

      <!-- 작성 중 -->
      <template v-else>
        <WholeInspectionForm v-if="inspection.flow === 'whole'" :initial-items="inspection.items" @save="onSave" />
        <IssueInspectionForm
          v-else
          :initial-items="inspection.items"
          :initial-observations="inspection.observations"
          @save="onSave"
        />

        <PhotoUploader :initial-images="inspection.images" @save="onImagesSave" />

        <AiGuidePanel
          :guide="aiGuide"
          :fallback="aiFallback"
          :loading="aiLoading"
          @request="requestGuide"
          @apply="applyDraft"
        />

        <div class="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
          <div class="flex items-center justify-between">
            <h3 class="font-medium">최종 의견</h3>
            <button class="text-xs text-slate-700 hover:underline" @click="saveOpinion">의견 저장</button>
          </div>
          <textarea
            v-model="finalOpinion"
            rows="4"
            placeholder="시공업자 최종 의견을 작성하세요. (리포트에는 이 의견만 표시됩니다)"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          ></textarea>
        </div>

        <div class="flex justify-end">
          <button
            class="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            :disabled="submitting"
            @click="submit"
          >
            {{ submitting ? '제출 중…' : '점검 제출 (리포트 생성)' }}
          </button>
        </div>
      </template>
    </template>
  </section>
</template>
