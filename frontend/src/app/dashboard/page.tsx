'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { api, Document, SummaryResult } from '@/lib/api';
import {
  FileText,
  UploadCloud,
  Trash2,
  BookOpen,
  Calendar,
  Layers,
  X,
  File,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Summarize Modal State
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [summaryError, setSummaryError] = useState('');

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await api.documents.list();
      setDocuments(res.documents);
    } catch (err: any) {
      console.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Dropzone setup
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    const file = acceptedFiles[0];
    try {
      await api.documents.upload(file);
      setUploadSuccess(`"${file.name}" uploaded successfully. Processing in background.`);
      fetchDocuments();
      // Clear success banner after 5 seconds
      setTimeout(() => setUploadSuccess(''), 5000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  }, [fetchDocuments]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.documents.delete(id);
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
        setSummaryResult(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleSummarize = async (doc: Document) => {
    setSelectedDoc(doc);
    setSummaryLoading(true);
    setSummaryResult(null);
    setSummaryError('');
    try {
      const res = await api.documents.summarize(doc.id);
      setSummaryResult(res);
    } catch (err: any) {
      setSummaryError(err.message || 'Failed to generate document summary. It may still be processing.');
    } finally {
      setSummaryLoading(false);
    }
  };

  // Helper: Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper: Get file color theme and icon
  const getFileInfo = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return { color: '#f87171', bg: 'rgba(239, 68, 68, 0.1)' };
      case 'docx':
      case 'doc':
        return { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)' };
      default:
        return { color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.1)' };
    }
  };

  // Helper: Format date
  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '40px' }} className="fade-in">
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.5px' }}>
          Document Intelligence Hub
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Upload files to index them for semantic AI queries and automatic structural summaries.
        </p>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }} className="fade-in">
        {/* Upload Zone */}
        <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--accent)',
              marginBottom: '4px'
            }} className={uploading ? 'pulse' : ''}>
              <UploadCloud size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
                {uploading ? 'Uploading and indexing...' : 'Drag & drop document here'}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Supports PDF, DOCX, DOC, or TXT (up to 20MB)
              </p>
            </div>
            {!uploading && (
              <button type="button" className="btn-primary" style={{ padding: '10px 20px', fontSize: '13px' }}>
                Select File
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {uploadError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', padding: '12px 16px' }}>
            <AlertCircle size={18} color="#ef4444" />
            <span style={{ fontSize: '14px', color: '#ef4444' }}>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-sm)', padding: '12px 16px' }}>
            <CheckCircle size={18} color="#10b981" />
            <span style={{ fontSize: '14px', color: '#10b981' }}>{uploadSuccess}</span>
          </div>
        )}

        {/* Document List Panel */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Indexed Documents</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '99px', border: '1px solid var(--border)' }}>
              {documents.length} Total
            </span>
          </h2>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: '76px', width: '100%' }} />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="glass" style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <File size={36} color="var(--text-muted)" />
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
                No documents indexed yet. Drag a file above to get started!
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
              {documents.map((doc) => {
                const info = getFileInfo(doc.file_type);
                return (
                  <div
                    key={doc.id}
                    className="glass glass-hover"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      gap: '16px'
                    }}
                  >
                    {/* Left: Document Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: info.bg,
                        color: info.color,
                        flexShrink: 0
                      }}>
                        <FileText size={20} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }} title={doc.original_name}>
                          {doc.original_name}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Layers size={11} />
                            {doc.chunk_count > 0 ? `${doc.chunk_count} chunks` : 'Processing...'}
                          </span>
                          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {formatSize(doc.file_size)}
                          </span>
                          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={11} />
                            {formatDate(doc.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={() => handleSummarize(doc)}
                        disabled={doc.chunk_count === 0}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-sm)'
                        }}
                        className="btn-ghost"
                      >
                        <BookOpen size={13} />
                        <span>Summarize</span>
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid rgba(239, 68, 68, 0.15)',
                          background: 'rgba(239, 68, 68, 0.05)',
                          color: '#f87171',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                          e.currentTarget.style.color = '#ef4444';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                          e.currentTarget.style.color = '#f87171';
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Summarize Modal Overlay */}
      {selectedDoc && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass fade-in" style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)'
            }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
                  Document Summary
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={selectedDoc.original_name}>
                  {selectedDoc.original_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px',
                  borderRadius: '50%', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {summaryLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="skeleton" style={{ height: '80px', width: '100%' }} />
                  <div className="skeleton" style={{ height: '140px', width: '100%' }} />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div className="skeleton" style={{ height: '30px', width: '80px' }} />
                    <div className="skeleton" style={{ height: '30px', width: '120px' }} />
                    <div className="skeleton" style={{ height: '30px', width: '90px' }} />
                  </div>
                </div>
              ) : summaryError ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px' }}>
                  <AlertCircle size={16} color="#ef4444" />
                  <span style={{ fontSize: 13, color: '#ef4444' }}>{summaryError}</span>
                </div>
              ) : summaryResult ? (
                <>
                  {/* Category & Summary */}
                  <div>
                    {summaryResult.document_type && (
                      <span style={{
                        display: 'inline-block',
                        background: 'rgba(6, 182, 212, 0.1)',
                        border: '1px solid rgba(6, 182, 212, 0.25)',
                        color: '#22d3ee',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: '99px',
                        marginBottom: '10px'
                      }}>
                        {summaryResult.document_type}
                      </span>
                    )}
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Executive Summary
                    </h4>
                    <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                      {summaryResult.summary}
                    </p>
                  </div>

                  {/* Key Points */}
                  {summaryResult.key_points && summaryResult.key_points.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Key Takeaways
                      </h4>
                      <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {summaryResult.key_points.map((pt, idx) => (
                          <li key={idx} style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Topics Badges */}
                  {summaryResult.topics && summaryResult.topics.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Core Topics & Keywords
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {summaryResult.topics.map((topic, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: 'var(--bg-hover)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-secondary)',
                              fontSize: '11px',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: 500
                            }}
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'rgba(0, 0, 0, 0.15)'
            }}>
              <button
                onClick={() => setSelectedDoc(null)}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
