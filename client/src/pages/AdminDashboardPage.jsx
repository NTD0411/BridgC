import { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Coins,
  Cpu,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserCheck,
  Users,
  X,
  CloudSun,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useSessionStore } from '../store/sessionStore.js';
import GoogleMapView from '../components/GoogleMapView.jsx';

export default function AdminDashboardPage() {
  const token = useSessionStore((state) => state.token);
  const user = useSessionStore((state) => state.user);

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Overview metrics & health
  const [metrics, setMetrics] = useState(null);
  const [health, setHealth] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);

  // Users tab
  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [selectedUserForCredits, setSelectedUserForCredits] = useState(null);
  const [creditAmount, setCreditAmount] = useState(100);

  // Vendors tab
  const [vendors, setVendors] = useState([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorVerifiedFilter, setVendorVerifiedFilter] = useState('all');
  const [selectedVendorMap, setSelectedVendorMap] = useState(null);

  // RFPs tab
  const [rfps, setRfps] = useState([]);
  const [rfpStatusFilter, setRfpStatusFilter] = useState('all');
  const [rfpSearch, setRfpSearch] = useState('');

  // Reviews tab
  const [reviews, setReviews] = useState([]);

  // Integrations diagnostic test
  const [testLocation, setTestLocation] = useState('Đà Nẵng');
  const [testWeatherResult, setTestWeatherResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  // Fetch metrics & overview
  const fetchOverview = async () => {
    try {
      const res = await apiRequest('/api/admin/metrics', { token });
      setMetrics(res.data);
    } catch (e) {
      setError(e.message);
    }
  };

  const runDiagnostics = async () => {
    setDiagnosing(true);
    try {
      const res = await apiRequest('/api/admin/system', { token });
      setHealth(res.system);
      setToast('Đã chạy xong kiểm tra chẩn đoán toàn hệ thống!');
    } catch (e) {
      setError(e.message);
    } finally {
      setDiagnosing(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: usersPage,
        limit: 15,
        search: userSearch,
        role: userRoleFilter,
        status: userStatusFilter,
      });
      const res = await apiRequest(`/api/admin/users?${params}`, { token });
      setUsers(res.users || []);
      setUsersTotalPages(res.pagination?.totalPages || 1);
    } catch (e) {
      setError(e.message);
    }
  };

  const fetchVendors = async () => {
    try {
      const params = new URLSearchParams({
        limit: 30,
        search: vendorSearch,
        isVerified: vendorVerifiedFilter,
      });
      const res = await apiRequest(`/api/admin/vendors?${params}`, { token });
      setVendors(res.vendors || []);
    } catch (e) {
      setError(e.message);
    }
  };

  const fetchRfps = async () => {
    try {
      const params = new URLSearchParams({
        limit: 30,
        status: rfpStatusFilter,
        search: rfpSearch,
      });
      const res = await apiRequest(`/api/admin/rfps?${params}`, { token });
      setRfps(res.rfps || []);
    } catch (e) {
      setError(e.message);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await apiRequest('/api/admin/reviews?limit=30', { token });
      setReviews(res.reviews || []);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchOverview().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'vendors') fetchVendors();
    if (activeTab === 'rfps') fetchRfps();
    if (activeTab === 'reviews') fetchReviews();
  }, [activeTab, usersPage, userRoleFilter, userStatusFilter, vendorVerifiedFilter, rfpStatusFilter]);

  // Action handlers
  const handleUpdateUserStatus = async (userId, newStatus) => {
    try {
      await apiRequest(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: newStatus }),
      });
      setToast(`Đã chuyển trạng thái sang ${newStatus}`);
      fetchUsers();
      fetchOverview();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    if (!window.confirm(`Bạn có chắc muốn đổi vai trò người dùng này thành "${newRole}"?`)) return;
    try {
      await apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ role: newRole }),
      });
      setToast(`Đã chuyển vai trò sang ${newRole}`);
      fetchUsers();
      fetchOverview();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleCreditAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedUserForCredits) return;
    try {
      await apiRequest(`/api/admin/users/${selectedUserForCredits._id}/credits`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ amount: Number(creditAmount), mode: 'add' }),
      });
      setToast(`Đã cộng ${creditAmount} B-Credit cho ${selectedUserForCredits.fullName}`);
      setSelectedUserForCredits(null);
      fetchUsers();
      fetchOverview();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleVerifyVendor = async (vendorId, currentVerified) => {
    try {
      await apiRequest(`/api/admin/vendors/${vendorId}/verify`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ isVerified: !currentVerified }),
      });
      setToast(!currentVerified ? 'Đã duyệt huy hiệu Verified!' : 'Đã bỏ duyệt Verified');
      fetchVendors();
      fetchOverview();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleToggleProVendor = async (vendorId, currentPro) => {
    try {
      await apiRequest(`/api/admin/vendors/${vendorId}/verify`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ isPro: !currentPro }),
      });
      setToast(!currentPro ? 'Đã nâng cấp lên Vendor Pro!' : 'Đã hạ cấp khỏi Pro');
      fetchVendors();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleUpdateRfpStatus = async (rfpId, newStatus) => {
    try {
      await apiRequest(`/api/admin/rfps/${rfpId}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: newStatus }),
      });
      setToast(`Đã cập nhật trạng thái RFP thành ${newStatus}`);
      fetchRfps();
      fetchOverview();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleToggleReviewVisibility = async (reviewId, currentVisibility) => {
    try {
      await apiRequest(`/api/admin/reviews/${reviewId}/visibility`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ isPublic: !currentVisibility }),
      });
      setToast(!currentVisibility ? 'Đã bật hiển thị đánh giá' : 'Đã ẩn đánh giá');
      fetchReviews();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Bạn có chắc muốn xóa vĩnh viễn đánh giá này?')) return;
    try {
      await apiRequest(`/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
        token,
      });
      setToast('Đã xóa đánh giá thành công');
      fetchReviews();
      fetchOverview();
    } catch (e) {
      alert(e.message);
    }
  };

  const runIntegrationTest = async () => {
    setTestLoading(true);
    setTestWeatherResult(null);
    try {
      const res = await apiRequest(`/api/weather/current?location=${encodeURIComponent(testLocation)}`);
      setTestWeatherResult(res.data || res);
    } catch (e) {
      setTestWeatherResult({ error: e.message });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Toast Alert */}
      {toast && (
        <div className="admin-toast">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
          <button type="button" onClick={() => setToast('')}><X size={14} /></button>
        </div>
      )}

      {/* Admin Header */}
      <header className="admin-header-row">
        <div>
          <div className="admin-badge">
            <ShieldCheck size={14} /> TRUNG TÂM QUẢN TRỊ VIÊN
          </div>
          <h1>Trung tâm điều hành BridgC</h1>
          <p>Theo dõi hoạt động nền tảng và xử lý tài khoản, hồ sơ Vendor, yêu cầu RFQ, đánh giá cùng trạng thái hệ thống.</p>
        </div>

        <div className="admin-actions">
          <button
            type="button"
            className="button button-outline"
            onClick={runDiagnostics}
            disabled={diagnosing}
          >
            <RefreshCw size={15} className={diagnosing ? 'ai-spin' : ''} />
            {diagnosing ? 'Đang chẩn đoán…' : 'Chẩn đoán kết nối'}
          </button>
        </div>
      </header>

      <div className="admin-workspace">
        <nav className="admin-tabs-nav" aria-label="Khu vực quản trị">
          <div className="admin-nav-group">
            <span className="admin-nav-heading">Điều hành &amp; giám sát</span>
            <button
              type="button"
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => setActiveTab('overview')}
            >
              <Activity size={17} /> <span>Tổng quan Dashboard</span>
            </button>
            <button
              type="button"
              className={activeTab === 'rfps' ? 'active' : ''}
              onClick={() => setActiveTab('rfps')}
            >
              <FileText size={17} /> <span>Giám sát RFQ &amp; sự kiện</span>
              <span className="admin-nav-count">{metrics?.rfps?.total || 0}</span>
            </button>
          </div>
          <div className="admin-nav-group">
            <span className="admin-nav-heading">Quản lý tài khoản</span>
            <button
              type="button"
              className={activeTab === 'users' ? 'active' : ''}
              onClick={() => setActiveTab('users')}
            >
              <Users size={17} /> <span>Khách hàng &amp; tài khoản</span>
              <span className="admin-nav-count">{metrics?.users?.total || 0}</span>
            </button>
            <button
              type="button"
              className={activeTab === 'vendors' ? 'active' : ''}
              onClick={() => setActiveTab('vendors')}
            >
              <BadgeCheck size={17} /> <span>Xác minh Vendor</span>
              <span className="admin-nav-count">{metrics?.vendors?.total || 0}</span>
            </button>
          </div>
          <div className="admin-nav-group">
            <span className="admin-nav-heading">Kiểm duyệt &amp; hệ thống</span>
            <button
              type="button"
              className={activeTab === 'reviews' ? 'active' : ''}
              onClick={() => setActiveTab('reviews')}
            >
              <Star size={17} /> <span>Đánh giá &amp; nội dung</span>
              <span className="admin-nav-count">{metrics?.reviews?.total || 0}</span>
            </button>
            <button
              type="button"
              className={activeTab === 'integrations' ? 'active' : ''}
              onClick={() => setActiveTab('integrations')}
            >
              <Cpu size={17} /> <span>Tích hợp hệ thống</span>
            </button>
          </div>
          <div className="admin-nav-note">
            <ShieldCheck size={16} />
            <span>Quyền truy cập quản trị viên</span>
          </div>
        </nav>

        <main className="admin-main-body">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="admin-tab-content">
            {/* KPI Cards */}
            <div className="admin-kpi-grid">
              <div className="admin-kpi-card">
                <div className="kpi-icon users"><Users size={20} /></div>
                <div className="kpi-info">
                  <span>Tổng người dùng</span>
                  <strong>{metrics?.users?.total || 0}</strong>
                  <small>
                    Khách: {metrics?.users?.byRole?.customer || 0} · Vendor: {metrics?.users?.byRole?.vendor || 0} · Admin: {metrics?.users?.byRole?.admin || 0}
                  </small>
                </div>
              </div>

              <div className="admin-kpi-card">
                <div className="kpi-icon vendors"><BadgeCheck size={20} /></div>
                <div className="kpi-info">
                  <span>Gian hàng Vendor</span>
                  <strong>{metrics?.vendors?.total || 0}</strong>
                  <small>Đã xác thực: {metrics?.vendors?.verified || 0} · Gói Pro: {metrics?.vendors?.pro || 0}</small>
                </div>
              </div>

              <div className="admin-kpi-card">
                <div className="kpi-icon rfps"><FileText size={20} /></div>
                <div className="kpi-info">
                  <span>Dự án RFP</span>
                  <strong>{metrics?.rfps?.total || 0}</strong>
                  <small>Đang mở: {metrics?.rfps?.byStatus?.open || 0} · Đang xử lý: {metrics?.rfps?.byStatus?.processing || 0}</small>
                </div>
              </div>

              <div className="admin-kpi-card">
                <div className="kpi-icon leads"><Layers size={20} /></div>
                <div className="kpi-info">
                  <span>Giao dịch / Leads</span>
                  <strong>{metrics?.leads?.total || 0}</strong>
                  <small>Đang kết nối: {metrics?.leads?.byStatus?.contacted || 0} · Thành công: {metrics?.leads?.byStatus?.won || 0}</small>
                </div>
              </div>

              <div className="admin-kpi-card">
                <div className="kpi-icon reviews"><Star size={20} /></div>
                <div className="kpi-info">
                  <span>Đánh giá dịch vụ</span>
                  <strong>{metrics?.reviews?.total || 0}</strong>
                  <small>Điểm trung bình: {metrics?.reviews?.avgRating || 5.0} / 5.0</small>
                </div>
              </div>

              <div className="admin-kpi-card">
                <div className="kpi-icon credits"><Coins size={20} /></div>
                <div className="kpi-info">
                  <span>B-Credit lưu hành</span>
                  <strong>{new Intl.NumberFormat('vi-VN').format(metrics?.credits?.totalDistributed || 0)}</strong>
                  <small>Dùng cho dịch vụ mở khóa lead & nâng hạng</small>
                </div>
              </div>
            </div>

            {/* System Live Status */}
            <section className="admin-section card-surface">
              <div className="section-header-row">
                <div>
                  <span className="panel-kicker">CHẨN ĐOÁN THỜI GIAN THỰC</span>
                  <h2>Trạng thái các dịch vụ cốt lõi</h2>
                </div>
                <button
                  type="button"
                  className="button button-sm button-ghost"
                  onClick={runDiagnostics}
                  disabled={diagnosing}
                >
                  <RefreshCw size={13} className={diagnosing ? 'ai-spin' : ''} /> Làm mới
                </button>
              </div>

              <div className="admin-health-grid">
                {/* Database */}
                <div className="health-box">
                  <div className="health-head">
                    <span className={`status-dot ${health?.database?.status === 'healthy' ? 'online' : 'offline'}`} />
                    <strong>Cơ sở dữ liệu (MongoDB)</strong>
                  </div>
                  <p>Trạng thái: <span>{health?.database?.status === 'healthy' ? 'Đang hoạt động ổn định' : 'Mất kết nối'}</span></p>
                  <small>Cluster MongoDB Atlas kết nối trực tiếp.</small>
                </div>

                {/* Gemini AI */}
                <div className="health-box">
                  <div className="health-head">
                    <span className={`status-dot ${health?.ai?.status === 'healthy' ? 'online' : 'warning'}`} />
                    <strong>Trợ lý Gemini AI</strong>
                  </div>
                  <p>
                    Trạng thái: <span>{health?.ai?.status === 'healthy' ? `Sẵn sàng (${health.ai.activeModel})` : health?.ai?.note || 'Dự phòng thông minh'}</span>
                  </p>
                  <small>Có cơ chế chuyển đổi dự phòng mô hình và xử lý 429/503 tự động.</small>
                </div>

                {/* Weather API */}
                <div className="health-box">
                  <div className="health-head">
                    <span className={`status-dot ${health?.weather?.status === 'healthy' ? 'online' : 'warning'}`} />
                    <strong>Dịch vụ Thời tiết</strong>
                  </div>
                  <p>Nhà cung cấp: <span>{health?.weather?.provider || 'Đang nạp…'}</span></p>
                  <small>{health?.weather?.sample || 'Hỗ trợ dự báo 14 ngày & cảnh báo thời tiết xấu cho sự kiện.'}</small>
                </div>

                {/* Google Maps */}
                <div className="health-box">
                  <div className="health-head">
                    <span className={`status-dot ${health?.maps?.status === 'healthy' ? 'online' : 'warning'}`} />
                    <strong>Bản đồ Google Maps</strong>
                  </div>
                  <p>Dịch vụ: <span>{health?.maps?.provider || 'Google Maps Embed'}</span></p>
                  <small>Hỗ trợ hiển thị vị trí gian hàng, nhúng bản đồ tương tác & chỉ đường.</small>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: USERS */}
        {activeTab === 'users' && (
          <div className="admin-tab-content">
            <div className="admin-table-toolbar">
              <div className="search-input-shell">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Tìm theo tên, email, số điện thoại..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                />
              </div>

              <div className="filter-group">
                <select
                  value={userRoleFilter}
                  onChange={(e) => { setUserRoleFilter(e.target.value); setUsersPage(1); }}
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="customer">Khách hàng (Customer)</option>
                  <option value="vendor">Nhà cung ứng (Vendor)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => { setUserStatusFilter(e.target.value); setUsersPage(1); }}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động (Active)</option>
                  <option value="suspended">Đã tạm khóa (Suspended)</option>
                  <option value="pending">Chờ kích hoạt (Pending)</option>
                </select>

                <button type="button" className="button button-sm button-dark" onClick={fetchUsers}>
                  Lọc
                </button>
              </div>
            </div>

            <div className="admin-table-container card-surface">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>B-Credit</th>
                    <th>Số điện thoại</th>
                    <th>Ngày tạo</th>
                    <th className="text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div className="user-cell">
                          <span className="user-avatar-small">{u.fullName?.slice(0, 1) || 'U'}</span>
                          <div>
                            <strong>{u.fullName}</strong>
                            <small>{u.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge ${u.role}`}>{u.role}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${u.status}`}>{u.status}</span>
                      </td>
                      <td>
                        <span className="credit-text">
                          <Coins size={13} /> {new Intl.NumberFormat('vi-VN').format(u.creditsBalance || 0)}
                        </span>
                      </td>
                      <td>{u.phone || '—'}</td>
                      <td>{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td className="text-right">
                        <div className="action-button-row">
                          <button
                            type="button"
                            className="btn-action"
                            title="Điều chỉnh B-Credit"
                            onClick={() => setSelectedUserForCredits(u)}
                          >
                            <Coins size={14} />
                          </button>

                          {u.status === 'active' ? (
                            <button
                              type="button"
                              className="btn-action warn"
                              title="Tạm khóa tài khoản"
                              onClick={() => handleUpdateUserStatus(u._id, 'suspended')}
                            >
                              <ShieldAlert size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-action success"
                              title="Kích hoạt lại tài khoản"
                              onClick={() => handleUpdateUserStatus(u._id, 'active')}
                            >
                              <UserCheck size={14} />
                            </button>
                          )}

                          <select
                            className="inline-role-select"
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u._id, e.target.value)}
                            title="Đổi phân quyền vai trò"
                          >
                            <option value="customer">Customer</option>
                            <option value="vendor">Vendor</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-6">Không tìm thấy người dùng phù hợp.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {usersTotalPages > 1 && (
                <div className="admin-pagination">
                  <button
                    type="button"
                    disabled={usersPage <= 1}
                    onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                  >
                    Trang trước
                  </button>
                  <span>Trang {usersPage} / {usersTotalPages}</span>
                  <button
                    type="button"
                    disabled={usersPage >= usersTotalPages}
                    onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
                  >
                    Trang sau
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: VENDORS */}
        {activeTab === 'vendors' && (
          <div className="admin-tab-content">
            <div className="admin-table-toolbar">
              <div className="search-input-shell">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Tìm theo tên gian hàng, ngành dịch vụ, tỉnh thành..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchVendors()}
                />
              </div>

              <div className="filter-group">
                <select
                  value={vendorVerifiedFilter}
                  onChange={(e) => setVendorVerifiedFilter(e.target.value)}
                >
                  <option value="all">Tất cả xác thực</option>
                  <option value="true">Đã xác thực (Verified)</option>
                  <option value="false">Chưa xác thực</option>
                </select>

                <button type="button" className="button button-sm button-dark" onClick={fetchVendors}>
                  Lọc
                </button>
              </div>
            </div>

            <div className="admin-table-container card-surface">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Gian hàng</th>
                    <th>Chủ tài khoản</th>
                    <th>Danh mục</th>
                    <th>Địa điểm</th>
                    <th>Gói dịch vụ</th>
                    <th>Huy hiệu</th>
                    <th className="text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr key={v._id}>
                      <td>
                        <div className="user-cell">
                          <span className="vendor-avatar-mark">v.</span>
                          <div>
                            <strong>{v.storeName}</strong>
                            <small>/{v.slug}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <span>{v.userId?.fullName || '—'}</span>
                          <small className="text-muted block">{v.userId?.email || ''}</small>
                        </div>
                      </td>
                      <td>
                        <div className="tags-cell">
                          {(v.category || []).map((cat) => (
                            <span key={cat} className="mini-tag">{cat}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span>{[v.location?.city, v.location?.province].filter(Boolean).join(', ') || 'Chưa cập nhật'}</span>
                      </td>
                      <td>{(v.packages || []).length} gói</td>
                      <td>
                        <div className="badge-row">
                          {v.isVerified && <span className="verified-pill"><BadgeCheck size={12} /> Verified</span>}
                          {v.isPro && <span className="pro-pill">PRO</span>}
                          {!v.isVerified && !v.isPro && <span className="text-muted">Thường</span>}
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="action-button-row">
                          <button
                            type="button"
                            className={`btn-action ${v.isVerified ? 'active' : ''}`}
                            title={v.isVerified ? 'Hủy huy hiệu Verified' : 'Duyệt xác thực Verified'}
                            onClick={() => handleToggleVerifyVendor(v._id, v.isVerified)}
                          >
                            <BadgeCheck size={14} /> {v.isVerified ? 'Bỏ duyệt' : 'Duyệt'}
                          </button>

                          <button
                            type="button"
                            className={`btn-action ${v.isPro ? 'active' : ''}`}
                            title={v.isPro ? 'Hạ cấp Pro' : 'Nâng cấp Pro'}
                            onClick={() => handleToggleProVendor(v._id, v.isPro)}
                          >
                            PRO
                          </button>

                          <button
                            type="button"
                            className="btn-action"
                            title="Xem vị trí trên Google Maps"
                            onClick={() => setSelectedVendorMap(v)}
                          >
                            <MapPin size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {vendors.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-6">Chưa có gian hàng nào trong database.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Vendor Google Map */}
            {selectedVendorMap && (
              <div className="admin-modal-backdrop" onClick={() => setSelectedVendorMap(null)}>
                <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Vị trí gian hàng: {selectedVendorMap.storeName}</h3>
                    <button type="button" onClick={() => setSelectedVendorMap(null)}><X size={18} /></button>
                  </div>
                  <div className="modal-body">
                    <GoogleMapView
                      location={[selectedVendorMap.location?.city, selectedVendorMap.location?.province].filter(Boolean).join(', ')}
                      address={selectedVendorMap.address}
                      title={`Bản đồ - ${selectedVendorMap.storeName}`}
                      height={320}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: RFPS */}
        {activeTab === 'rfps' && (
          <div className="admin-tab-content">
            <div className="admin-table-toolbar">
              <div className="search-input-shell">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Tìm theo tiêu đề, danh mục yêu cầu..."
                  value={rfpSearch}
                  onChange={(e) => setRfpSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchRfps()}
                />
              </div>

              <div className="filter-group">
                <select
                  value={rfpStatusFilter}
                  onChange={(e) => setRfpStatusFilter(e.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="open">Đang mở (Open)</option>
                  <option value="processing">Đang xử lý (Processing)</option>
                  <option value="completed">Đã hoàn tất (Completed)</option>
                  <option value="cancelled">Đã hủy (Cancelled)</option>
                </select>

                <button type="button" className="button button-sm button-dark" onClick={fetchRfps}>
                  Lọc
                </button>
              </div>
            </div>

            <div className="admin-table-container card-surface">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tiêu đề yêu cầu</th>
                    <th>Khách hàng</th>
                    <th>Danh mục</th>
                    <th>Ngân sách</th>
                    <th>Địa điểm</th>
                    <th>Ngày tổ chức</th>
                    <th>Vendor khớp</th>
                    <th>Trạng thái</th>
                    <th className="text-right">Cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {rfps.map((rfp) => (
                    <tr key={rfp._id}>
                      <td>
                        <strong>{rfp.title}</strong>
                        <small className="text-muted block line-clamp-1">{rfp.description}</small>
                      </td>
                      <td>
                        <div>
                          <span>{rfp.customerId?.fullName || 'Khách hàng'}</span>
                          <small className="text-muted block">{rfp.customerId?.email || ''}</small>
                        </div>
                      </td>
                      <td><span className="mini-tag">{rfp.category}</span></td>
                      <td>
                        {rfp.budgetMin || rfp.budgetMax
                          ? `${new Intl.NumberFormat('vi-VN').format(rfp.budgetMin || 0)} - ${new Intl.NumberFormat('vi-VN').format(rfp.budgetMax || 0)}đ`
                          : 'Thương lượng'}
                      </td>
                      <td>{[rfp.location?.city, rfp.location?.province].filter(Boolean).join(', ') || '—'}</td>
                      <td>{rfp.eventDate ? new Date(rfp.eventDate).toLocaleDateString('vi-VN') : 'Linh hoạt'}</td>
                      <td><strong>{rfp.matchedVendorCount || 0}</strong> đối tác</td>
                      <td>
                        <span className={`status-badge ${rfp.status}`}>{rfp.status}</span>
                      </td>
                      <td className="text-right">
                        <select
                          className="inline-role-select"
                          value={rfp.status}
                          onChange={(e) => handleUpdateRfpStatus(rfp._id, e.target.value)}
                        >
                          <option value="open">open</option>
                          <option value="processing">processing</option>
                          <option value="completed">completed</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {rfps.length === 0 && (
                    <tr>
                      <td colSpan="9" className="text-center py-6">Chưa có dự án RFP nào trong hệ thống.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="admin-tab-content">
            <div className="admin-table-container card-surface">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Gian hàng</th>
                    <th>Đánh giá</th>
                    <th>Nội dung nhận xét</th>
                    <th>Hiển thị</th>
                    <th>Ngày đăng</th>
                    <th className="text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((rev) => (
                    <tr key={rev._id}>
                      <td>
                        <strong>{rev.customerId?.fullName || 'Khách ẩn danh'}</strong>
                        <small className="text-muted block">{rev.customerId?.email}</small>
                      </td>
                      <td>{rev.vendorId?.storeName || 'Vendor'}</td>
                      <td>
                        <span className="review-stars-text">
                          {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)} ({rev.rating}/5)
                        </span>
                      </td>
                      <td>
                        <p className="line-clamp-2">{rev.comment || 'Không để lại lời bình.'}</p>
                      </td>
                      <td>
                        <span className={`status-badge ${rev.isPublic ? 'active' : 'suspended'}`}>
                          {rev.isPublic ? 'Công khai' : 'Đã ẩn'}
                        </span>
                      </td>
                      <td>{new Date(rev.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td className="text-right">
                        <div className="action-button-row">
                          <button
                            type="button"
                            className="btn-action"
                            title={rev.isPublic ? 'Ẩn đánh giá' : 'Hiển thị công khai'}
                            onClick={() => handleToggleReviewVisibility(rev._id, rev.isPublic)}
                          >
                            {rev.isPublic ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            type="button"
                            className="btn-action danger"
                            title="Xóa đánh giá vĩnh viễn"
                            onClick={() => handleDeleteReview(rev._id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reviews.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-6">Chưa có đánh giá nào trong hệ thống.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: INTEGRATIONS */}
        {activeTab === 'integrations' && (
          <div className="admin-tab-content integrations-view">
            <div className="integration-card-grid">
              {/* Gemini AI Card */}
              <div className="integration-service-card">
                <div className="service-card-head">
                  <div className="service-icon ai"><Sparkles size={20} /></div>
                  <div>
                    <h3>Google Gemini AI</h3>
                    <span className="service-provider">Google AI Generative Language API</span>
                  </div>
                  <span className={`service-status-pill ${health?.ai?.status === 'healthy' ? 'online' : 'warning'}`}>
                    {health?.ai?.status === 'healthy' ? 'Sẵn sàng' : 'Dự phòng thông minh'}
                  </span>
                </div>
                <div className="service-details">
                  <p><strong>Model ưu tiên:</strong> <code>gemini-flash-lite-latest</code>, <code>gemini-3.5-flash-lite</code></p>
                  <p><strong>Cơ chế bảo vệ:</strong> Tự động thử model tiếp theo khi gặp HTTP 429 (Resource Exhausted) hoặc 503 (Quá tải). Nếu toàn bộ model hết quota, hệ thống tự động chuyển sang trợ lý AI Rule-based lấy dữ liệu thật từ database.</p>
                  <small>Cấu hình biến môi trường: <code>GEMINI_API_KEY</code> trong <code>server/.env</code></small>
                </div>
              </div>

              {/* Weather API Card */}
              <div className="integration-service-card">
                <div className="service-card-head">
                  <div className="service-icon weather"><CloudSun size={20} /></div>
                  <div>
                    <h3>Dịch vụ Thời tiết (Weather API)</h3>
                    <span className="service-provider">{health?.weather?.provider || 'Open-Meteo & WeatherAPI'}</span>
                  </div>
                  <span className={`service-status-pill ${health?.weather?.status === 'healthy' ? 'online' : 'warning'}`}>
                    Hoạt động
                  </span>
                </div>
                <div className="service-details">
                  <p><strong>Chức năng:</strong> Tự động lấy dự báo thời tiết 14 ngày, nhiệt độ, khả năng mưa, gió, tia UV để đánh giá rủi ro cho sự kiện.</p>
                  <p><strong>Cơ chế dự phòng:</strong> Tự động fallback sang <em>Open-Meteo</em> miễn phí không cần API key nếu thiếu <code>WEATHER_API_KEY</code>. Tuyệt đối không làm crash app!</p>
                  <small>Cấu hình tùy chọn: <code>WEATHER_API_KEY</code> trong <code>server/.env</code></small>
                </div>
              </div>

              {/* Google Maps Card */}
              <div className="integration-service-card">
                <div className="service-card-head">
                  <div className="service-icon maps"><MapPin size={20} /></div>
                  <div>
                    <h3>Google Maps &amp; Geocoding</h3>
                    <span className="service-provider">{health?.maps?.provider || 'Google Maps Embed & Geocoding'}</span>
                  </div>
                  <span className={`service-status-pill ${health?.maps?.status === 'healthy' ? 'online' : 'warning'}`}>
                    Hoạt động
                  </span>
                </div>
                <div className="service-details">
                  <p><strong>Chức năng:</strong> Tọa độ hóa địa chỉ gian hàng/sự kiện, nhúng bản đồ tương tác, nút mở bản đồ Google Maps và dẫn đường (Directions).</p>
                  <p><strong>Cơ chế hiển thị:</strong> Nhúng trực tiếp iframe bản đồ vệ tinh/đường đi Google Maps không bắt buộc API key trả phí. Hỗ trợ <code>GOOGLE_MAPS_API_KEY</code> cho Geocoding nâng cao.</p>
                  <small>Cấu hình tùy chọn: <code>GOOGLE_MAPS_API_KEY</code> trong <code>server/.env</code></small>
                </div>
              </div>
            </div>

            {/* Live Testing Tool */}
            <div className="integration-test-tool card-surface">
              <h3>Kiểm tra thử nghiệm dịch vụ Thời tiết & Bản đồ</h3>
              <p>Nhập tên tỉnh/thành hoặc địa chỉ tại Việt Nam để kiểm tra dữ liệu trả về trực tiếp:</p>
              <div className="test-tool-row">
                <input
                  type="text"
                  value={testLocation}
                  onChange={(e) => setTestLocation(e.target.value)}
                  placeholder="Ví dụ: Đà Nẵng, Hà Nội, Hồ Chí Minh..."
                />
                <button
                  type="button"
                  className="button button-dark"
                  onClick={runIntegrationTest}
                  disabled={testLoading}
                >
                  {testLoading ? 'Đang gọi API…' : 'Thử nghiệm ngay'}
                </button>
              </div>

              {testWeatherResult && (
                <div className="test-result-box">
                  {testWeatherResult.error ? (
                    <div className="text-danger"><AlertCircle size={16} /> Lỗi: {testWeatherResult.error}</div>
                  ) : (
                    <div>
                      <div className="test-weather-info">
                        <strong>{testWeatherResult.city} ({testWeatherResult.region})</strong>
                        <span>Nhiệt độ: {testWeatherResult.temp_c}°C (Cảm giác: {testWeatherResult.feelslike_c}°C)</span>
                        <span>Thời tiết: {testWeatherResult.condition}</span>
                        <span>Độ ẩm: {testWeatherResult.humidity}% · Gió: {testWeatherResult.wind_kph} km/h</span>
                        <span>Nguồn: <strong>{testWeatherResult.provider}</strong></span>
                      </div>
                      <div className="mt-4">
                        <GoogleMapView location={testLocation} height={200} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        </main>
      </div>

      {/* Credit Modal */}
      {selectedUserForCredits && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedUserForCredits(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cộng B-Credit cho người dùng</h3>
              <button type="button" onClick={() => setSelectedUserForCredits(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreditAdjustment} className="modal-body">
              <p>Tài khoản: <strong>{selectedUserForCredits.fullName}</strong> ({selectedUserForCredits.email})</p>
              <p>Số dư hiện tại: <strong>{selectedUserForCredits.creditsBalance || 0} B-Credit</strong></p>
              <label className="field mt-3">
                <span>Số lượng B-Credit muốn cộng thêm:</span>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  required
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="button button-outline" onClick={() => setSelectedUserForCredits(null)}>
                  Hủy
                </button>
                <button type="submit" className="button button-dark">
                  Xác nhận cộng điểm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
