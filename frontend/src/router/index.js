import { createRouter, createWebHistory } from 'vue-router';
import { isLoggedIn } from '../stores/session.js';
import RoleUserSelector from '../views/RoleUserSelector.vue';
import ContractorHome from '../views/ContractorHome.vue';
import NewInspection from '../views/NewInspection.vue';
import InspectionEdit from '../views/InspectionEdit.vue';
import OwnerReports from '../views/OwnerReports.vue';
import TenantReports from '../views/TenantReports.vue';
import ReportDetail from '../views/ReportDetail.vue';
import ReportCompareView from '../views/ReportCompareView.vue';
import SharedReport from '../views/SharedReport.vue';
import PrintableReport from '../views/PrintableReport.vue';

// 전체 라우트 표는 PRD §21 참고. F03~F08에서 점검 작성/리포트 상세/비교/공유 화면을 채운다.
const routes = [
  { path: '/', name: 'home', component: RoleUserSelector },
  { path: '/contractor', name: 'contractor-home', component: ContractorHome, meta: { requiresUser: true } },
  { path: '/contractor/inspections/new', name: 'inspection-new', component: NewInspection, meta: { requiresUser: true } },
  { path: '/contractor/inspections/:id', name: 'inspection-edit', component: InspectionEdit, meta: { requiresUser: true } },
  { path: '/owner/reports', name: 'owner-reports', component: OwnerReports, meta: { requiresUser: true } },
  { path: '/owner/reports/:id', name: 'owner-report-detail', component: ReportDetail, meta: { requiresUser: true } },
  { path: '/owner/compare', name: 'owner-compare', component: ReportCompareView, meta: { requiresUser: true } },
  { path: '/tenant/reports', name: 'tenant-reports', component: TenantReports, meta: { requiresUser: true } },
  { path: '/tenant/reports/:id', name: 'tenant-report-detail', component: ReportDetail, meta: { requiresUser: true } },
  // 인쇄용 (역할 무관, 본인 접근 가능 리포트)
  { path: '/reports/:id/print', name: 'report-print', component: PrintableReport, meta: { requiresUser: true } },
  // 공유 링크 (비인증)
  { path: '/share/:token', name: 'shared-report', component: SharedReport },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 사용자 미선택 시 선택 화면으로
router.beforeEach((to) => {
  if (to.meta.requiresUser && !isLoggedIn()) return { name: 'home' };
  return true;
});

export default router;
