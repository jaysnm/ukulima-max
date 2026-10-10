import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { FarmProvider } from './context/FarmContext'

import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Dashboard from './pages/dashboard/Dashboard'
import CropsPage from './pages/crops/CropsPage'
import YieldPage from './pages/crops/YieldPage'
import CattlePage from './pages/livestock/CattlePage'
import PoultryPage from './pages/livestock/PoultryPage'
import TreatmentsPage from './pages/inputs/TreatmentsPage'
import FeedPage from './pages/inputs/FeedPage'
import SeedlingsSoilPage from './pages/inputs/SeedlingsSoilPage'
import PestsPage from './pages/pests/PestsPage'
import FencePage from './pages/fence/FencePage'
import DamagePage from './pages/damage/DamagePage'
import FarmsPage from './pages/farms/FarmsPage'
import OperationalCostsPage from './pages/finance/OperationalCostsPage'
import SuppliersPage from './pages/suppliers/SuppliersPage'
import UserManagementPage from './pages/admin/UserManagementPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/crops" element={<CropsPage />} />
        <Route path="/yield" element={<YieldPage />} />
        <Route path="/pests" element={<PestsPage />} />
        <Route path="/damage" element={<DamagePage />} />
        <Route path="/fence" element={<FencePage />} />
        <Route path="/cattle" element={<CattlePage />} />
        <Route path="/poultry" element={<PoultryPage />} />
        <Route path="/treatments" element={<TreatmentsPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/seedlings-soil" element={<SeedlingsSoilPage />} />
        <Route path="/costs" element={<OperationalCostsPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/farms" element={<FarmsPage />} />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <UserManagementPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FarmProvider>
          <AppRoutes />
        </FarmProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
