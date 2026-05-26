// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient.js';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { AppLayout } from '@/components/layout/AppLayout.jsx';
import { ProtectedRoute } from '@/components/common/ProtectedRoute.jsx';
import {
  ROLES,
  MANAGEMENT_ROLES,
  TENANT_ACCESS_ROLES,
  CONTRACT_VIEW_ROLES,
} from '@/constants/roles.js';

// ── Auth Module Pages ──────────────────────────────────────────────────────────
import LoginPage from 'modules/auth/frontend/pages/LoginPage.jsx';
import DashboardPage from 'modules/auth/frontend/pages/DashboardPage.jsx';
import ProfilePage from 'modules/auth/frontend/pages/ProfilePage.jsx';
import UsersPage from 'modules/auth/frontend/pages/UsersPage.jsx';

// ── Building Module Pages ──────────────────────────────────────────────────────
import BuildingsPage from 'modules/building/frontend/pages/BuildingsPage.jsx';
import BuildingDetailPage from 'modules/building/frontend/pages/BuildingDetailPage.jsx';
import ApartmentsPage from 'modules/building/frontend/pages/ApartmentsPage.jsx';
import ApartmentDetailPage from 'modules/building/frontend/pages/ApartmentDetailPage.jsx';

// ── Tenant Module Pages ────────────────────────────────────────────────────────
import TenantsPage from 'modules/tenant/frontend/pages/TenantsPage.jsx';
import TenantFormPage from 'modules/tenant/frontend/pages/TenantFormPage.jsx';
import TenantDetailPage from 'modules/tenant/frontend/pages/TenantDetailPage.jsx';

// ── Contract Module Pages ──────────────────────────────────────────────────────
import ContractsPage from 'modules/contract/frontend/pages/ContractsPage.jsx';
import ContractFormPage from 'modules/contract/frontend/pages/ContractFormPage.jsx';
import ContractDetailPage from 'modules/contract/frontend/pages/ContractDetailPage.jsx';

// ── Finance Module Pages ────────────────────────────────────────────────────────
import UtilityReadingsPage from 'modules/finance/frontend/pages/UtilityReadingsPage.jsx';
import InvoicesPage from 'modules/finance/frontend/pages/InvoicesPage.jsx';
import InvoiceDetailPage from 'modules/finance/frontend/pages/InvoiceDetailPage.jsx';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Public ──────────────────────────────────────── */}
            <Route path="/login" element={<LoginPage />} />

            {/* ── Protected (requires auth + AppLayout) ────────── */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Building */}
              <Route path="/buildings" element={<BuildingsPage />} />
              <Route path="/buildings/:id" element={<BuildingDetailPage />} />
              <Route path="/apartments" element={<ApartmentsPage />} />
              <Route path="/apartments/:id" element={<ApartmentDetailPage />} />

              {/* Tenant — ADMIN, MANAGER, RECEPTIONIST */}
              <Route
                path="/tenants"
                element={
                  <ProtectedRoute roles={TENANT_ACCESS_ROLES}>
                    <TenantsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tenants/new"
                element={
                  <ProtectedRoute roles={TENANT_ACCESS_ROLES}>
                    <TenantFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tenants/:id"
                element={
                  <ProtectedRoute roles={TENANT_ACCESS_ROLES}>
                    <TenantDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Contract */}
              <Route
                path="/contracts"
                element={
                  <ProtectedRoute roles={CONTRACT_VIEW_ROLES}>
                    <ContractsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contracts/new"
                element={
                  <ProtectedRoute roles={MANAGEMENT_ROLES}>
                    <ContractFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contracts/:id"
                element={
                  <ProtectedRoute roles={CONTRACT_VIEW_ROLES}>
                    <ContractDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Finance */}
              <Route
                path="/utilities"
                element={
                  <ProtectedRoute>
                    <UtilityReadingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute>
                    <InvoicesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices/:id"
                element={
                  <ProtectedRoute>
                    <InvoiceDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Users — ADMIN only */}
              <Route
                path="/users"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN]}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
