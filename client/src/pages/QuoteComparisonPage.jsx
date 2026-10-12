import { useState } from 'react';
import { ArrowLeft, BadgeCheck, Check, ChevronDown, Download, Eye, MessageCircle, Plus, Share2, ShieldCheck, Star, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const startingVendors = [
  { id: 'media', name: 'Danang Media Art Pro', location: 'Đà Nẵng', rating: 4.9, reviews: 128, logo: 'DM', color: 'logo-green', selected: 'Gói Gala Chuyên Nghiệp', price: 16500000, features: ['3 máy quay 4K đa góc', 'Flycam & đạo diễn hình ảnh', 'Livestream Full HD', 'Highlight video 3–5 phút', 'Bàn giao trong 48 giờ'], response: '25 phút', insured: true },
  { id: 'skyline', name: 'SkyLine Film & Events', location: 'Hội An', rating: 4.8, reviews: 96, logo: 'SF', color: 'logo-blue', selected: 'Gói Tiết kiệm', price: 14000000, features: ['2 máy quay 4K', 'Đạo diễn hình ảnh', 'Livestream Full HD', 'Highlight video 3 phút', 'Bàn giao trong 5 ngày'], response: '40 phút', insured: true },
  { id: 'furama', name: 'Furama Ocean Visual Team', location: 'Đà Nẵng', rating: 4.9, reviews: 74, logo: 'FV', color: 'logo-purple', selected: 'Gói Luxury', price: 21000000, features: ['4 máy quay cinema 4K', 'Flycam & ekip 6 người', 'Livestream đa nền tảng', 'Video recap + raw footage', 'Bàn giao trong 24 giờ'], response: '15 phút', insured: true },
];

const criteria = [
  ['Đánh giá tổng thể', (vendor) => <span className="quote-rating"><Star size={15} fill="currentColor" /> {vendor.rating} <small>({vendor.reviews})</small></span>, (vendor) => vendor.rating],
  ['Gói đang xem', (vendor) => <strong>{vendor.selected}</strong>, (vendor) => vendor.selected],
  ['Tổng báo giá', (vendor) => <strong className="quote-total">{vendor.price.toLocaleString('vi-VN')}đ</strong>, (vendor) => vendor.price],
  ['Máy quay 4K', (vendor) => vendor.features.some((feature) => feature.includes('máy quay')), (vendor) => vendor.features.some((feature) => feature.includes('máy quay'))],
  ['Flycam', (vendor) => vendor.features.some((feature) => feature.toLowerCase().includes('flycam')), (vendor) => vendor.features.some((feature) => feature.toLowerCase().includes('flycam'))],
  ['Livestream', (vendor) => vendor.features.some((feature) => feature.toLowerCase().includes('livestream')), (vendor) => vendor.features.some((feature) => feature.toLowerCase().includes('livestream'))],
  ['Thời gian phản hồi', (vendor) => vendor.response, (vendor) => vendor.response],
  ['Bảo chứng giao dịch', (vendor) => vendor.insured, (vendor) => vendor.insured],
];

export default function QuoteComparisonPage() {
  const [vendors, setVendors] = useState(startingVendors);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [notice, setNotice] = useState('');

  const rows = criteria.filter(([, , compare]) =>
    !differencesOnly || new Set(vendors.map((vendor) => String(compare(vendor)))).size > 1,
  );

  function addVendor() {
    if (vendors.length >= 4) {
      setNotice('Bạn có thể so sánh tối đa 4 nhà cung cấp.');
      return;
    }
    const source = startingVendors.find((vendor) => !vendors.some((item) => item.id === vendor.id));
    if (!source) {
      setNotice('Đã thêm tất cả vendor gợi ý hiện có.');
      return;
    }
    setVendors((current) => [...current, { ...source, id: `${source.id}-copy`, name: 'Visual Moments Photography', logo: 'VM', price: 12000000 }]);
    setNotice('');
  }

  return (
    <div className="quote-page">
      <div className="quote-breadcrumb"><Link to="/"><ArrowLeft size={14} /> BridgC Workspace</Link><span>/</span><span>Quản lý Đấu thầu &amp; RFQ</span><span>/</span><strong>So sánh ma trận báo giá</strong></div>
      <section className="quote-heading"><div><span className="market-kicker">DECISION WORKSPACE · RFQ-2025-0842</span><h1>So sánh năng lực &amp; báo giá</h1><p>Gala Dinner thường niên · 18 tháng 12, 2026 · Đà Nẵng</p></div><div className="quote-heading-actions"><button type="button" onClick={() => window.print()}><Download size={15} /> Xuất file PDF</button><button type="button" onClick={() => { navigator.clipboard?.writeText(window.location.href); setNotice('Đã sao chép liên kết để chia sẻ.'); }}><Share2 size={15} /> Chia sẻ Ban Giám đốc</button></div></section>
      <div className="quote-toolbar"><div><span className="quote-status"><span /> Đang nhận báo giá</span><span className="quote-update">Cập nhật lần cuối: 15 phút trước</span></div><div><button type="button" className={differencesOnly ? 'toggle-active' : ''} onClick={() => setDifferencesOnly((value) => !value)}><span className="toggle-dot" /> Chỉ xem điểm khác biệt</button><button type="button" onClick={addVendor}><Plus size={15} /> Thêm vendor ({vendors.length}/4)</button></div></div>
      {notice && <p className="quote-notice" role="status">{notice}</p>}
      <div className="quote-table-wrap">
        <table className="quote-matrix">
          <thead><tr><th scope="col" className="criteria-heading"><span className="market-kicker">BẢNG TIÊU CHÍ</span><h2>Danh mục<br />tiêu chí</h2><p>Đánh giá theo<br />8 tiêu chí</p></th>
            {vendors.map((vendor, index) => <th scope="col" className="quote-vendor-heading" key={vendor.id}><div className={`quote-vendor-logo ${vendor.color}`}>{vendor.logo}</div><button className="remove-quote-vendor" type="button" aria-label={`Bỏ ${vendor.name}`} onClick={() => setVendors((current) => current.filter((item) => item.id !== vendor.id))}><X size={15} /></button><h3>{vendor.name}</h3><p><BadgeCheck size={13} /> Verified · {vendor.location}</p><span className="quote-vendor-index">VENDOR 0{index + 1}</span></th>)}
          </tr></thead>
          <tbody>
            {rows.map(([label, render]) => <tr key={label}><th scope="row">{label}</th>{vendors.map((vendor) => { const value = render(vendor); return <td key={vendor.id}>{typeof value === 'boolean' ? value ? <span className="quote-yes"><Check size={15} /> Có</span> : <span className="quote-no">Không bao gồm</span> : value}</td>; })}</tr>)}
            <tr className="quote-features-row"><th scope="row">Chi tiết gói</th>{vendors.map((vendor) => <td key={vendor.id}><ul>{vendor.features.map((feature) => <li key={feature}><Check size={13} /> {feature}</li>)}</ul></td>)}</tr>
            <tr className="quote-action-row"><th scope="row"><ShieldCheck size={15} /> Bước tiếp theo</th>{vendors.map((vendor, index) => <td key={vendor.id}><button className={index === 0 ? 'quote-select-button primary' : 'quote-select-button'} type="button" onClick={() => setNotice(`Đã chọn ${vendor.selected} của ${vendor.name}. Hãy hoàn tất xác nhận với vendor.`)}>{index === 0 ? 'Chọn & tiếp tục' : 'Chọn gói này'} <ArrowRightIcon /></button><button className="quote-contact" type="button" onClick={() => setNotice(`Yêu cầu trao đổi với ${vendor.name} đã sẵn sàng.`)}><MessageCircle size={14} /> Thương lượng</button><Link className="quote-preview" to={`/vendors/${vendor.id}`}><Eye size={14} /> Xem hồ sơ vendor</Link></td>)}</tr>
          </tbody>
        </table>
      </div>
      <div className="quote-assurance"><ShieldCheck size={17} /><span><strong>Bảo chứng BridgC Escrow</strong><small>Khoản đặt cọc chỉ được giải ngân theo các mốc nghiệm thu dự án đã thống nhất.</small></span><button type="button" onClick={() => setNotice('Chi tiết quy trình Escrow: ký hợp đồng, nghiệm thu theo mốc, giải ngân an toàn.')}>Tìm hiểu thêm <ChevronDown size={14} /></button></div>
      <div className="quote-footnote"><span><Check size={14} /> Đã chuẩn hóa theo yêu cầu RFP</span><span><ShieldCheck size={14} /> Giá do nhà cung cấp gửi trực tiếp</span></div>
    </div>
  );
}

function ArrowRightIcon() {
  return <span aria-hidden="true">→</span>;
}
