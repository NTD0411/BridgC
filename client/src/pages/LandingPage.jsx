import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, MapPin, Search, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import VendorComparisonTable from '../components/VendorComparisonTable.jsx';

const sampleVendors = [
  { id: 'media', name: 'Danang Media Art Pro', location: 'Đà Nẵng', category: 'Quay phim & Flycam', rating: 4.9, reviews: 128, price: 'Từ 14.000.000đ', tag: 'Đã xác thực', photo: 'photo-1492684223066-81342ee5ff30', badge: 'TOP 1' },
  { id: 'band', name: 'Heritage Live Acoustic Band', location: 'Hội An', category: 'Ban nhạc & Ca sĩ', rating: 4.8, reviews: 86, price: 'Từ 8.500.000đ', tag: 'Phản hồi nhanh', photo: 'photo-1516280440614-37939bbacd81', badge: 'PRO' },
  { id: 'light', name: 'Luxe Light & Sound Studio', location: 'Đà Nẵng', category: 'Âm thanh & Ánh sáng', rating: 4.9, reviews: 94, price: 'Từ 12.000.000đ', tag: 'Đã xác thực', photo: 'photo-1506157786151-b8491531f063', badge: 'TOP 3' },
  { id: 'visual', name: 'Visual Moments Photography', location: 'Huế', category: 'Chụp ảnh / Photo', rating: 5, reviews: 61, price: 'Từ 6.000.000đ', tag: 'Đã xác thực', photo: 'photo-1519741497674-611481863552', badge: 'PRO' },
];

const categories = [
  ['◉', 'Tất cả dịch vụ', '1.240'],
  ['▧', 'Chụp ảnh / Photo', '340'],
  ['▶', 'Quay phim / Video', '215'],
  ['♫', 'Ban nhạc & Ca sĩ', '185'],
  ['◖', 'Âm thanh & Ánh sáng', '198'],
  ['✦', 'MC & Host', '120'],
  ['✿', 'Trang trí / Decor', '182'],
];

const categoryQueryMap = {
  audio: 'Âm thanh & Ánh sáng',
  stage: 'Sân khấu & LED',
  venue: 'Địa điểm Luxury',
  catering: 'Tiệc & Catering',
  video: 'Quay phim / Video',
};

const normalize = (value) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLocaleLowerCase();

function formatVendor(vendor) {
  return {
    id: vendor.id,
    name: vendor.name,
    initials: vendor.name.slice(0, 1),
    location: vendor.location,
    categories: [vendor.category],
    rating: vendor.rating,
    reviewCount: vendor.reviews,
    fiveStarReviews: Math.round(vendor.reviews * 0.84),
    startingPrice: Number(vendor.price.replace(/\D/g, '')),
    responseTime: 25,
    packages: ['Standard', 'Premium'],
    isPro: vendor.badge === 'PRO',
    href: `/vendors/${vendor.id}`,
  };
}

export default function LandingPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('Đà Nẵng');
  const [activeCategory, setActiveCategory] = useState('Tất cả dịch vụ');
  const [comparedIds, setComparedIds] = useState(['media', 'band']);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  useEffect(() => {
    const category = categoryQueryMap[searchParams.get('category')];
    setActiveCategory(category || 'Tất cả dịch vụ');
  }, [searchParams]);

  const visible = useMemo(() => sampleVendors.filter((vendor) => {
    const text = normalize(`${vendor.name} ${vendor.category} ${vendor.location}`);
    const queryMatch = !searched || !query.trim() || normalize(query).split(/\s+/).every((term) => text.includes(term));
    const locationMatch = !searched || !location.trim() || normalize(vendor.location).includes(normalize(location.trim()));
    const categoryMatch = activeCategory === 'Tất cả dịch vụ' ||
      (activeCategory.includes('Quay phim') && vendor.category.includes('Quay phim')) ||
      (activeCategory.includes('Ban nhạc') && vendor.category.includes('Ban nhạc')) ||
      (activeCategory.includes('Âm thanh') && vendor.category.includes('Âm thanh')) ||
      (activeCategory.includes('Photo') && vendor.category.includes('Photo'));
    return queryMatch && locationMatch && categoryMatch;
  }), [activeCategory, location, query, searched]);

  const comparisonVendors = sampleVendors.filter((vendor) => comparedIds.includes(vendor.id)).map(formatVendor);

  function toggleCompare(id) {
    setComparedIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < 3 ? [...current, id] : current);
  }

  function runSearch(event) {
    event.preventDefault();
    setSearched(true);
    setSearchError('');
    if (!query.trim() && !location.trim() && activeCategory === 'Tất cả dịch vụ') {
      setSearchError('Nhập từ khóa, địa điểm hoặc chọn danh mục để tìm kiếm.');
    }
  }

  return (
    <div className="landing-page">
      <section className="market-hero">
        <div className="hero-background-photo" />
        <div className="hero-shade" />
        <div className="market-hero-copy">
          <span className="market-eyebrow"><Sparkles size={14} /> EVENT PROCUREMENT, REIMAGINED</span>
          <h1>Khám phá &amp; chọn lọc<br />Vendor sự kiện <em>đẳng cấp.</em></h1>
          <p>Một không gian tin cậy để tìm kiếm, so sánh và kết nối với những nhà cung cấp sự kiện hàng đầu.</p>
          <form className="hero-search" onSubmit={runSearch}>
            <label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bạn đang tìm dịch vụ nào?" aria-label="Từ khóa dịch vụ" /></label>
            <label><MapPin size={16} /><input value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Địa điểm" /></label>
            <button type="submit">Tìm kiếm <ArrowRight size={16} /></button>
          </form>
          {searchError && <p className="landing-error">{searchError}</p>}
          <div className="popular-searches"><span>Đang thịnh hành</span>{['Quay phim Đà Nẵng', 'Nhiếp ảnh Gala Dinner', 'Ban nhạc Jazz'].map((item) => <button key={item} type="button" onClick={() => { setQuery(item); setSearched(true); }}>{item}</button>)}</div>
        </div>
        <div className="hero-trust"><ShieldCheck size={18} /><span><strong>Verified network</strong><small>Chỉ 5% vendor được tuyển chọn</small></span><span className="trust-divider" /><span className="trust-rating"><Star size={15} fill="currentColor" /> 4.9/5 <small>từ 2.400+ đánh giá</small></span></div>
        <span className="hero-scroll-cue">SCROLL TO DISCOVER ↓</span>
      </section>

      <section className="landing-section category-section">
        <div className="section-topline"><div><span className="market-kicker">KHÁM PHÁ THEO NHU CẦU</span><h2>Tìm đúng dịch vụ, đúng đối tác</h2></div><button type="button" className="quiet-link" onClick={() => setActiveCategory('Tất cả dịch vụ')}>Xóa lọc <ArrowRight size={15} /></button></div>
        <div className="category-grid">
          {categories.map(([icon, label, count]) => (
            <button type="button" key={label} className={`category-card ${activeCategory === label ? 'active' : ''}`} onClick={() => setActiveCategory(label)}>
              <span className="category-glyph">{icon}</span><strong>{label}</strong><small>{count} nhà cung cấp</small>
            </button>
          ))}
        </div>
      </section>

      <section className="landing-section vendor-listing">
        <div className="section-topline"><div><span className="market-kicker">ĐƯỢC TUYỂN CHỌN CHO BẠN</span><h2>Nhà cung cấp nổi bật <span className="listing-count">{visible.length}</span></h2></div><Link className="quiet-link" to="/vendors/danang-media">Xem tất cả <ArrowRight size={15} /></Link></div>
        <div className="market-vendor-grid">
          {visible.map((vendor) => (
            <article className="market-vendor-card" key={vendor.id}>
              <Link className="market-vendor-image" to={`/vendors/${vendor.id}`} style={{ backgroundImage: `url(https://images.unsplash.com/${vendor.photo}?auto=format&fit=crop&w=900&q=80)` }}>
                <span className="vendor-status"><ShieldCheck size={12} /> {vendor.tag}</span><span className="vendor-rank">{vendor.badge}</span>
              </Link>
              <div className="market-vendor-body">
                <div className="market-vendor-title"><div><Link to={`/vendors/${vendor.id}`}>{vendor.name}</Link><p><MapPin size={13} /> {vendor.location} <span>·</span> {vendor.category}</p></div><button type="button" className="favorite-mark" aria-label={`Lưu ${vendor.name}`}>♡</button></div>
                <div className="vendor-card-stats"><span><Star size={14} fill="currentColor" /> {vendor.rating.toFixed(1)} <small>({vendor.reviews} reviews)</small></span><span>{vendor.price}</span></div>
                <div className="market-vendor-actions">
                  <button type="button" className={comparedIds.includes(vendor.id) ? 'compare-selected' : ''} onClick={() => toggleCompare(vendor.id)}>
                    {comparedIds.includes(vendor.id) ? <Check size={14} /> : '+'} {comparedIds.includes(vendor.id) ? 'Đã chọn so sánh' : 'Thêm so sánh'}
                  </button>
                  <Link to={`/vendors/${vendor.id}`}>Yêu cầu báo giá <ArrowUpRight size={14} /></Link>
                </div>
              </div>
            </article>
          ))}
          {visible.length === 0 && <p className="market-empty">Chưa có vendor khớp bộ lọc. Hãy thử từ khóa hoặc địa điểm khác.</p>}
        </div>
        <div className="listing-pagination"><button type="button" aria-label="Trang trước"><ChevronLeft size={17} /></button><button type="button" className="current-page">1</button><button type="button">2</button><button type="button">3</button><span>…</span><button type="button">12</button><button type="button" aria-label="Trang tiếp"><ChevronRight size={17} /></button></div>
      </section>

      {comparisonVendors.length > 0 && (
        <section className="landing-section compare-dock">
          <div className="section-topline"><div><span className="market-kicker">CHỌN LỰA DỰA TRÊN DỮ LIỆU</span><h2>So sánh dịch vụ <span className="listing-count">{comparisonVendors.length}/3</span></h2></div><Link className="compare-open" to="/quotes">So sánh chi tiết <ArrowRight size={15} /></Link></div>
          <VendorComparisonTable vendors={comparisonVendors} onRemove={toggleCompare} />
        </section>
      )}
    </div>
  );
}
