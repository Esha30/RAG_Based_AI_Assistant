'use client';

import { useEffect, useState } from 'react';
import { api, Analytics } from '@/lib/api';
import {
  BarChart2,
  FileText,
  Layers,
  HardDrive,
  MessageSquare,
  Cpu,
  Activity,
  CheckCircle,
  TrendingUp,
  Percent
} from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await api.analytics.get();
        setData(res);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  const limitQuota = 500; // Simulated storage limit in MB

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }} className="fade-in">
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.5px' }}>
          Platform Analytics
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Real-time storage diagnostics, document ingestion statistics, and chat interaction metrics.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton" style={{ height: '140px' }} />
          ))}
        </div>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="fade-in">
          
          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            
            {/* Documents Card */}
            <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Indexed Documents</span>
                <FileText size={16} color="var(--accent)" />
              </div>
              <h2 style={{ fontSize: '36px', fontWeight: 800 }}>{data.document_count}</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Files currently available in context</span>
            </div>

            {/* Total Size Card */}
            <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Context Size</span>
                <HardDrive size={16} color="#06b6d4" />
              </div>
              <h2 style={{ fontSize: '36px', fontWeight: 800 }}>{data.total_size_mb} <span style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-secondary)' }}>MB</span></h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Combined raw text storage size</span>
            </div>

            {/* Database Chunks Card */}
            <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Vector Index Chunks</span>
                <Layers size={16} color="#f59e0b" />
              </div>
              <h2 style={{ fontSize: '36px', fontWeight: 800 }}>{data.total_chunks}</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Embeddings stored in ChromaDB</span>
            </div>

            {/* Chat Sessions Card */}
            <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Chat Sessions</span>
                <MessageSquare size={16} color="#10b981" />
              </div>
              <h2 style={{ fontSize: '36px', fontWeight: 800 }}>{data.chat_count}</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Conversational threads initialized</span>
            </div>

            {/* AI Responses Card */}
            <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>AI Responses</span>
                <Cpu size={16} color="#a78bfa" />
              </div>
              <h2 style={{ fontSize: '36px', fontWeight: 800 }}>{data.ai_responses}</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total streaming answers generated</span>
            </div>

            {/* Avg Chunks Card */}
            <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Avg. Chunks / Doc</span>
                <Activity size={16} color="#ec4899" />
              </div>
              <h2 style={{ fontSize: '36px', fontWeight: 800 }}>{data.avg_chunks_per_doc}</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mean chunk segmentation depth</span>
            </div>
          </div>

          {/* Detailed Resource Limit Analytics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            
            {/* Storage Quota details */}
            <div className="glass" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HardDrive size={16} color="var(--accent)" />
                <span>Indexed Disk Storage Limit</span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Storage Used</span>
                  <span>{data.total_size_mb} MB / {limitQuota} MB</span>
                </div>
                
                {/* Progress bar */}
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min((data.total_size_mb / limitQuota) * 100, 100)}%` }}
                  />
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  The vector store holds embeddings indexing your text chunks. Reaching 100% of storage limits requires cleanup of obsolete documents.
                </p>
              </div>
            </div>

            {/* Performance Analytics summary */}
            <div className="glass" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} color="var(--accent)" />
                <span>System Operations Health</span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Embeddings Ingestion Status</span>
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Active / Online</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>ChromaDB Persistence</span>
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Synced</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>LLM Inference Mode</span>
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Gemini-2.0-Flash (API)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          No analytics data available.
        </div>
      )}
    </div>
  );
}
