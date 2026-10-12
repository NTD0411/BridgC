import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  CircleHelp,
  FilePlus2,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Search,
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/sessionStore.js';

const customerLinks = [
  { to: '/', label: 'Khám phá Vendor' },
  { to: '/vendors/danang-media', label: 'Hồ sơ Vendor' },
  { to: '/quotes', label: 'So sánh dịch vụ' },
  { to: '/rfp/new', label: 'Đăng dự án RFP' },
];

const vendorLinks = [
  { to: '/vendor', label: 'Tổng quan & Mini CRM', icon: LayoutDashboard },
  { to: '/vendor#storefront', label: 'Gian hàng Storefront', icon: BriefcaseBusiness },
  { to: '/vendor#rfp', label: 'Chợ Dự án RFP', icon: FilePlus2 },
  { to: '/vendor#insights', label: 'Thống kê & Insight', icon: Search },
];

export default function MarketplaceLayout({ children, mode = 'customer' }) {
  const token = useSessionStore((state) => state.token);
  const setToken = useSessionStore((state) => state.setToken);
  const navigate = useNavigate();
  const location = useLocation();
  const isVendor = mode === 'vendor';
  const links = isVendor ? vendorLinks : customerLinks;

  return (
    <div className={`marketplace-shell ${isVendor ? 'vendor-shell' : ''}`}>
      <header className="market-header">
        <div className="market-header-main">
          <Link className="market-brand" to="/" aria-label="BridgC trang chủ">
            <span className="market-brand-mark">b.</span>
            <span className="market-brand-copy"><strong>Bridg<span>C</span></strong><small>{isVendor ? 'BUSINESS PORTAL' : 'EVENT MARKETPLACE'}</small></span>
          </Link>
          <div className="portal-switch" aria-label="Chế độ nền tảng">
            <Link to="/" className={!isVendor ? 'selected' : ''}>Khách hàng</Link>
            <Link to="/vendor" className={isVendor ? 'selected' : ''}>Dành cho Vendor</Link>
          </div>
          <nav className="market-nav" aria-label="Điều hướng chính">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/' || to === '/vendor'}
                className={({ isActive }) => {
                  const hash = to.includes('#') ? to.slice(to.indexOf('#') + 1) : '';
                  const sectionActive = hash && location.pathname === '/vendor' && location.hash === `#${hash}`;
                  return isActive && !to.includes('#') || sectionActive ? 'active' : '';
                }}
              >
                {Icon && <Icon size={15} />}
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="market-header-actions">
            {!isVendor && (
              <Link className="header-create" to="/rfp/new">
                <FilePlus2 size={16} /> <span>Tạo yêu cầu mới</span>
              </Link>
            )}
            {isVendor && <span className="credit-pill">◉ 1,250 <small>B-Credit</small></span>}
            <button className="header-icon" type="button" aria-label="Thông báo"><Bell size={18} /><i /></button>
            <button className="header-icon" type="button" aria-label="Tin nhắn"><MessageCircle size={18} /></button>
            {token ? (
              <div className="account-menu">
                <span className="account-avatar">{isVendor ? 'DM' : 'AN'}</span>
                <span className="account-copy"><strong>{isVendor ? 'Danang Media' : 'Anh Nguyễn'}</strong><small>{isVendor ? 'Vendor Pro' : 'Khách hàng'}</small></span>
                <ChevronDown size={14} />
                <button type="button" className="account-logout" onClick={() => { setToken(null); navigate('/'); }} aria-label="Đăng xuất">
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <Link className="header-login" to="/login">Đăng nhập <ArrowRight size={14} /></Link>
            )}
          </div>
        </div>
        {!isVendor && (
          <nav className="category-bar" aria-label="Danh mục dịch vụ">
            <span>Khám phá:</span>
            <Link to="/?category=audio">Âm thanh & Ánh sáng</Link>
            <Link to="/?category=stage">Sân khấu & LED</Link>
            <Link to="/?category=venue">Địa điểm Luxury</Link>
            <Link to="/?category=catering">Tiệc & Catering</Link>
            <Link to="/?category=video">Quay phim & Flycam</Link>
            <span className="category-note"><HeartHandshake size={14} /> Nhà cung cấp đã xác thực</span>
          </nav>
        )}
      </header>
      <main className={`market-page ${isVendor ? 'market-page-vendor' : ''}`}>{children}</main>
      <footer className="market-footer">
        <Link className="footer-brand" to="/">BridgC</Link>
        <span>Kết nối sự kiện bằng niềm tin và minh bạch.</span>
        <nav aria-label="Liên kết footer">
          <a href="#terms">Điều khoản</a><a href="#privacy">Bảo mật</a><a href="mailto:hello@bridgc.vn"><CircleHelp size={14} /> Trợ giúp</a>
        </nav>
      </footer>
    </div>
  );
}
