import { useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Heart, MapPin, MessageCircle, Play, Share2, ShieldCheck, Star, UsersRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

const portfolio = [
  ['photo-1519741497674-611481863552', 'Lễ khai trương khách sạn ven biển'],
  ['photo-1506157786151-b8491531f063', 'Gala dinner hội nghị thường niên'],
  ['photo-1492684223066-81342ee5ff30', 'Hội nghị y khoa quốc tế'],
  ['photo-1505373877841-8d25f7d46678', 'Sân khấu sự kiện doanh nghiệp'],
  ['photo-1470229722913-7c0e2dbbafd3', 'Đêm nhạc bên bờ biển'],
  ['photo-1505236858219-8359eb29e329', 'Hội nghị khách hàng 2025'],
];

const packages = [
  { name: 'Gói Cơ Bản', tier: 'STANDARD', price: '14.000.000đ', details: ['2 máy quay 4K', '01 đạo diễn hình ảnh', 'Video highlight 3–5 phút', 'Bàn giao sau 7 ngày'] },
  { name: 'Gala Chuyên Nghiệp', tier: 'BEST SELLER', price: '16.500.000đ', featured: true, details: ['3 máy quay 4K đa góc', 'Flycam & đạo diễn hình ảnh', 'Livestream Full HD', 'Bàn giao sau 48 giờ'] },
  { name: 'Gói VIP Enterprise', tier: 'ENTERPRISE', price: '21.000.000đ', details: ['Multi-cam 4K + livestream', 'Ekip 6 nhân sự chuyên nghiệp', 'Video recap & raw footage', 'Bàn giao ưu tiên 24 giờ'] },
];

const busyDays = new Set([3, 8, 9, 14, 21, 22, 28]);
const profileDetails = {
  media: { name: 'Danang Media Art Pro', location: 'Đà Nẵng', category: 'Quay phim & Flycam', rating: '4.9', reviews: 128 },
  band: { name: 'Heritage Live Acoustic Band', location: 'Hội An', category: 'Ban nhạc & Ca sĩ', rating: '4.8', reviews: 86 },
  skyline: { name: 'SkyLine Film & Events', location: 'Hội An', category: 'Quay phim & Sản xuất', rating: '4.8', reviews: 96 },
  furama: { name: 'Furama Ocean Visual Team', location: 'Đà Nẵng', category: 'Quay phim & Flycam', rating: '4.9', reviews: 74 },
  visual: { name: 'Visual Moments Photography', location: 'Huế', category: 'Chụp ảnh sự kiện', rating: '5.0', reviews: 61 },
};

export default function VendorProfilePage() {
  const { slug } = useParams();
  const [activeTab, setActiveTab] = useState('Tổng quan');
  const [month, setMonth] = useState(5);
  const [selectedDay, setSelectedDay] = useState(null);
  const [saved, setSaved] = useState(false);
  const profile = profileDetails[slug] || profileDetails.media;
  const firstWeekday = (new Date(2026, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(2026, month, 0).getDate();
  const calendarDays = Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const monthLabel = new Intl.DateTimeFormat('vi-VN', { month: 'long' }).format(new Date(2026, month - 1, 1));

  return (
    <div className="profile-page">
      <div className="profile-breadcrumb"><Link to="/"><ArrowLeft size={14} /> Khám phá Vendor</Link><span>/</span><span>Hồ sơ nhà cung cấp</span></div>
      <section className="profile-cover">
        <img src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1800&q=85" alt="Sân khấu sự kiện được quay bởi Danang Media Art Pro" />
        <div className="profile-cover-shade" />
        <span className="cover-caption">EVENTS, CAPTURED WITH PURPOSE</span>
      </section>
      <section className="profile-identity card-surface">
        <div className="profile-logo">DM<span>+</span></div>
        <div className="profile-identity-copy"><div className="profile-name-line"><h1>{profile.name}</h1><span className="verified-pill"><BadgeCheck size={14} /> VERIFIED VENDOR</span><span className="pro-pill">PRO</span></div><p><MapPin size={14} /> {profile.location}, Việt Nam <span>·</span> Hoạt động từ 2018 <span>·</span> {profile.category}</p></div>
        <div className="profile-actions"><button type="button" className="profile-secondary" onClick={() => setSaved((value) => !value)}><Heart size={15} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Đã lưu' : 'Lưu hồ sơ'}</button><button type="button" className="profile-secondary"><Share2 size={15} /> Chia sẻ</button><Link className="profile-primary" to="/rfp/new"><CalendarDays size={16} /> Đặt lịch &amp; Báo giá</Link></div>
      </section>
      <nav className="profile-tabs" aria-label="Nội dung hồ sơ">
        {['Tổng quan', 'Giới thiệu & Thiết bị', 'Bảng giá & Gói dịch vụ', 'Portfolio dự án', 'Đánh giá khách hàng', 'Lịch làm việc'].map((tab, index) => (
          <a key={tab} href={`#${['overview', 'about', 'packages', 'portfolio', 'reviews', 'calendar'][index]}`} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</a>
        ))}
      </nav>

      <div className="profile-layout" id="overview">
        <div className="profile-main-column">
          <section className="profile-section card-surface" id="about">
            <div className="profile-section-title"><div><span className="market-kicker">NĂNG LỰC SẢN XUẤT</span><h2>Hình ảnh kể câu chuyện của bạn</h2></div><span className="experience-stamp"><BadgeCheck size={15} /> 7+ năm kinh nghiệm</span></div>
            <p className="profile-intro">Danang Media Art Pro là đội ngũ sản xuất hình ảnh sự kiện chuyên nghiệp tại miền Trung. Chúng tôi đồng hành cùng doanh nghiệp để lưu giữ những khoảnh khắc quan trọng bằng góc nhìn giàu cảm xúc và quy trình minh bạch.</p>
            <div className="capability-grid"><div><Check size={15} /><span><strong>Thiết bị chuẩn cinema</strong><small>Máy quay Sony FX6 / FX3, ống kính cinema</small></span></div><div><Check size={15} /><span><strong>Multi-cam &amp; livestream</strong><small>Hệ thống truyền dẫn dự phòng ổn định</small></span></div><div><Check size={15} /><span><strong>Ekip onsite chuyên nghiệp</strong><small>Đạo diễn, quay phim và kỹ thuật viên</small></span></div><div><Check size={15} /><span><strong>Hợp đồng &amp; hóa đơn VAT</strong><small>Quy trình rõ ràng cho khách hàng doanh nghiệp</small></span></div></div>
          </section>

          <section className="profile-section card-surface" id="packages">
            <div className="profile-section-title"><div><span className="market-kicker">BẢNG GIÁ MINH BẠCH</span><h2>Bảng giá &amp; các gói dịch vụ</h2></div><span className="muted-inline">Giá tham khảo · Đã bao gồm ekip onsite</span></div>
            <div className="package-grid">
              {packages.map((item) => <article className={`package-card ${item.featured ? 'featured' : ''}`} key={item.name}>
                <span className="package-tier">{item.tier}</span><h3>{item.name}</h3><p>Quay phim sự kiện chuyên nghiệp</p><strong className="package-price">{item.price}</strong><span className="package-unit">/ sự kiện</span>
                <ul>{item.details.map((detail) => <li key={detail}><Check size={14} /> {detail}</li>)}</ul>
                <Link to="/quotes" className={item.featured ? 'package-cta primary' : 'package-cta'}>{item.featured ? 'Chọn gói Best Seller' : 'Chọn gói này'} <ArrowRight size={14} /></Link>
              </article>)}
            </div>
          </section>

          <section className="profile-section card-surface" id="portfolio">
            <div className="profile-section-title"><div><span className="market-kicker">DẤU ẤN ĐỒNG HÀNH</span><h2>Portfolio dự án tiêu biểu</h2></div><button type="button" className="quiet-link">Tất cả (24) <ArrowRight size={14} /></button></div>
            <div className="portfolio-filters"><button className="active" type="button">Tất cả</button><button type="button">Video 4K</button><button type="button">Photo Album</button></div>
            <div className="profile-portfolio-grid">{portfolio.map(([photo, title], index) => <button className="profile-project" type="button" key={photo}><img src={`https://images.unsplash.com/${photo}?auto=format&fit=crop&w=800&q=80`} alt={title} /><span className="project-play">{index % 2 === 0 ? <Play size={16} fill="currentColor" /> : <ArrowRight size={16} />}</span><span className="project-title">{title}</span></button>)}</div>
            <button type="button" className="portfolio-more">Xem thêm 21 dự án khác <ArrowRight size={15} /></button>
          </section>

          <section className="profile-section card-surface" id="reviews">
            <div className="profile-section-title"><div><span className="market-kicker">PHẢN HỒI ĐÃ XÁC THỰC</span><h2>Đánh giá thực tế từ khách hàng</h2></div><div className="review-summary"><Star size={17} fill="currentColor" /> 4.9 <small>/ 5 · 128 đánh giá</small></div></div>
            <div className="review-card"><div className="reviewer-avatar">TH</div><div><div className="reviewer-line"><strong>Thu Hà Nguyễn</strong><span className="verified-pill"><ShieldCheck size={12} /> Giao dịch hoàn tất</span></div><span className="review-stars">★★★★★ <small>Tháng 4, 2025 · Gala doanh nghiệp</small></span><p>Ekip làm việc rất chuyên nghiệp, xử lý tình huống nhanh và chất lượng video vượt mong đợi. Sẽ tiếp tục đồng hành ở sự kiện tiếp theo.</p></div></div>
            <div className="review-card"><div className="reviewer-avatar lavender">MN</div><div><div className="reviewer-line"><strong>Minh Nguyễn</strong><span className="verified-pill"><ShieldCheck size={12} /> Giao dịch hoàn tất</span></div><span className="review-stars">★★★★★ <small>Tháng 3, 2025 · Hội nghị khách hàng</small></span><p>Quy trình báo giá minh bạch, hình ảnh chỉn chu. Đội ngũ đã giao đủ file và đúng thời hạn.</p></div></div>
          </section>
        </div>

        <aside className="profile-aside">
          <section className="profile-section card-surface profile-stat-card"><div className="profile-stat-rating"><Star size={19} fill="currentColor" /><strong>{profile.rating}</strong><span>/ 5</span></div><p>{profile.reviews} đánh giá đã xác thực</p><div className="stat-divider" /><div className="quick-stats"><span><Clock3 size={15} /> Thời gian phản hồi<strong>~ 25 phút</strong></span><span><UsersRound size={15} /> Sự kiện đã đồng hành<strong>240+ dự án</strong></span><span><ShieldCheck size={15} /> Tỷ lệ phản hồi<strong>98%</strong></span></div></section>
          <section className="profile-section card-surface calendar-card" id="calendar"><div className="calendar-top"><div><span className="market-kicker">LỊCH LÀM VIỆC</span><h3>Lịch trống {monthLabel} 2026</h3></div><div><button type="button" aria-label="Tháng trước" onClick={() => setMonth((value) => Math.max(1, value - 1))}><ChevronLeft size={15} /></button><button type="button" aria-label="Tháng sau" onClick={() => setMonth((value) => Math.min(12, value + 1))}><ChevronRight size={15} /></button></div></div><div className="calendar-grid calendar-weekdays">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendarDays.map((day, index) => <button key={`${month}-${index}`} type="button" disabled={!day || busyDays.has(day)} className={`${!day ? 'outside' : ''} ${day && busyDays.has(day) ? 'busy' : ''} ${selectedDay === day ? 'chosen' : ''}`} onClick={() => setSelectedDay(day)}>{day || ''}</button>)}</div><div className="calendar-legend"><span><i /> Còn trống</span><span><i /> Đã kín lịch</span></div><Link className="profile-primary full-width" to="/rfp/new"><CalendarDays size={15} /> Chọn ngày &amp; Yêu cầu báo giá</Link></section>
          <section className="profile-section card-surface document-card"><h3>Hồ sơ năng lực</h3><p>Catalogue dịch vụ &amp; thiết bị sản xuất</p><button type="button"><ArrowDownToLine size={16} /> Tải hồ sơ năng lực (PDF)</button></section>
          <Link className="profile-chat-card" to="/rfp/new"><span><MessageCircle size={17} /></span><strong>Trao đổi với nhà cung cấp</strong><small>Thường phản hồi trong 25 phút</small><ArrowRight size={16} /></Link>
        </aside>
      </div>
    </div>
  );
}
