import { ArrowUpRight, Check, Crown, Star } from 'lucide-react';
import { assetUrl } from '../lib/api.js';

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(price);

export default function VendorComparisonTable({ vendors = [], onRemove }) {
  const compared = vendors.slice(0, 3);
  if (compared.length === 0) {
    return <p className="empty-state">Chọn nhà cung cấp để bắt đầu so sánh.</p>;
  }

  const rows = [
    {
      label: 'Đánh giá',
      render: (vendor) => (
        <span className="rating-value">
          <Star size={15} fill="currentColor" /> {vendor.rating?.toFixed(1) ?? '—'}
          <span className="muted"> ({vendor.reviewCount ?? 0})</span>
        </span>
      ),
    },
    {
      label: 'Review 5 sao',
      render: (vendor) => <strong>{vendor.fiveStarReviews ?? '—'}</strong>,
    },
    { label: 'Giá từ', render: (vendor) => <strong>{vendor.startingPrice == null ? 'Chưa cập nhật' : formatPrice(vendor.startingPrice)}</strong> },
    { label: 'Phản hồi', render: (vendor) => vendor.responseTime ? `${vendor.responseTime} phút` : 'Chưa có dữ liệu' },
    {
      label: 'Portfolio',
      render: (vendor) => (
        <div className="portfolio-preview" aria-label={`Portfolio của ${vendor.name}`}>
          {vendor.portfolio?.length
            ? vendor.portfolio.slice(0, 3).map((item, index) => item.url
              ? <img key={`${vendor.id}-${index}`} src={assetUrl(item.url)} alt={item.title || `Tác phẩm ${index + 1}`} loading="lazy" />
              : null)
            : <span>Chưa có dữ liệu</span>}
        </div>
      ),
    },
    {
      label: 'Gói dịch vụ',
      render: (vendor) =>       (vendor.packages?.length ? vendor.packages.map((item) => item.name || item).join(' · ') : 'Chưa đăng gói'),
    },
    {
      label: 'Danh mục',
      render: (vendor) => vendor.categories?.join(', ') || 'Chưa cập nhật',
    },
  ];

  return (
    <div className="comparison-wrap">
      <table className="comparison-table">
        <thead>
          <tr>
            <th scope="col" className="comparison-label">
              Tiêu chí
            </th>
            {compared.map((vendor) => (
              <th scope="col" key={vendor.id}>
                <div className="compare-vendor">
                  <div className={`vendor-avatar ${vendor.avatarClass || ''}`}>
                    {vendor.initials || vendor.name?.slice(0, 1)}
                  </div>
                  <div className="compare-vendor-name">
                    <span>{vendor.name}</span>
                    {vendor.isPro && <Crown size={13} aria-label="Nhà cung cấp Pro" />}
                    <small>{vendor.location}</small>
                  </div>
                  {onRemove && (
                    <button
                      type="button"
                      className="icon-button compare-remove"
                      aria-label={`Bỏ ${vendor.name} khỏi danh sách so sánh`}
                      onClick={() => onRemove(vendor.id)}
                    >
                      ×
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="comparison-label">
                {row.label}
              </th>
              {compared.map((vendor) => (
                <td key={vendor.id}>{row.render(vendor)}</td>
              ))}
            </tr>
          ))}
          <tr>
            <th scope="row" className="comparison-label">
              Hồ sơ
            </th>
            {compared.map((vendor) => (
              <td key={vendor.id}>
                <a className="profile-link" href={vendor.href || '#vendor'}>
                  Xem hồ sơ <ArrowUpRight size={14} />
                </a>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="comparison-footnote">
        <Check size={15} /> Thông tin được cung cấp bởi nhà cung cấp
      </div>
    </div>
  );
}
