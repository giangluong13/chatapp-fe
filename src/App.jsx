import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { chatService } from './services/chatService';
import './index.css';

// ---- Icons ----
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const BotIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/>
    <path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>
  </svg>
);
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const ChatIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);
const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ---- Typing indicator ----
const TypingDots = () => (
  <div className="typing-dots">
    <span/><span/><span/>
  </div>
);

// ---- Message component ----
const Message = ({ msg }) => {
  const isUser = msg.role === 'user';
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className={`message-row ${isUser ? 'user' : 'assistant'}`}>
      <div className="avatar">{isUser ? <UserIcon /> : <BotIcon />}</div>
      <div className="bubble-wrap">
        <div className={`bubble ${isUser ? 'user' : 'assistant'}`}>
          <p className="bubble-text">{msg.content}</p>
          {msg.attachments?.length > 0 && (
            <div className="attachments">
              {msg.attachments.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noreferrer" className="attachment-chip">
                  <FileIcon /> <span>{a.originalName}</span>
                </a>
              ))}
            </div>
          )}
        </div>
        <span className="timestamp">{time}</span>
      </div>
    </div>
  );
};

// ---- Main App ----
export default function App() {
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('chatSessionId') || uuidv4());
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState(null);

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Persist sessionId
  useEffect(() => {
    localStorage.setItem('chatSessionId', sessionId);
  }, [sessionId]);

  // Load history on session change
  useEffect(() => {
    const load = async () => {
      try {
        const data = await chatService.getHistory(sessionId);
        setMessages(data.messages || []);
      } catch { setMessages([]); }
    };
    load();
  }, [sessionId]);

  // Load sidebar conversations
  const loadConversations = useCallback(async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch { /* no-op */ }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!prompt.trim() && files.length === 0) return;
    setError(null);
    const userText = prompt.trim();
    setPrompt('');

    // Optimistic user message
    const optimistic = {
      role: 'user',
      content: userText,
      attachments: files.map(f => ({ originalName: f.name })),
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimistic]);
    setFiles([]);
    setLoading(true);

    try {
      const res = await chatService.sendMessage(userText, sessionId, files);
      setSessionId(res.sessionId);
      // Replace optimistic with real data
      setMessages(prev => [
        ...prev.slice(0, -1),
        res.userMessage,
        res.assistantMessage
      ]);
      loadConversations();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message. Is the backend running?');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (e.nativeEvent.isComposing) return
      console.log('handleKeyDown', e);
      handleSend();
    }
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selected].slice(0, 5));
    e.target.value = '';
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const newChat = () => {
    const sid = uuidv4();
    setSessionId(sid);
    setMessages([]);
    setPrompt('');
    setFiles([]);
  };

  const loadConvo = (sid) => {
    setSessionId(sid);
  };

  const deleteConvo = async (e, sid) => {
    e.stopPropagation();
    await chatService.deleteConversation(sid);
    if (sid === sessionId) newChat();
    loadConversations();
  };

  const adjustTextarea = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    }
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <BotIcon />
            <span>AI Chat</span>
          </div>
          <button className="new-chat-btn" onClick={newChat}>
            <PlusIcon /> New Chat
          </button>
        </div>
        <div className="conversations-list">
          <p className="list-label">Recent Chats</p>
          {conversations.length === 0 && (
            <p className="empty-list">No conversations yet</p>
          )}
          {conversations.map(c => (
            <div
              key={c.sessionId}
              className={`convo-item ${c.sessionId === sessionId ? 'active' : ''}`}
              onClick={() => loadConvo(c.sessionId)}
            >
              <ChatIcon />
              <span className="convo-title">{c.title}</span>
              <button className="delete-btn" onClick={(e) => deleteConvo(e, c.sessionId)}>
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <p>Powered by Giang Luong</p>
        </div>
      </aside>

      {/* Main area */}
      <main className="main">
        {/* Topbar */}
        <header className="topbar">
          <button className="toggle-sidebar" onClick={() => setSidebarOpen(o => !o)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <h1 className="topbar-title">AI Assistant</h1>
        </header>

        {/* Messages */}
        <div className="messages-area">
          {messages.length === 0 && !loading && (
            <div className="welcome">
              <div className="welcome-icon"><BotIcon /></div>
              <h2>How can I help you today?</h2>
              <p>Ask me anything or upload a file to get started.</p>
              <div className="suggestions">
                {['Explain a concept', 'Write some code', 'Summarize a document', 'Answer a question'].map(s => (
                  <button key={s} className="suggestion-chip" onClick={() => setPrompt(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => <Message key={i} msg={msg} />)}

          {loading && (
            <div className="message-row assistant">
              <div className="avatar"><BotIcon /></div>
              <div className="bubble assistant thinking">
                <TypingDots />
              </div>
            </div>
          )}

          {error && (
            <div className="error-banner">⚠ {error}</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="input-area">
          {files.length > 0 && (
            <div className="file-chips">
              {files.map((f, i) => (
                <div key={i} className="file-chip">
                  <FileIcon />
                  <span>{f.name}</span>
                  <button onClick={() => removeFile(i)}><XIcon /></button>
                </div>
              ))}
            </div>
          )}
          <div className="input-box">
            <button
              className="upload-btn"
              title="Upload file"
              onClick={() => fileInputRef.current?.click()}
            >
              <PlusIcon />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              multiple
              accept=".jpg,.jpeg,.png,.gif,.pdf,.txt,.doc,.docx,.csv,.json"
              onChange={handleFileChange}
            />
            <textarea
              ref={textareaRef}
              className="prompt-input"
              placeholder="Message AI Assistant... (Shift+Enter for new line)"
              value={prompt}
              onChange={e => { setPrompt(e.target.value); adjustTextarea(); }}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              className={`send-btn ${(prompt.trim() || files.length > 0) && !loading ? 'active' : ''}`}
              onClick={handleSend}
              disabled={loading || (!prompt.trim() && files.length === 0)}
            >
              <SendIcon />
              <span>Generate Free</span>
            </button>
          </div>
          <p className="input-hint">AI can make mistakes. Verify important information.</p>
        </div>
      </main>
    </div>
  );
}
