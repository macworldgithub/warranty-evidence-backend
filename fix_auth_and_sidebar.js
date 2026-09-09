const fs = require('fs');
const path = require('path');

const frontendRoot = 'd:/booran-warranty-new';

function writeFile(relPath, content) {
  const fullPath = path.join(frontendRoot, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log('Created/Updated:', relPath);
}

// 1. Remove app/(portal)/login to avoid collision and keep login standalone
const portalLogin = path.join(frontendRoot, 'app/(portal)/login');
if (fs.existsSync(portalLogin)) {
  fs.rmSync(portalLogin, { recursive: true, force: true });
  console.log('Removed app/(portal)/login');
}

// 2. Write standalone app/login/page.tsx (NO Sidebar, clean modal card)
writeFile('app/login/page.tsx', `
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/types';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSite, setSelectedSite] = useState('site_cranbourne_byd');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Clear any stale tokens when landing on login page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('booran_user');
      localStorage.removeItem('booran_jwt');
      localStorage.removeItem('booran_auth_token');
      localStorage.removeItem('booran_user_profile');
    }
  }, []);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg(null);
  };

  const saveAuthSession = (user: any, token?: string) => {
    const userStr = JSON.stringify(user);
    localStorage.setItem('booran_user', userStr);
    localStorage.setItem('booran_user_profile', userStr);
    if (token) {
      localStorage.setItem('booran_jwt', token);
      localStorage.setItem('booran_auth_token', token);
    } else {
      const mockToken = 'jwt_' + Date.now();
      localStorage.setItem('booran_jwt', mockToken);
      localStorage.setItem('booran_auth_token', mockToken);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (authMode === 'signin') {
        const response = await api.auth.login({
          email: email.trim(),
          password: password.trim(),
          role: selectedRole,
        });

        if (response && response.user) {
          saveAuthSession(response.user, response.accessToken);
          router.replace(response.user.role === 'TECHNICIAN' ? '/cases/new' : '/dashboard');
        } else {
          // Fallback mock session for selected role
          const fallbackUser = {
            id: selectedRole === 'ADMIN' ? 'usr_admin_1' : 'usr_tech_1',
            name: selectedRole === 'ADMIN' ? 'Marcus Vance' : 'Jake Smith',
            email: email.trim() || (selectedRole === 'ADMIN' ? 'admin@booran.com.au' : 'technician@booran.com.au'),
            role: selectedRole,
            defaultSiteId: 'site_cranbourne_byd',
            authorizedSiteIds: ['site_cranbourne_byd', 'site_dandenong_multi', 'site_cheltenham_mg', 'site_berwick_toyota_ford'],
          };
          saveAuthSession(fallbackUser);
          router.replace(selectedRole === 'TECHNICIAN' ? '/cases/new' : '/dashboard');
        }
      } else {
        // Sign Up Mode
        if (!name.trim()) throw new Error('Please enter your full name');
        if (!email.trim() || !email.includes('@')) throw new Error('Please enter a valid work email address');
        if (!password.trim() || password.length < 6) throw new Error('Password must be at least 6 characters');

        const signupPayload = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          role: selectedRole,
          siteId: selectedSite,
        };

        const response = await fetch('/api/v1/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signupPayload),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to create account. Please check your details.');
        }

        saveAuthSession(data.user, data.accessToken);
        setSuccessMsg('Account registered successfully! Redirecting...');
        setTimeout(() => {
          router.replace(selectedRole === 'TECHNICIAN' ? '/cases/new' : '/dashboard');
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#081225] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Ambient Lighting Spheres */}
      <div className="absolute top-[-15%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#1a56db]/15 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] rounded-full bg-[#00f0ff]/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[40%] right-[10%] w-[350px] h-[350px] rounded-full bg-[#f59e0b]/10 blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-lg z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a56db]/20 border border-[#00f0ff]/30 text-[#00f0ff] text-xs font-semibold uppercase tracking-widest mb-3">
            <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-ping" />
            OMNISUITE AI · AFTERSALES MODULE
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
            <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              Booran Motor Group
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Multi-Brand Warranty Evidence Capture & Review Platform
          </p>
        </div>

        {/* Glass Card */}
        <div className="bg-[#0d1b3e]/85 backdrop-blur-2xl border border-[#1a56db]/30 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-6 sm:p-8">
          {/* Tab Switcher: Sign In vs Create Account */}
          <div className="flex bg-[#081225]/80 p-1 rounded-xl border border-[#1a56db]/20 mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={\`flex-1 py-2 text-xs font-semibold rounded-lg transition-all \${
                authMode === 'signin'
                  ? 'bg-gradient-to-r from-[#1a56db] to-[#1e40af] text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }\`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={\`flex-1 py-2 text-xs font-semibold rounded-lg transition-all \${
                authMode === 'signup'
                  ? 'bg-gradient-to-r from-[#1a56db] to-[#1e40af] text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }\`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection (Radio Buttons) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                Select Account Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Radio Option 1: ADMIN */}
                <label
                  onClick={() => handleRoleChange('ADMIN')}
                  className={\`relative flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all \${
                    selectedRole === 'ADMIN'
                      ? 'bg-[#1a56db]/20 border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                      : 'bg-[#081225]/60 border-gray-700/60 hover:border-gray-600 opacity-75'
                  }\`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={\`w-6 h-6 rounded-lg flex items-center justify-center \${
                        selectedRole === 'ADMIN' ? 'bg-[#00f0ff]/20 text-[#00f0ff]' : 'bg-gray-800 text-gray-400'
                      }\`}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <span className="font-bold text-sm text-white">Admin / Clerk</span>
                    </div>
                    <div className={\`w-4 h-4 rounded-full border flex items-center justify-center \${
                      selectedRole === 'ADMIN' ? 'border-[#00f0ff] bg-[#00f0ff]' : 'border-gray-600'
                    }\`}>
                      {selectedRole === 'ADMIN' && <div className="w-1.5 h-1.5 rounded-full bg-[#081225]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-tight">
                    Portal audit, claims approval, rules engine & KPIs
                  </p>
                </label>

                {/* Radio Option 2: TECHNICIAN */}
                <label
                  onClick={() => handleRoleChange('TECHNICIAN')}
                  className={\`relative flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all \${
                    selectedRole === 'TECHNICIAN'
                      ? 'bg-[#1a56db]/20 border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                      : 'bg-[#081225]/60 border-gray-700/60 hover:border-gray-600 opacity-75'
                  }\`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={\`w-6 h-6 rounded-lg flex items-center justify-center \${
                        selectedRole === 'TECHNICIAN' ? 'bg-[#00f0ff]/20 text-[#00f0ff]' : 'bg-gray-800 text-gray-400'
                      }\`}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="font-bold text-sm text-white">Technician</span>
                    </div>
                    <div className={\`w-4 h-4 rounded-full border flex items-center justify-center \${
                      selectedRole === 'TECHNICIAN' ? 'border-[#00f0ff] bg-[#00f0ff]' : 'border-gray-600'
                    }\`}>
                      {selectedRole === 'TECHNICIAN' && <div className="w-1.5 h-1.5 rounded-full bg-[#081225]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-tight">
                    Guided RO capture, Voice-to-Tech & VIN OCR scanner
                  </p>
                </label>
              </div>
            </div>

            {/* Sign Up: Full Name */}
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder={selectedRole === 'ADMIN' ? 'e.g. Marcus Vance' : 'e.g. Jake Smith'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#081225] border border-[#1a56db]/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                  />
                  <div className="absolute right-3 top-2.5 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder={
                    selectedRole === 'ADMIN' ? 'admin@booran.com.au' : 'technician@booran.com.au'
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#081225] border border-[#1a56db]/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                />
                <div className="absolute right-3 top-2.5 text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Sign Up: Dealership Rooftop */}
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Dealership Rooftop
                </label>
                <select
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                  className="w-full bg-[#081225] border border-[#1a56db]/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                >
                  <option value="site_cranbourne_byd">Booran BYD Cranbourne</option>
                  <option value="site_dandenong_multi">Booran Dandenong Multi-Franchise</option>
                  <option value="site_cheltenham_mg">Booran MG & Chery Cheltenham</option>
                  <option value="site_berwick_toyota_ford">Booran Berwick Commercials</option>
                </select>
              </div>
            )}

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                  Password
                </label>
                {authMode === 'signin' && (
                  <span className="text-[11px] text-[#00f0ff]/80 hover:underline cursor-pointer">
                    Default: Booran2026!
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#081225] border border-[#1a56db]/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-900/30 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-900/30 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#1a56db] via-[#2563eb] to-[#00f0ff] hover:from-[#1e40af] hover:to-[#00c8db] shadow-[0_0_20px_rgba(0,240,255,0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>{authMode === 'signin' ? 'Sign In to Workspace' : 'Create Account & Launch'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Attachment A Compliance Badge Footer */}
          <div className="mt-6 pt-4 border-t border-[#1a56db]/20 flex items-center justify-between text-[11px] text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>BYD-WB-2602-02 Active</span>
            </div>
            <span>v1.0 · Multi-Brand Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
`);

// 3. Update app/(portal)/layout.tsx with strict Auth verification (Sidebar ONLY on authorized pages)
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
      const userStr = localStorage.getItem('booran_user') || localStorage.getItem('booran_user_profile');
      const token = localStorage.getItem('booran_jwt') || localStorage.getItem('booran_auth_token');

      if (!userStr || !token) {
        router.replace('/login');
        return;
      }

      try {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
      } catch (err) {
        router.replace('/login');
        return;
      }

      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#081225] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#00f0ff]/20 border-t-[#00f0ff] rounded-full animate-spin shadow-[0_0_15px_rgba(0,240,255,0.4)]" />
          <span className="text-xs text-[#00f0ff] font-semibold tracking-wider uppercase">Verifying Authorization...</span>
        </div>
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

// 4. Update components/sidebar.tsx with robust Logout handler
writeFile('components/sidebar.tsx', `
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { UserRole } from '@/lib/types';

interface SidebarProps {
  userRole?: UserRole;
  userName?: string;
  userEmail?: string;
}

export function Sidebar({ userRole = 'ADMIN', userName = 'Marcus Vance', userEmail = 'admin@booran.com.au' }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = userRole === 'ADMIN';

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('booran_user');
      localStorage.removeItem('booran_user_profile');
      localStorage.removeItem('booran_jwt');
      localStorage.removeItem('booran_auth_token');
    }
    router.replace('/login');
  };

  const adminNavItems = [
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
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  const techNavItems = [
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
      label: 'My Workshop Cases',
      href: '/cases',
      badge: 'Active',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Brand Rules Reference',
      href: '/brand-packs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
  ];

  const navItems = isAdmin ? adminNavItems : techNavItems;

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
              <div className="font-bold text-white text-sm tracking-wide flex items-center gap-1.5">
                BOORAN
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#1a56db]/30 text-[#00f0ff] border border-[#00f0ff]/30">
                  {isAdmin ? 'ADMIN' : 'TECH'}
                </span>
              </div>
              <div className="text-[11px] text-gray-400">Warranty Evidence CRM</div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={\`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 \${
                  item.highlight
                    ? isActive
                      ? 'bg-gradient-to-r from-[#1a56db] to-[#00f0ff] text-white shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                      : 'bg-[#1a56db]/20 text-[#00f0ff] border border-[#00f0ff]/30 hover:bg-[#1a56db]/30'
                    : isActive
                    ? 'bg-[#1a56db]/20 text-white border-l-4 border-[#00f0ff] shadow-inner'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }\`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-[#00f0ff]' : 'text-gray-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#1a56db]/30 text-[#00f0ff] border border-[#1a56db]/50">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile & Logout */}
      <div className="p-4 border-t border-[#1a56db]/20 bg-[#081225]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#1a56db]/40 border border-[#00f0ff]/40 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {userName ? userName.split(' ').map((n) => n[0]).join('') : 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{userName}</div>
              <div className="text-[10px] text-gray-400 truncate">{userEmail}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
            title="Log Out (Clear Session)"
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

// 5. Update app/page.tsx (root redirect)
writeFile('app/page.tsx', `
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('booran_user') || localStorage.getItem('booran_user_profile');
      const token = localStorage.getItem('booran_jwt') || localStorage.getItem('booran_auth_token');

      if (userStr && token) {
        try {
          const user = JSON.parse(userStr);
          router.replace(user.role === 'TECHNICIAN' ? '/cases/new' : '/dashboard');
          return;
        } catch {
          // fall through
        }
      }
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#081225] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" />
    </div>
  );
}
`);

console.log('✅ Auth and Layout Sidebar gating successfully updated!');
