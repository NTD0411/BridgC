import { useEffect, useRef, useState } from 'react';
import { Bot, Check, LoaderCircle, Send, Sparkles } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useSessionStore } from '../store/sessionStore.js';
import RichMarkdown from './RichMarkdown.jsx';

function timeLabel(value) {
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(value);
}

export default function AiMessenger({ onRecommendations }) {
  const token = useSessionStore((state) => state.token);
  const user = useSessionStore((state) => state.user);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [geminiConfigured, setGeminiConfigured] = useState(null);
  const threadRef = useRef(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/api/ai/status', { token })
      .then((result) => {
        if (!cancelled) setGeminiConfigured(result.configured ? 'configured' : 'missing');
      })
      .catch(() => {
        if (!cancelled) setGeminiConfigured('unavailable');
      });
    return () => { cancelled = true; };
  }, [token]);

  async function sendMessage(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;

    const history = messages.map(({ role, text }) => ({ role, text }));
    const userMessage = { role: 'user', text: message, time: new Date() };
    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setSending(true);
    setError('');
    try {
      const result = await apiRequest('/api/ai/chat', {
        method: 'POST',
        token,
        body: JSON.stringify({ message, history }),
      });
      setMessages((current) => [...current, {
        role: 'assistant',
        text: result.reply,
        time: new Date(),
      }]);
      onRecommendations?.(result.vendors || []);
    } catch (requestError) {
      setError(requestError.message);
      onRecommendations?.([]);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="ai-messenger" aria-label="Trò chuyện với BridgC AI">
      <header className="ai-messenger-header">
        <span className="ai-messenger-avatar"><Bot size={20} /></span>
        <div className="ai-messenger-contact">
          <strong>BridgC AI Assistant</strong>
          <span className={geminiConfigured !== 'configured' ? 'gemini-offline' : ''}>
            <i /> Trợ lý sự kiện · {geminiConfigured === null
              ? 'Đang kiểm tra Gemini'
              : geminiConfigured === 'configured'
                ? 'Gemini đã cấu hình'
                : geminiConfigured === 'missing'
                  ? 'Gemini chưa cấu hình'
                  : 'Không kiểm tra được trạng thái Gemini'}
          </span>
        </div>
        <span className="ai-messenger-secure"><Sparkles size={14} /> AI</span>
      </header>

      <div className="ai-messenger-thread" ref={threadRef} aria-live="polite">
        {messages.length === 0 && (
          <div className="ai-chat-welcome">
            <span className="ai-welcome-avatar"><Bot size={25} /></span>
            <div className="ai-chat-date">BẮT ĐẦU CUỘC TRÒ CHUYỆN</div>
            <div className="ai-message-bubble assistant-message">
              Xin chào{user?.fullName ? ` ${user.fullName}` : ''}! Tôi là BridgC AI Assistant. Bạn đang cần tìm dịch vụ gì hoặc cần hỗ trợ lên kế hoạch cho sự kiện?
            </div>
            <small>Hãy chia sẻ loại sự kiện, địa điểm, ngân sách hoặc ngày tổ chức.</small>
          </div>
        )}

        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          return (
            <article className={`ai-chat-message ${isUser ? 'own' : ''}`} key={`${message.time.toISOString()}-${index}`}>
              {!isUser && <span className="ai-chat-avatar"><Bot size={15} /></span>}
              <div className="ai-chat-message-content">
                <div className={`ai-message-bubble ${isUser ? 'user-message' : 'assistant-message'}`}>
                  {isUser ? message.text : <RichMarkdown content={message.text} />}
                </div>
                <small>{timeLabel(message.time)} {isUser && <Check size={12} />}</small>
              </div>
            </article>
          );
        })}

        {sending && (
          <article className="ai-chat-message">
            <span className="ai-chat-avatar"><Bot size={15} /></span>
            <div className="ai-message-bubble assistant-message messenger-typing-bubble" aria-label="Đang soạn tin nhắn">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </article>
        )}
      </div>

      {error && <p className="ai-chat-error" role="alert">{error}</p>}

      <form className="ai-chat-composer" onSubmit={sendMessage}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form.requestSubmit();
            }
          }}
          placeholder="Nhập yêu cầu sự kiện hoặc hỏi BridgC AI..."
          rows={2}
          maxLength={4000}
          aria-label="Nội dung tin nhắn cho AI"
        />
        <div className="ai-chat-composer-footer">
          <small>Enter để gửi · Shift + Enter để xuống dòng</small>
          <button type="submit" disabled={sending || !draft.trim()} aria-label="Gửi tin nhắn">
            {sending ? <LoaderCircle className="ai-spin" size={17} /> : <Send size={17} />}
            <span>Gửi</span>
          </button>
        </div>
      </form>
    </section>
  );
}
