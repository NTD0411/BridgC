import { ArrowLeft, BadgeCheck, Check, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import DynamicRfpForm from '../components/DynamicRfpForm.jsx';

export default function EventCreatePage() {
  return (
    <div className="event-create-page">
      <div className="event-step-line"><Link to="/"><ArrowLeft size={14} /> Quay lại</Link><span className="step-current">01 <i /> Thông tin sự kiện</span><span>02 <i /> Vendor &amp; Ngân sách</span><span>03 <i /> Xem trước &amp; Đăng</span><span className="step-save">Được lưu tự động</span></div>
      <div className="event-create-layout">
        <div className="event-create-main">
          <div className="event-title"><span className="market-kicker">PROJECT BRIEF · BƯỚC 1 / 3</span><h1>Tạo yêu cầu sự kiện mới</h1><p>Mô tả nhu cầu của bạn để kết nối với nhà cung cấp phù hợp.</p></div>
          <div className="event-create-form"><DynamicRfpForm /></div>
          <div className="event-assurance"><ShieldCheck size={18} /><span><strong>Đăng yêu cầu hoàn toàn miễn phí</strong><small>Thông tin chỉ được chia sẻ với nhà cung cấp đã xác thực và phù hợp.</small></span><BadgeCheck size={20} /></div>
        </div>
        <aside className="event-create-aside">
          <section className="event-side-card event-checklist"><span className="market-kicker">PROJECT BRIEF</span><h2>Thông tin sự kiện mục tiêu</h2><p>Điền rõ thông tin để nhận đề xuất phù hợp hơn.</p><ul><li><Check size={15} /> Chọn đúng ngành dịch vụ</li><li><Check size={15} /> Nêu rõ phạm vi công việc</li><li><Check size={15} /> Thêm địa điểm &amp; thời gian</li><li><Check size={15} /> Ngân sách dự kiến</li></ul><div className="brief-seal"><ShieldCheck size={17} /> Dữ liệu được bảo mật</div></section>
          <section className="event-side-card event-guide-card"><span className="market-kicker">HƯỚNG DẪN</span><h3>Hoàn thiện yêu cầu</h3><p>Thông tin chi tiết giúp nhà cung cấp hiểu đúng nhu cầu sự kiện của bạn.</p><ul><li><Check size={15} /> Nêu phạm vi công việc</li><li><Check size={15} /> Cung cấp địa điểm và thời gian</li><li><Check size={15} /> Thêm ngân sách dự kiến</li></ul></section>
        </aside>
      </div>
    </div>
  );
}
