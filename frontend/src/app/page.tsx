'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) router.replace(user ? '/dashboard' : '/login');
  }, [user, loading, router]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(139,92,246,0.3)', borderTopColor: '#8b5cf6', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
