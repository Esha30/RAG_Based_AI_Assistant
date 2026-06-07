'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { api, ResumeAnalysis } from '@/lib/api';
import {
  FileCheck,
  UploadCloud,
  FileText,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Award,
  Zap,
  BookOpen
} from 'lucide-react';

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError('');
    }
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please upload a resume file first.');
      return;
    }
    setLoading(true);
    setError('');
    setAnalysis(null);
    try {
      const result = await api.resume.analyze(file, jobDescription);
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setJobDescription('');
    setAnalysis(null);
    setError('');
  };

  // Helper: Get color-code based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('good') || s.includes('excellent')) {
      return { label: 'Good', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
    }
    if (s.includes('improve') || s.includes('warning')) {
      return { label: 'Needs Improvement', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
    }
    return { label: 'Critical Check', bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }} className="fade-in">
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.5px' }}>
          ATS Resume Analyzer
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Upload your CV/Resume alongside a target job description to get an automated ATS grade, feedback, and keyword matching.
        </p>
      </div>

      {/* Main Analyzer View */}
      {!analysis ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }} className="fade-in">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* File Dropzone */}
            <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'active' : ''}`} style={{ padding: '50px 40px' }}>
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
                }}>
                  <UploadCloud size={26} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                    {file ? `Selected file: ${file.name}` : 'Upload your CV / Resume'}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    Supports PDF, DOCX, DOC, or TXT
                  </p>
                </div>
                {file && (
                  <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                    Click or drag a new file to replace
                  </span>
                )}
              </div>
            </div>

            {/* Target Job Description Text Area */}
            <div>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                Target Job Description (Optional)
              </label>
              <textarea
                className="input-field"
                placeholder="Paste the target job description here to enable resume tailoring, keyword optimization checks, and skill-gap matching..."
                rows={8}
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                style={{ resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px' }}>
                <AlertTriangle size={16} color="#ef4444" />
                <span style={{ fontSize: 13, color: '#ef4444' }}>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !file}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', fontSize: '15px' }}
            >
              {loading ? (
                <>
                  <Loader className="spin" size={16} />
                  <span>Parsing and scanning resume contents...</span>
                </>
              ) : (
                <>
                  <FileCheck size={16} />
                  <span>Start ATS Scan & Match</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* ATS Results Report scorecard view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="fade-in">
          
          {/* Header Action / Back */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={18} color="var(--accent)" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Analysis report for: {file?.name}
              </span>
            </div>
            <button onClick={resetForm} className="btn-ghost" style={{ padding: '8px 16px', fontSize: '13px' }}>
              Scan Another Resume
            </button>
          </div>

          {/* Core Score Section Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            
            {/* ATS Score Ring Card */}
            <div className="glass" style={{ padding: '30px', display: 'flex', alignItems: 'center', gap: '30px' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                <svg className="score-ring" width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="transparent"
                    stroke={getScoreColor(analysis.ats_score)}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 50}
                    strokeDashoffset={2 * Math.PI * 50 * (1 - analysis.ats_score / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'Outfit', color: getScoreColor(analysis.ats_score) }}>
                    {analysis.ats_score}%
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>ATS FIT</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Overall Grade
                </span>
                <h2 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  {analysis.overall_grade}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Estimated level: <strong style={{ color: '#fff' }}>{analysis.career_level}</strong>
                </p>
              </div>
            </div>

            {/* Strengths & Improvement Quick Summary */}
            <div className="glass" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} color="var(--accent)" />
                <span>Executive Summary</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Your resume highlights a solid background with core strengths in:
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {analysis.strengths.slice(0, 3).map((st, i) => (
                      <span key={i} style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#6ee7b7', fontSize: '10px', padding: '2px 8px', borderRadius: '4px' }}>
                        {st}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section Grade Breakdowns */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Section Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(analysis.sections).map(([sectionKey, val]: [string, any]) => {
                const badge = getStatusBadge(val.status);
                return (
                  <div key={sectionKey} className="glass" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '240px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', width: '40px', textAlign: 'center' }}>
                        {val.score}%
                      </div>
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 600, textTransform: 'capitalize', color: '#fff' }}>
                          {sectionKey.replace('_', ' ')}
                        </span>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                          {val.notes}
                        </p>
                      </div>
                    </div>
                    <span style={{
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.color}30`,
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '99px'
                    }}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skills, Keyword Matching & Recommended Roles Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            
            {/* Skills & Keyword matching card */}
            <div className="glass" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} color="var(--accent)" />
                <span>Keywords & Skill Gap Analysis</span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Found Keywords */}
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    Matching Skills & Keywords ({analysis.keywords_found.length})
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {analysis.keywords_found.map((kw, i) => (
                      <span key={i} style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#a7f3d0', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Missing Keywords */}
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    Missing Keywords ({analysis.keywords_missing.length})
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {analysis.keywords_missing.map((kw, i) => (
                      <span key={i} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Improvement checklist & Recommended Roles */}
            <div className="glass" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={16} color="var(--accent)" />
                <span>Recommendations</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Actions of Improvement */}
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    Actionable Improvements
                  </span>
                  <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {analysis.improvements.map((imp, i) => (
                      <li key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {imp}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommended roles */}
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    Recommended Job Targets
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {analysis.recommended_roles.map((role, i) => (
                      <span key={i} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '11px', padding: '4px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Briefcase size={11} />
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Formatting issues */}
                {analysis.formatting_issues && analysis.formatting_issues.length > 0 && (
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                      Formatting Checks
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {analysis.formatting_issues.map((issue, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#fca5a5' }}>
                          <AlertTriangle size={11} />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple loader helper
function Loader({ className, size }: { className?: string; size?: number }) {
  return (
    <div className={className} style={{ width: size || 16, height: size || 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
  );
}
