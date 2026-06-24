// SmartCat Feeder - App Router
// Defines all routes and protected navigation.

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import SchedulesPage from './pages/SchedulesPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role === 'ADMIN' ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={<PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>}
        />
        <Route
          path="/history"
          element={<PrivateRoute><Layout><HistoryPage /></Layout></PrivateRoute>}
        />
        <Route
          path="/schedules"
          element={<PrivateRoute><Layout><SchedulesPage /></Layout></PrivateRoute>}
        />
        <Route
          path="/settings"
          element={<PrivateRoute><Layout><SettingsPage /></Layout></PrivateRoute>}
        />
        <Route
          path="/admin"
          element={<AdminRoute><Layout><AdminPage /></Layout></AdminRoute>}
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
