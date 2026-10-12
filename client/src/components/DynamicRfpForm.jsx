import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Paperclip } from 'lucide-react';
import { apiRequest } from '../lib/api.js';

const categoryFields = {
  'Quay phim': [
    { name: 'cameraCount', label: 'Số lượng máy quay', type: 'number', min: 1, placeholder: 'Ví dụ: 2' },
    { name: 'needFlycam', label: 'Có cần quay flycam không?', type: 'checkbox' },
    { name: 'durationMinutes', label: 'Thời lượng quay (phút)', type: 'number', min: 1, placeholder: 'Ví dụ: 240' },
  ],
  'Ban nhạc': [
    { name: 'genre', label: 'Dòng nhạc', type: 'text', placeholder: 'Ví dụ: Acoustic, Pop' },
    { name: 'memberCount', label: 'Số thành viên', type: 'number', min: 1, placeholder: 'Ví dụ: 5' },
    { name: 'performanceTime', label: 'Thời lượng biểu diễn', type: 'text', placeholder: 'Ví dụ: 2 set × 45 phút' },
  ],
  'Địa điểm': [
    { name: 'guestCount', label: 'Số lượng khách', type: 'number', min: 1, placeholder: 'Ví dụ: 150' },
    { name: 'indoorOutdoor', label: 'Không gian', type: 'select', options: ['Trong nhà', 'Ngoài trời', 'Linh hoạt'] },
  ],
};

export default function DynamicRfpForm({ token = localStorage.getItem('bridgc_token'), onSubmitted }) {
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiRequest('/api/vendors?limit=50')
      .then((result) => {
        if (cancelled) return;
        const names = (result.categories || []).map(({ name }) => name);
        setCategories(names);
        setCategory((current) => current || names[0] || '');
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      });
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const dynamicFields = {};

    for (const field of categoryFields[category] || []) {
      if (field.type === 'checkbox') dynamicFields[field.name] = form.get(field.name) === 'on';
      else if (field.type === 'number') dynamicFields[field.name] = Number(form.get(field.name) || 0);
      else dynamicFields[field.name] = String(form.get(field.name) || '');
    }

    const payload = {
      category,
      title: form.get('title'),
      description: form.get('description'),
      location: { province: form.get('province'), city: form.get('city') || '' },
      budgetMin: form.get('budgetMin') === '' ? null : Number(form.get('budgetMin')),
      budgetMax: form.get('budgetMax') === '' ? null : Number(form.get('budgetMax')),
      eventDate: form.get('eventDate') || null,
      deadline: form.get('deadline') || null,
      tags: String(form.get('tags') || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      dynamicFields,
    };

    setSubmitting(true);
    try {
      const result = await apiRequest('/api/rfps', {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
      });
      setMessage(`Đã gửi yêu cầu. Tìm thấy ${result.matchedVendorCount} nhà cung cấp phù hợp.`);
      onSubmitted?.(result);
      formElement.reset();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="rfp-form" onSubmit={handleSubmit}>
      <div className="form-heading">
        <span className="eyebrow">BẮT ĐẦU KẾT NỐI</span>
        <h2>Tạo yêu cầu sự kiện</h2>
        <p>Chia sẻ mong muốn của bạn. BridgC sẽ tìm đúng đội ngũ phù hợp.</p>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Danh mục dịch vụ</span>
          {categories.length ? (
            <select required value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          ) : (
            <input required value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Nhập danh mục dịch vụ" />
          )}
        </label>
        <label className="field">
          <span>Tên sự kiện / yêu cầu</span>
          <input name="title" required maxLength="160" placeholder="Ví dụ: Quay phim lễ cưới ngoài trời" />
        </label>
        <label className="field field-wide">
          <span>Mô tả chi tiết</span>
          <textarea name="description" required rows="3" maxLength="10000" placeholder="Điều bạn muốn nhà cung cấp biết..." />
        </label>
        {(categoryFields[category] || []).map((field) => (
          <label className={`field ${field.type === 'checkbox' ? 'field-check' : ''}`} key={field.name}>
            {field.type === 'checkbox' ? (
              <>
                <input name={field.name} type="checkbox" />
                <span>{field.label}</span>
              </>
            ) : (
              <>
                <span>{field.label}</span>
                {field.type === 'select' ? (
                  <select name={field.name}>{field.options.map((option) => <option key={option}>{option}</option>)}</select>
                ) : (
                  <input name={field.name} type={field.type} min={field.min} placeholder={field.placeholder} />
                )}
              </>
            )}
          </label>
        ))}
        <label className="field">
          <span>Tỉnh / thành phố</span>
          <input name="province" required placeholder="Ví dụ: Đà Nẵng" />
        </label>
        <label className="field">
          <span>Quận / khu vực</span>
          <input name="city" placeholder="Ví dụ: Hải Châu" />
        </label>
        <label className="field">
          <span>Ngân sách từ (VND)</span>
          <input name="budgetMin" type="number" min="0" placeholder="Để trống nếu linh hoạt" />
        </label>
        <label className="field">
          <span>Ngân sách đến (VND)</span>
          <input name="budgetMax" type="number" min="0" placeholder="Ví dụ: 10000000" />
        </label>
        <label className="field">
          <span>Ngày diễn ra</span>
          <input name="eventDate" type="date" />
        </label>
        <label className="field">
          <span>Hạn nhận đề xuất</span>
          <input name="deadline" type="date" />
        </label>
        <label className="field field-wide">
          <span>Từ khóa mong muốn</span>
          <input name="tags" placeholder="Ví dụ: ngoài trời, acoustic, tiệc cưới (ngăn cách bằng dấu phẩy)" />
        </label>
      </div>
      <div className="form-footer">
        <span className="attachment-note"><Paperclip size={15} /> Tệp đính kèm sẽ được hỗ trợ khi bật upload.</span>
        <button className="button button-dark" type="submit" disabled={submitting}>
          {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'} <ArrowRight size={16} />
        </button>
      </div>
      {message && <p className="form-success"><CheckCircle2 size={17} /> {message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}
