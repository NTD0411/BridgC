import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, Fingerprint, LockKeyhole, ShieldCheck, Store, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';

let googleIdentityPromise;

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (!googleIdentityPromise) {
    googleIdentityPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => {
        googleIdentityPromise = null;
        reject(new Error('Không tải được dịch vụ đăng nhập Google. Vui lòng thử lại.'));
      };
      document.head.appendChild(script);
    });
  }
  return googleIdentityPromise;
}

function roleMismatchMessage(role) {
  return role === 'vendor'
    ? 'Tài khoản này chưa được đăng ký với vai trò nhà cung ứng.'
    : 'Tài khoản này chưa được đăng ký với vai trò khách hàng doanh nghiệp.';
}

export default function LoginPage({ role, onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const navigate = useNavigate();
  const location = useLocation();
  const redirectAfterLogin = () => {
    const requestedPath = location.state?.from?.pathname;
    const requestedSearch = location.state?.from?.search || '';
    const allowedCustomerPath = requestedPath === '/quotes' || requestedPath === '/rfp/new';
    const allowedVendorPath = requestedPath === '/vendor' || requestedPath?.startsWith('/vendor/');
    const allowedChatPath = requestedPath === '/messages';
    const destination = role === 'vendor'
      ? allowedVendorPath ? requestedPath : allowedChatPath ? '/messages' : '/vendor'
      : allowedCustomerPath ? `${requestedPath}${requestedSearch}` : allowedChatPath ? `/messages${requestedSearch}` : '/';
    navigate(destination, { replace: true });
  };

  const handleGoogleCredential = useCallback(async ({ credential }) => {
    if (!credential) {
      setError('Google không trả về thông tin xác thực. Vui lòng thử lại.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const result = await apiRequest('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential, role }),
      });
      if (result.user.role !== role && result.user.role !== 'admin') {
        setError(roleMismatchMessage(role));
        return;
      }
      onLogin(result.token, result.user);
      redirectAfterLogin();
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }, [onLogin, role, navigate, location.state]);

  useEffect(() => {
    if (!googleClientId) return undefined;
    let disposed = false;
    loadGoogleIdentity()
      .then((google) => {
        if (disposed || !googleButtonRef.current) return;
        googleButtonRef.current.innerHTML = '';
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential,
        });
        google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          width: 180,
        });
      })
      .catch((loadError) => {
        if (!disposed) setError(loadError.message);
      });
    return () => {
      disposed = true;
      if (googleButtonRef.current) googleButtonRef.current.innerHTML = '';
    };
  }, [googleClientId, handleGoogleCredential]);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    setSubmitting(true);
    try {
      const result = await apiRequest(isRegistering ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
          ...(isRegistering ? { fullName: form.get('fullName'), role } : {}),
        }),
      });
      if (result.user.role !== role && result.user.role !== 'admin') {
        setError(roleMismatchMessage(role));
        return;
      }
      onLogin(result.token, result.user);
      redirectAfterLogin();
    } catch (authError) {
      setError(authError.message);
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
          <span className="ekyc-status">B2B WORKSPACE</span>
        </header>

        <div className="enterprise-message">
          <span className="enterprise-trust-label"><ShieldCheck size={15} /> HỆ THỐNG BẢO CHỨNG ĐỘC QUYỀN</span>
          <h1>Khai phá chuỗi thầu sự kiện <em>chuẩn hóa 100%</em></h1>
          <p>Hạ tầng số kết nối doanh nghiệp và nhóm nhà cung ứng sự kiện tinh hoa. Minh bạch chi phí, hợp đồng số và giải ngân theo từng mốc nghiệm thu.</p>
        </div>

        <article className="enterprise-proof-card">
          <div className="proof-card-top"><span className="proof-photo" /><span className="proof-copy"><small>BRIDGC WORKSPACE</small><strong>Không gian kết nối doanh nghiệp</strong><span><ShieldCheck size={13} /> Hồ sơ và dữ liệu tài khoản</span></span><span className="proof-seal"><Check size={16} /></span></div>
        </article>

        <div className="enterprise-assurance"><LockKeyhole size={15} /><span>Dữ liệu doanh nghiệp được mã hóa và bảo vệ theo tiêu chuẩn bảo mật.</span></div>
        <span className="enterprise-copyright">© 2026 BRIDGC · EVENT PROCUREMENT INFRASTRUCTURE</span>
      </section>

      <section className="enterprise-login-panel">
        <div className="enterprise-login-wrap">
          <Link className="mobile-enterprise-brand" to="/"><span><Fingerprint size={20} /></span><strong>BridgC</strong></Link>
          <span className="enterprise-kicker">WORKSPACE ACCESS · B2B PROCUREMENT</span>
          <h2>{isRegistering ? `Đăng ký ${role === 'vendor' ? 'nhà cung ứng' : 'khách hàng'}` : role === 'vendor' ? 'Cổng đăng nhập Vendor' : 'Cổng đăng nhập khách hàng'}</h2>
          <p className="enterprise-login-intro">
            {isRegistering
              ? role === 'vendor' ? 'Tạo tài khoản riêng để quản lý gian hàng và cơ hội kinh doanh.' : 'Tạo tài khoản để tìm kiếm, so sánh và đặt dịch vụ sự kiện.'
              : role === 'vendor' ? 'Truy cập Vendor Hub để quản lý gian hàng và khách hàng.' : 'Truy cập không gian tìm kiếm và quản lý dịch vụ sự kiện.'}
          </p>

          <div className="sso-options">
            {googleClientId ? (
              <div className="google-login-button" ref={googleButtonRef} aria-label="Tiếp tục với Google" />
            ) : (
              <button type="button" className="google-login-unconfigured" onClick={() => setError('Đăng nhập Google chưa được cấu hình. Vui lòng liên hệ quản trị viên.')}>
                <span className="sso-google">G</span> Google
              </button>
            )}
            <button type="button" onClick={() => showUnavailable('Microsoft 365')}><span className="sso-microsoft"><i /><i /><i /><i /></span> Microsoft 365 SSO</button>
          </div>
          <div className="sso-divider"><span>hoặc dùng email doanh nghiệp</span></div>

          <form className="enterprise-login-form" onSubmit={handleSubmit}>
            {isRegistering && (
              <label className="enterprise-field">
                <span>Họ và tên</span>
                <input name="fullName" type="text" required maxLength={120} autoComplete="name" placeholder="Nguyễn Văn An" />
              </label>
            )}
            <label className="enterprise-field"><span>Email doanh nghiệp</span><input name="email" type="email" required autoComplete="email" placeholder="ten@congty.com" /></label>
            <label className="enterprise-field"><span>Mật khẩu</span><span className="enterprise-password"><input name="password" type={showPassword ? 'text' : 'password'} required minLength={isRegistering ? 8 : undefined} maxLength={72} autoComplete={isRegistering ? 'new-password' : 'current-password'} placeholder={isRegistering ? 'Tối thiểu 8 ký tự' : 'Nhập mật khẩu của bạn'} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
            {!isRegistering && (
              <div className="enterprise-login-options"><label><input type="checkbox" /> Duy trì đăng nhập</label><a href="mailto:support@bridgc.vn?subject=Kh%C3%B4i%20ph%E1%BB%A5c%20m%E1%BA%ADt%20kh%E1%BA%A9u">Quên mật khẩu?</a></div>
            )}
            <button type="submit" className="enterprise-submit" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : isRegistering ? 'Tạo tài khoản' : role === 'vendor' ? 'Vào Vendor Hub' : 'Vào Không Gian Mua Sắm B2B'}
              <ArrowRight size={17} />
            </button>
            {error && <p className="enterprise-error" role="alert"><X size={15} /> {error}</p>}
          </form>

          <div className="enterprise-register-callout">
            <div className="register-icon"><Store size={17} /></div>
            <div>
              <strong>{isRegistering ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}</strong>
              <p>{isRegistering ? 'Quay lại đăng nhập BridgC.' : 'Đăng ký tài khoản riêng cho cổng này.'}</p>
            </div>
            <button type="button" onClick={() => { setIsRegistering((value) => !value); setError(''); }} aria-label={isRegistering ? 'Quay lại đăng nhập' : 'Tạo tài khoản'}>
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="enterprise-switch-role">
            {role === 'vendor' ? 'Bạn là khách hàng?' : 'Bạn là nhà cung ứng?'}
            {' '}
            <Link to={role === 'vendor' ? '/login' : '/vendor/login'}>{role === 'vendor' ? 'Đăng nhập khách hàng' : 'Vào cổng Vendor'}</Link>
          </div>
          <div className="enterprise-legal">Bằng việc tiếp tục, bạn đồng ý với <a href="#terms">Điều khoản sử dụng</a> và <a href="#privacy">Chính sách bảo mật</a>.</div>
        </div>
      </section>
    </main>
  );
}
