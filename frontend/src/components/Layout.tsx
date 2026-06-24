// SmartCat Feeder - Layout Component
// Sidebar navigation + top header wrapper for authenticated pages.

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, ClipboardList, Clock, Settings, Shield, LogOut, Menu, X, Cat } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/history',   icon: ClipboardList, label: 'History' },
    { to: '/schedules', icon: Clock, label: 'Schedules' },
    { to: '/settings',  icon: Settings, label: 'Settings' },
    ...(user?.role === 'ADMIN' ? [{ to: '/admin', icon: Shield, label: 'Admin Panel' }] : []),
  ];

  return (
    <div className="min-h-screen flex bg-cat-50">
      {/* ── Sidebar (Desktop) ─────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-white shadow-card border-r border-gray-100 fixed h-full z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <Cat className="w-8 h-8 text-cat-500" />
          <div>
            <p className="font-bold text-gray-900 text-base leading-tight">feedy</p>
            <p className="text-xs text-gray-400">IoT Dashboard</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-cat-50">
            <div className="w-9 h-9 rounded-full bg-cat-200 flex items-center justify-center font-bold text-cat-700 text-sm shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-30 flex flex-col
          transition-transform duration-300 md:hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <Cat className="w-8 h-8 text-cat-500" />
          <div>
            <p className="font-bold text-gray-900">feedy</p>
            <p className="text-xs text-gray-400">IoT Dashboard</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-gray-100">
          <button onClick={handleLogout} className="btn-danger w-full justify-center gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────── */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
              <Menu className="w-6 h-6" />
            </button>
            <Cat className="w-6 h-6 text-cat-500" />
            <span className="font-bold text-gray-900">feedy</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
