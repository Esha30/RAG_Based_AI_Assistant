'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sparkles, FileText, MessageSquare, FileCheck, BarChart2, LogOut, User } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Documents', path: '/dashboard', icon: FileText },
    { name: 'AI Chat', path: '/dashboard/chat', icon: MessageSquare },
    { name: 'Resume Analyzer', path: '/dashboard/resume', icon: FileCheck },
    { name: 'Analytics', path: '/dashboard/analytics', icon: BarChart2 },
  ];

  return (
    <aside className="sidebar" style={{ padding: '24px 16px', justifyContent: 'space-between' }}>
      {/* Top Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 8 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 38,
            height: 38,
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            borderRadius: 10,
            boxShadow: '0 4px 12px rgba(139,92,246,0.3)'
          }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '0.5px' }}>RAG ASSISTANT</h2>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Intelligence Hub</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--bg-hover)' : 'transparent',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--border)' : 'transparent',
                  boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                }}
                className={!isActive ? 'glass-hover' : ''}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Info & Logout */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        paddingTop: 16,
        borderTop: '1px solid var(--border)'
      }}>
        {/* User Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)'
          }}>
            <User size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.username || 'User'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email || ''}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            padding: '11px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.1)';
          }}
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
