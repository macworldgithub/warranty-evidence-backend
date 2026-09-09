const fs = require('fs');
const path = require('path');

const targetRoot = 'd:/booran-warranty-new';

function writeFile(relPath, content) {
  const fullPath = path.join(targetRoot, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log('Created:', relPath);
}

console.log('Generating Booran Warranty Next.js 16 Frontend...');

// 1. components/sidebar.tsx
writeFile('components/sidebar.tsx', `
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  userRole?: string;
  userName?: string;
  userEmail?: string;
}

export function Sidebar({ userRole = 'WARRANTY_CLERK', userName = 'Sarah Jenkins', userEmail = 'sarah.jenkins@booran.com.au' }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: 'Warranty Cases',
      href: '/cases',
      badge: 'Live',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: 'New RO Capture',
      href: '/cases/new',
      highlight: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      label: 'Brand Packs & Rules',
      href: '/brand-packs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      label: 'Dealership Sites',
      href: '/sites',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      label: 'User Access',
      href: '/users',
      adminOnly: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-64 bg-[#0d1b3e]/90 backdrop-blur-xl border-r border-[#1a56db]/20 flex flex-col justify-between shrink-0 min-h-screen sticky top-0 z-40 transition-all">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1a56db]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1a56db] to-[#00f0ff] flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <span className="font-extrabold text-white text-lg tracking-wider">B</span>
            </div>
            <div>
              <h1 className="font-bold text-white text-base tracking-tight leading-none">BOORAN</h1>
              <p className="text-[10px] text-[#00f0ff] uppercase tracking-widest font-semibold mt-1">Warranty Hub</p>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" title="System Live" />
        </div>

        {/* OEM Badges quick strip */}
        <div className="px-5 py-3 border-b border-[#1a56db]/10 flex items-center gap-2 overflow-x-auto text-[11px] text-[#cbd5e1]/70">
          <span className="px-1.5 py-0.5 rounded bg-[#1a56db]/20 text-[#00f0ff] font-medium">BYD Attachment A</span>
          <span className="px-1.5 py-0.5 rounded bg-[#132952] text-[#cbd5e1]">8 Brands</span>
        </div>

        {/* Navigation links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href) && item.href !== '/cases/new');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={\`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group \${
                  isActive
                    ? 'bg-gradient-to-r from-[#1a56db] to-[#1a56db]/70 text-white shadow-[0_0_20px_rgba(26,86,219,0.4)] border border-[#00f0ff]/30'
                    : item.highlight
                    ? 'bg-[#1a56db]/20 text-[#00f0ff] hover:bg-[#1a56db]/30 border border-[#00f0ff]/20'
                    : 'text-[#cbd5e1] hover:text-white hover:bg-[#132952]/60'
                }\`}
              >
                <div className="flex items-center gap-3">
                  <span className={\`transition-colors \${isActive ? 'text-white' : item.highlight ? 'text-[#00f0ff]' : 'text-[#64748b] group-hover:text-[#00f0ff]'}\`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-[#1a56db]/20 bg-[#081225]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1a56db] to-[#f59e0b] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {userName.split(' ').map((n) => n[0]).join('')}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{userName}</p>
              <p className="text-[10px] text-[#00f0ff] font-medium truncate">{userRole.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('booran_auth_token');
                localStorage.removeItem('booran_user_profile');
                window.location.href = '/login';
              }
            }}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
`);

// 2. components/header.tsx
writeFile('components/header.tsx', `
'use client';

import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="px-8 py-5 border-b border-[#1a56db]/20 bg-[#081225]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          {title}
        </h2>
        {subtitle && <p className="text-xs text-[#cbd5e1]/70 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {action}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0d1b3e] border border-[#1a56db]/20 text-xs text-[#cbd5e1]">
          <span className="w-2 h-2 rounded-full bg-[#10b981]" />
          <span>VIC Multi-Franchise Network</span>
        </div>
      </div>
    </header>
  );
}
`);

// 3. components/stat-card.tsx
writeFile('components/stat-card.tsx', `
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  trendPositive?: boolean;
  accent?: 'blue' | 'cyan' | 'gold' | 'green' | 'red';
  icon?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  subtext,
  trend,
  trendPositive = true,
  accent = 'blue',
  icon,
}: StatCardProps) {
  const accentGlow = {
    blue: 'border-[#1a56db]/40 hover:border-[#1a56db] shadow-[0_0_15px_rgba(26,86,219,0.15)]',
    cyan: 'border-[#00f0ff]/40 hover:border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.15)]',
    gold: 'border-[#f59e0b]/40 hover:border-[#f59e0b] shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    green: 'border-[#10b981]/40 hover:border-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    red: 'border-[#ef4444]/40 hover:border-[#ef4444] shadow-[0_0_15px_rgba(239,68,68,0.15)]',
  }[accent];

  const accentText = {
    blue: 'text-[#1a56db]',
    cyan: 'text-[#00f0ff]',
    gold: 'text-[#f59e0b]',
    green: 'text-[#10b981]',
    red: 'text-[#ef4444]',
  }[accent];

  return (
    <div className={\`p-5 rounded-2xl bg-[#0d1b3e]/80 border transition-all duration-300 backdrop-blur-md \${accentGlow}\`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[#cbd5e1]/70 uppercase tracking-wider">{label}</span>
        {icon && <span className={\`\${accentText} opacity-80\`}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-white tracking-tight">{value}</span>
        {trend && (
          <span
            className={\`text-xs font-bold \${
              trendPositive ? 'text-[#10b981]' : 'text-[#ef4444]'
            }\`}
          >
            {trend}
          </span>
        )}
      </div>
      {subtext && <p className="text-[11px] text-[#64748b] mt-1 font-medium">{subtext}</p>}
    </div>
  );
}
`);

// 4. components/status-badge.tsx
writeFile('components/status-badge.tsx', `
import React from 'react';
import { CaseStatus } from '../lib/types';

interface StatusBadgeProps {
  status: CaseStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const styles: Record<CaseStatus, string> = {
    'Draft': 'bg-[#64748b]/20 text-[#cbd5e1] border-[#64748b]/30',
    'Uploading': 'bg-[#1a56db]/20 text-[#00f0ff] border-[#1a56db]/40 animate-pulse',
    'Awaiting Review': 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
    'Flagged': 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/40 shadow-[0_0_10px_rgba(239,68,68,0.2)] font-bold',
    'Submitted': 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
    'Closed': 'bg-[#64748b]/20 text-[#64748b] border-[#64748b]/30',
    'Withdrawn': 'bg-[#ef4444]/10 text-[#64748b] border-transparent',
  };

  const px = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={\`inline-flex items-center gap-1.5 rounded-full font-semibold border uppercase tracking-wider \${px} \${styles[status] || styles['Draft']}\`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
`);

// 5. components/modal.tsx
writeFile('components/modal.tsx', `
'use client';

import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'lg',
}: ModalProps) {
  if (!isOpen) return null;

  const maxW = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className={\`w-full \${maxW} bg-[#0d1b3e] border border-[#1a56db]/30 rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden animate-scaleIn\`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1a56db]/20 flex items-center justify-between bg-[#081225]/60">
          <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#64748b] hover:text-white hover:bg-[#132952] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto text-sm text-[#cbd5e1] space-y-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-[#1a56db]/20 bg-[#081225]/40 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
`);

// 6. components/toast.tsx
writeFile('components/toast.tsx', `
'use client';

import React, { createContext, useContext, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={\`toast \${
              toast.type === 'success'
                ? 'toast-success text-[#10b981]'
                : toast.type === 'error'
                ? 'toast-error text-[#ef4444]'
                : 'toast-info text-[#00f0ff]'
            }\`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg: string) => console.log('Toast:', msg),
    };
  }
  return context;
}
`);

// 7. app/login/page.tsx
writeFile('app/login/page.tsx', `
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('sarah.jenkins@booran.com.au');
  const [password, setPassword] = useState('Booran2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.login(email, password);
      if (typeof window !== 'undefined') {
        localStorage.setItem('booran_auth_token', res.accessToken);
        localStorage.setItem('booran_user_profile', JSON.stringify(res.user));
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { name: 'Sarah Jenkins (Warranty Clerk)', email: 'sarah.jenkins@booran.com.au', role: 'WARRANTY_CLERK' },
    { name: 'Jake Smith (Technician)', email: 'jake.smith@booran.com.au', role: 'TECHNICIAN' },
    { name: 'Marcus Vance (Group Admin)', email: 'marcus.vance@booran.com.au', role: 'GROUP_ADMIN' },
    { name: 'Dave Miller (Service Manager)', email: 'dave.miller@booran.com.au', role: 'SERVICE_MANAGER' },
  ];

  return (
    <div className="min-h-screen bg-[#081225] flex items-center justify-center p-4 relative overflow-hidden starfield">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#1a56db]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-[#00f0ff]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fadeIn">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1a56db] to-[#00f0ff] shadow-[0_0_30px_rgba(0,240,255,0.4)] mb-4">
            <span className="text-2xl font-black text-white">B</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">BOORAN MOTOR GROUP</h1>
          <p className="text-xs text-[#00f0ff] uppercase tracking-widest font-semibold mt-1">
            Aftersales Warranty Evidence & Review Hub
          </p>
          <p className="text-xs text-[#64748b] mt-2">
            BYD Attachment A · Multi-Brand OEM Pack Engine
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card-static p-8 border border-[#1a56db]/30 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/30 text-xs font-semibold text-[#ef4444] animate-shake">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#cbd5e1] uppercase tracking-wider mb-2">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@booran.com.au"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#cbd5e1] uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-3 mt-2 shadow-[0_0_25px_rgba(26,86,219,0.5)]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                'Sign In to Warranty Hub'
              )}
            </button>
          </form>

          {/* Quick login pill selector */}
          <div className="mt-6 pt-6 border-t border-[#1a56db]/20">
            <p className="text-[11px] text-[#64748b] font-semibold uppercase tracking-wider mb-2 text-center">
              Quick Sign-In Presets
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword('Booran2026!');
                  }}
                  className="p-2 rounded-lg bg-[#081225]/80 hover:bg-[#132952] border border-[#1a56db]/20 text-left transition-all group"
                >
                  <p className="text-[11px] font-bold text-white group-hover:text-[#00f0ff] truncate">{acc.name.split(' ')[0]}</p>
                  <p className="text-[9px] text-[#64748b] truncate">{acc.role.replace('_', ' ')}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#64748b] mt-6">
          OmniSuiteAI · Enterprise Warranty Verification System
        </p>
      </div>
    </div>
  );
}
`);

// 8. app/page.tsx (root redirect)
writeFile('app/page.tsx', `
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('booran_auth_token');
      if (token) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#081225] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" />
    </div>
  );
}
`);

// 9. app/(portal)/layout.tsx
writeFile('app/(portal)/layout.tsx', `
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/sidebar';
import { ToastProvider } from '../../components/toast';
import { UserProfile } from '../../lib/types';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('booran_auth_token');
      const userProfileStr = localStorage.getItem('booran_user_profile');

      if (!token) {
        router.replace('/login');
        return;
      }

      if (userProfileStr) {
        try {
          setUser(JSON.parse(userProfileStr));
        } catch {
          // ignore
        }
      }
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#081225] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[#081225] text-[#cbd5e1]">
        <Sidebar
          userRole={user?.role}
          userName={user?.name}
          userEmail={user?.email}
        />
        <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
`);

// 10. app/(portal)/dashboard/page.tsx
writeFile('app/(portal)/dashboard/page.tsx', `
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '../../../components/header';
import { StatCard } from '../../../components/stat-card';
import { api } from '../../../lib/api';
import { DashboardKPIs, FlagReasonStat, SitePerformance } from '../../../lib/types';

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [flagReasons, setFlagReasons] = useState<FlagReasonStat[]>([]);
  const [sites, setSites] = useState<SitePerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [kpiRes, flagRes, siteRes] = await Promise.all([
          api.getKPIs(),
          api.getFlagReasons(),
          api.getSitePerformance(),
        ]);
        setKpis(kpiRes);
        setFlagReasons(flagRes);
        setSites(siteRes);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex-1 flex flex-col pb-12">
      <Header
        title="Group Warranty Operations Dashboard"
        subtitle="Live cross-dealership KPIs, First-Time Pass Rates, and Flag Analytics"
        action={
          <Link
            href="/cases/new"
            className="btn-primary shadow-[0_0_20px_rgba(26,86,219,0.4)] text-xs py-2 px-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Start RO Capture</span>
          </Link>
        }
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            label="Total Opened"
            value={kpis?.totalCasesOpened ?? '...'}
            subtext="This billing cycle"
            accent="blue"
            trend="+14%"
            trendPositive={true}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatCard
            label="Same-Day SLA"
            value={kpis ? \`\${kpis.submittedSameDayPercent}%\` : '...'}
            subtext="Submitted <24h"
            accent="green"
            trend="+5.2%"
            trendPositive={true}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <StatCard
            label="Flagged Queue"
            value={kpis?.activeFlaggedCases ?? '...'}
            subtext="Requires retake/clarification"
            accent="red"
            trend="-3 cases"
            trendPositive={true}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <StatCard
            label="Avg Velocity"
            value={kpis ? \`\${kpis.avgWorkshopToSubmittedHours}h\` : '...'}
            subtext="Workshop to OEM portal"
            accent="cyan"
            trend="-45 min"
            trendPositive={true}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Rooftops"
            value={kpis?.activeRooftopsCount ?? 4}
            subtext="Booran VIC Sites"
            accent="gold"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
          <StatCard
            label="OEM Brands"
            value={kpis?.activeBrandsCount ?? 8}
            subtext="BYD, Kia, Hyundai..."
            accent="blue"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            }
          />
        </div>

        {/* Middle Section: Site Performance + Top Flag Reasons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sites Performance Table */}
          <div className="lg:col-span-2 glass-card-static p-6 border border-[#1a56db]/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Dealership Rooftop Velocity & Quality</h3>
                  <p className="text-xs text-[#cbd5e1]/70">Pass rates before clerk submission</p>
                </div>
                <span className="text-xs text-[#00f0ff] font-semibold">Live Feed</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#cbd5e1]">
                  <thead className="border-b border-[#1a56db]/20 text-[#64748b] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">Site Rooftop</th>
                      <th className="py-3 px-3 text-center">Cases</th>
                      <th className="py-3 px-3 text-center">1st-Time Pass</th>
                      <th className="py-3 px-3 text-center">Flagged</th>
                      <th className="py-3 px-3 text-right">Avg Velocity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a56db]/10">
                    {sites.map((site) => (
                      <tr key={site.siteId} className="hover:bg-[#132952]/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-white">
                          {site.siteName}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-[#00f0ff]">
                          {site.totalCases}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-[#10b981]">
                            {site.firstTimePassRate}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {site.flaggedCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#ef4444]/20 text-[#ef4444] font-bold">
                              {site.flaggedCount}
                            </span>
                          ) : (
                            <span className="text-[#64748b]">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-white">
                          {site.avgHoursToSubmit}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#1a56db]/10 flex items-center justify-between text-xs text-[#64748b]">
              <span>Group Average Pass Rate: <strong className="text-white">92.8%</strong></span>
              <Link href="/sites" className="text-[#00f0ff] hover:underline font-semibold">
                Manage Rooftops →
              </Link>
            </div>
          </div>

          {/* Top Failure / Retake Reasons */}
          <div className="glass-card-static p-6 border border-[#1a56db]/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Top Flagged Issues</h3>
                  <p className="text-xs text-[#cbd5e1]/70">Technician training insights</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              </div>

              <div className="space-y-4">
                {flagReasons.map((reason) => (
                  <div key={reason.reasonCode} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#cbd5e1] truncate max-w-[200px]" title={reason.label}>
                        {reason.label}
                      </span>
                      <span className="font-bold text-[#ef4444] font-mono">{reason.percentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#081225] rounded-full overflow-hidden border border-[#1a56db]/20">
                      <div
                        className="h-full bg-gradient-to-r from-[#ef4444] to-[#f59e0b] rounded-full"
                        style={{ width: \`\${reason.percentage}%\` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#64748b] text-right">{reason.count} occurrences</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 p-3 rounded-xl bg-[#1a56db]/10 border border-[#1a56db]/20 text-[11px] text-[#cbd5e1]">
              <strong className="text-[#00f0ff] block mb-0.5">Automated Gate Prevention:</strong>
              Mobile camera AI validation reduces blurry VIN & odometer submissions before repair begins.
            </div>
          </div>
        </div>

        {/* Quick Review Portal Banner */}
        <div className="glass-card p-6 border border-[#1a56db]/30 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-[#0d1b3e] via-[#132952] to-[#0d1b3e]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center text-[#00f0ff]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Warranty Clerk Review Queue</h4>
              <p className="text-xs text-[#cbd5e1]/80 mt-0.5">
                Review pending workshop cases, audit BYD Attachment A checklist gates, and export OEM ZIP packs.
              </p>
            </div>
          </div>
          <Link
            href="/cases"
            className="btn-primary text-xs py-2.5 px-6 whitespace-nowrap shadow-[0_0_20px_rgba(26,86,219,0.5)]"
          >
            Open Live Cases Queue →
          </Link>
        </div>
      </div>
    </div>
  );
}
`);

// 11. app/(portal)/cases/page.tsx
writeFile('app/(portal)/cases/page.tsx', `
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '../../../components/header';
import { StatusBadge } from '../../../components/status-badge';
import { api } from '../../../lib/api';
import { WarrantyCase, CaseStatus } from '../../../lib/types';

export default function CasesPage() {
  const [cases, setCases] = useState<WarrantyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  useEffect(() => {
    loadCases();
  }, [statusFilter, brandFilter, flaggedOnly]);

  async function loadCases() {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (brandFilter !== 'ALL') params.brandId = brandFilter;
      if (flaggedOnly) params.flaggedOnly = true;

      const data = await api.getWarrantyCases(params);
      setCases(data);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredCases = cases.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.roNumber.toLowerCase().includes(q) ||
      c.vin.toLowerCase().includes(q) ||
      c.model.toLowerCase().includes(q) ||
      c.technicianName.toLowerCase().includes(q) ||
      c.concernTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col pb-12">
      <Header
        title="Warranty Cases CRM & Review Queue"
        subtitle="Manage workshop tickets, verify OEM checklist gates, flag discrepancies, and submit claims"
        action={
          <Link
            href="/cases/new"
            className="btn-primary text-xs py-2 px-4 shadow-[0_0_20px_rgba(26,86,219,0.4)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Warranty Ticket</span>
          </Link>
        }
      />

      <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Filters Toolbar */}
        <div className="glass-card-static p-4 border border-[#1a56db]/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search RO, VIN, Model, Technician..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 text-xs"
              />
              <svg className="w-4 h-4 absolute left-3 top-3 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-xs w-44"
            >
              <option value="ALL">All Statuses</option>
              <option value="Awaiting Review">Awaiting Review</option>
              <option value="Flagged">Flagged</option>
              <option value="Submitted">Submitted</option>
              <option value="Draft">Draft</option>
              <option value="Closed">Closed</option>
            </select>

            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="input-field text-xs w-36"
            >
              <option value="ALL">All Brands</option>
              <option value="brand_byd">BYD</option>
              <option value="brand_hyundai">Hyundai</option>
              <option value="brand_kia">Kia</option>
              <option value="brand_mg">MG</option>
              <option value="brand_toyota">Toyota</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFlaggedOnly(!flaggedOnly)}
              className={\`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 \${
                flaggedOnly
                  ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                  : 'bg-[#0d1b3e] border-[#1a56db]/20 text-[#cbd5e1] hover:border-[#1a56db]'
              }\`}
            >
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              <span>Flagged Queue Only</span>
            </button>
            <button
              onClick={loadCases}
              className="p-2 rounded-xl bg-[#0d1b3e] border border-[#1a56db]/20 text-[#64748b] hover:text-white hover:border-[#1a56db] transition-colors"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Cases Table */}
        <div className="glass-card-static border border-[#1a56db]/20 overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" />
              <p className="text-xs text-[#64748b]">Loading warranty cases...</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#132952] flex items-center justify-center mx-auto text-[#64748b]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white">No warranty cases found</p>
              <p className="text-xs text-[#64748b]">Try clearing your search filters or start a new repair ticket.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#081225]/80 border-b border-[#1a56db]/20 text-[#64748b] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">RO & Claim #</th>
                    <th className="py-3.5 px-4">Vehicle & VIN</th>
                    <th className="py-3.5 px-4">Fault Concern</th>
                    <th className="py-3.5 px-4">Site / Brand</th>
                    <th className="py-3.5 px-4">Technician</th>
                    <th className="py-3.5 px-4 text-center">Gates Progress</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a56db]/10">
                  {filteredCases.map((c) => {
                    const gatePercent = Math.round(
                      (c.checklistSummary.completedMandatory / (c.checklistSummary.totalMandatory || 1)) * 100
                    );
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-[#132952]/50 transition-colors group cursor-pointer"
                      >
                        <td className="py-3.5 px-4">
                          <Link href={\`/cases/\${c.id}\`} className="block">
                            <span className="font-mono font-bold text-white group-hover:text-[#00f0ff] transition-colors">
                              {c.roNumber}
                            </span>
                            {c.claimNumber ? (
                              <p className="text-[10px] text-[#10b981] font-mono mt-0.5">OEM: {c.claimNumber}</p>
                            ) : (
                              <p className="text-[10px] text-[#64748b] mt-0.5">Unsubmitted</p>
                            )}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <Link href={\`/cases/\${c.id}\`} className="block">
                            <p className="font-semibold text-white truncate max-w-[180px]">
                              {c.year} {c.make} {c.model}
                            </p>
                            <p className="font-mono text-[10px] text-[#64748b] tracking-wider truncate max-w-[180px]">
                              {c.vin}
                            </p>
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <Link href={\`/cases/\${c.id}\`} className="block">
                            <p className="font-medium text-[#cbd5e1] truncate max-w-[220px]" title={c.concernTitle}>
                              {c.concernTitle}
                            </p>
                            <span className="text-[10px] text-[#00f0ff] inline-block mt-0.5 font-medium">
                              {c.faultCategory}
                            </span>
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-white">{c.brandName}</p>
                          <p className="text-[10px] text-[#64748b] truncate max-w-[120px]">{c.siteName}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-white">{c.technicianName}</p>
                          <p className="text-[10px] text-[#64748b]">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center gap-1 w-24">
                            <div className="flex items-center justify-between w-full text-[10px] font-mono">
                              <span className="text-[#00f0ff] font-bold">
                                {c.checklistSummary.completedMandatory}/{c.checklistSummary.totalMandatory}
                              </span>
                              <span className="text-[#64748b]">{gatePercent}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-[#081225] rounded-full overflow-hidden border border-[#1a56db]/20">
                              <div
                                className={\`h-full rounded-full \${
                                  gatePercent === 100
                                    ? 'bg-[#10b981]'
                                    : gatePercent > 50
                                    ? 'bg-[#1a56db]'
                                    : 'bg-[#f59e0b]'
                                }\`}
                                style={{ width: \`\${gatePercent}%\` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge status={c.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={\`/cases/\${c.id}\`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a56db]/20 hover:bg-[#1a56db] text-[#00f0ff] hover:text-white font-semibold text-xs transition-all border border-[#1a56db]/30"
                          >
                            <span>Review</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`);

// 12. app/(portal)/cases/[id]/page.tsx (Case Detail & Gallery & Review Actions)
writeFile('app/(portal)/cases/[id]/page.tsx', `
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../../../components/header';
import { StatusBadge } from '../../../../components/status-badge';
import { Modal } from '../../../../components/modal';
import { useToast } from '../../../../components/toast';
import { api } from '../../../../lib/api';
import { WarrantyCase, FlagReasonCode, SubmissionPackResponse } from '../../../../lib/types';

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const caseId = params?.id as string;

  const [caseData, setCaseData] = useState<WarrantyCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);

  // Modals
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [packModalOpen, setPackModalOpen] = useState(false);
  const [packData, setPackData] = useState<SubmissionPackResponse | null>(null);

  // Flag Form
  const [flagRuleKey, setFlagRuleKey] = useState('');
  const [flagReason, setFlagReason] = useState<FlagReasonCode>('WRONG_ANGLE');
  const [flagInstruction, setFlagInstruction] = useState('');

  // Submit Form
  const [claimNumber, setClaimNumber] = useState('');
  const [clerkNote, setClerkNote] = useState('');

  useEffect(() => {
    if (caseId) loadCase();
  }, [caseId]);

  async function loadCase() {
    setLoading(true);
    try {
      const res = await api.getCase(caseId);
      setCaseData(res);
      if (res.claimNumber) setClaimNumber(res.claimNumber);
    } catch (err) {
      console.error('Failed to load case:', err);
      showToast('Case not found', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleFlagSubmit() {
    if (!flagInstruction.trim()) {
      showToast('Please provide instructions for the technician', 'error');
      return;
    }
    try {
      const updated = await api.flagCase(caseId, {
        evidenceRuleKey: flagRuleKey || 'fault_location',
        reasonCode: flagReason,
        instruction: flagInstruction,
        flaggedBy: 'Sarah Jenkins (Warranty Clerk)',
      });
      setCaseData(updated);
      setFlagModalOpen(false);
      showToast('Case flagged and returned to technician queue', 'error');
    } catch (err: any) {
      showToast(err.message || 'Flag failed', 'error');
    }
  }

  async function handleMarkSubmitted() {
    if (!claimNumber.trim()) {
      showToast('Please enter the OEM Claim / Approval number', 'error');
      return;
    }
    try {
      const updated = await api.markSubmitted(caseId, {
        claimNumber,
        clerkNote,
      });
      setCaseData(updated);
      setSubmitModalOpen(false);
      showToast('Case marked as Submitted to OEM Portal!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Submission failed', 'error');
    }
  }

  async function handleGeneratePack() {
    try {
      const pack = await api.getSubmissionPack(caseId);
      setPackData(pack);
      setPackModalOpen(true);
      showToast('OEM Submission ZIP & Summary PDF prepared!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate pack', 'error');
    }
  }

  if (loading || !caseData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" />
        <p className="text-xs text-[#64748b]">Loading case details...</p>
      </div>
    );
  }

  const gatePercent = Math.round(
    (caseData.checklistSummary.completedMandatory / (caseData.checklistSummary.totalMandatory || 1)) * 100
  );

  return (
    <div className="flex-1 flex flex-col pb-12">
      <Header
        title={\`Case: \${caseData.roNumber}\`}
        subtitle={\`\${caseData.brandName} · \${caseData.siteName} · Tech: \${caseData.technicianName}\`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/cases"
              className="btn-ghost text-xs py-2 px-3"
            >
              ← Back to Queue
            </Link>
            <button
              onClick={handleGeneratePack}
              className="btn-ghost text-xs py-2 px-3 border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/10 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export OEM ZIP Pack</span>
            </button>
            {caseData.status !== 'Submitted' && (
              <>
                <button
                  onClick={() => setFlagModalOpen(true)}
                  className="btn-danger text-xs py-2 px-3 flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Flag for Retake</span>
                </button>
                <button
                  onClick={() => setSubmitModalOpen(true)}
                  className="btn-success text-xs py-2 px-4 flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Approve & Submit</span>
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Top Summary Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Vehicle Info */}
          <div className="glass-card-static p-5 border border-[#1a56db]/20 space-y-2">
            <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider">Vehicle Details</span>
            <p className="text-base font-extrabold text-white">
              {caseData.year} {caseData.make} {caseData.model}
            </p>
            <div className="space-y-1 font-mono text-xs">
              <p className="text-[#cbd5e1] flex justify-between">
                <span className="text-[#64748b]">VIN:</span>
                <strong className="text-white tracking-wider">{caseData.vin}</strong>
              </p>
              <p className="text-[#cbd5e1] flex justify-between">
                <span className="text-[#64748b]">Odometer:</span>
                <span>{caseData.odometer.toLocaleString()} km</span>
              </p>
              <p className="text-[#cbd5e1] flex justify-between">
                <span className="text-[#64748b]">Powertrain:</span>
                <span className="px-1.5 py-0.2 rounded bg-[#1a56db]/20 text-[#00f0ff] font-sans font-semibold">
                  {caseData.powertrain}
                </span>
              </p>
            </div>
          </div>

          {/* Fault Category & Concern */}
          <div className="glass-card-static p-5 border border-[#1a56db]/20 space-y-2 lg:col-span-2">
            <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider">Technician Concern & Scope</span>
            <p className="text-base font-bold text-white leading-snug">{caseData.concernTitle}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="px-2 py-0.5 rounded bg-[#1a56db]/20 text-[#00f0ff] font-semibold">
                {caseData.faultCategory}
              </span>
              <span className="px-2 py-0.5 rounded bg-[#132952] text-[#cbd5e1]">
                Stage: {caseData.repairStage}
              </span>
              {caseData.partReplaced && (
                <span className="px-2 py-0.5 rounded bg-[#f59e0b]/20 text-[#f59e0b] font-semibold">
                  Part Replaced
                </span>
              )}
              {caseData.noiseFault && (
                <span className="px-2 py-0.5 rounded bg-[#ef4444]/20 text-[#ef4444] font-semibold">
                  Audio/Noise Fault
                </span>
              )}
            </div>
          </div>

          {/* Gates Progress Box */}
          <div className="glass-card-static p-5 border border-[#1a56db]/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider">Mandatory Gates</span>
                <StatusBadge status={caseData.status} size="sm" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-white">
                  {caseData.checklistSummary.completedMandatory} / {caseData.checklistSummary.totalMandatory}
                </span>
                <span className="text-xs font-bold text-[#00f0ff]">({gatePercent}%)</span>
              </div>
              <div className="h-2 w-full bg-[#081225] rounded-full overflow-hidden border border-[#1a56db]/20 mt-2">
                <div
                  className={\`h-full rounded-full \${
                    gatePercent === 100 ? 'bg-[#10b981]' : 'bg-gradient-to-r from-[#1a56db] to-[#00f0ff]'
                  }\`}
                  style={{ width: \`\${gatePercent}%\` }}
                />
              </div>
            </div>
            {caseData.claimNumber && (
              <p className="text-[11px] text-[#10b981] font-mono mt-2 pt-2 border-t border-[#1a56db]/10">
                Claim #: <strong>{caseData.claimNumber}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Flag History Alert (if any) */}
        {caseData.flagHistory && caseData.flagHistory.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#ef4444]/10 border border-[#ef4444]/30 space-y-2 animate-slideInLeft">
            <div className="flex items-center gap-2 text-xs font-bold text-[#ef4444] uppercase tracking-wider">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Case Flag Discrepancy Log</span>
            </div>
            {caseData.flagHistory.map((flag, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[#081225]/80 border border-[#ef4444]/20 text-xs">
                <div className="flex items-center justify-between text-[#ef4444] font-semibold mb-1">
                  <span>Reason: {flag.reasonCode} (Rule: {flag.evidenceRuleKey})</span>
                  <span className="text-[10px] text-[#64748b]">{new Date(flag.flaggedAt).toLocaleString()}</span>
                </div>
                <p className="text-[#cbd5e1] font-medium">"{flag.instruction}"</p>
                <p className="text-[10px] text-[#64748b] mt-1">— Flagged by {flag.flaggedBy}</p>
              </div>
            ))}
          </div>
        )}

        {/* Evidence Gallery Section */}
        <div className="glass-card-static p-6 border border-[#1a56db]/20 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Audit Evidence Pack Gallery</h3>
              <p className="text-xs text-[#cbd5e1]/70">BYD-WB-2602-02 Attachment A standardized shots & videos</p>
            </div>
            <span className="text-xs text-[#00f0ff] font-semibold">
              {caseData.evidenceItems.length} Captured Items
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {caseData.evidenceItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-[#081225]/90 border border-[#1a56db]/20 overflow-hidden hover:border-[#00f0ff]/50 transition-all group flex flex-col justify-between"
              >
                {/* Media preview */}
                <div
                  onClick={() => setSelectedMedia(item.storageUrl)}
                  className="h-44 bg-[#0d1b3e] relative cursor-pointer overflow-hidden flex items-center justify-center"
                >
                  <img
                    src={item.storageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-lg bg-black/80 text-white text-xs font-semibold backdrop-blur-sm">
                      Click to Expand
                    </span>
                  </div>
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-[#00f0ff] uppercase backdrop-blur-sm">
                    {item.mediaType}
                  </span>
                </div>

                {/* Details */}
                <div className="p-3.5 space-y-1.5 text-xs">
                  <p className="font-bold text-white truncate" title={item.name}>
                    {item.name}
                  </p>
                  <p className="font-mono text-[10px] text-[#64748b]">Key: {item.ruleKey}</p>
                  {item.ocrExtractedText && (
                    <div className="p-2 rounded bg-[#132952]/50 border border-[#1a56db]/10 text-[10px]">
                      <span className="text-[#00f0ff] font-semibold block">OCR Verified:</span>
                      <span className="font-mono text-white font-bold">{item.ocrExtractedText}</span>
                      {item.ocrConfidence && (
                        <span className="text-[#10b981] ml-2">({item.ocrConfidence}% conf)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Voice to Tech Dictation Section */}
        <div className="glass-card-static p-6 border border-[#1a56db]/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center text-[#00f0ff]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Voice to Tech Workshop Transcripts</h3>
                <p className="text-xs text-[#cbd5e1]/70">OmniSuiteAI Australian Automotive Speech-to-Text Model</p>
              </div>
            </div>
            <span className="text-xs text-[#10b981] font-semibold">Live Dictation Verified</span>
          </div>

          {caseData.voiceNotes && caseData.voiceNotes.length > 0 ? (
            <div className="space-y-3">
              {caseData.voiceNotes.map((vn) => (
                <div key={vn.id} className="p-4 rounded-xl bg-[#081225]/80 border border-[#1a56db]/20 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#64748b]">
                    <span className="font-semibold text-[#00f0ff]">Recorded by {vn.recordedBy}</span>
                    <span className="font-mono">{vn.durationSeconds}s duration · {new Date(vn.recordedAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-white font-medium italic">"{vn.transcript}"</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#64748b] italic">No audio dictation notes recorded for this ticket.</p>
          )}
        </div>
      </div>

      {/* Media Lightbox Modal */}
      {selectedMedia && (
        <div
          onClick={() => setSelectedMedia(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md cursor-pointer animate-fadeIn"
        >
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-[#00f0ff]/30 shadow-2xl">
            <img src={selectedMedia} alt="Evidence" className="w-full h-full object-contain" />
          </div>
        </div>
      )}

      {/* Flag Retake Modal */}
      <Modal
        isOpen={flagModalOpen}
        onClose={() => setFlagModalOpen(false)}
        title="Flag Case Discrepancy & Return to Workshop"
        maxWidth="md"
        footer={
          <>
            <button onClick={() => setFlagModalOpen(false)} className="btn-ghost text-xs">
              Cancel
            </button>
            <button onClick={handleFlagSubmit} className="btn-danger text-xs">
              Confirm Flag & Notify Tech
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-[#cbd5e1] mb-1">Select Discrepancy Rule</label>
            <select
              value={flagRuleKey}
              onChange={(e) => setFlagRuleKey(e.target.value)}
              className="input-field text-xs"
            >
              <option value="vin_photo">VIN Plate Photo</option>
              <option value="odometer_photo">Odometer Cluster Photo</option>
              <option value="fault_location">Defect / Fault Location Photo</option>
              <option value="tier2_hv_isolation">HV Battery Isolation Test</option>
              <option value="noise_video">Audio / Vibration Recording</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#cbd5e1] mb-1">Standardized Reason Code</label>
            <select
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value as FlagReasonCode)}
              className="input-field text-xs"
            >
              <option value="POOR_LIGHTING_BLUR">POOR_LIGHTING_BLUR (Blurry or dark)</option>
              <option value="WRONG_ANGLE">WRONG_ANGLE (Too close / missed context)</option>
              <option value="UNREADABLE_VIN">UNREADABLE_VIN (VIN numbers obscured)</option>
              <option value="NO_SERIAL">NO_SERIAL (Old/New part serial missing)</option>
              <option value="NO_DTC">NO_DTC (Diagnostic DTC report missing)</option>
              <option value="VIDEO_TOO_SHORT">VIDEO_TOO_SHORT (Under min duration)</option>
              <option value="MISSING_SHOT">MISSING_SHOT (Mandatory shot omitted)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#cbd5e1] mb-1">Technician Retake Instruction</label>
            <textarea
              rows={3}
              value={flagInstruction}
              onChange={(e) => setFlagInstruction(e.target.value)}
              placeholder="E.g., Please step back 1 meter to capture the subframe context..."
              className="input-field text-xs"
            />
          </div>
        </div>
      </Modal>

      {/* Approve & Submit Modal */}
      <Modal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title="Approve & Mark Case Submitted to OEM Portal"
        maxWidth="md"
        footer={
          <>
            <button onClick={() => setSubmitModalOpen(false)} className="btn-ghost text-xs">
              Cancel
            </button>
            <button onClick={handleMarkSubmitted} className="btn-success text-xs">
              Record Approval & Lock Case
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-[#cbd5e1] mb-1">OEM Claim / Reference #</label>
            <input
              type="text"
              required
              value={claimNumber}
              onChange={(e) => setClaimNumber(e.target.value)}
              placeholder="E.g., BYD-CLM-2026-9841"
              className="input-field text-xs font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#cbd5e1] mb-1">Internal Clerk Verification Notes</label>
            <textarea
              rows={3}
              value={clerkNote}
              onChange={(e) => setClerkNote(e.target.value)}
              placeholder="Verified all 8 Attachment A photos. Submitted into BYD dealer portal."
              className="input-field text-xs"
            />
          </div>
        </div>
      </Modal>

      {/* Submission Pack Modal */}
      <Modal
        isOpen={packModalOpen}
        onClose={() => setPackModalOpen(false)}
        title="OEM Standardized Submission Package"
        maxWidth="lg"
        footer={
          <button onClick={() => setPackModalOpen(false)} className="btn-primary text-xs">
            Done
          </button>
        }
      >
        {packData && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-[#081225]/80 border border-[#1a56db]/20 space-y-2">
              <p className="text-white font-bold text-sm">Download Ready Package</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={packData.zipDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary text-xs py-2 px-4 shadow-[0_0_15px_rgba(26,86,219,0.4)]"
                >
                  Download {packData.zipFileName}
                </a>
                <a
                  href={packData.pdfSummaryDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost text-xs py-2 px-4 border-[#00f0ff]/30 text-[#00f0ff]"
                >
                  Download One-Page Case Summary PDF
                </a>
              </div>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">OEM-Named File Manifest (BYD Convention):</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {packData.includedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-[#081225] border border-[#1a56db]/10 flex items-center justify-between font-mono text-[11px]"
                  >
                    <span className="text-[#00f0ff]">{file.oemFileName}</span>
                    <span className="text-[#64748b]">{(file.sizeBytes / 1024).toFixed(0)} KB</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
`);

// 13. app/(portal)/cases/new/page.tsx (New RO Wizard)
writeFile('app/(portal)/cases/new/page.tsx', `
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../../components/header';
import { useToast } from '../../../../components/toast';
import { api } from '../../../../lib/api';
import { FaultCategory, Site, Brand } from '../../../../lib/types';

export default function NewCaseWizard() {
  const router = useRouter();
  const { showToast } = useToast();

  const [sites, setSites] = useState<Site[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [vinDecoding, setVinDecoding] = useState(false);

  // Form State
  const [siteId, setSiteId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [roNumber, setRoNumber] = useState('CR-');
  const [vin, setVin] = useState('LGXCE4C86P0019283');
  const [odometer, setOdometer] = useState<number>(14250);
  const [make, setMake] = useState('BYD');
  const [model, setModel] = useState('ATTO 3');
  const [year, setYear] = useState<number>(2024);
  const [powertrain, setPowertrain] = useState<'EV' | 'Hybrid' | 'PHEV' | 'ICE'>('EV');
  const [technicianName, setTechnicianName] = useState('Jake Smith');
  const [concernTitle, setConcernTitle] = useState('High-voltage battery cooling loop moisture detected on dash');
  const [faultCategory, setFaultCategory] = useState<FaultCategory>('Battery and high-voltage (HV) components');
  const [partReplaced, setPartReplaced] = useState(true);
  const [noiseFault, setNoiseFault] = useState(false);
  const [diagnosticsAvailable, setDiagnosticsAvailable] = useState(true);
  const [repairStage, setRepairStage] = useState<'Pre-repair only' | 'During repair' | 'Repair complete'>('Repair complete');

  // Evaluated Rules
  const [evaluatedRules, setEvaluatedRules] = useState<any>(null);

  useEffect(() => {
    async function init() {
      try {
        const [sitesRes, brandsRes] = await Promise.all([api.getSites(), api.getBrands()]);
        setSites(sitesRes);
        setBrands(brandsRes);
        if (sitesRes.length > 0) setSiteId(sitesRes[0].id);
        if (brandsRes.length > 0) setBrandId(brandsRes[0].id);
      } catch (err) {
        console.error(err);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (brandId && faultCategory) {
      evaluateDynamicRules();
    }
  }, [brandId, faultCategory, partReplaced, noiseFault, diagnosticsAvailable, repairStage]);

  async function evaluateDynamicRules() {
    try {
      const res = await api.evaluateRules({
        brandId: brandId || 'brand_byd',
        faultCategory,
        partReplaced,
        noiseFault,
        diagnosticsAvailable,
        repairStage,
      });
      setEvaluatedRules(res);
    } catch (err) {
      console.error('Rules engine evaluation error:', err);
    }
  }

  async function handleDecodeVin() {
    if (!vin || vin.length !== 17) {
      showToast('VIN must be exactly 17 characters', 'error');
      return;
    }
    setVinDecoding(true);
    try {
      const decoded = await api.decodeVin(vin);
      setMake(decoded.make);
      setModel(decoded.model);
      setYear(decoded.year);
      setPowertrain(decoded.powertrain);
      showToast(\`Decoded: \${decoded.year} \${decoded.make} \${decoded.model} via \${decoded.provider}\`, 'success');
    } catch (err: any) {
      showToast(err.message || 'VIN decode failed', 'error');
    } finally {
      setVinDecoding(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const created = await api.createCase({
        siteId,
        brandId,
        roNumber,
        vin,
        odometer: Number(odometer),
        make,
        model,
        year: Number(year),
        powertrain,
        technicianId: 'tech_jake_s',
        technicianName,
        concernTitle,
        faultCategory,
        partReplaced,
        noiseFault,
        diagnosticsAvailable,
        repairStage,
      });

      showToast(\`Warranty Case \${created.roNumber} created with \${evaluatedRules?.mandatoryCount || 6} mandatory gates!\`, 'success');
      router.push(\`/cases/\${created.id}\`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create case', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col pb-12">
      <Header
        title="New Warranty RO Evidence Capture"
        subtitle="Start a guided technician evidence ticket with auto-evaluated OEM rules"
      />

      <div className="p-8 max-w-4xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Rooftop & Brand */}
          <div className="glass-card-static p-6 border border-[#1a56db]/20 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">1. Dealership Rooftop & OEM Roster</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">Dealership Site</label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="input-field text-xs"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">OEM Brand</label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="input-field text-xs"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.seedChecklistReference})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 2: Vehicle Identification & Fast VIN Decode */}
          <div className="glass-card-static p-6 border border-[#1a56db]/20 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">2. Vehicle Identification</h3>
              <span className="text-xs text-[#00f0ff]">RedBooks AU Live Integration</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">Repair Order (RO #)</label>
                <input
                  type="text"
                  required
                  value={roNumber}
                  onChange={(e) => setRoNumber(e.target.value)}
                  className="input-field text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">17-Digit Vehicle VIN</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    maxLength={17}
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    className="input-field text-xs font-mono uppercase tracking-wider flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleDecodeVin}
                    disabled={vinDecoding}
                    className="btn-ghost text-xs py-2 px-3 border-[#00f0ff]/40 text-[#00f0ff] hover:bg-[#00f0ff]/10 whitespace-nowrap"
                  >
                    {vinDecoding ? 'Decoding...' : 'Decode VIN'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">Make</label>
                <input
                  type="text"
                  required
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">Model</label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">Year</label>
                <input
                  type="number"
                  required
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">Odometer (km)</label>
                <input
                  type="number"
                  required
                  value={odometer}
                  onChange={(e) => setOdometer(Number(e.target.value))}
                  className="input-field text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Fault Category & Dynamic Evidence Requirements */}
          <div className="glass-card-static p-6 border border-[#1a56db]/20 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">3. Fault Classification & Gate Resolver</h3>
            
            <div>
              <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">Fault Category (Attachment A)</label>
              <select
                value={faultCategory}
                onChange={(e) => setFaultCategory(e.target.value as FaultCategory)}
                className="input-field text-xs"
              >
                <option value="Oil leaks or seepage">Oil leaks or seepage</option>
                <option value="ECU or sensor internal faults">ECU or sensor internal faults</option>
                <option value="Software updates or program refreshes">Software updates or program refreshes</option>
                <option value="Battery and high-voltage (HV) components">Battery and high-voltage (HV) components</option>
                <option value="Charging system faults">Charging system faults</option>
                <option value="Powertrain, chassis or body component faults">Powertrain, chassis or body component faults</option>
                <option value="General / other (Tier 1 only)">General / other (Tier 1 only)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">Technician Stated Concern</label>
              <textarea
                rows={2}
                required
                value={concernTitle}
                onChange={(e) => setConcernTitle(e.target.value)}
                placeholder="Describe customer complaint & workshop findings..."
                className="input-field text-xs"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#cbd5e1] cursor-pointer">
                <input
                  type="checkbox"
                  checked={partReplaced}
                  onChange={(e) => setPartReplaced(e.target.checked)}
                  className="rounded border-[#1a56db] text-[#1a56db] focus:ring-[#00f0ff]"
                />
                <span>Part Replaced?</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-[#cbd5e1] cursor-pointer">
                <input
                  type="checkbox"
                  checked={noiseFault}
                  onChange={(e) => setNoiseFault(e.target.checked)}
                  className="rounded border-[#1a56db] text-[#1a56db] focus:ring-[#00f0ff]"
                />
                <span>Noise/Audio Fault?</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-[#cbd5e1] cursor-pointer">
                <input
                  type="checkbox"
                  checked={diagnosticsAvailable}
                  onChange={(e) => setDiagnosticsAvailable(e.target.checked)}
                  className="rounded border-[#1a56db] text-[#1a56db] focus:ring-[#00f0ff]"
                />
                <span>DTC Scan Available?</span>
              </label>
            </div>

            {/* Dynamic Rule Preview Output */}
            {evaluatedRules && (
              <div className="mt-4 p-4 rounded-xl bg-[#081225]/80 border border-[#00f0ff]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#00f0ff]">
                    Resolved Evidence Pack: {evaluatedRules.packName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] text-[10px] font-bold">
                    {evaluatedRules.mandatoryCount} Mandatory Gates
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {evaluatedRules.resolvedRules.map((ruleKey: string) => (
                    <span
                      key={ruleKey}
                      className="px-2 py-0.5 rounded bg-[#132952] text-[#cbd5e1] font-mono text-[10px]"
                    >
                      {ruleKey}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-ghost text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xs py-3 px-8 shadow-[0_0_25px_rgba(26,86,219,0.5)]"
            >
              {loading ? 'Initializing Ticket...' : 'Create Ticket & Launch Evidence Capture →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
`);

// 14. app/(portal)/brand-packs/page.tsx
writeFile('app/(portal)/brand-packs/page.tsx', `
'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '../../../components/header';
import { useToast } from '../../../components/toast';
import { api } from '../../../lib/api';
import { BrandPack } from '../../../lib/types';

export default function BrandPacksPage() {
  const { showToast } = useToast();
  const [packs, setPacks] = useState<BrandPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState<BrandPack | null>(null);

  useEffect(() => {
    loadPacks();
  }, []);

  async function loadPacks() {
    setLoading(true);
    try {
      const data = await api.getBrandPacks();
      setPacks(data);
      if (data.length > 0) setSelectedPack(data[0]);
    } catch (err) {
      console.error('Failed to load brand packs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClone(id: string) {
    try {
      const cloned = await api.cloneBrandPackVersion(id);
      showToast(\`Created draft v\${cloned.version} of \${cloned.name}\`, 'success');
      loadPacks();
    } catch (err: any) {
      showToast(err.message || 'Clone failed', 'error');
    }
  }

  async function handlePublish(id: string) {
    try {
      const pub = await api.publishBrandPackVersion(id);
      showToast(\`Published v\${pub.version} as live OEM evidence pack!\`, 'success');
      loadPacks();
    } catch (err: any) {
      showToast(err.message || 'Publish failed', 'error');
    }
  }

  return (
    <div className="flex-1 flex flex-col pb-12">
      <Header
        title="Brand Packs & Rules Engine Admin"
        subtitle="Versioned OEM evidence requirements, BYD Attachment A checklist gates, and fault triggers"
      />

      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Brand Packs Version List */}
          <div className="glass-card-static p-5 border border-[#1a56db]/20 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configured OEM Packs</h3>
            <div className="space-y-2">
              {packs.map((pack) => {
                const isSelected = selectedPack?.id === pack.id;
                return (
                  <div
                    key={pack.id}
                    onClick={() => setSelectedPack(pack)}
                    className={\`p-3.5 rounded-xl border transition-all cursor-pointer \${
                      isSelected
                        ? 'bg-[#1a56db]/30 border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                        : 'bg-[#081225]/70 border-[#1a56db]/20 hover:border-[#1a56db]/60'
                    }\`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white text-xs">{pack.name}</p>
                      <span
                        className={\`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase \${
                          pack.status === 'PUBLISHED'
                            ? 'bg-[#10b981]/20 text-[#10b981]'
                            : 'bg-[#f59e0b]/20 text-[#f59e0b]'
                        }\`}
                      >
                        v{pack.version} · {pack.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748b] mt-1 line-clamp-1">{pack.description}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1a56db]/10 text-[10px] text-[#00f0ff]">
                      <span>{pack.rules.length} Evidence Rules</span>
                      <span>OEM: {pack.brandName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Pack Detail & Rules Viewer */}
          <div className="lg:col-span-2 glass-card-static p-6 border border-[#1a56db]/20 space-y-6">
            {selectedPack ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1a56db]/20">
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedPack.name}</h3>
                    <p className="text-xs text-[#cbd5e1]/70 mt-0.5">{selectedPack.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleClone(selectedPack.id)}
                      className="btn-ghost text-xs py-1.5 px-3"
                    >
                      Clone Draft Version
                    </button>
                    {selectedPack.status === 'DRAFT' && (
                      <button
                        onClick={() => handlePublish(selectedPack.id)}
                        className="btn-success text-xs py-1.5 px-3"
                      >
                        Publish Version
                      </button>
                    )}
                  </div>
                </div>

                {/* Rules Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#00f0ff] uppercase tracking-wider">
                    Evidence Checklist Gates ({selectedPack.rules.length} Rules)
                  </h4>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {selectedPack.rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-3.5 rounded-xl bg-[#081225]/80 border border-[#1a56db]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{rule.name}</span>
                            <span
                              className={\`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase \${
                                rule.isMandatory
                                  ? 'bg-[#ef4444]/20 text-[#ef4444]'
                                  : 'bg-[#64748b]/20 text-[#cbd5e1]'
                              }\`}
                            >
                              {rule.isMandatory ? 'Mandatory' : 'Optional'}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-[#1a56db]/20 text-[#00f0ff] text-[10px] font-mono">
                              Tier {rule.tier}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#cbd5e1]/80">{rule.description}</p>
                          <p className="text-[10px] text-[#64748b] font-mono">
                            OEM File: <strong>{rule.namingConvention}</strong>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-2 py-1 rounded bg-[#132952] text-[#00f0ff] font-mono uppercase text-[10px]">
                            {rule.mediaType}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-[#64748b]">Select a brand pack to review rules.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
`);

// 15. app/(portal)/sites/page.tsx
writeFile('app/(portal)/sites/page.tsx', `
'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '../../../components/header';
import { api } from '../../../lib/api';
import { Site } from '../../../lib/types';

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getSites();
        setSites(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="flex-1 flex flex-col pb-12">
      <Header
        title="Booran Dealership Sites & Rooftops"
        subtitle="Manage Victoria multi-brand dealership locations, authorized OEM franchises, and RO prefixes"
      />

      <div className="p-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sites.map((site) => (
            <div
              key={site.id}
              className="glass-card p-6 border border-[#1a56db]/20 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-white">{site.name}</h3>
                  <p className="text-xs text-[#cbd5e1]/70 mt-0.5">{site.location}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#10b981]/20 text-[#10b981] text-xs font-bold">
                  Active
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#1a56db]/10 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#64748b]">RO Prefix:</span>
                  <strong className="font-mono text-[#00f0ff]">{site.roPrefix}</strong>
                </div>
                <div>
                  <span className="text-[#64748b] block mb-1.5">Authorized OEM Rosters:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {site.authorizedBrandIds.map((bid) => (
                      <span
                        key={bid}
                        className="px-2 py-0.5 rounded bg-[#132952] text-white font-medium text-[11px]"
                      >
                        {bid.replace('brand_', '').toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
`);

// 16. app/(portal)/users/page.tsx
writeFile('app/(portal)/users/page.tsx', `
'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '../../../components/header';
import { api } from '../../../lib/api';
import { UserProfile } from '../../../lib/types';

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getUsers();
        setUsers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="flex-1 flex flex-col pb-12">
      <Header
        title="User Access & Role Management"
        subtitle="Group Admin, Warranty Clerks, Service Managers, and Workshop Technicians"
      />

      <div className="p-8 max-w-7xl mx-auto w-full">
        <div className="glass-card-static border border-[#1a56db]/20 overflow-hidden shadow-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#081225]/80 border-b border-[#1a56db]/20 text-[#64748b] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Default Site</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a56db]/10">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#132952]/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">{u.name}</td>
                  <td className="py-3.5 px-4 text-[#cbd5e1] font-mono">{u.email}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-[#1a56db]/20 text-[#00f0ff] font-semibold">
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#cbd5e1]">{u.defaultSiteId}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] font-bold">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
`);

console.log('All frontend pages generated successfully!');
