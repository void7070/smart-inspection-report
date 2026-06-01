<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { apiFetch } from '../lib/api.js';
import { session } from '../stores/session.js';
import ReportSnapshotView from '../components/ReportSnapshotView.vue';

const route = useRoute();
const router = useRouter();
const snapshot = ref(null);
const error = ref('');
const loading = ref(true);
const confirmed = ref(false);
const shareUrl = ref('');
const busy = ref(false);

const reportId = computed(() => route.params.id);
const basePath = computed(() => (session.role === 'owner' ? '/owner/reports' : '/tenant/reports'));

async function load() {
  try {
    snapshot.value = (await apiFetch(`/api/reports/${reportId.value}`)).report;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function confirm() {
  busy.value = true;
  error.value = '';
  try {
    await apiFetch(`/api/reports/${reportId.value}/confirm`, { method: 'POST' });
    confirmed.value = true;
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

async function share() {
  busy.value = true;
  error.value = '';
  try {
    const data = await apiFetch(`/api/reports/${reportId.value}/share`, { method: 'POST' });
    shareUrl.value = `${window.location.origin}${data.path}`;
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

function printReport() {
  router.push(`/reports/${reportId.value}/print`);
}

onMounted(load);
</script>

<template>
  <section class="space-y-4">
    <RouterLink :to="basePath" class="text-sm text-slate-500 hover:underline">← 목록으로</RouterLink>
    <p v-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="loading" class="text-slate-500">불러오는 중…</p>

    <template v-if="snapshot">
      <!-- 액션 (인쇄 시 숨김 — F08 print 스타일과 연동) -->
      <div class="flex flex-wrap gap-2 print:hidden">
        <button
          class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
          :disabled="busy || confirmed"
          @click="confirm"
        >
          {{ confirmed ? '확인 완료됨' : '확인 완료' }}
        </button>
        <button class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100" :disabled="busy" @click="share">
          공유 링크 생성
        </button>
        <button class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100" @click="printReport">
          PDF 저장 (인쇄)
        </button>
      </div>

      <p v-if="shareUrl" class="break-all rounded-md bg-slate-50 p-2 text-xs text-slate-600 print:hidden">
        공유 링크: <a :href="shareUrl" class="text-blue-600 underline">{{ shareUrl }}</a>
      </p>

      <div class="rounded-lg border border-slate-200 bg-white p-5">
        <ReportSnapshotView :snapshot="snapshot" />
      </div>
    </template>
  </section>
</template>
