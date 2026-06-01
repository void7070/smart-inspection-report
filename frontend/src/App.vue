<script setup>
import { RouterView, useRouter } from 'vue-router';
import { session, clearUser } from './stores/session.js';

const router = useRouter();
const ROLE_LABEL = { contractor: '시공업자', owner: '임대인', tenant: '임차인' };

function changeUser() {
  clearUser();
  router.push('/');
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="border-b border-slate-200 bg-white print:hidden">
      <div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <h1 class="text-lg font-semibold">
          <RouterLink to="/" class="hover:underline">스마트 점검 리포트</RouterLink>
        </h1>
        <div v-if="session.userId" class="flex items-center gap-3 text-sm">
          <span class="text-slate-600">
            {{ session.name }} · {{ ROLE_LABEL[session.role] }}
          </span>
          <button class="rounded-md border border-slate-300 px-2.5 py-1 hover:bg-slate-100" @click="changeUser">
            사용자 변경
          </button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-4xl px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>
