import { useState } from 'react';
import {
  ArrowRight,
  Bot,
  CalendarDays,
  FileText,
  MapPin,
  MessageCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Trophy,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AiMessenger from '../components/AiMessenger.jsx';
import { assetUrl } from '../lib/api.js';

function formatPrice(value) {
  if (value == null || value === 0) return 'Thương lượng';
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
}

function MatchBadge({ score }) {
  if (!score) return null;
  const level = score >= 80 ? 'high' : score >= 50 ? 'mid' : 'low';
  const label = score >= 80 ? 'Khớp cao' : score >= 50 ? 'Phù hợp' : 'Có liên quan';
  return (
    <span className={`vendor-match-badge vendor-match-${level}`}>
      <Trophy size={10} /> {label} {score}%
    </span>
  );
}

function VendorCard({ vendor, rank, isHighlighted }) {
  return (
    <article className={`ai-vendor-card ${isHighlighted ? 'ai-vendor-card--top' : ''}`}>
      {rank === 1 && <span className="ai-vendor-rank-badge">⭐ Đề xuất #1</span>}
      <div className="ai-vendor-card-top">
        <div className="ai-vendor-avatar">
          {vendor.logo
            ? <img src={assetUrl(vendor.logo)} alt="" />
            : <span>{(vendor.name || 'V').slice(0, 1).toLocaleUpperCase()}</span>}
        </div>
        <div className="ai-vendor-identity">
          <strong className="ai-vendor-name">{vendor.name}</strong>
          <MatchBadge score={vendor.matchScore} />
        </div>
      </div>

      <div className="ai-vendor-meta">
        {vendor.location && (
          <span className="ai-vendor-meta-item">
            <MapPin size={11} /> {vendor.location}
          </span>
        )}
        {(vendor.categories || []).slice(0, 2).map((cat) => (
          <span className="ai-vendor-meta-item ai-vendor-category" key={cat}>
            <Tag size={10} /> {cat}
          </span>
        ))}
      </div>

      <div className="ai-vendor-stats">
        <span className="ai-vendor-rating">
          <Star size={12} fill="currentColor" />
          {Number(vendor.rating || 0).toFixed(1)}
          {vendor.reviewCount > 0 && <small>({vendor.reviewCount})</small>}
        </span>
        <span className="ai-vendor-price">
          Từ <strong>{formatPrice(vendor.startingPrice)}</strong>
        </span>
      </div>

      {vendor.isVerified && (
        <span className="ai-vendor-verified">
          <ShieldCheck size={11} /> Đã xác thực
        </span>
      )}

      {vendor.bio && (
        <p className="ai-vendor-bio">{vendor.bio.slice(0, 90)}{vendor.bio.length > 90 ? '…' : ''}</p>
      )}

      <Link className="ai-vendor-cta" to={`/vendors/${vendor.slug}`}>
        Xem hồ sơ <ArrowRight size={13} />
      </Link>
    </article>
  );
}

export default function CustomerAiPage() {
  const [vendors, setVendors] = useState([]);

  return (
    <div className="ai-page-shell customer-ai-page">
      <div className="ai-workspace-heading">
        <div>
          <span className="eyebrow-badge ai-heading-badge"><Sparkles size={15} /> EVENT PLANNING COPILOT</span>
          <h1>BridgC AI Assistant</h1>
          <p>Trợ lý sự kiện thông minh, kết nối câu hỏi của bạn với dữ liệu vendor thật trên BridgC.</p>
        </div>
        <Link className="primary-button wide-button" to="/rfp/new"><Plus size={16} /> Tạo yêu cầu RFP</Link>
      </div>

      <div className="ai-messenger-layout">
        {/* ── Left sidebar: context / session ── */}
        <aside className="ai-context-sidebar">
          <div className="ai-sidebar-title">
            <span className="panel-kicker">Không gian AI</span>
            <h2>Cuộc trò chuyện</h2>
          </div>
          <div className="ai-session-item active">
            <span><MessageCircle size={17} /></span>
            <div><strong>Phiên hiện tại</strong><small>Chat trực tiếp với BridgC AI</small></div>
          </div>

          <div className="ai-context-card">
            <div className="ai-context-card-title"><ShieldCheck size={16} /> Bối cảnh đáng tin cậy</div>
            <p>AI sử dụng hồ sơ vendor, gói dịch vụ, vị trí và đánh giá đang có trong database.</p>
          </div>
          <div className="ai-context-card soft-context-card">
            <div className="ai-context-card-title"><CalendarDays size={16} /> Bắt đầu yêu cầu</div>
            <p>Để nhận đề xuất chính xác, hãy chia sẻ loại sự kiện, ngày, địa điểm và ngân sách.</p>
            <Link to="/rfp/new">Mở biểu mẫu RFP <span>→</span></Link>
          </div>
          <div className="ai-sidebar-security"><ShieldCheck size={15} /> Cuộc trò chuyện dành riêng cho tài khoản của bạn.</div>
        </aside>

        {/* ── Center: chat ── */}
        <AiMessenger onRecommendations={setVendors} />

        {/* ── Right sidebar: vendor recommendations ── */}
        <aside className="ai-recommendation-sidebar">
          <div className="ai-sidebar-title">
            <span className="panel-kicker">Database match</span>
            <h2>Vendor gợi ý</h2>
          </div>

          {vendors.length > 0 ? (
            <>
              <p className="ai-vendor-sidebar-hint">
                Tìm thấy <strong>{vendors.length}</strong> nhà cung cấp phù hợp với yêu cầu của bạn.
              </p>
              <div className="ai-vendor-list">
                {vendors.map((vendor, index) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    rank={index + 1}
                    isHighlighted={index === 0}
                  />
                ))}
              </div>

              {vendors.length >= 2 && (
                <div className="ai-vendor-compare-note">
                  <span>💡</span>
                  <p>So sánh các vendor bằng cách xem hồ sơ chi tiết và gói dịch vụ của họ.</p>
                </div>
              )}
            </>
          ) : (
            <div className="ai-recommendation-empty">
              <span><Bot size={21} /></span>
              <p>Khi bạn gửi yêu cầu, những vendor khớp dữ liệu trong database sẽ xuất hiện tại đây.</p>
            </div>
          )}

          <p className="ai-source-note">
            <FileText size={14} /> Kết quả đến từ hồ sơ đang hoạt động; AI không tự tạo vendor hoặc giá.
          </p>
        </aside>
      </div>
    </div>
  );
}
