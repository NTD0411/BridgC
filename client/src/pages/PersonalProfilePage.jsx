import { useEffect, useState } from 'react';
import { Camera, Save, UserRound } from 'lucide-react';
import { assetUrl, apiRequest } from '../lib/api.js';
import { useSessionStore } from '../store/sessionStore.js';

export default function PersonalProfilePage() {
  const token = useSessionStore((state) => state.token);
  const user = useSessionStore((state) => state.user);
  const setSession = useSessionStore((state) => state.setSession);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiRequest('/api/users/me', { token })
      .then(({ user: currentUser }) => {
        if (cancelled) return;
        setFullName(currentUser.fullName || '');
        setPhone(currentUser.phone || '');
        setAvatar(currentUser.avatar || '');
        setSession(token, currentUser);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token, setSession]);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await apiRequest('/api/users/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ fullName, phone }),
      });
      setFullName(result.user.fullName);
      setPhone(result.user.phone || '');
      setAvatar(result.user.avatar || '');
      setSession(token, result.user);
      setNotice('Đã cập nhật thông tin cá nhân.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn tệp hình ảnh.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh đại diện không được lớn hơn 5 MB.');
      return;
    }
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await apiRequest('/api/uploads/avatar', {
        method: 'POST',
        token,
        body,
      });
      setAvatar(result.user.avatar || '');
      setSession(token, result.user);
      setNotice('Đã cập nhật ảnh đại diện.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="personal-profile-page">
      <header className="personal-profile-heading">
        <span className="market-kicker">TÀI KHOẢN BRIDGC</span>
        <h1>Thông tin cá nhân</h1>
        <p>Cập nhật thông tin liên hệ và ảnh đại diện của bạn.</p>
      </header>
      <form className="personal-profile-card card-surface" onSubmit={saveProfile}>
        <div className="personal-profile-avatar">
          {avatar
            ? <img src={assetUrl(avatar)} alt="Ảnh đại diện" />
            : <UserRound size={34} />}
          <label className="personal-profile-avatar-upload" title="Đổi ảnh đại diện" aria-label="Đổi ảnh đại diện">
            <Camera size={15} />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={uploading || loading}
              onChange={(event) => {
                const [file] = event.target.files || [];
                void uploadAvatar(file);
                event.target.value = '';
              }}
            />
          </label>
        </div>
        {uploading && <p className="personal-profile-muted">Đang tải ảnh đại diện…</p>}
        <div className="personal-profile-fields">
          <label>
            Họ và tên
            <input
              type="text"
              autoComplete="name"
              maxLength={120}
              required
              value={fullName}
              disabled={loading || saving}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>
          <label>
            Email
            <input type="email" value={user?.email || ''} readOnly />
            <small>Email đăng nhập hiện chưa thể thay đổi.</small>
          </label>
          <label>
            Số điện thoại
            <input
              type="tel"
              autoComplete="tel"
              maxLength={30}
              value={phone}
              disabled={loading || saving}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="personal-profile-notice" role="status">{notice}</p>}
        <button className="personal-profile-save" type="submit" disabled={loading || saving || uploading}>
          <Save size={16} /> {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </form>
    </section>
  );
}
