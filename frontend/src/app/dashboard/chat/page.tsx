'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api, Chat, Message, Document, Source } from '@/lib/api';
import {
  MessageSquare,
  Plus,
  Trash2,
  FileText,
  Send,
  Loader,
  BookOpen,
  Info,
  Layers,
  ChevronRight,
  ExternalLink,
  X
} from 'lucide-react';

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  
  // Creation States
  const [newChatTitle, setNewChatTitle] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  
  // Message Sending States
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [streamedSources, setStreamedSources] = useState<Source[]>([]);
  
  // Selected Citation Detail Drawer/Modal
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial documents and chats
  const loadInitialData = useCallback(async () => {
    try {
      const [docsRes, chatsRes] = await Promise.all([
        api.documents.list(),
        api.chats.list(),
      ]);
      setDocuments(docsRes.documents.filter(doc => doc.chunk_count > 0));
      setChats(chatsRes.chats);

      if (chatsRes.chats.length > 0) {
        handleSelectChat(chatsRes.chats[0]);
      }
    } catch (err) {
      console.error('Failed to load initial chat data', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedText]);

  // Select a Chat thread
  const handleSelectChat = async (chat: Chat) => {
    setActiveChat(chat);
    setSelectedDocIds(chat.document_ids);
    setMessages([]);
    setStreamedText('');
    setStreamedSources([]);
    try {
      const res = await api.chats.get(chat.id);
      setMessages(res.messages);
    } catch (err) {
      console.error('Failed to get chat messages', err);
    }
  };

  // Create a new Chat thread
  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDocIds.length === 0) {
      alert('Please select at least one document to chat with.');
      return;
    }
    setIsCreatingChat(true);
    try {
      const title = newChatTitle.trim() || 'Chat with ' + selectedDocIds.length + ' doc(s)';
      const chat = await api.chats.create(title, selectedDocIds);
      setChats(prev => [chat, ...prev]);
      setActiveChat(chat);
      setMessages([]);
      setNewChatTitle('');
      setIsCreatingChat(false);
    } catch (err) {
      alert('Failed to create chat thread');
      setIsCreatingChat(false);
    }
  };

  // Delete Chat thread
  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat history?')) return;
    try {
      await api.chats.delete(chatId);
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (activeChat?.id === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
    } catch (err) {
      alert('Failed to delete chat thread');
    }
  };

  // Toggle document selection
  const handleToggleDoc = (docId: string) => {
    setSelectedDocIds(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeChat || isStreaming) return;

    const currentMsg = inputMessage;
    setInputMessage('');
    setIsStreaming(true);
    setStreamedText('');
    setStreamedSources([]);

    // Locally append user message to prompt responsive feel
    const userMsg: Message = {
      id: Math.random().toString(),
      chat_id: activeChat.id,
      role: 'user',
      content: currentMsg,
      sources: [],
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      await api.streamMessage(
        activeChat.id,
        currentMsg,
        selectedDocIds,
        (chunk) => {
          setStreamedText(prev => prev + chunk);
        },
        (sources) => {
          setStreamedSources(sources);
        },
        async () => {
          // Finished streaming
          setIsStreaming(false);
          setStreamedText('');
          setStreamedSources([]);
          // Re-fetch chat messages to align exactly with database ID schemas
          const res = await api.chats.get(activeChat.id);
          setMessages(res.messages);
          // Re-fetch chats to refresh automated titles
          const chatsRes = await api.chats.list();
          setChats(chatsRes.chats);
          const activeUpdated = chatsRes.chats.find(c => c.id === activeChat.id);
          if (activeUpdated) setActiveChat(activeUpdated);
        }
      );
    } catch (err) {
      alert('Failed to stream response');
      setIsStreaming(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', position: 'relative' }}>
      
      {/* ── Chat Side History Panel ────────────────────────────────────────── */}
      <div style={{
        width: '320px',
        borderRight: '1px solid var(--border)',
        background: 'rgba(17, 17, 24, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        {/* Header Create Trigger */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color="var(--accent)" />
            <span>Chat Sessions</span>
          </h2>
          <form onSubmit={handleCreateChat} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="New session title..."
              value={newChatTitle}
              onChange={e => setNewChatTitle(e.target.value)}
              className="input-field"
              style={{ padding: '10px 14px', fontSize: '13px' }}
            />
            
            {/* Quick Multi-select doc list for context selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Target Documents</span>
              {documents.length === 0 ? (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No processed documents available.</span>
              ) : (
                documents.map(doc => (
                  <label key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.id)}
                      onChange={() => handleToggleDoc(doc.id)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selectedDocIds.includes(doc.id) ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {doc.original_name}
                    </span>
                  </label>
                ))
              )}
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isCreatingChat || selectedDocIds.length === 0}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '13px' }}
            >
              {isCreatingChat ? <Loader size={14} className="spin" /> : <Plus size={14} />}
              <span>Start New Chat</span>
            </button>
          </form>
        </div>

        {/* Chat Threads List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {chats.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px 0' }}>
              No chats found. Select docs above to start a thread!
            </div>
          ) : (
            chats.map((chat) => {
              const isActive = activeChat?.id === chat.id;
              return (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className={`glass ${isActive ? '' : 'glass-hover'}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    background: isActive ? 'var(--bg-hover)' : 'rgba(22, 22, 31, 0.4)',
                    borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <MessageSquare size={15} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {chat.title}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      borderRadius: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Active Chat Workspace ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', height: '100%' }}>
        {activeChat ? (
          <>
            {/* Header / Attached Docs info */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(22,22,31,0.3)',
            }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
                  {activeChat.title}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Layers size={11} />
                    Linked Context:
                  </span>
                  {selectedDocIds.map((id) => {
                    const doc = documents.find(d => d.id === id);
                    if (!doc) return null;
                    return (
                      <span
                        key={id}
                        style={{
                          background: 'var(--bg-hover)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '99px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FileText size={9} />
                        {doc.original_name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chat Messages viewport */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '30px 40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {messages.length === 0 && !isStreaming && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px', maxWidth: '500px', margin: '0 auto', gap: '16px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--accent)'
                  }}>
                    <BookOpen size={24} />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Start your semantic inquiry</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>
                    Ask specific questions about the documents attached. The AI will extract context passages and provide direct answers with source citations.
                  </p>
                </div>
              )}

              {/* Message History mapping */}
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}
                  >
                    <div className="prose">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Citations block */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Info size={11} />
                          Passages Cited:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {msg.sources.map((src, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedSource(src)}
                              className="source-badge"
                            >
                              <span>Doc {idx + 1}: {src.source} (Pg. {src.page})</span>
                              <ChevronRight size={10} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Streaming AI message render placeholder */}
              {isStreaming && streamedText && (
                <div className="chat-bubble-ai fade-in">
                  <div className="prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamedText}
                    </ReactMarkdown>
                  </div>

                  {/* Streaming Sources list */}
                  {streamedSources.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Info size={11} />
                        Passages Cited:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {streamedSources.map((src, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedSource(src)}
                            className="source-badge"
                          >
                            <span>Doc {idx + 1}: {src.source} (Pg. {src.page})</span>
                            <ChevronRight size={10} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Streaming loading indicator when waiting for first response token */}
              {isStreaming && !streamedText && (
                <div className="chat-bubble-ai" style={{ display: 'flex', gap: '6px', padding: '14px 20px' }}>
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar form */}
            <div style={{ padding: '24px 40px', borderTop: '1px solid var(--border)', background: 'rgba(10,10,15,0.8)' }}>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <input
                  type="text"
                  placeholder="Ask a question about the document context..."
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  className="input-field"
                  disabled={isStreaming}
                  style={{ flex: 1, padding: '14px 18px', borderRadius: '12px' }}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isStreaming || !inputMessage.trim()}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', padding: 0, borderRadius: '12px', flexShrink: 0 }}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
            <MessageSquare size={36} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>No session active</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '300px' }}>
              Create a new session or select an existing thread from the left sidebar to begin.
            </p>
          </div>
        )}
      </div>

      {/* ── Citation Detail Modal Overlay ────────────────────────────────── */}
      {selectedSource && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div className="glass fade-in" style={{
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={16} color="var(--accent)" />
                <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Source Passage Citation</h4>
              </div>
              <button
                onClick={() => setSelectedSource(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Document Name</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={14} color="var(--text-secondary)" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedSource.source}</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Page Citation</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Page {selectedSource.page}</span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Extracted Snippet</span>
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic'
                }}>
                  &ldquo;{selectedSource.snippet}...&rdquo;
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'rgba(0, 0, 0, 0.15)'
            }}>
              <button
                onClick={() => setSelectedSource(null)}
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Close Citation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
