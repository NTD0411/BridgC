import { useState } from 'react';
import { ArrowRight, BadgeCheck, Bell, BriefcaseBusiness, CalendarClock, ChartNoAxesCombined, ChevronDown, CircleHelp, FilePlus2, MessageCircle, Plus, Search, ShieldCheck, Sparkles, TrendingUp, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import CrmKanbanBoard from '../components/CrmKanbanBoard.jsx';

const events = [
  { title: 'Hội nghị Tech Summit 2026', type: 'AI MATCHING', client: 'FPT Software', date: '18 Thg 12', budget: '18–25 triệu', color: 'rfp-blue' },
  { title: 'Gala Dinner BĐS Đất Xanh', type: 'KHÁCH TÌM KIẾM', client: 'Đất Xanh Group', date: '22 Thg 12', budget: '14–20 triệu', color: 'rfp-gold' },
  { title: 'Tiệc cưới Luxury InterContinental', type: 'QUICK INQUIRY', client: 'Ngọc Hà', date: '04 Thg 01', budget: '10–16 triệu', color: 'rfp-pink' },
];

export default function VendorDashboardPage() {
  const [notice, setNotice] = useState('');
  return (
    <div className="vendor-dashboard">
      <section className="vendor-welcome">
        <div className="vendor-welcome-copy"><span className="market-kicker">VENDOR HUB · THỨ BẢY, 11 THÁNG 10, 2026</span><h1>Xin chào, Danang Media Art Pro <Sparkles size={22} /></h1><p>Những kết nối mới đang chờ bạn hôm nay.</p><div className="vendor-welcome-actions"><button type="button" onClick={() => setNotice('Storefront của bạn đã sẵn sàng để chỉnh sửa.')}>Chỉnh sửa gian hàng <BriefcaseBusiness size={15} /></button><Link to="/rfp/new">Tạo sự kiện mới <FilePlus2 size={15} /></Link></div></div>
        <div className="vendor-welcome-graphic"><span className="welcome-orbit" /><span className="welcome-spark">✳</span><span className="welcome-caption">your work<br /><i>in good company.</i></span><span className="welcome-stats"><strong>+24%</strong><small>lượt xem tháng này</small></span></div>
        <span className="vendor-verified-stamp"><BadgeCheck size={14} /> VERIFIED · PRO</span>
      </section>
      {notice && <p className="quote-notice" role="status">{notice}</p>}

      <div className="vendor-metric-grid">
        <article><span className="metric-label">Lượt hiển thị <Search size={15} /></span><strong>12,840</strong><small className="metric-growth"><TrendingUp size={13} /> +18.6% <span>so với tháng trước</span></small><div className="metric-sparkline"><i /><i /><i /><i /><i /><i /><i /></div></article>
        <article><span className="metric-label">Lượt xem hồ sơ <BriefcaseBusiness size={15} /></span><strong>2,416</strong><small className="metric-growth"><TrendingUp size={13} /> +12.4% <span>so với tháng trước</span></small><div className="metric-sparkline blue"><i /><i /><i /><i /><i /><i /><i /></div></article>
        <article><span className="metric-label">Yêu cầu báo giá <MessageCircle size={15} /></span><strong>86</strong><small className="metric-growth"><TrendingUp size={13} /> +8.2% <span>so với tháng trước</span></small><div className="metric-sparkline gold"><i /><i /><i /><i /><i /><i /><i /></div></article>
        <article><span className="metric-label">Tỷ lệ chuyển đổi <ChartNoAxesCombined size={15} /></span><strong>6.8<span>%</span></strong><small className="metric-growth"><TrendingUp size={13} /> +1.4% <span>so với tháng trước</span></small><div className="metric-sparkline violet"><i /><i /><i /><i /><i /><i /><i /></div></article>
      </div>

      <section className="vendor-insight-row" id="insights">
        <article className="insight-panel"><div className="dashboard-section-heading"><div><span className="market-kicker">TỔNG QUAN HIỆU SUẤT</span><h2>Hiệu quả gian hàng</h2></div><button type="button">7 ngày qua <ChevronDown size={14} /></button></div><div className="chart-legend"><span><i className="legend-blue" /> Lượt xem hồ sơ</span><span><i className="legend-green" /> Lượt hiển thị</span><strong>12.8K <small>lượt hiển thị</small></strong></div><div className="dashboard-chart"><div className="chart-grid"><span>15k</span><span>10k</span><span>5k</span><span>0</span></div><svg viewBox="0 0 600 145" preserveAspectRatio="none" role="img" aria-label="Biểu đồ lượt xem và lượt hiển thị trong tuần"><defs><linearGradient id="areaBlue" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4f82ef" stopOpacity=".2" /><stop offset="100%" stopColor="#4f82ef" stopOpacity="0" /></linearGradient></defs><path d="M0,112 C45,108 55,82 105,91 S165,106 205,74 S270,88 310,65 S380,84 420,45 S485,67 520,37 S570,50 600,18 L600,145 L0,145Z" fill="url(#areaBlue)" /><path d="M0,112 C45,108 55,82 105,91 S165,106 205,74 S270,88 310,65 S380,84 420,45 S485,67 520,37 S570,50 600,18" fill="none" stroke="#4779e8" strokeWidth="3" /><path d="M0,127 C50,119 66,105 108,114 S171,119 211,99 S278,113 320,91 S381,102 425,74 S484,93 530,66 S574,78 600,56" fill="none" stroke="#9bbd66" strokeDasharray="5 5" strokeWidth="2" /></svg><div className="chart-days"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div></div></article>
        <article className="keyword-panel"><div className="dashboard-section-heading"><div><span className="market-kicker">MARKET INTELLIGENCE</span><h2>Từ khóa nổi bật</h2></div><span className="keyword-live">TUẦN NÀY</span></div><p>Những gì khách hàng đang tìm kiếm</p>{[['Quay phim sự kiện 4K', '+32%', 'hot'], ['Livestream hội nghị', '+24%', 'up'], ['Flycam Đà Nẵng', '+18%', 'up'], ['Gala dinner doanh nghiệp', '+12%', 'up']].map(([term, growth, kind], index) => <div className="keyword-row" key={term}><span className="keyword-number">0{index + 1}</span><strong>{term}</strong><span className={`keyword-growth ${kind}`}>{growth}</span></div>)}<Link to="/?category=video">Khám phá xu hướng <ArrowRight size={14} /></Link></article>
      </section>

      <section className="vendor-rfp-section" id="rfp"><div className="dashboard-section-heading"><div><span className="market-kicker">OPPORTUNITY CENTER</span><h2>Yêu cầu phù hợp với bạn <span className="listing-count">3</span></h2><p>Được AI matching dựa trên danh mục, vị trí và gói dịch vụ.</p></div><Link to="/quotes">Xem chợ dự án <ArrowRight size={14} /></Link></div><div className="rfp-opportunities">{events.map((event) => <article className="rfp-opportunity" key={event.title}><div className={`rfp-event-visual ${event.color}`}><CalendarClock size={21} /><span>{event.type}</span></div><div className="rfp-event-copy"><h3>{event.title}</h3><p>{event.client} <span>·</span> {event.date}</p><div><span>{event.budget}</span><span>Quay phim &amp; Production</span></div></div><button type="button" onClick={() => setNotice(`Đã mở hồ sơ ${event.title}.`)}>Xem yêu cầu <ArrowRight size={14} /></button></article>)}</div></section>

      <section className="vendor-crm-section" id="storefront"><div className="dashboard-section-heading"><div><span className="market-kicker">CUSTOMER RELATIONSHIP</span><h2>Pipeline khách hàng</h2><p>Chăm sóc mọi kết nối trong cùng một không gian làm việc.</p></div><div className="crm-toolbar-actions"><button type="button" onClick={() => setNotice('Đã mở bộ lọc lead.')}>Tất cả nguồn <ChevronDown size={13} /></button><button type="button" onClick={() => setNotice('Tạo lead thủ công: chức năng sẽ khả dụng khi API CRM mở rộng.')}><Plus size={14} /> Thêm Lead</button></div></div><div className="dashboard-crm-board"><CrmKanbanBoard /></div></section>
      <div className="vendor-dashboard-bottom"><div><ShieldCheck size={17} /><span><strong>Gian hàng của bạn đã xác thực</strong><small>Duy trì hồ sơ cập nhật để giữ huy hiệu Verified.</small></span></div><Link to="/vendors/danang-media">Xem storefront <ArrowRight size={14} /></Link></div>
    </div>
  );
}
