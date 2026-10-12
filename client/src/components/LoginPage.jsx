import { useState } from 'react';
import { ArrowRight, Building2, Check, Eye, EyeOff, Fingerprint, LockKeyhole, ShieldCheck, Store, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';

export default function LoginPage({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    setSubmitting(true);
    try {
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      if (result.user.role !== selectedRole && result.user.role !== 'admin') {
        setError(selectedRole === 'vendor'
          ? 'Tài khoản này chưa được đăng ký với vai trò nhà cung ứng.'
          : 'Tài khoản này chưa được đăng ký với vai trò khách hàng doanh nghiệp.');
        return;
      }
      onLogin(result.token);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function showUnavailable(provider) {
    setError(`${provider} SSO chưa được cấu hình cho workspace này. Vui lòng đăng nhập bằng email.`);
  }

  return (
    <main className="enterprise-login">
      <section className="login-enterprise-story">
        <header className="login-enterprise-header">
          <Link className="enterprise-brand" to="/">
            <span><Fingerprint size={23} /></span>
            <span><strong>BridgC</strong><small>ENTERPRISE EVENT PROCUREMENT</small></span>
          </Link>
          <span className="ekyc-status"><i /> e-KYC 2.0 Sẵn sàng</span>
        </header>

        <div className="enterprise-message">
          <span className="enterprise-trust-label"><ShieldCheck size={15} /> HỆ THỐNG BẢO CHỨNG ĐỘC QUYỀN</span>
          <h1>Khai phá chuỗi thầu sự kiện <em>chuẩn hóa 100%</em></h1>
          <p>Hạ tầng số kết nối doanh nghiệp và nhóm nhà cung ứng sự kiện tinh hoa. Minh bạch chi phí, hợp đồng số và giải ngân theo từng mốc nghiệm thu.</p>
        </div>

        <article className="enterprise-proof-card">
          <div className="proof-card-top"><span className="proof-photo" /><span className="proof-copy"><small>VENDOR ĐƯỢC THẨM ĐỊNH</small><strong>Danang Media Art Pro</strong><span><ShieldCheck size={13} /> VERIFIED · Đà Nẵng</span></span><span className="proof-seal"><Check size={16} /></span></div>
          <div className="proof-card-bottom"><span><strong>1.240+</strong><small>nhà cung ứng</small></span><span><strong>98%</strong><small>hồ sơ xác thực</small></span><span><strong>4.9/5</strong><small>điểm hài lòng</small></span></div>
        </article>

        <div className="enterprise-assurance"><LockKeyhole size={15} /><span>Dữ liệu doanh nghiệp được mã hóa và bảo vệ theo tiêu chuẩn bảo mật.</span></div>
        <span className="enterprise-copyright">© 2026 BRIDGC · EVENT PROCUREMENT INFRASTRUCTURE</span>
      </section>

      <section className="enterprise-login-panel">
        <div className="enterprise-login-wrap">
          <Link className="mobile-enterprise-brand" to="/"><span><Fingerprint size={20} /></span><strong>BridgC</strong></Link>
          <span className="enterprise-kicker">WORKSPACE ACCESS · B2B PROCUREMENT</span>
          <h2>Cổng Đăng nhập Doanh nghiệp</h2>
          <p className="enterprise-login-intro">Truy cập không gian đấu thầu và quản lý sự kiện an toàn.</p>

          <div className="enterprise-role-switch" aria-label="Chọn loại tài khoản">
            <button type="button" className={selectedRole === 'customer' ? 'active' : ''} onClick={() => { setSelectedRole('customer'); setError(''); }}><Building2 size={16} /> Doanh nghiệp <small>SME / Buyer</small></button>
            <button type="button" className={selectedRole === 'vendor' ? 'active' : ''} onClick={() => { setSelectedRole('vendor'); setError(''); }}><Store size={16} /> Nhà cung ứng <small>Vendor e-KYC</small></button>
          </div>

          <div className="sso-options">
            <button type="button" onClick={() => showUnavailable('Google Workspace')}><span className="sso-google">G</span> Google Workspace</button>
            <button type="button" onClick={() => showUnavailable('Microsoft 365')}><span className="sso-microsoft"><i /><i /><i /><i /></span> Microsoft 365 SSO</button>
          </div>
          <div className="sso-divider"><span>hoặc dùng email doanh nghiệp</span></div>

          <form className="enterprise-login-form" onSubmit={handleSubmit}>
            <label className="enterprise-field"><span>Email doanh nghiệp</span><input name="email" type="email" required autoComplete="username" placeholder="ten@congty.com" /></label>
            <label className="enterprise-field"><span>Mật khẩu</span><span className="enterprise-password"><input name="password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" placeholder="Nhập mật khẩu của bạn" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
            <div className="enterprise-login-options"><label><input type="checkbox" /> Duy trì đăng nhập</label><a href="mailto:support@bridgc.vn?subject=Kh%C3%B4i%20ph%E1%BB%A5c%20m%E1%BA%ADt%20kh%E1%BA%A9u">Quên mật khẩu?</a></div>
            <button type="submit" className="enterprise-submit" disabled={submitting}>{submitting ? 'Đang xác thực...' : selectedRole === 'vendor' ? 'Vào Vendor Hub' : 'Vào Không Gian Mua Sắm B2B'} <ArrowRight size={17} /></button>
            {error && <p className="enterprise-error" role="alert"><X size={15} /> {error}</p>}
          </form>

          <div className="enterprise-register-callout"><div className="register-icon"><Store size={17} /></div><div><strong>Nhà cung ứng mới?</strong><p>Xác thực năng lực để tham gia mạng lưới vendor BridgC.</p></div><Link to="/vendor" aria-label="Tìm hiểu dành cho vendor"><ArrowRight size={16} /></Link></div>
          <div className="enterprise-legal">Bằng việc tiếp tục, bạn đồng ý với <a href="#terms">Điều khoản sử dụng</a> và <a href="#privacy">Chính sách bảo mật</a>.</div>
        </div>
      </section>
    </main>
  );
}
