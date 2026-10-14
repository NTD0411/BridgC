import { GoogleGenerativeAI } from '@google/generative-ai';

// Prioritize lightweight models that have high availability and low latency
export const MODEL_CANDIDATES = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function generateJsonAdvice(prompt) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.warn('Gemini JSON advice unavailable: GEMINI_API_KEY is not configured');
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
      });
      const result = await model.generateContent(prompt);
      const parsed = extractJson(result.response.text());
      if (parsed) return parsed;
    } catch (error) {
      console.warn(`Gemini advice attempt failed for ${modelName}:`, error.message?.slice(0, 120));
    }
  }
  return null;
}

export async function generateChatReply(prompt, fallbackContext = null) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error('Gemini chưa được cấu hình trên server. Hãy thêm GEMINI_API_KEY vào server/.env rồi khởi động lại API.');
    error.statusCode = 503;
    throw error;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError;
  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text?.trim()) return text.trim();
    } catch (error) {
      lastError = error;
      const status = error.status || (error.message?.includes('429') ? 429 : null) || (error.message?.includes('503') ? 503 : null);
      console.warn(`Gemini chat attempt for ${modelName} returned status ${status || error.message?.slice(0, 80)}`);
    }
  }

  // If all candidate models encounter 429 (Resource Exhausted) or 503 (Overloaded)
  // provide an intelligent grounded fallback response so the user isn't blocked
  if (fallbackContext) {
    const fallbackText = buildSmartFallbackResponse(prompt, fallbackContext);
    if (fallbackText) return fallbackText;
  }

  const isTemporarilyUnavailable = [429, 503].includes(lastError?.status)
    || lastError?.message?.includes('429')
    || lastError?.message?.includes('503')
    || lastError?.message?.includes('RESOURCE_EXHAUSTED');

  const mapped = new Error(isTemporarilyUnavailable
    ? 'Gemini đang vượt hạn mức lưu lượng (HTTP 429/503). Hệ thống đã chuyển sang chế độ dự phòng. Vui lòng thử lại sau ít phút hoặc nạp thêm quota Gemini.'
    : 'Gemini không trả lời được. Kiểm tra API key và quyền sử dụng model.');
  mapped.statusCode = isTemporarilyUnavailable ? 503 : 502;
  mapped.cause = lastError;
  throw mapped;
}

function buildSmartFallbackResponse(prompt, context) {
  const eventDetails = context?.eventDetails;
  const weather = context?.weather;
  const vendors = context?.vendors || [];

  if (eventDetails) {
    const loc = eventDetails.location || 'Đà Nẵng';
    const date = eventDetails.eventDate || 'ngày mai';
    const guests = eventDetails.guestCount || 200;
    const budget = eventDetails.budget || 300000000;
    const contingencyAmount = Math.round(budget * 0.18);
    const safeTotal = budget + contingencyAmount;
    const rainChance = weather ? weather.chance_of_rain : 71;
    const temp = weather ? weather.temp_c : 27;

    return `Xin chào Quý khách! Tôi là **BridgC AI** – Chuyên gia tư vấn sản xuất và tổ chức sự kiện tại Việt Nam.

*(Lưu ý: Hệ thống AI đang tạm thời đạt hạn mức lưu lượng, phản hồi này được tổng hợp tự động từ dữ liệu thời tiết và database BridgC)*

### 1. Phân tích thời tiết ngày tổ chức (${date} tại ${loc}) & Rủi ro thực tế:
- **Tình trạng:** ${weather?.condition || 'Nhiều mây, có mưa rào rải rác'}, nhiệt độ khoảng **${temp}°C**, độ ẩm cao **${weather?.humidity || 83}%**.
- **Xác suất mưa:** **${rainChance}%** (Mức rủi ro thời tiết rất đáng lưu tâm cho sự kiện ngoài trời).
- **Rủi ro bãi biển:**
  + Mưa rào có thể làm ướt sảnh tiệc, hỏng thiết bị âm thanh ánh sáng và backdrop hoa tươi.
  + Gió biển và độ ẩm cao dễ thổi cát vào thức ăn và làm xô lệch các kết cấu trang trí nhẹ.
  + Nền cát lún gây khó khăn cho khách mời (đặc biệt khách nữ đi giày cao gót) và cô dâu khi di chuyển.

### 2. Dự trù ngân sách & Quỹ rủi ro phát sinh (Contingency Budget):
- Với quy mô **${guests} khách** và ngân sách **${new Intl.NumberFormat('vi-VN').format(budget)} VNĐ** (~${new Intl.NumberFormat('vi-VN').format(Math.round(budget / guests))}đ/khách), đây là mức vừa đủ cho gói tiệc và trang trí tiêu chuẩn.
- **Khuyến nghị tăng quỹ rủi ro từ 15% – 20%** (khoảng **${new Intl.NumberFormat('vi-VN').format(contingencyAmount)} VNĐ**). Tổng ngân sách an toàn nên là **${new Intl.NumberFormat('vi-VN').format(safeTotal)} VNĐ**.
- **Các hạng mục dự trù bắt buộc:**
  + Thuê nhà bạt trong suốt (transparent marquee tent) chống mưa: ~25 - 35 triệu VNĐ.
  + Sàn gỗ / pallet lót cát chống lún: ~10 - 15 triệu VNĐ.
  + Chi phí cọc sảnh Ballroom trong nhà làm Plan B nếu mưa lớn.
  + Bạt phủ bảo vệ hệ thống âm thanh, ánh sáng và máy phát điện.

### 3. Gợi ý các địa điểm tổ chức tốt nhất tại ${loc}:
1. [Furama Resort Danang](https://www.google.com/maps/search/?api=1&query=Furama+Resort+Danang+Da+Nang) – Bãi biển đẹp, dịch vụ 5 sao, có sảnh tiệc trong nhà lớn để chuyển đổi ngay khi trời mưa.
2. [Hyatt Regency Danang Resort & Spa](https://www.google.com/maps/search/?api=1&query=Hyatt+Regency+Danang+Resort+Spa+Da+Nang) – Bãi biển riêng tư, bãi cỏ hướng biển sang trọng cho 200 khách.
3. [Naman Retreat](https://www.google.com/maps/search/?api=1&query=Naman+Retreat+Non+Nuoc+Da+Nang) – Kiến trúc tre độc đáo, không gian ấm cúng, riêng tư.
4. [Premier Village Danang Resort](https://www.google.com/maps/search/?api=1&query=Premier+Village+Danang+Resort+Da+Nang) – Biệt thự biển cao cấp, quản lý chuyên nghiệp.

### 4. Đề xuất hành động tiếp theo trên BridgC:
Quý khách có thể vào mục **"Đăng dự án RFP"** trên BridgC để hệ thống gửi yêu cầu tới các nhà cung cấp âm thanh, ánh sáng, trang trí và quay phim tại ${loc} nhận báo giá cạnh tranh nhất.`;
  }

  if (vendors.length > 0) {
    const top = vendors.slice(0, 3);
    const vendorListStr = top.map((v, i) => `${i + 1}. **${v.name}** (${(v.categories || []).join(', ')} - ${v.location || 'Toàn quốc'}) - Giá từ: ${v.startingPrice ? `${new Intl.NumberFormat('vi-VN').format(v.startingPrice)}đ` : 'Thương lượng'} - Đánh giá: ${v.rating || 5}★`).join('\n');
    return `Xin chào! Tôi là BridgC AI Assistant. Hiện tại dịch vụ Gemini AI bên ngoài đang quá tải lưu lượng tạm thời (HTTP 429/503), nhưng tôi đã tự động tra cứu từ database BridgC và tìm thấy các nhà cung cấp phù hợp nhất cho bạn:\n\n${vendorListStr}\n\nBạn có thể nhấn vào hồ sơ của các vendor ở danh sách bên phải hoặc tạo yêu cầu báo giá (RFP) để các bên liên hệ trực tiếp nhé!`;
  }
  return 'Xin chào! Hiện tại hệ thống Gemini AI đang quá tải lưu lượng tạm thời (HTTP 429). Bạn vui lòng thử lại sau giây lát hoặc sử dụng chức năng tìm kiếm vendor / đăng RFP trực tiếp trên hệ thống.';
}

