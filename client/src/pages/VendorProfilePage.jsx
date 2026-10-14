import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, MapPin, MessageCircle, Play, ShieldCheck, Star } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest, assetUrl } from '../lib/api.js';
import { useSessionStore } from '../store/sessionStore.js';
import GoogleMapView from '../components/GoogleMapView.jsx';

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(price);

const formatDate = (value) => new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(new Date(value));

export default function VendorProfilePage() {
  const { slug } = useParams();
  const role = useSessionStore((state) => state.role);
  const [activeTab, setActiveTab] = useState('Tổng quan');
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiRequest(`/api/vendors/${encodeURIComponent(slug)}`)
      .then(({ vendor: result }) => {
        if (!cancelled) setVendor(result);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  const year = new Date().getFullYear();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const monthLabel = formatDate(new Date(year, month, 1));
  const availability = useMemo(() => new Map(
    (vendor?.availabilityCalendar || []).map(({ date, status }) => [new Date(date).toDateString(), status]),
  ), [vendor]);

  if (loading) return <p className="market-empty">Đang tải hồ sơ vendor…</p>;
  if (error || !vendor) return <p className="market-empty" role="alert">{error || 'Không tìm thấy hồ sơ vendor.'}</p>;

  const image = vendor.coverImage || vendor.portfolio?.find((item) => item.type === 'image')?.url || '';
  const location = [vendor.location?.city, vendor.location?.province].filter(Boolean).join(', ');

  return (
    <div className="profile-page">
      <div className="profile-breadcrumb"><Link to="/"><ArrowLeft size={14} /> Khám phá Vendor</Link><span>/</span><span>Hồ sơ nhà cung cấp</span></div>
      <section className="profile-cover">
        {image && <img src={assetUrl(image)} alt={`Hình ảnh của ${vendor.storeName}`} />}
        <div className="profile-cover-shade" />
        <span className="cover-caption">{vendor.storeName}</span>
      </section>
      <section className="profile-identity card-surface">
        <div className="profile-logo">{vendor.logo ? <img src={assetUrl(vendor.logo)} alt="" /> : vendor.storeName.slice(0, 2).toLocaleUpperCase()}</div>
        <div className="profile-identity-copy"><div className="profile-name-line"><h1>{vendor.storeName}</h1>{vendor.isVerified && <span className="verified-pill"><BadgeCheck size={14} /> VERIFIED VENDOR</span>}{vendor.isPro && <span className="pro-pill">PRO</span>}</div><p><MapPin size={14} /> {location || 'Chưa cập nhật địa điểm'} <span>·</span> {vendor.category?.join(', ')}</p></div>
        <div className="profile-actions">{role !== 'vendor' && <Link className="profile-secondary" to={`/messages?vendor=${encodeURIComponent(vendor.slug)}`}><MessageCircle size={15} /> Nhắn tin</Link>}<Link className="profile-primary" to={`/rfp/new?vendor=${encodeURIComponent(vendor.slug)}`}><CalendarDays size={16} /> Yêu cầu báo giá</Link></div>
      </section>
      <nav className="profile-tabs" aria-label="Nội dung hồ sơ">
        {['Tổng quan', 'Giới thiệu', 'Bảng giá & Gói dịch vụ', 'Portfolio dự án', 'Đánh giá khách hàng', 'Lịch làm việc'].map((tab, index) => (
          <a key={tab} href={`#${['overview', 'about', 'packages', 'portfolio', 'reviews', 'calendar'][index]}`} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</a>
        ))}
      </nav>

      <div className="profile-layout" id="overview">
        <div className="profile-main-column">
          <section className="profile-section card-surface" id="about">
            <div className="profile-section-title"><div><span className="market-kicker">GIỚI THIỆU</span><h2>{vendor.storeName}</h2></div></div>
            <p className="profile-intro">{vendor.bio || 'Nhà cung cấp chưa cập nhật phần giới thiệu.'}</p>
            {!!vendor.tags?.length && <div className="capability-grid">{vendor.tags.map((tag) => <div key={tag}><Check size={15} /><span><strong>{tag}</strong></span></div>)}</div>}
          </section>

          <section className="profile-section card-surface" id="packages">
            <div className="profile-section-title"><div><span className="market-kicker">DỊCH VỤ ĐÃ ĐĂNG KÝ</span><h2>Bảng giá &amp; các gói dịch vụ</h2></div></div>
            <div className="package-grid">
              {vendor.packages?.map((item) => <article className="package-card" key={item._id || item.name}>
                <span className="package-tier">{item.name}</span><h3>{item.name}</h3><p>{item.description}</p><strong className="package-price">{formatPrice(item.price)}</strong>
                <ul>{item.features.map((feature) => <li key={feature}><Check size={14} /> {feature}</li>)}</ul>
                <Link to={`/rfp/new?vendor=${encodeURIComponent(vendor.slug)}`} className="package-cta">Yêu cầu gói này <ArrowRight size={14} /></Link>
              </article>)}
              {!vendor.packages?.length && <p className="market-empty">Vendor chưa đăng ký gói dịch vụ.</p>}
            </div>
          </section>

          <section className="profile-section card-surface" id="portfolio">
            <div className="profile-section-title"><div><span className="market-kicker">PORTFOLIO</span><h2>Dự án đã đăng</h2></div></div>
            <div className="profile-portfolio-grid">{vendor.portfolio?.map((item) => <a className="profile-project" key={item._id || item.url} href={assetUrl(item.url)} target="_blank" rel="noreferrer">
              {item.type === 'image' ? <img src={assetUrl(item.url)} alt={item.title || vendor.storeName} /> : <span className="project-play">{item.type === 'video' ? <Play size={16} fill="currentColor" /> : <ArrowDownToLine size={16} />}</span>}
              <span className="project-title">{item.title || item.type}</span>
            </a>)}</div>
            {!vendor.portfolio?.length && <p className="market-empty">Vendor chưa đăng dự án portfolio.</p>}
          </section>

          <section className="profile-section card-surface" id="reviews">
            <div className="profile-section-title"><div><span className="market-kicker">ĐÁNH GIÁ</span><h2>Đánh giá từ khách hàng</h2></div><div className="review-summary"><Star size={17} fill="currentColor" /> {vendor.stats?.ratingAvg?.toFixed(1) || '—'} <small>/ 5 · {vendor.stats?.reviewCount || 0} đánh giá</small></div></div>
            {vendor.reviews?.map((review) => <div className="review-card" key={review.id}><div className="reviewer-avatar">{review.customer?.fullName?.slice(0, 1)?.toLocaleUpperCase() || '?'}</div><div><div className="reviewer-line"><strong>{review.customer?.fullName || 'Khách hàng'}</strong>{review.isVerifiedDeal && <span className="verified-pill"><ShieldCheck size={12} /> Giao dịch hoàn tất</span>}</div><span className="review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} <small>{formatDate(review.createdAt)}</small></span><p>{review.comment || 'Khách hàng không để lại nhận xét.'}</p></div></div>)}
            {!vendor.reviews?.length && <p className="market-empty">Chưa có đánh giá trong hệ thống.</p>}
          </section>
        </div>

        <aside className="profile-aside">
          <section className="profile-section card-surface profile-stat-card"><div className="profile-stat-rating"><Star size={19} fill="currentColor" /><strong>{vendor.stats?.ratingAvg?.toFixed(1) || '—'}</strong><span>/ 5</span></div><p>{vendor.stats?.reviewCount || 0} đánh giá</p><div className="stat-divider" /><div className="quick-stats"><span><Clock3 size={15} /> Thời gian phản hồi<strong>{vendor.stats?.responseTimeMinutes ? `${vendor.stats.responseTimeMinutes} phút` : 'Chưa có dữ liệu'}</strong></span><span><ShieldCheck size={15} /> Tỷ lệ phản hồi<strong>{vendor.stats?.responseRate ? `${vendor.stats.responseRate}%` : 'Chưa có dữ liệu'}</strong></span></div></section>
          <section className="profile-section card-surface calendar-card" id="calendar"><div className="calendar-top"><div><span className="market-kicker">LỊCH LÀM VIỆC</span><h3>{monthLabel}</h3></div><div><button type="button" aria-label="Tháng trước" onClick={() => setMonth((value) => Math.max(0, value - 1))}><ChevronLeft size={15} /></button><button type="button" aria-label="Tháng sau" onClick={() => setMonth((value) => Math.min(11, value + 1))}><ChevronRight size={15} /></button></div></div><div className="calendar-grid calendar-weekdays">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendarDays.map((day, index) => {
            const date = day ? new Date(year, month, day) : null;
            const status = date ? availability.get(date.toDateString()) : null;
            return <button key={`${month}-${index}`} type="button" disabled={!day || !status || status === 'busy' || status === 'fully_booked'} className={`${!day ? 'outside' : ''} ${status === 'busy' || status === 'fully_booked' ? 'busy' : ''} ${selectedDay === day ? 'chosen' : ''}`} onClick={() => setSelectedDay(day)}>{day || ''}</button>;
          })}</div>{vendor.availabilityCalendar?.length ? <div className="calendar-legend"><span><i /> Ngày có lịch trống</span><span><i /> Đã bận</span></div> : <p className="market-empty">Vendor chưa cập nhật lịch làm việc.</p>}<Link className="profile-primary full-width" to={`/rfp/new?vendor=${encodeURIComponent(vendor.slug)}`}><CalendarDays size={15} /> Yêu cầu báo giá</Link></section>
          {vendor.companyProfilePdfUrl && <section className="profile-section card-surface document-card"><h3>Hồ sơ năng lực</h3><a href={assetUrl(vendor.companyProfilePdfUrl)} target="_blank" rel="noreferrer"><ArrowDownToLine size={16} /> Tải hồ sơ năng lực (PDF)</a></section>}
          {vendor.cataloguePdfUrl && <section className="profile-section card-surface document-card"><h3>Catalogue</h3><a href={assetUrl(vendor.cataloguePdfUrl)} target="_blank" rel="noreferrer"><ArrowDownToLine size={16} /> Tải catalogue (PDF)</a></section>}
          <section className="profile-section card-surface map-card">
            <div className="profile-section-title">
              <div><span className="market-kicker">ĐỊA ĐIỂM</span><h3>Bản đồ vị trí</h3></div>
            </div>
            <GoogleMapView
              location={location || 'Đà Nẵng'}
              address={vendor.address}
              title={vendor.storeName}
              height={200}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
