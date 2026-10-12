import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, BriefcaseBusiness, FilePlus2, MapPin, MessageCircle, Save, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import CrmKanbanBoard from '../components/CrmKanbanBoard.jsx';
import { apiRequest, assetUrl } from '../lib/api.js';
import { useSessionStore } from '../store/sessionStore.js';

const emptyProfile = {
  storeName: '',
  slug: '',
  category: '',
  province: '',
  city: '',
  bio: '',
  logo: '',
  coverImage: '',
  tags: '',
  packages: [],
  portfolio: [],
};

const slugify = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const formatBudget = (min, max) => {
  const format = (value) => value == null ? '' : new Intl.NumberFormat('vi-VN').format(value);
  if (min == null && max == null) return 'Chưa nêu ngân sách';
  if (min != null && max != null) return `${format(min)}–${format(max)}đ`;
  return `${min != null ? 'Từ' : 'Đến'} ${format(min ?? max)}đ`;
};

export default function VendorDashboardPage() {
  const user = useSessionStore((state) => state.user);
  const [dashboard, setDashboard] = useState(null);
  const [form, setForm] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/api/vendors/me/dashboard', {
        token: localStorage.getItem('bridgc_token'),
      });
      setDashboard(result);
      if (result.profile) {
        setForm({
          storeName: result.profile.storeName || '',
          slug: result.profile.slug || '',
          category: (result.profile.category || []).join(', '),
          province: result.profile.location?.province || '',
          city: result.profile.location?.city || '',
          bio: result.profile.bio || '',
          logo: result.profile.logo || '',
          coverImage: result.profile.coverImage || '',
          tags: (result.profile.tags || []).join(', '),
          packages: (result.profile.packages || []).map((item) => ({
            ...item,
            featureText: (item.features || []).join(', '),
          })),
          portfolio: result.profile.portfolio || [],
        });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  async function saveProfile(event) {
    event.preventDefault();
    if (form.portfolio.some((item) => !item.url)) {
      setError('Hãy chọn và tải lên tệp cho từng dự án portfolio trước khi lưu hồ sơ.');
      return;
    }
    if (Object.values(uploading).some(Boolean)) {
      setError('Vui lòng chờ các tệp tải lên hoàn tất trước khi lưu hồ sơ.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await apiRequest('/api/vendors/me/profile', {
        method: 'PUT',
        token: localStorage.getItem('bridgc_token'),
        body: JSON.stringify({
          ...form,
          category: form.category.split(',').map((item) => item.trim()).filter(Boolean),
          tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean),
          slug: form.slug || slugify(form.storeName),
          location: { province: form.province, city: form.city },
          packages: form.packages.map(({ featureText, ...item }) => ({
            ...item,
            price: Number(item.price),
            features: featureText.split(',').map((feature) => feature.trim()).filter(Boolean),
          })),
          portfolio: form.portfolio,
        }),
      });
      setDashboard((current) => ({ ...current, profile: result.profile }));
      setForm((current) => ({ ...current, slug: result.profile.slug }));
      setNotice('Đã lưu hồ sơ vendor vào cơ sở dữ liệu.');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadLocalFile(file, key, onUploaded) {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError('Tệp tải lên không được lớn hơn 50 MB.');
      return;
    }
    setError('');
    setNotice('');
    setUploading((current) => ({ ...current, [key]: true }));
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await apiRequest('/api/uploads', {
        method: 'POST',
        token: localStorage.getItem('bridgc_token'),
        body,
      });
      onUploaded(result);
      setNotice(`Đã tải ${file.name} lên thành công.`);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading((current) => ({ ...current, [key]: false }));
    }
  }

  const profile = dashboard?.profile;
  const metrics = dashboard?.metrics;

  function updatePackage(index, key, value) {
    setForm((current) => ({
      ...current,
      packages: current.packages.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    }));
  }

  function updatePortfolio(index, key, value) {
    setForm((current) => ({
      ...current,
      portfolio: current.portfolio.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    }));
  }

  return (
    <div className="vendor-dashboard">
      <section className="vendor-welcome">
        <div className="vendor-welcome-copy"><span className="market-kicker">VENDOR HUB</span><h1>Xin chào, {user?.fullName || user?.email || 'Vendor'} <Sparkles size={22} /></h1><p>Dữ liệu bên dưới được tải từ hồ sơ và hoạt động trong hệ thống.</p><div className="vendor-welcome-actions"><a href="#profile-editor">Cập nhật hồ sơ <BriefcaseBusiness size={15} /></a><a href="#rfp">Yêu cầu phù hợp <FilePlus2 size={15} /></a></div></div>
        <div className="vendor-welcome-graphic"><span className="welcome-orbit" /><span className="welcome-spark">✳</span><span className="welcome-caption">{profile?.storeName || 'Hồ sơ vendor'}<br /><i>{profile ? 'hồ sơ hệ thống' : 'chưa khởi tạo'}</i></span><span className="welcome-stats"><strong>{profile?.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}</strong><small>trạng thái hồ sơ</small></span></div>
        {profile?.isPro && <span className="vendor-verified-stamp"><BadgeCheck size={14} /> PRO</span>}
      </section>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="quote-notice" role="status">{notice}</p>}
      {loading && <p className="market-empty">Đang tải dữ liệu vendor…</p>}

      {!loading && (
        <>
          <section className="vendor-metric-grid" id="insights">
            <article><span className="metric-label">Lượt hiển thị <Search size={15} /></span><strong>{metrics?.impressions ?? 0}</strong><small className="metric-growth">Theo số liệu đã ghi nhận</small></article>
            <article><span className="metric-label">Lượt xem hồ sơ <BriefcaseBusiness size={15} /></span><strong>{metrics?.profileViews ?? 0}</strong><small className="metric-growth">Theo số liệu đã ghi nhận</small></article>
            <article><span className="metric-label">Yêu cầu báo giá <MessageCircle size={15} /></span><strong>{metrics?.leadCount ?? 0}</strong><small className="metric-growth">Lead trong cơ sở dữ liệu</small></article>
            <article><span className="metric-label">Tỷ lệ hoàn tất</span><strong>{metrics?.conversionRate ?? 0}<span>%</span></strong><small className="metric-growth">Tính từ lead đã hoàn thành</small></article>
          </section>

          <section className="profile-section card-surface" id="profile-editor">
            <div className="dashboard-section-heading"><div><span className="market-kicker">HỒ SƠ DOANH NGHIỆP</span><h2>{profile ? 'Thông tin gian hàng' : 'Tạo hồ sơ gian hàng'}</h2><p>Thông tin này được lưu trong cơ sở dữ liệu và hiển thị trên marketplace.</p></div></div>
            <form className="vendor-profile-form" onSubmit={saveProfile}>
              <label>Tên gian hàng<input required maxLength={120} value={form.storeName} onChange={(event) => setForm((current) => ({ ...current, storeName: event.target.value, slug: current.slug || slugify(event.target.value) }))} /></label>
              <label>Đường dẫn (slug)<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} /></label>
              <label>Danh mục (phân tách bằng dấu phẩy)<input required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></label>
              <label>Tỉnh/thành<input required value={form.province} onChange={(event) => setForm((current) => ({ ...current, province: event.target.value }))} /></label>
              <label>Quận/huyện hoặc thành phố<input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} /></label>
              <label>Logo gian hàng<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading.logo} onChange={(event) => { const [file] = event.target.files || []; void uploadLocalFile(file, 'logo', ({ url }) => setForm((current) => ({ ...current, logo: url }))); event.target.value = ''; }} />{form.logo && <img className="vendor-upload-preview" src={assetUrl(form.logo)} alt="Logo hiện tại" />}{uploading.logo && <small>Đang tải logo…</small>}</label>
              <label>Ảnh bìa gian hàng<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading.coverImage} onChange={(event) => { const [file] = event.target.files || []; void uploadLocalFile(file, 'coverImage', ({ url }) => setForm((current) => ({ ...current, coverImage: url }))); event.target.value = ''; }} />{form.coverImage && <img className="vendor-upload-preview vendor-cover-preview" src={assetUrl(form.coverImage)} alt="Ảnh bìa hiện tại" />}{uploading.coverImage && <small>Đang tải ảnh bìa…</small>}</label>
              <label className="vendor-profile-form-wide">Từ khóa (phân tách bằng dấu phẩy)<input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} /></label>
              <label className="vendor-profile-form-wide">Giới thiệu<textarea rows="4" maxLength={5000} value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} /></label>
              <div className="vendor-profile-form-wide vendor-profile-data-editor">
                <div className="dashboard-section-heading"><div><h3>Gói dịch vụ</h3><p>Quản lý giá và tính năng hiển thị trên storefront.</p></div><button type="button" onClick={() => setForm((current) => ({ ...current, packages: [...current.packages, { name: 'Basic', description: '', price: '', featureText: '' }] }))}>Thêm gói</button></div>
                {form.packages.map((item, index) => <div className="vendor-data-row" key={`package-${index}`}>
                  <select aria-label="Tên gói" value={item.name} onChange={(event) => updatePackage(index, 'name', event.target.value)}><option>Basic</option><option>Standard</option><option>Premium</option></select>
                  <input aria-label="Mô tả gói" value={item.description} onChange={(event) => updatePackage(index, 'description', event.target.value)} placeholder="Mô tả" />
                  <input aria-label="Giá gói" type="number" min="0" required value={item.price} onChange={(event) => updatePackage(index, 'price', event.target.value)} placeholder="Giá VND" />
                  <input aria-label="Tính năng" value={item.featureText} onChange={(event) => updatePackage(index, 'featureText', event.target.value)} placeholder="Tính năng, phân tách bằng dấu phẩy" />
                  <button type="button" aria-label="Xóa gói" onClick={() => setForm((current) => ({ ...current, packages: current.packages.filter((_, itemIndex) => itemIndex !== index) }))}>×</button>
                </div>)}
              </div>
              <div className="vendor-profile-form-wide vendor-profile-data-editor">
                <div className="dashboard-section-heading"><div><h3>Portfolio</h3><p>Tải ảnh, video hoặc PDF của dự án từ máy tính.</p></div><button type="button" onClick={() => setForm((current) => ({ ...current, portfolio: [...current.portfolio, { type: 'image', url: '', title: '', description: '' }] }))}>Thêm dự án</button></div>
                {form.portfolio.map((item, index) => <div className="vendor-data-row" key={`portfolio-${index}`}>
                  <select aria-label="Loại portfolio" value={item.type} onChange={(event) => setForm((current) => ({ ...current, portfolio: current.portfolio.map((portfolioItem, itemIndex) => itemIndex === index ? { ...portfolioItem, type: event.target.value, url: '' } : portfolioItem) }))}><option value="image">Ảnh</option><option value="video">Video</option><option value="pdf">PDF</option></select>
                  <input aria-label="Tệp dự án" type="file" accept={item.type === 'image' ? 'image/jpeg,image/png,image/webp,image/avif' : item.type === 'video' ? 'video/mp4,video/quicktime,video/webm' : 'application/pdf'} disabled={uploading[`portfolio-${index}`]} onChange={(event) => { const [file] = event.target.files || []; void uploadLocalFile(file, `portfolio-${index}`, ({ url }) => updatePortfolio(index, 'url', url)); event.target.value = ''; }} />
                  <input aria-label="Tên dự án" value={item.title} onChange={(event) => updatePortfolio(index, 'title', event.target.value)} placeholder="Tên dự án" />
                  <small>{item.url ? 'Đã tải lên' : uploading[`portfolio-${index}`] ? 'Đang tải…' : 'Chưa có tệp'}</small>
                  <button type="button" aria-label="Xóa dự án" onClick={() => setForm((current) => ({ ...current, portfolio: current.portfolio.filter((_, itemIndex) => itemIndex !== index) }))}>×</button>
                </div>)}
              </div>
              <button type="submit" disabled={saving}><Save size={15} /> {saving ? 'Đang lưu…' : 'Lưu hồ sơ'}</button>
              {profile?.slug && <Link to={`/vendors/${profile.slug}`}>Xem trang công khai <ArrowRight size={14} /></Link>}
            </form>
          </section>

          <section className="vendor-rfp-section" id="rfp">
            <div className="dashboard-section-heading"><div><span className="market-kicker">CƠ HỘI</span><h2>Yêu cầu phù hợp với bạn <span className="listing-count">{dashboard?.opportunities?.length || 0}</span></h2><p>Yêu cầu được ghép với danh mục, địa điểm và ngân sách của hồ sơ.</p></div></div>
            <div className="rfp-opportunities">
              {dashboard?.opportunities?.map((rfp) => <article className="rfp-opportunity" key={rfp._id}><div className="rfp-event-visual"><MapPin size={21} /><span>{rfp.category}</span></div><div className="rfp-event-copy"><h3>{rfp.title}</h3><p>{rfp.customerId?.fullName || 'Khách hàng'} <span>·</span> {[rfp.location?.city, rfp.location?.province].filter(Boolean).join(', ')}</p><div><span>{formatBudget(rfp.budgetMin, rfp.budgetMax)}</span><span>{rfp.eventDate ? new Date(rfp.eventDate).toLocaleDateString('vi-VN') : 'Chưa có ngày sự kiện'}</span></div></div><span>{rfp.status}</span></article>)}
              {!dashboard?.opportunities?.length && <p className="market-empty">Chưa có yêu cầu phù hợp trong cơ sở dữ liệu.</p>}
            </div>
          </section>

          <section className="vendor-crm-section" id="storefront"><div className="dashboard-section-heading"><div><span className="market-kicker">CRM</span><h2>Pipeline khách hàng</h2><p>Lead và trạng thái lấy từ cơ sở dữ liệu.</p></div></div><div className="dashboard-crm-board"><CrmKanbanBoard initialLeads={dashboard?.leads} /></div></section>
          <div className="vendor-dashboard-bottom"><div><ShieldCheck size={17} /><span><strong>{profile?.isVerified ? 'Hồ sơ đã xác thực' : 'Hồ sơ chưa xác thực'}</strong><small>{profile?.storeName || 'Tạo hồ sơ gian hàng để hiển thị dịch vụ.'}</small></span></div>{profile?.slug && <Link to={`/vendors/${profile.slug}`}>Xem storefront <ArrowRight size={14} /></Link>}</div>
        </>
      )}
    </div>
  );
}
