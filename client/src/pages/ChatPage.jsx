import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_URL, apiRequest, assetUrl } from '../lib/api.js';
import { useSessionStore } from '../store/sessionStore.js';
import {
  ArrowLeft,
  Check,
  Download,
  FileText,
  ImagePlus,
  Paperclip,
  Search,
  Send,
  Video,
  X,
  ShieldCheck,
} from 'lucide-react';

const allowedFileTypes = 'image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/quicktime,video/webm,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';
const maxFiles = 5;
const maxFileSize = 50 * 1024 * 1024;

function decodeUserId(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
  } catch {
    return '';
  }
}

function formatTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatDay(value) {
  return new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

function conversationContact(conversation, userId) {
  const isCustomer = String(conversation.customer?._id) === String(userId);
  return isCustomer
    ? { name: conversation.vendorProfile?.storeName || conversation.vendor?.fullName || 'Nhà cung ứng', avatar: conversation.vendorProfile?.logo || conversation.vendor?.avatar, role: 'Nhà cung ứng' }
    : { name: conversation.customer?.fullName || 'Khách hàng', avatar: conversation.customer?.avatar, role: 'Khách hàng' };
}

function messageSenderId(message) {
  return typeof message.senderId === 'string' ? message.senderId : String(message.senderId?._id);
}

function Attachment({ attachment }) {
  const url = assetUrl(attachment.url);
  if (attachment.fileType?.startsWith('image/')) {
    return <a className="chat-attachment-image" href={url} target="_blank" rel="noreferrer"><img src={url} alt={attachment.fileName} loading="lazy" /></a>;
  }
  if (attachment.fileType?.startsWith('video/')) {
    return <video className="chat-attachment-video" controls preload="metadata" src={url}>{attachment.fileName}</video>;
  }
  return (
    <a className="chat-attachment-document" href={url} target="_blank" rel="noreferrer" download={attachment.fileName}>
      <FileText size={20} />
      <span><strong>{attachment.fileName}</strong><small>{attachment.fileType || 'Tài liệu'}</small></span>
      <Download size={16} />
    </a>
  );
}

export default function ChatPage() {
  const token = useSessionStore((state) => state.token);
  const userId = useMemo(() => decodeUserId(token || ''), [token]);
  const [searchParams] = useSearchParams();
  const requestedVendorSlug = searchParams.get('vendor');
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const activeIdRef = useRef(activeId);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const loadConversations = useCallback(async () => {
    const result = await apiRequest('/api/messages/conversations', { token });
    setConversations(result.conversations);
    return result.conversations;
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      setLoading(true);
      setError('');
      try {
        let items = await loadConversations();
        if (cancelled) return;
        if (requestedVendorSlug) {
          const result = await apiRequest('/api/messages/conversations', {
            token,
            method: 'POST',
            body: JSON.stringify({ vendorSlug: requestedVendorSlug }),
          });
          if (cancelled) return;
          items = [result.conversation, ...items.filter((item) => item.id !== result.conversation.id)];
          setConversations(items);
          setActiveId(result.conversation.id);
        } else if (items.length > 0) {
          setActiveId(items[0].id);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    initialize();
    return () => { cancelled = true; };
  }, [loadConversations, requestedVendorSlug, token]);

  useEffect(() => {
    const socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect_error', (socketError) => {
      console.error('BridgC chat connection failed', socketError.message);
      setError('Mất kết nối chat real-time. Đang thử kết nối lại...');
    });
    socket.on('connect', () => setError(''));
    socket.on('chat:message', (message) => {
      if (String(message.conversationId) !== activeIdRef.current) return;
      setMessages((current) => current.some((item) => String(item._id) === String(message._id)) ? current : [...current, message]);
      if (messageSenderId(message) !== userId) {
        apiRequest(`/api/messages/${message.conversationId}/read`, { token, method: 'POST' })
          .then(() => setConversations((current) => current.map((item) => item.id === message.conversationId ? { ...item, unreadCount: 0 } : item)))
          .catch((readError) => console.error('Could not mark chat as read', readError));
      }
    });
    socket.on('chat:conversation', () => {
      loadConversations().catch((loadError) => console.error('Could not refresh chat list', loadError));
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [loadConversations, token, userId]);

  useEffect(() => {
    if (!activeId || !socketRef.current) return undefined;
    const socket = socketRef.current;
    let cancelled = false;
    socket.emit('chat:join', { conversationId: activeId }, (result) => {
      if (!result?.success) setError(result?.error || 'Không thể kết nối cuộc trò chuyện');
    });
    apiRequest(`/api/messages/${activeId}`, { token })
      .then(({ messages: loadedMessages }) => {
        if (!cancelled) {
          setMessages((current) => {
            const byId = new Map(loadedMessages.map((message) => [String(message._id), message]));
            current.forEach((message) => byId.set(String(message._id), message));
            return [...byId.values()].sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
          });
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message);
      });
    apiRequest(`/api/messages/${activeId}/read`, { token, method: 'POST' })
      .then(() => setConversations((current) => current.map((item) => item.id === activeId ? { ...item, unreadCount: 0 } : item)))
      .catch((readError) => console.error('Could not mark chat as read', readError));
    return () => {
      cancelled = true;
      socket.emit('chat:leave', { conversationId: activeId });
    };
  }, [activeId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const visibleConversations = conversations.filter((conversation) => {
    const contact = conversationContact(conversation, userId);
    return contact.name.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  });
  const activeConversation = conversations.find((item) => item.id === activeId);
  const contact = activeConversation ? conversationContact(activeConversation, userId) : null;

  function addFiles(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    setError('');
    const tooLarge = selected.find((file) => file.size > maxFileSize);
    if (tooLarge) {
      setError(`${tooLarge.name} vượt quá giới hạn 50 MB.`);
      return;
    }
    if (files.length + selected.length > maxFiles) {
      setError(`Bạn chỉ có thể gửi tối đa ${maxFiles} tệp cùng lúc.`);
      return;
    }
    setFiles((current) => [...current, ...selected]);
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!activeId || sending || (!draft.trim() && files.length === 0)) return;
    const form = new FormData();
    form.append('message', draft.trim());
    files.forEach((file) => form.append('attachments', file));
    setSending(true);
    setError('');
    try {
      const result = await apiRequest(`/api/messages/${activeId}`, {
        token,
        method: 'POST',
        body: form,
      });
      setMessages((current) => current.some((item) => String(item._id) === String(result.message._id)) ? current : [...current, result.message]);
      setDraft('');
      setFiles([]);
      await loadConversations();
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className={`chat-page ${activeId ? 'has-active-chat' : ''}`}>
      <aside className="chat-sidebar">
        <div className="chat-sidebar-heading"><div><span className="market-kicker">BRIDGC MESSENGER</span><h1>Tin nhắn</h1></div><span className="chat-total">{conversations.length}</span></div>
        <label className="chat-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm cuộc trò chuyện" /></label>
        <div className="chat-conversation-list">
          {loading && <p className="chat-list-placeholder">Đang tải cuộc trò chuyện...</p>}
          {!loading && visibleConversations.length === 0 && <p className="chat-list-placeholder">{search ? 'Không tìm thấy cuộc trò chuyện.' : 'Chưa có tin nhắn. Mở hồ sơ vendor để bắt đầu trò chuyện.'}</p>}
          {visibleConversations.map((conversation) => {
            const person = conversationContact(conversation, userId);
            return (
              <button type="button" key={conversation.id} className={`chat-conversation ${activeId === conversation.id ? 'active' : ''}`} onClick={() => { setActiveId(conversation.id); setError(''); }}>
                <span className="chat-avatar">{person.avatar ? <img src={person.avatar} alt="" /> : person.name.slice(0, 1).toLocaleUpperCase()}</span>
                <span className="chat-conversation-copy"><strong>{person.name}</strong><small>{conversation.lastMessage || 'Bắt đầu cuộc trò chuyện'} · {formatTime(conversation.lastMessageAt)}</small></span>
                {conversation.unreadCount > 0 && <span className="chat-unread">{conversation.unreadCount}</span>}
              </button>
            );
          })}
        </div>
      </aside>

      <main className="chat-thread">
        {activeConversation && contact ? (
          <>
            <header className="chat-thread-header">
              <button type="button" className="chat-back" onClick={() => setActiveId('')} aria-label="Quay lại danh sách"><ArrowLeft size={19} /></button>
              <span className="chat-avatar">{contact.avatar ? <img src={contact.avatar} alt="" /> : contact.name.slice(0, 1).toLocaleUpperCase()}</span>
              <span><strong>{contact.name}</strong><small>{contact.role} · Cuộc trò chuyện riêng tư</small></span>
              <span className="chat-secure-label"><ShieldCheck size={15} /> Chat real-time</span>
            </header>

            <div className="chat-message-list">
              {messages.map((message, index) => {
                const own = messageSenderId(message) === userId;
                const previous = messages[index - 1];
                const showDate = !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
                return (
                  <div key={message._id || `${message.createdAt}-${index}`}>
                    {showDate && <div className="chat-date-divider"><span>{formatDay(message.createdAt)}</span></div>}
                    <article className={`chat-message-row ${own ? 'own' : ''}`}>
                      {!own && <span className="chat-message-avatar">{contact.avatar ? <img src={contact.avatar} alt="" /> : contact.name.slice(0, 1).toLocaleUpperCase()}</span>}
                      <div className="chat-message-content">
                        {message.message && <p>{message.message}</p>}
                        {message.attachments?.map((attachment) => <Attachment key={`${attachment.url}-${attachment.fileName}`} attachment={attachment} />)}
                        <small>{formatTime(message.createdAt)} {own && <Check size={12} />}</small>
                      </div>
                    </article>
                  </div>
                );
              })}
              {messages.length === 0 && <div className="chat-empty-thread"><span className="chat-empty-logo">{contact.name.slice(0, 1).toLocaleUpperCase()}</span><h2>{contact.name}</h2><p>Đây là điểm bắt đầu cuộc trò chuyện của bạn.</p></div>}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-composer" onSubmit={sendMessage}>
              {files.length > 0 && <div className="chat-file-queue">{files.map((file, index) => <span key={`${file.name}-${index}`}><FileText size={14} /> {file.name}<button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Bỏ ${file.name}`}><X size={13} /></button></span>)}</div>}
              {error && <p className="chat-error" role="alert">{error}</p>}
              <div className="chat-composer-controls">
                <input ref={fileInputRef} className="chat-file-input" type="file" accept={allowedFileTypes} multiple onChange={addFiles} />
                <button type="button" className="chat-attach-button" onClick={() => fileInputRef.current?.click()} aria-label="Đính kèm ảnh, video hoặc tài liệu"><Paperclip size={20} /><ImagePlus size={15} /><Video size={15} /></button>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} placeholder="Aa · Nhập tin nhắn..." rows={1} maxLength={10000} aria-label="Nội dung tin nhắn" />
                <button type="submit" className="chat-send-button" disabled={sending || (!draft.trim() && files.length === 0)} aria-label="Gửi tin nhắn">{sending ? <span className="chat-sending-indicator" /> : <Send size={18} />}</button>
              </div>
              <small className="chat-composer-hint">Enter để gửi · Shift + Enter để xuống dòng · Tối đa 5 tệp, 50 MB mỗi tệp</small>
            </form>
          </>
        ) : (
          <div className="chat-select-empty"><span><Send size={25} /></span><h2>Không gian nhắn tin của bạn</h2><p>Chọn một cuộc trò chuyện để trao đổi trực tiếp với khách hàng hoặc nhà cung ứng.</p></div>
        )}
      </main>
    </section>
  );
}
