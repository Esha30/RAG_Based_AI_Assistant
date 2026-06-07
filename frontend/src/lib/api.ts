const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('rag_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isFormData = false
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }

  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    register: (email: string, username: string, password: string) =>
      request<{ access_token: string; user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, username, password }),
      }),
    login: (email: string, password: string) =>
      request<{ access_token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<User>('/api/auth/me'),
  },

  // ─── Documents ──────────────────────────────────────────────────────────────
  documents: {
    list: () => request<{ documents: Document[] }>('/api/documents/'),
    upload: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<{ message: string; document: Document }>(
        '/api/documents/upload',
        { method: 'POST', body: form },
        true
      );
    },
    delete: (id: string) =>
      request<{ message: string }>(`/api/documents/${id}`, { method: 'DELETE' }),
    summarize: (id: string) =>
      request<SummaryResult>(`/api/documents/${id}/summarize`),
  },

  // ─── Chats ──────────────────────────────────────────────────────────────────
  chats: {
    list: () => request<{ chats: Chat[] }>('/api/chats/'),
    create: (title: string, documentIds: string[]) =>
      request<Chat>('/api/chats/', {
        method: 'POST',
        body: JSON.stringify({ title, document_ids: documentIds }),
      }),
    get: (id: string) => request<{ chat: Chat; messages: Message[] }>(`/api/chats/${id}`),
    delete: (id: string) =>
      request<{ message: string }>(`/api/chats/${id}`, { method: 'DELETE' }),
  },

  // ─── Analytics ──────────────────────────────────────────────────────────────
  analytics: {
    get: () => request<Analytics>('/api/analytics/'),
  },

  // ─── Resume ─────────────────────────────────────────────────────────────────
  resume: {
    analyze: (file: File, jobDescription?: string) => {
      const form = new FormData();
      form.append('file', file);
      if (jobDescription) form.append('job_description', jobDescription);
      return request<ResumeAnalysis>('/api/resume/analyze', { method: 'POST', body: form }, true);
    },
  },

  // ─── Streaming ──────────────────────────────────────────────────────────────
  streamMessage: async (
    chatId: string,
    content: string,
    documentIds: string[],
    onChunk: (text: string) => void,
    onSources: (sources: Source[]) => void,
    onDone: () => void,
    onError?: (message: string) => void
  ) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content, document_ids: documentIds }),
    });

    if (!res.ok) throw new Error('Failed to send message');

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // Accumulate decoded bytes into buffer; stream=false keeps partial surrogates
      buffer += decoder.decode(value, { stream: true });
      // Split on SSE double-newline boundaries
      const parts = buffer.split('\n\n');
      // Keep the last (possibly incomplete) part in the buffer
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'chunk') onChunk(data.content);
          else if (data.type === 'sources') onSources(data.sources);
          else if (data.type === 'done') onDone();
          else if (data.type === 'error') {
            if (onError) onError(data.content);
            else onDone(); // fall back: close stream cleanly
          }
        } catch { /* ignore malformed frames */ }
      }
    }
    // Flush any residual bytes in the decoder
    const residual = decoder.decode();
    if (residual.startsWith('data: ')) {
      try {
        const data = JSON.parse(residual.slice(6));
        if (data.type === 'chunk') onChunk(data.content);
        else if (data.type === 'sources') onSources(data.sources);
        else if (data.type === 'done') onDone();
        else if (data.type === 'error') {
          if (onError) onError(data.content);
          else onDone();
        }
      } catch { /* ignore */ }
    }
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  username: string;
}

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  chunk_count: number;
  collection_name: string;
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  document_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Source[];
  created_at: string;
}

export interface Source {
  source: string;
  page: number | string;
  snippet: string;
}

export interface Analytics {
  document_count: number;
  total_size_bytes: number;
  total_size_mb: number;
  total_chunks: number;
  chat_count: number;
  ai_responses: number;
  avg_chunks_per_doc: number;
}

export interface SummaryResult {
  document_id: string;
  document_name: string;
  summary: string;
  key_points: string[];
  topics: string[];
  document_type?: string;
}

export interface ResumeAnalysis {
  ats_score: number;
  overall_grade: string;
  sections: Record<string, { score: number; status: string; notes: string }>;
  found_skills: string[];
  missing_skills: string[];
  strengths: string[];
  improvements: string[];
  keywords_found: string[];
  keywords_missing: string[];
  formatting_issues: string[];
  career_level: string;
  recommended_roles: string[];
}
