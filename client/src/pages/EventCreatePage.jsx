import { ArrowLeft, BadgeCheck, CalendarDays, Check, Clock3, Gift, MapPin, ShieldCheck, UsersRound } from 'lucide-react';
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
          <section className="event-side-card"><span className="market-kicker">MẸO TỪ BRIDGC</span><h3>Brief tốt nhận đề xuất tốt</h3><p>Hồ sơ có ngày diễn ra, ngân sách và mô tả chi tiết thường nhận được phản hồi nhanh hơn.</p><div className="brief-progress"><span style={{ width: '68%' }} /></div><small>Hoàn thiện project brief để tăng độ phù hợp</small></section>
          <section className="event-escrow-card"><span><Gift size={16} /> BRIDGC ESCROW</span><h3>Yên tâm từ bước đầu</h3><p>Thanh toán theo mốc nghiệm thu, chỉ giải ngân khi bạn xác nhận.</p><div><CalendarDays size={14} /> Kiểm soát tiến độ &amp; ngân sách</div><div><UsersRound size={14} /> Vendor đã qua xác thực</div><div><Clock3 size={14} /> Mọi trao đổi được lưu lại</div><Link to="/quotes">Tìm hiểu bảo chứng <MapPin size={13} /></Link></section>
        </aside>
      </div>
    </div>
  );
}
