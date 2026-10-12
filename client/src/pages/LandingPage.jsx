import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, ListFilter, MapPin, Search, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest, assetUrl } from '../lib/api.js';

const formatPrice = (price) => price > 0
  ? `Từ ${new Intl.NumberFormat('vi-VN').format(price)}đ`
  : 'Chưa cập nhật giá';

export default function LandingPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [comparedIds, setComparedIds] = useState([]);
  const [offset, setOffset] = useState(0);
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const category = searchParams.get('category');
    setActiveCategory(category || '');
    setOffset(0);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (location.trim()) params.set('province', location.trim());
    if (activeCategory) params.set('category', activeCategory);
    params.set('limit', '24');
    params.set('skip', String(offset));
    setLoading(true);
    setError('');
    apiRequest(`/api/vendors?${params}`)
      .then((result) => {
        if (cancelled) return;
        setVendors((current) => offset
          ? [...current, ...(result.vendors || [])]
          : result.vendors || []);
        setCategories(result.categories || []);
        setTotal(result.total || 0);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [query, location, activeCategory, offset]);

  function toggleCompare(id) {
    setComparedIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < 4 ? [...current, id] : current);
  }

  function runSearch(event) {
    event.preventDefault();
    setOffset(0);
  }

  return (
    <div className="landing-page">
      <section className="market-hero">
        <div className="hero-background-photo" />
        <div className="hero-shade" />
        <div className="market-hero-copy">
          <span className="market-eyebrow"><Sparkles size={14} /> EVENT PROCUREMENT</span>
          <h1>Khám phá &amp; chọn lọc<br />Vendor sự kiện <em>phù hợp.</em></h1>
          <p>Tìm kiếm nhà cung cấp dựa trên hồ sơ và dịch vụ đã được đăng ký.</p>
          <form className="hero-search" onSubmit={runSearch}>
            <label><Search size={17} /><input value={query} onChange={(event) => { setOffset(0); setQuery(event.target.value); }} placeholder="Bạn đang tìm dịch vụ nào?" aria-label="Từ khóa dịch vụ" /></label>
            <label><MapPin size={16} /><input value={location} onChange={(event) => { setOffset(0); setLocation(event.target.value); }} placeholder="Tỉnh/thành" aria-label="Địa điểm" /></label>
            <label className="hero-category-filter"><ListFilter size={16} /><select aria-label="Lọc theo danh mục dịch vụ" value={activeCategory} onChange={(event) => { setOffset(0); setActiveCategory(event.target.value); }}><option value="">Tất cả dịch vụ</option>{categories.map(({ name }) => <option key={name} value={name}>{name}</option>)}</select></label>
            <button type="submit">Tìm kiếm <ArrowRight size={16} /></button>
          </form>
          <div className="popular-searches"><span>Danh mục</span>{categories.slice(0, 3).map(({ name }) => <button key={name} type="button" onClick={() => setActiveCategory(name)}>{name}</button>)}</div>
        </div>
        <div className="hero-trust"><ShieldCheck size={18} /><span><strong>Hồ sơ từ cơ sở dữ liệu</strong><small>{total} nhà cung cấp đã đăng ký</small></span></div>
        <span className="hero-scroll-cue">SCROLL TO DISCOVER ↓</span>
      </section>

      <section className="landing-section category-section">
        <div className="section-topline"><div><span className="market-kicker">DANH MỤC ĐÃ ĐĂNG KÝ</span><h2>Tìm theo dịch vụ</h2></div><button type="button" className="quiet-link" onClick={() => { setOffset(0); setActiveCategory(''); }}>Xóa lọc <ArrowRight size={15} /></button></div>
        <div className="category-grid">
          {categories.map(({ name, count }, index) => (
            <button type="button" key={name} className={`category-card ${activeCategory === name ? 'active' : ''}`} onClick={() => { setOffset(0); setActiveCategory(name); }}>
              <span className="category-glyph">{['◉', '▧', '▶', '♫', '✦'][index % 5]}</span><strong>{name}</strong><small>{count} nhà cung cấp</small>
            </button>
          ))}
          {categories.length === 0 && !loading && <p className="market-empty">Chưa có danh mục vendor nào trong hệ thống.</p>}
        </div>
      </section>

      <section className="landing-section vendor-listing">
        <div className="section-topline"><div><span className="market-kicker">HỒ SƠ NHÀ CUNG CẤP</span><h2>Nhà cung cấp <span className="listing-count">{total}</span></h2></div><div className="listing-heading-actions">{comparedIds.length > 0 && <Link className="compare-open" to={`/quotes?vendors=${comparedIds.join(',')}`}>So sánh ({comparedIds.length}) <ArrowRight size={15} /></Link>}</div></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="market-vendor-grid">
          {vendors.map((vendor) => {
            const image = vendor.coverImage || vendor.portfolio?.find((item) => item.type === 'image')?.url || vendor.logo;
            return (
              <article className="market-vendor-card" key={vendor.id}>
                <Link className="market-vendor-image" to={`/vendors/${vendor.slug}`} style={image ? { backgroundImage: `url(${assetUrl(image)})` } : undefined}>
                  {vendor.isVerified && <span className="vendor-status"><ShieldCheck size={12} /> Đã xác thực</span>}
                  {vendor.isPro && <span className="vendor-rank">PRO</span>}
                </Link>
                <div className="market-vendor-body">
                  <div className="market-vendor-title"><div><Link to={`/vendors/${vendor.slug}`}>{vendor.name}</Link><p><MapPin size={13} /> {vendor.location || 'Chưa cập nhật địa điểm'} <span>·</span> {vendor.categories.join(', ')}</p></div></div>
                  <div className="vendor-card-stats"><span><Star size={14} fill="currentColor" /> {vendor.rating?.toFixed(1) || '—'} <small>({vendor.reviewCount} đánh giá)</small></span><span>{formatPrice(vendor.startingPrice)}</span></div>
                  <div className="market-vendor-actions">
                    <button type="button" className={comparedIds.includes(String(vendor.id)) ? 'compare-selected' : ''} onClick={() => toggleCompare(String(vendor.id))}>
                      {comparedIds.includes(String(vendor.id)) ? <Check size={14} /> : '+'} {comparedIds.includes(String(vendor.id)) ? 'Đã chọn so sánh' : 'Thêm so sánh'}
                    </button>
                    <Link to={`/vendors/${vendor.slug}`}>Xem hồ sơ <ArrowUpRight size={14} /></Link>
                  </div>
                </div>
              </article>
            );
          })}
          {!loading && vendors.length === 0 && <p className="market-empty">Chưa có hồ sơ vendor phù hợp. Vendor có thể đăng ký và tạo hồ sơ để xuất hiện ở đây.</p>}
          {loading && <p className="market-empty">Đang tải hồ sơ từ hệ thống…</p>}
        </div>
        {!loading && vendors.length < total && <button type="button" className="quiet-link" onClick={() => setOffset(vendors.length)}>Tải thêm nhà cung cấp <ArrowRight size={15} /></button>}
      </section>
    </div>
  );
}
