import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Search,
  Sparkles,
  Star,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';
import { useSessionStore } from '../store/sessionStore.js';
import AiMessenger from '../components/AiMessenger.jsx';

const formatCurrency = (value) => value == null
  ? 'Chưa có ngân sách'
  : `${new Intl.NumberFormat('vi-VN').format(value)}đ`;

function budgetLabel(min, max) {
  if (min == null && max == null) return 'Chưa có ngân sách';
  if (min != null && max != null) return `${formatCurrency(min)} – ${formatCurrency(max)}`;
  return `${min != null ? 'Từ' : 'Tối đa'} ${formatCurrency(min ?? max)}`;
}

export default function VendorAiPage() {
  const user = useSessionStore((state) => state.user);
  const [dashboard, setDashboard] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiRequest('/api/vendors/me/dashboard', { token: localStorage.getItem('bridgc_token') })
      .then((result) => {
        if (!cancelled) setDashboard(result);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const leads = dashboard?.leads || [];
  const opportunities = dashboard?.opportunities || [];
  const filteredLeads = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return leads;
    return leads.filter((lead) => [
      lead.rfpId?.title,
      lead.rfpId?.category,
      lead.rfpId?.description,
      lead.customerId?.fullName,
      lead.customerId?.email,
      lead.status,
    ].some((value) => String(value || '').toLocaleLowerCase().includes(term)));
  }, [leads, query]);

  const filteredOpportunities = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return opportunities;
    return opportunities.filter((rfp) => [
      rfp.title,
      rfp.category,
      rfp.description,
      rfp.location?.province,
      rfp.location?.city,
    ].some((value) => String(value || '').toLocaleLowerCase().includes(term)));
  }, [opportunities, query]);

  const metrics = dashboard?.metrics || {};
  const profile = dashboard?.profile;
  const availableDates = (profile?.availabilityCalendar || []).filter((item) => item.status === 'available').length;

  return (
    <div className="ai-page-shell vendor-ai-page">
      <div className="vendor-shell-header">
        <div>
          <span className="eyebrow-badge vendor-eyebrow"><Sparkles size={15} /> Vendor AI Copilot</span>
          <h1>Trợ lý tổng hợp lead, yêu cầu báo giá và thông tin gian hàng.</h1>
          <p className="ai-data-note">Số liệu và nội dung bên dưới được tải từ hồ sơ, lead và RFP của vendor trong database.</p>
        </div>
        <div className="header-balance-box">
          <small>Tài khoản</small>
          <strong>{user?.fullName || user?.email || 'Vendor'}</strong>
          <Link className="secondary-button small-button" to="/vendor">Mở dashboard</Link>
        </div>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="market-empty">Đang tải dữ liệu từ database…</p>}

      {!loading && !error && (
        <>
          {!profile && (
            <section className="ai-panel ai-empty-profile">
              <h2>Chưa có hồ sơ gian hàng</h2>
              <p>Tạo hồ sơ vendor để xem các yêu cầu phù hợp và thông tin hoạt động tại đây.</p>
              <Link className="primary-button wide-button" to="/vendor">Thiết lập hồ sơ <ArrowRight size={16} /></Link>
            </section>
          )}

          {profile && (
            <>
              <div className="vendor-ai-chat-layout">
                <div className="vendor-ai-chat-intro">
                  <span className="panel-kicker">AI BUSINESS COPILOT</span>
                  <h2>Hỏi AI về lead và hoạt động gian hàng</h2>
                  <p>Gemini chỉ nhận dữ liệu sự kiện, gói dịch vụ và chỉ số của gian hàng này; thông tin liên hệ khách hàng không được gửi đi.</p>
                </div>
                <AiMessenger />
              </div>
              <div className="ai-grid">
                <section className="ai-panel vendor-main-panel">
                  <div className="panel-header-row">
                    <div>
                      <span className="panel-kicker">Dữ liệu hoạt động</span>
                      <h2>{profile.storeName}</h2>
                      <p className="ai-result-query">
                        {[...(profile.category || []), profile.location?.city, profile.location?.province].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {profile.isVerified && <span className="tag-button">Đã xác thực</span>}
                  </div>

                  <div className="metric-card-grid">
                    <div className="metric-card primary"><span>Lead trong DB</span><strong>{metrics.leadCount ?? leads.length}</strong></div>
                    <div className="metric-card success"><span>Tỷ lệ hoàn tất</span><strong>{metrics.conversionRate ?? 0}%</strong></div>
                    <div className="metric-card accent"><span>Ngày còn trống</span><strong>{availableDates}</strong></div>
                  </div>

                  <form className="vendor-ai-filter" onSubmit={(event) => event.preventDefault()}>
                    <label htmlFor="vendor-ai-query">Tìm trong lead và yêu cầu của gian hàng</label>
                    <div className="input-shell">
                      <Search size={18} aria-hidden="true" />
                      <input
                        id="vendor-ai-query"
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Nhập tên khách, loại sự kiện, dịch vụ hoặc địa điểm..."
                        maxLength={200}
                      />
                    </div>
                  </form>

                  <section className="ai-data-section">
                    <div className="panel-header-row compact-row">
                      <div><span className="panel-kicker">CRM</span><h2>Lead của gian hàng ({filteredLeads.length})</h2></div>
                    </div>
                    {filteredLeads.length ? (
                      <div className="ai-record-list">
                        {filteredLeads.slice(0, 12).map((lead) => (
                          <article className="ai-record-card" key={lead._id}>
                            <div className="ai-record-icon"><BriefcaseBusiness size={17} /></div>
                            <div className="ai-record-copy">
                              <strong>{lead.rfpId?.title || 'Yêu cầu trao đổi'}</strong>
                              <span>{lead.customerId?.fullName || lead.customerId?.email || 'Khách hàng'} · {lead.rfpId?.category || 'Chưa phân loại'}</span>
                              {lead.rfpId && <small>{budgetLabel(lead.rfpId.budgetMin, lead.rfpId.budgetMax)} · {[lead.rfpId.location?.city, lead.rfpId.location?.province].filter(Boolean).join(', ') || 'Chưa có địa điểm'}</small>}
                            </div>
                            <span className="ai-status-chip">{String(lead.status || 'new_lead').replaceAll('_', ' ')}</span>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="market-empty">{query ? 'Không tìm thấy lead khớp nội dung tìm kiếm.' : 'Chưa có lead nào được lưu cho gian hàng.'}</p>
                    )}
                  </section>
                </section>

                <aside className="ai-panel side-panel vendor-side-panel">
                  <div className="panel-header-row compact-row">
                    <div><span className="panel-kicker">RFP phù hợp</span><h2>Yêu cầu đang mở ({filteredOpportunities.length})</h2></div>
                  </div>
                  {filteredOpportunities.length ? (
                    <div className="ai-record-list">
                      {filteredOpportunities.slice(0, 10).map((rfp) => (
                        <article className="ai-opportunity-card" key={rfp._id}>
                          <div className="ai-record-icon"><FileText size={17} /></div>
                          <div className="ai-record-copy">
                            <strong>{rfp.title}</strong>
                            <span>{rfp.category} · {[rfp.location?.city, rfp.location?.province].filter(Boolean).join(', ') || 'Chưa có địa điểm'}</span>
                            <small><CircleDollarSign size={13} /> {budgetLabel(rfp.budgetMin, rfp.budgetMax)}</small>
                            {rfp.eventDate && <small><CalendarDays size={13} /> {new Date(rfp.eventDate).toLocaleDateString('vi-VN')}</small>}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="market-empty">{query ? 'Không tìm thấy yêu cầu phù hợp với nội dung tìm kiếm.' : 'Chưa có RFP đang mở khớp với hồ sơ gian hàng.'}</p>
                  )}

                  <div className="insight-card">
                    <div className="insight-head"><Star size={17} /><strong>Thông tin từ hồ sơ</strong></div>
                    <ul>
                      <li>Đánh giá: {profile.stats?.ratingAvg || 0} / 5 ({profile.stats?.reviewCount || 0} lượt)</li>
                      <li>Gói dịch vụ: {(profile.packages || []).length}</li>
                      <li>Portfolio: {(profile.portfolio || []).length} mục</li>
                    </ul>
                  </div>
                </aside>
              </div>
              <p className="ai-data-note">Không có lead hoặc RFP mẫu. Danh sách hiển thị những bản ghi thực mà API dashboard trả về cho tài khoản vendor hiện tại.</p>
            </>
          )}
        </>
      )}
    </div>
  );
}
