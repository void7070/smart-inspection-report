<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch } from '../lib/api.js';
import { setUser, homePathForRole } from '../stores/session.js';

const router = useRouter();
const users = ref([]);
const error = ref('');
const loading = ref(true);

const ROLE_LABEL = { contractor: '시공업자', owner: '임대인', tenant: '임차인' };

const groups = computed(() => {
  const by = { contractor: [], owner: [], tenant: [] };
  for (const u of users.value) (by[u.role] ??= []).push(u);
  return by;
});

onMounted(async () => {
  try {
    const data = await apiFetch('/api/demo/users');
    users.value = data.users;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});

function select(user) {
  setUser(user);
  router.push(homePathForRole(user.role));
}
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-xl font-semibold">데모 사용자 선택</h2>
      <p class="text-sm text-slate-500">역할을 선택하면 해당 화면으로 이동합니다. (로그인 없음)</p>
    </div>

    <p v-if="loading" class="text-slate-500">불러오는 중…</p>
    <p v-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

    <div v-for="(list, role) in groups" :key="role" v-show="list.length" class="space-y-2">
      <h3 class="text-sm font-medium text-slate-500">{{ ROLE_LABEL[role] }}</h3>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="u in list"
          :key="u.id"
          class="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-400 hover:shadow"
          @click="select(u)"
        >
          <div class="font-medium">{{ u.name }}</div>
          <div class="text-sm text-slate-500">{{ ROLE_LABEL[u.role] }}<span v-if="u.org"> · {{ u.org }}</span></div>
        </button>
      </div>
    </div>
  </section>
</template>
