import VendorProfile from '../models/VendorProfile.js';
import Lead from '../models/Lead.js';
import Rfp from '../models/Rfp.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generateChatReply, MODEL_CANDIDATES } from '../services/geminiService.js';
import { buildEventPlan } from '../services/eventAdvisorService.js';
import { getWeatherForLocation } from '../services/weatherService.js';

const normalize = (value) => String(value || '')
  .toLocaleLowerCase()
  .normalize('NFD')
  .replace(/\p{M}/gu, '')
  .replace(/đ/g, 'd');

const redactContactDetails = (value) => String(value || '')
  .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
  .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[phone]');

const stopWords = new Set([
  'cho', 'can', 'minh', 'toi', 'voi', 'va', 'co', 'tai', 'la', 'mot', 'cac',
  'nhung', 'theo', 'uu', 'tien', 'ngan', 'sach', 'khoang', 'muon', 'tim',
  'dich', 'vu', 'su', 'kien', 'event', 'need', 'find', 'for', 'with', 'and',
  'the', 'a', 'an', 'to', 'in', 'on', 'my', 'our',
]);

function requestTerms(message) {
  return [...new Set(normalize(message).match(/[\p{L}\p{N}]+/gu) || [])]
    .filter((term) => term.length > 1 && !stopWords.has(term))
    .slice(0, 24);
}

function rankVendor(profile, terms) {
  const fields = {
    name: normalize(profile.storeName),
    category: normalize((profile.category || []).join(' ')),
    tags: normalize((profile.tags || []).join(' ')),
    location: normalize(`${profile.location?.city || ''} ${profile.location?.province || ''}`),
    details: normalize([
      profile.bio,
      ...(profile.packages || []).flatMap((item) => [item.name, item.description, ...(item.features || [])]),
    ].join(' ')),
  };
  const matched = terms.filter((term) => Object.values(fields).some((field) => field.includes(term)));
  const score = matched.reduce((sum, term) => {
    if (fields.category.includes(term)) return sum + 5;
    if (fields.tags.includes(term)) return sum + 4;
    if (fields.name.includes(term)) return sum + 3;
    if (fields.location.includes(term)) return sum + 2;
    return sum + 1;
  }, 0);
  const packages = profile.packages || [];
  return {
    id: String(profile._id),
    slug: profile.slug,
    name: profile.storeName,
    categories: profile.category || [],
    tags: profile.tags || [],
    location: [profile.location?.city, profile.location?.province].filter(Boolean).join(', '),
    bio: profile.bio || '',
    rating: profile.stats?.ratingAvg || 0,
    reviewCount: profile.stats?.reviewCount || 0,
    startingPrice: packages.length ? Math.min(...packages.map((item) => item.price)) : null,
    packages: packages.map(({ name, price, description, features }) => ({ name, price, description, features })),
    isVerified: profile.isVerified,
    matchScore: terms.length ? Math.round((matched.length / terms.length) * 100) : 0,
    score,
  };
}

export const getAiStatus = asyncHandler(async (req, res) => {
  return res.json({
    provider: 'Gemini',
    configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    model: MODEL_CANDIDATES[0],
  });
});

async function buildCustomerContext(message) {
  const activeVendorIds = await User.find({ role: 'vendor', status: 'active' }).distinct('_id');
  const profiles = await VendorProfile.find({ userId: { $in: activeVendorIds } })
    .populate({ path: 'userId', match: { status: 'active' }, select: '_id' })
    .sort({ 'stats.ratingAvg': -1, isVerified: -1 })
    .limit(100)
    .lean();
  const terms = requestTerms(message);
  const vendors = profiles
    .filter((profile) => profile.userId)
    .map((profile) => rankVendor(profile, terms))
    .filter((vendor) => vendor.score > 0)
    .sort((a, b) => b.score - a.score || b.rating - a.rating)
    .slice(0, 8)
    .map(({ score, ...vendor }) => vendor);
  return vendors;
}

async function buildVendorContext(userId) {
  const profile = await VendorProfile.findOne({ userId }).lean();
  if (!profile) return { profile: null, leads: [], opportunities: [] };
  const [leads, opportunities] = await Promise.all([
    Lead.find({ vendorId: profile._id })
      .sort({ updatedAt: -1 })
      .limit(12)
      .populate('rfpId', 'title category description budgetMin budgetMax location eventDate')
      .lean(),
    Rfp.find({ matchedVendorIds: profile._id, status: { $in: ['open', 'processing'] } })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean(),
  ]);
  return {
    profile: {
      storeName: profile.storeName,
      category: profile.category,
      location: profile.location,
      bio: profile.bio,
      tags: profile.tags,
      packages: profile.packages,
      stats: profile.stats,
      isVerified: profile.isVerified,
      isPro: profile.isPro,
      availabilityCalendar: profile.availabilityCalendar,
    },
    leads: leads.map((lead) => ({
      status: lead.status,
      quotedAmount: lead.quotedAmount,
      event: lead.rfpId ? {
        title: lead.rfpId.title,
        category: lead.rfpId.category,
        description: redactContactDetails(lead.rfpId.description),
        budgetMin: lead.rfpId.budgetMin,
        budgetMax: lead.rfpId.budgetMax,
        location: lead.rfpId.location,
        eventDate: lead.rfpId.eventDate,
      } : null,
    })),
    opportunities: opportunities.map((rfp) => ({
      title: rfp.title,
      category: rfp.category,
      description: redactContactDetails(rfp.description),
      budgetMin: rfp.budgetMin,
      budgetMax: rfp.budgetMax,
      location: rfp.location,
      eventDate: rfp.eventDate,
    })),
  };
}

function parseEventDetails(text) {
  if (!text) return null;
  const clean = String(text);

  // Date parsing
  let eventDate = null;
  const dmyMatch = clean.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    eventDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  } else if (/ngay mai|ngày mai/i.test(clean)) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    eventDate = tomorrow.toISOString().slice(0, 10);
  } else if (/tuan sau|tuần sau/i.test(clean)) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    eventDate = nextWeek.toISOString().slice(0, 10);
  }

  // Location parsing
  let location = null;
  const cities = [
    'Đà Nẵng', 'Da Nang', 'Hà Nội', 'Ha Noi', 'Hồ Chí Minh', 'TP.HCM', 'TPHCM', 'Sài Gòn',
    'Nha Trang', 'Phú Quốc', 'Hội An', 'Huế', 'Đà Lạt', 'Vũng Tàu', 'Quy Nhơn', 'Hạ Long',
    'Phan Thiết', 'Cần Thơ', 'Hải Phòng'
  ];
  for (const c of cities) {
    if (new RegExp(c.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i').test(clean)) {
      location = c.toLowerCase().includes('danang') || c.toLowerCase().includes('đà nẵng') ? 'Đà Nẵng' : c;
      break;
    }
  }

  // Guest count
  let guestCount = null;
  const guestMatch = clean.match(/(\d+)\s*(người|khách|pax|guest)/i);
  if (guestMatch) guestCount = parseInt(guestMatch[1], 10);

  // Budget
  let budget = null;
  const budgetMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(triệu|tr|trieu|tỷ|ty)/i);
  if (budgetMatch) {
    const val = parseFloat(budgetMatch[1].replace(',', '.'));
    const unit = budgetMatch[2].toLowerCase();
    budget = unit.startsWith('tỷ') || unit.startsWith('ty') ? val * 1e9 : val * 1e6;
  }

  const isBeach = /bãi biển|bai bien|biển|bien/i.test(clean);
  const isOutdoor = isBeach || /ngoài trời|ngoai troi|sân vườn|san vuon/i.test(clean);
  const isWedding = /đám cưới|dam cuoi|tiệc cưới|tiec cuoi|hôn lễ|hon le|wedding/i.test(clean);

  if (location || eventDate || guestCount || budget || isOutdoor || isWedding) {
    return {
      location: location || 'Đà Nẵng',
      eventDate,
      guestCount,
      budget,
      isBeach,
      isOutdoor,
      isWedding,
    };
  }
  return null;
}

export const chat = asyncHandler(async (req, res) => {
  const message = typeof req.body.message === 'string'
    ? req.body.message.trim()
    : typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!message || message.length > 4000) {
    return res.status(400).json({ success: false, message: 'Nhập nội dung từ 1 đến 4000 ký tự' });
  }
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return res.status(503).json({
      success: false,
      message: 'Gemini chưa được cấu hình trên server. Hãy thêm GEMINI_API_KEY vào server/.env rồi khởi động lại API.',
    });
  }
  const history = Array.isArray(req.body.history)
    ? req.body.history
      .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.text === 'string')
      .slice(-12)
      .map(({ role, text }) => ({ role, text: text.slice(0, 4000) }))
    : [];

  let context;
  let assistantRole;
  let eventDetails = null;
  let weather = null;

  if (req.user.role === 'customer' || req.user.role === 'admin') {
    const priorRequests = history.filter((item) => item.role === 'user').map((item) => item.text);
    const fullConversationText = [...priorRequests, message].join('\n');
    eventDetails = parseEventDetails(fullConversationText);

    if (eventDetails?.location) {
      try {
        weather = await getWeatherForLocation(eventDetails.location, eventDetails.eventDate);
      } catch (err) {
        console.warn('Weather fetch warning in chat:', err.message);
      }
    }

    const matchedVendors = await buildCustomerContext(fullConversationText);
    context = {
      vendors: matchedVendors,
      weather,
      eventDetails,
    };
    assistantRole = 'chuyên gia tư vấn sản xuất và tổ chức sự kiện chuyên nghiệp tại Việt Nam';
  } else if (req.user.role === 'vendor') {
    context = await buildVendorContext(req.user._id);
    assistantRole = 'trợ lý kinh doanh riêng của vendor';
  } else {
    return res.status(403).json({ success: false, message: 'Tài khoản này không được sử dụng AI chat' });
  }

  let prompt;
  if (eventDetails) {
    prompt = `Bạn là BridgC AI – ${assistantRole}. Trả lời bằng tiếng Việt chuyên nghiệp, tận tâm, phân tích số liệu rõ ràng và có cấu trúc đẹp mắt (sử dụng tiêu đề ###, bullet points, in đậm các điểm mấu chốt).

Yêu cầu mới nhất của người dùng: "${message}"
${history.length ? `Lịch sử hội thoại: ${JSON.stringify(history)}` : ''}

${weather ? `DỮ LIỆU THỜI TIẾT THỰC TẾ TRA CỨU TỪ HỆ THỐNG:
- Địa điểm: ${weather.city} (${weather.region})
- Ngày tổ chức dự kiến: ${eventDetails.eventDate || weather.forecastDate || 'ngày mai'}
- Tình trạng: ${weather.condition}
- Nhiệt độ: ${weather.temp_c}°C (Cảm giác thực tế: ${weather.feelslike_c}°C)
- Xác suất mưa: ${weather.chance_of_rain}%
- Độ ẩm: ${weather.humidity}%, Gió: ${weather.wind_kph} km/h, Chỉ số UV: ${weather.uv}` : ''}

THÔNG TIN SỰ KIỆN:
- Địa điểm: ${eventDetails.location}${eventDetails.isBeach ? ' (Bãi biển / Ngoài trời)' : ''}
- Ngày tổ chức: ${eventDetails.eventDate || 'Linh hoạt'}
- Số lượng khách: ${eventDetails.guestCount ? `${eventDetails.guestCount} người` : 'Chưa nêu'}
- Ngân sách: ${eventDetails.budget ? `${new Intl.NumberFormat('vi-VN').format(eventDetails.budget)} VNĐ` : 'Chưa nêu'}

DANH SÁCH NHÀ CUNG CẤP TRÊN HỆ THỐNG BRIDGC:
${JSON.stringify(context.vendors || [])}

BẠN BẮT BUỘC PHẢI PHÂN TÍCH RÕ CÁC NỘI DUNG SAU:
1. **Phân tích thời tiết ngày tổ chức & Rủi ro thực tế**:
   - Nêu chi tiết dự báo thời tiết ngày tổ chức tại ${eventDetails.location} (nhiệt độ, xác suất mưa ${weather ? weather.chance_of_rain : 70}%, độ ẩm, gió).
   - Đánh giá thẳng thắn rủi ro lớn khi tổ chức ngoài trời/bãi biển (mưa làm ướt bàn tiệc, nguy cơ chập cháy hư hỏng hệ thống điện/âm thanh ánh sáng; gió lớn thổi cát bay vào thức ăn và làm đổ layout trang trí; nền cát lún gây khó khăn cho khách mời và trang phục).
2. **Dự trù ngân sách & Quỹ rủi ro phát sinh (Contingency Budget)**:
   - Đánh giá mức ngân sách ${eventDetails.budget ? `${new Intl.NumberFormat('vi-VN').format(eventDetails.budget)} VNĐ` : ''} theo quy mô ${eventDetails.guestCount || 200} khách.
   - Khuyến nghị TĂNG DỰ TRÙ RỦI RO từ 15% - 20% (nêu rõ số tiền triệu VNĐ cần dự phòng thêm và tổng ngân sách an toàn).
   - Nêu rõ các khoản bắt buộc cần dự phòng: thuê nhà bạt trong suốt (transparent marquee tent) chống mưa; sàn gỗ/ván pallet lót cát chống lún; chi phí cọc giữ sảnh Ballroom trong nhà của resort để kích hoạt Plan B nếu mưa to; bạt chống nước bảo vệ âm thanh ánh sáng.
3. **Gợi ý các địa điểm tổ chức tốt nhất tại ${eventDetails.location}**:
   - Gợi ý từ 3-4 địa điểm / resort / khách sạn hàng đầu tại ${eventDetails.location} có bãi biển đẹp và CÓ SẴN sảnh tiệc trong nhà (Ballroom) sẵn sàng làm phương án dự phòng khi thời tiết xấu.
   - **QUAN TRỌNG:** Khi nêu tên địa điểm/resort/khách sạn, BẮT BUỘC format tên dưới dạng Markdown link Google Maps theo cú pháp sau (thay thế khoảng trắng bằng dấu +):
     * [Tên Địa Điểm](https://www.google.com/maps/search/?api=1&query=Tên+Địa+Điểm+${encodeURIComponent(eventDetails.location)})
   - Ví dụ cụ thể tại Đà Nẵng:
     * [Furama Resort Danang](https://www.google.com/maps/search/?api=1&query=Furama+Resort+Danang+Da+Nang)
     * [Hyatt Regency Danang Resort & Spa](https://www.google.com/maps/search/?api=1&query=Hyatt+Regency+Danang+Resort+Spa+Da+Nang)
     * [Naman Retreat](https://www.google.com/maps/search/?api=1&query=Naman+Retreat+Da+Nang)
   - Tên resort PHẢI là link clickable dẫn đến Google Maps. Đây là yêu cầu bắt buộc để người dùng có thể xem vị trí trực tiếp trên bản đồ.
4. **Kế hoạch hành động tiếp theo trên BridgC**:
   - Hướng dẫn đăng yêu cầu báo giá (RFP) trên BridgC để nhận báo giá cạnh tranh từ các đối tác âm thanh ánh sáng, trang trí, quay phim, MC tại địa phương.`;
  } else {
    prompt = `Bạn là BridgC AI, ${assistantRole}, trả lời bằng tiếng Việt tự nhiên và súc tích.
Chỉ sử dụng dữ liệu hệ thống được cung cấp bên dưới. Không được bịa tên vendor, giá, lịch trống, khách hàng hay trạng thái deal. Nếu thiếu dữ liệu, nói rõ điều đó và hỏi thêm thông tin cần thiết.
Dữ liệu database hiện tại (có thể rỗng): ${JSON.stringify(context)}
Lịch sử hội thoại gần đây: ${JSON.stringify(history)}
Tin nhắn mới nhất của người dùng: ${message}`;
  }

  let reply;
  try {
    reply = await generateChatReply(prompt, context);
  } catch (geminiError) {
    console.warn('[chat] Gemini failed, using inline fallback:', geminiError.message?.slice(0, 120));
    // Build inline fallback so users never see a 500 on the chat page
    if (eventDetails) {
      const loc = eventDetails.location || 'Đà Nẵng';
      const date = eventDetails.eventDate || 'ngày tổ chức';
      const guests = eventDetails.guestCount || 200;
      const budget = eventDetails.budget || 300000000;
      const contingency = Math.round(budget * 0.18);
      const rain = weather ? weather.chance_of_rain : 70;
      const temp = weather ? weather.temp_c : 28;
      reply = `> ⚠️ *Gemini AI đang tạm thời quá tải (${geminiError.message?.includes('429') || geminiError.message?.includes('RESOURCE_EXHAUSTED') ? '429 quota' : 'lỗi kết nối'}). Phản hồi dưới đây được tổng hợp tự động từ dữ liệu hệ thống BridgC.*\n\n### 1. Thời tiết & Rủi ro tại ${loc}\n- **Nhiệt độ dự kiến:** ~${temp}°C | **Xác suất mưa:** ${rain}%\n- **Rủi ro:** ${rain > 50 ? '⚠️ Xác suất mưa cao — cần chuẩn bị nhà bạt, sàn gỗ chống lún và phương án dự phòng trong nhà (Ballroom).' : '✅ Thời tiết tương đối thuận lợi nhưng vẫn nên có phương án dự phòng.'}\n\n### 2. Ngân sách & Dự phòng rủi ro\n- Ngân sách: **${new Intl.NumberFormat('vi-VN').format(budget)} VNĐ** / ${guests} khách (~${new Intl.NumberFormat('vi-VN').format(Math.round(budget / guests))}đ/người)\n- **Khuyến nghị dự phòng +18%:** ${new Intl.NumberFormat('vi-VN').format(contingency)} VNĐ → Tổng an toàn: **${new Intl.NumberFormat('vi-VN').format(budget + contingency)} VNĐ**\n- Hạng mục dự phòng bắt buộc: nhà bạt trong suốt, sàn gỗ/pallet, cọc trước sảnh ballroom dự phòng.\n\n### 3. Địa điểm gợi ý tại ${loc}\n1. [Furama Resort Danang](https://www.google.com/maps/search/?api=1&query=Furama+Resort+Danang+Da+Nang) – Bãi biển đẹp, ballroom lớn dự phòng\n2. [Hyatt Regency Danang Resort & Spa](https://www.google.com/maps/search/?api=1&query=Hyatt+Regency+Danang+Resort+Spa+Da+Nang) – Bãi biển riêng, sân cỏ sang trọng\n3. [Naman Retreat](https://www.google.com/maps/search/?api=1&query=Naman+Retreat+Non+Nuoc+Da+Nang) – Kiến trúc độc đáo, riêng tư\n4. [Premier Village Danang Resort](https://www.google.com/maps/search/?api=1&query=Premier+Village+Danang+Resort+Da+Nang) – Biệt thự biển cao cấp\n\n### 4. Bước tiếp theo\nĐăng **RFP** trên BridgC để nhận báo giá từ các vendor âm thanh, ánh sáng, trang trí, MC tại ${loc}.`;
    } else {
      reply = `Xin chào! Hệ thống Gemini AI đang tạm thời quá tải. Bạn có thể:\n- Tìm kiếm vendor trực tiếp trên hệ thống\n- Đăng yêu cầu RFP để vendor chủ động liên hệ\n- Thử lại sau vài phút để AI tư vấn chi tiết hơn.`;
    }
  }
  return res.json({ success: true, reply, vendors: context.vendors || [] });
});

export const planEvent = asyncHandler(async (req, res) => {
  const location = typeof req.body.location === 'string' ? req.body.location.trim() : '';
  const eventType = typeof req.body.eventType === 'string' ? req.body.eventType.trim() : '';
  const prompt = typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '';
  const eventDate = typeof req.body.eventDate === 'string' ? req.body.eventDate.trim() : '';
  const guestCount = req.body.guestCount === undefined || req.body.guestCount === '' ? null : Number(req.body.guestCount);
  const budgetMin = req.body.budgetMin === undefined || req.body.budgetMin === '' ? null : Number(req.body.budgetMin);
  const budgetMax = req.body.budgetMax === undefined || req.body.budgetMax === '' ? null : Number(req.body.budgetMax);

  if (!location || location.length > 180) {
    return res.status(400).json({ success: false, message: 'Nhập địa điểm tổ chức (tối đa 180 ký tự)' });
  }
  if (prompt.length > 2000 || eventType.length > 120) {
    return res.status(400).json({ success: false, message: 'Mô tả sự kiện quá dài' });
  }
  if (guestCount != null && (!Number.isFinite(guestCount) || guestCount < 0 || guestCount > 100000)) {
    return res.status(400).json({ success: false, message: 'Số khách không hợp lệ' });
  }
  if ([budgetMin, budgetMax].some((value) => value != null && (!Number.isFinite(value) || value < 0))) {
    return res.status(400).json({ success: false, message: 'Ngân sách không hợp lệ' });
  }

  const plan = await buildEventPlan({
    location,
    eventType,
    eventDate,
    guestCount,
    budgetMin,
    budgetMax,
    prompt,
  });
  return res.json({ success: true, ...plan });
});
