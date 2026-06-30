import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';

function parseMarkdown(text: string) {
  // Very basic markdown parser for bold and line breaks
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,0.05);padding:2px 4px;border-radius:4px;">$1</code>');
  return { __html: html };
}

export default function CopilotScreen() {
  const { token } = useAuth();
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([{
    role: 'assistant',
    content: '👋 **Hello! I am CivicMind Copilot.**\n\nAsk me questions about ward performance, SLA configurations, or impact reports! I have direct access to your latest municipal data.'
  }]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userQuery = query.trim();
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setQuery('');
    setLoading(true);

    try {
      const res = await fetch(`${base}/api/v1/admin/copilot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ query: userQuery })
      });

      if (!res.ok) throw new Error('Copilot request failed');

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div style={{ marginBottom: '24px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: 'white', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
          ✨
        </div>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>AI Copilot</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            Powered by Gemini • Ask natural language questions about your municipal data.
          </p>
        </div>
      </div>

      <div style={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        background: 'var(--glass-bg-dark)',
        backdropFilter: 'var(--glass-blur)',
        borderRadius: '24px',
        border: '1px solid var(--glass-border-dark)',
        boxShadow: 'var(--shadow-xl)'
      }}>
        <div ref={scrollRef} style={{ flexGrow: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', scrollBehavior: 'smooth' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              display: 'flex',
              gap: '12px',
              maxWidth: '80%',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
            }}>
              <div style={{ 
                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user' ? 'var(--color-bg-elevated)' : 'var(--gradient-brand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'white',
                border: '1px solid var(--glass-border-dark)'
              }}>
                {msg.role === 'user' ? '👤' : '✨'}
              </div>
              <div style={{
                background: msg.role === 'user' ? 'rgba(0,0,0,0.3)' : 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)',
                padding: '16px 20px',
                borderRadius: '20px',
                borderTopRightRadius: msg.role === 'user' ? '4px' : '20px',
                borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '20px',
                border: '1px solid var(--glass-border-dark)',
                boxShadow: msg.role === 'assistant' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                lineHeight: '1.6',
                fontSize: '15px'
              }}>
                <div dangerouslySetInnerHTML={parseMarkdown(msg.content)} />
              </div>
            </div>
          ))}
          {loading && (
            <div style={{
              alignSelf: 'flex-start',
              display: 'flex',
              gap: '12px',
              maxWidth: '80%'
            }}>
              <div style={{ 
                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                background: 'var(--gradient-brand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'white',
                animation: 'pulse 2s infinite',
                border: '1px solid var(--glass-border-dark)'
              }}>
                ✨
              </div>
              <div style={{
                background: 'var(--color-bg-elevated)',
                padding: '16px 20px',
                borderRadius: '20px',
                borderTopLeftRadius: '4px',
                border: '1px solid var(--glass-border-dark)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ width: '8px', height: '8px', background: 'var(--color-brand-300)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }}></span>
                <span style={{ width: '8px', height: '8px', background: 'var(--color-brand-400)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.16s' }}></span>
                <span style={{ width: '8px', height: '8px', background: 'var(--color-brand-500)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.32s' }}></span>
                <style>{`
                  @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
                  @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
                `}</style>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '24px', background: 'rgba(0,0,0,0.1)', borderTop: '1px solid var(--glass-border-dark)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', background: 'var(--color-bg-elevated)', padding: '8px 8px 8px 24px', borderRadius: '99px', border: '1px solid var(--glass-border-dark)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. Which ward has the lowest resolution rate?"
              style={{ flexGrow: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', color: 'var(--color-text-primary)' }}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !query.trim()} className={query.trim() ? 'btn-primary' : ''} style={{ 
              background: query.trim() ? 'var(--gradient-brand)' : 'var(--color-bg-elevated)', 
              color: query.trim() ? 'white' : 'var(--color-text-muted)', 
              border: query.trim() ? 'none' : '1px solid var(--glass-border-dark)', 
              borderRadius: '99px', 
              padding: '12px 24px', 
              fontWeight: 600, 
              cursor: query.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}>
              Ask Copilot
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
