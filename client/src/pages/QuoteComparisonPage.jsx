import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Eye, Plus, ShieldCheck, Star, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest, assetUrl } from '../lib/api.js';

const formatPrice = (price) => price == null
  ? 'Chưa cập nhật'
  : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(price);

export default function QuoteComparisonPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vendors, setVendors] = useState([]);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const ids = searchParams.get('vendors')?.split(',').filter(Boolean) || [];

  useEffect(() => {
    let cancelled = false;
    if (!ids.length) {
      setVendors([]);
      return undefined;
    }
    setLoading(true);
    setError('');
    apiRequest(`/api/vendors/compare?ids=${encodeURIComponent(ids.join(','))}`)
      .then(({ vendors: result }) => {
        if (!cancelled) setVendors(result || []);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [searchParams]);

  const rows = useMemo(() => [
    ['Đánh giá', (vendor) => vendor.stats?.ratingAvg ? `${vendor.stats.ratingAvg.toFixed(1)} / 5 (${vendor.stats.reviewCount} đánh giá)` : 'Chưa có đánh giá'],
    ['Địa điểm', (vendor) => [vendor.location?.city, vendor.location?.province].filter(Boolean).join(', ') || 'Chưa cập nhật'],
    ['Danh mục', (vendor) => vendor.category?.join(', ') || 'Chưa cập nhật'],
    ['Gói dịch vụ', (vendor) => vendor.packages?.map((item) => item.name).join(', ') || 'Chưa đăng gói'],
    ['Giá thấp nhất', (vendor) => formatPrice(vendor.packages?.length ? Math.min(...vendor.packages.map((item) => item.price)) : null)],
    ['Thời gian phản hồi', (vendor) => vendor.stats?.responseTimeMinutes ? `${vendor.stats.responseTimeMinutes} phút` : 'Chưa có dữ liệu'],
    ['Xác thực', (vendor) => vendor.isVerified],
  ], []);

  function removeVendor(id) {
    const nextIds = ids.filter((item) => item !== id);
    if (nextIds.length) setSearchParams({ vendors: nextIds.join(',') });
    else setSearchParams({});
  }

  function showDifferences(values) {
    return !differencesOnly || new Set(values.map((value) => String(value))).size > 1;
  }

  return (
    <div className="quote-page">
      <div className="quote-breadcrumb"><Link to="/"><ArrowLeft size={14} /> Khám phá Vendor</Link><span>/</span><strong>So sánh nhà cung cấp</strong></div>
      <section className="quote-heading"><div><span className="market-kicker">SO SÁNH HỒ SƠ</span><h1>Năng lực &amp; dịch vụ</h1><p>Thông tin được lấy từ hồ sơ vendor trong cơ sở dữ liệu.</p></div></section>
      <div className="quote-toolbar"><div><span className="quote-status"><span /> {vendors.length} vendor</span></div><div><button type="button" className={differencesOnly ? 'toggle-active' : ''} onClick={() => setDifferencesOnly((value) => !value)}><span className="toggle-dot" /> Chỉ xem điểm khác biệt</button><Link to="/" className="profile-preview"><Plus size={15} /> Thêm vendor</Link></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="market-empty">Đang tải hồ sơ vendor…</p>}
      {!loading && !vendors.length && <p className="market-empty">Chưa chọn vendor để so sánh. Hãy chọn hồ sơ từ <Link to="/">trang khám phá</Link>.</p>}
      {!!vendors.length && (
        <div className="quote-table-wrap">
          <table className="quote-matrix">
            <thead><tr><th scope="col" className="criteria-heading"><span className="market-kicker">TIÊU CHÍ</span><h2>Thông tin</h2></th>
              {vendors.map((vendor, index) => <th scope="col" className="quote-vendor-heading" key={vendor._id}><div className="quote-vendor-logo">{vendor.logo ? <img src={assetUrl(vendor.logo)} alt="" /> : vendor.storeName.slice(0, 2).toLocaleUpperCase()}</div><button className="remove-quote-vendor" type="button" aria-label={`Bỏ ${vendor.storeName}`} onClick={() => removeVendor(String(vendor._id))}><X size={15} /></button><h3>{vendor.storeName}</h3><p>{vendor.isVerified && <><BadgeCheck size={13} /> Đã xác thực · </>}{[vendor.location?.city, vendor.location?.province].filter(Boolean).join(', ')}</p><span className="quote-vendor-index">VENDOR 0{index + 1}</span></th>)}
            </tr></thead>
            <tbody>
              {rows.filter(([, render]) => showDifferences(vendors.map(render))).map(([label, render]) => <tr key={label}><th scope="row">{label}</th>{vendors.map((vendor) => { const value = render(vendor); return <td key={vendor._id}>{typeof value === 'boolean' ? value ? <span className="quote-yes"><Check size={15} /> Có</span> : <span className="quote-no">Chưa xác thực</span> : value}</td>; })}</tr>)}
              {showDifferences(vendors.map((vendor) => (vendor.packages || []).map((item) => `${item.name}: ${formatPrice(item.price)}`).join('|'))) && <tr className="quote-features-row"><th scope="row">Chi tiết gói dịch vụ</th>{vendors.map((vendor) => <td key={vendor._id}><ul>{vendor.packages?.flatMap((item) => item.features || []).map((feature, index) => <li key={`${index}-${feature}`}><Check size={13} /> {feature}</li>) || 'Chưa đăng gói dịch vụ'}</ul></td>)}</tr>}
              <tr className="quote-action-row"><th scope="row"><ShieldCheck size={15} /> Hồ sơ</th>{vendors.map((vendor) => <td key={vendor._id}><Link className="quote-preview" to={`/vendors/${vendor.slug}`}><Eye size={14} /> Xem hồ sơ</Link></td>)}</tr>
            </tbody>
          </table>
        </div>
      )}
      <div className="quote-footnote"><span><Check size={14} /> Dữ liệu đồng bộ từ hồ sơ vendor</span><span><ShieldCheck size={14} /> Giá và dịch vụ do vendor đăng ký</span></div>
    </div>
  );
}
