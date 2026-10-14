import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  CircleHelp,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { assetUrl } from '../lib/api.js';
import { useSessionStore } from '../store/sessionStore.js';

const customerLinks = [
  { to: '/', label: 'Khám phá Vendor' },
  { to: '/quotes', label: 'So sánh dịch vụ' },
  { to: '/rfp/new', label: 'Đăng dự án RFP' },
  { to: '/ai/customer', label: 'AI hỗ trợ' },
];

const vendorLinks = [
  { to: '/vendor', label: 'Tổng quan & Mini CRM', icon: LayoutDashboard },
  { to: '/vendor#storefront', label: 'Gian hàng Storefront', icon: BriefcaseBusiness },
  { to: '/vendor#rfp', label: 'Chợ Dự án RFP', icon: FilePlus2 },
  { to: '/vendor#insights', label: 'Thống kê & Insight', icon: Search },
  { to: '/ai/vendor', label: 'AI Vendor' },
];

const adminLinks = [
  { to: '/admin', label: 'Bảng Quản trị', icon: ShieldCheck },
  { to: '/', label: 'Sàn dịch vụ' },
  { to: '/rfp/new', label: 'Đăng dự án' },
  { to: '/ai/customer', label: 'AI hỗ trợ' },
];

export default function MarketplaceLayout({ children, mode = 'customer' }) {
  const token = useSessionStore((state) => state.token);
  const user = useSessionStore((state) => state.user);
  const logout = useSessionStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'admin' || mode === 'admin';
  const isVendor = !isAdmin && mode === 'vendor';
  const links = isAdmin ? adminLinks : isVendor ? vendorLinks : customerLinks;
  const accountName = user?.fullName || user?.email || 'Tài khoản';
  const accountInitials = accountName
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toLocaleUpperCase())
    .join('');
  const accountRole = user?.role === 'admin'
    ? 'Quản trị viên'
    : user?.role === 'vendor' ? 'Nhà cung ứng' : 'Khách hàng';

  return (
    <div className={`marketplace-shell ${isVendor ? 'vendor-shell' : ''} ${isAdmin ? 'admin-shell' : ''}`}>
      <header className="market-header">
        <div className="market-header-main">
          <Link className="market-brand" to={isAdmin ? '/admin' : '/'} aria-label="BridgC trang chủ">
            <span className="market-brand-mark">b.</span>
            <span className="market-brand-copy">
              <strong>Bridg<span>C</span></strong>
              <small>{isAdmin ? 'ADMIN CONTROL CENTER' : isVendor ? 'BUSINESS PORTAL' : 'EVENT MARKETPLACE'}</small>
            </span>
          </Link>
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
            {!isVendor && !isAdmin && (
              <Link className="header-create" to="/rfp/new">
                <FilePlus2 size={16} /> <span>Tạo yêu cầu mới</span>
              </Link>
            )}
            {isAdmin && (
              <Link className="header-create admin-cta-pill" to="/admin">
                <ShieldCheck size={16} /> <span>Quản trị hệ thống</span>
              </Link>
            )}
            {isVendor && <span className="credit-pill">◉ {new Intl.NumberFormat('vi-VN').format(user?.creditsBalance ?? 0)} <small>B-Credit</small></span>}
            <button className="header-icon" type="button" aria-label="Thông báo"><Bell size={18} /><i /></button>
            <Link className="header-icon" to={token ? '/messages' : isVendor ? '/vendor/login' : '/login'} aria-label="Tin nhắn" title="Tin nhắn"><MessageCircle size={18} /></Link>
            {token ? (
              <div className="account-menu">
                <Link className="account-profile-link" to="/profile" title="Thông tin cá nhân">
                  <span className="account-avatar">{user?.avatar
                    ? <img src={assetUrl(user.avatar)} alt="" />
                    : accountInitials}</span>
                  <span className="account-copy"><strong>{accountName}</strong><small>{user?.email || accountRole}</small></span>
                </Link>
                <ChevronDown size={14} />
                <button type="button" className="account-logout" onClick={() => { logout(); navigate(isVendor ? '/vendor/login' : '/login', { replace: true }); }} aria-label="Đăng xuất" title="Đăng xuất">
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <Link className="header-login" to={isVendor ? '/vendor/login' : '/login'}>Đăng nhập <ArrowRight size={14} /></Link>
            )}
          </div>
        </div>
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
