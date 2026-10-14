import VendorProfile from '../models/VendorProfile.js';
import User from '../models/User.js';
import { generateJsonAdvice } from './geminiService.js';
import { getWeatherForLocation } from './weatherService.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function normalize(value) {
  return String(value || '').toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function startingPrice(packages = []) {
  const prices = packages.map((item) => item.price).filter((price) => Number.isFinite(price));
  return prices.length ? Math.min(...prices) : null;
}

function buildWeatherRisks(weather, eventType) {
  const risks = [];
  const outdoor = /ngoai troi|outdoor|san khau|khai truong|le hoi|gala/.test(normalize(eventType));
  if ((weather.precip_mm || 0) >= 1 || (weather.chance_of_rain || 0) >= 50) {
    risks.push({
      title: 'Mưa và mặt sàn ướt',
      severity: 'high',
      detail: `${weather.condition || 'Có mưa'} tại ${weather.city}. Trang trí ngoài trời, backdrop và thiết bị điện dễ hỏng.`,
      mitigation: 'Chuẩn bị nhà bạt, mái che lối đi, bạt phủ thiết bị và phương án chuyển indoor.',
    });
  }
  if ((weather.wind_kph || 0) >= 25) {
    risks.push({
      title: 'Gió mạnh làm đổ khung/sân khấu',
      severity: weather.wind_kph >= 40 ? 'high' : 'medium',
      detail: `Gió ${weather.wind_kph} km/h có thể làm xê dịch backdrop, nhà bạt và ánh sáng treo.`,
      mitigation: 'Gia cố chân đế, giảm chiều cao backdrop, hạn chế vật treo nhẹ.',
    });
  }
  if ((weather.temp_c || 0) >= 33) {
    risks.push({
      title: 'Nắng nóng ảnh hưởng khách mời',
      severity: 'medium',
      detail: `Nhiệt độ khoảng ${weather.temp_c}°C, cảm giác ${weather.feelslike_c ?? weather.temp_c}°C.`,
      mitigation: 'Bố trí mái che, quạt/điều hòa, nước uống và rút ngắn nghi thức ngoài trời.',
    });
  }
  if ((weather.humidity || 0) >= 80) {
    risks.push({
      title: 'Ẩm cao ảnh hưởng thiết bị và ẩm thực',
      severity: 'medium',
      detail: `Độ ẩm ${weather.humidity}% dễ làm mốc backdrop vải, trễ makeup và hỏng món lạnh.`,
      mitigation: 'Ưu tiên nhà cung cấp có kho thiết bị kín, bàn tiệc trong nhà và máy hút ẩm/quạt.',
    });
  }
  if ((weather.uv || 0) >= 7 && outdoor) {
    risks.push({
      title: 'Tia UV cao cho khách và ekip',
      severity: 'low',
      detail: `Chỉ số UV ${weather.uv} vào ban ngày.`,
      mitigation: 'Lều che, kem chống nắng cho ekip, tránh giờ nắng gắt nếu lịch cho phép.',
    });
  }
  if (!risks.length) {
    risks.push({
      title: 'Thời tiết tương đối ổn định',
      severity: 'low',
      detail: `${weather.condition || 'Trời ổn'} tại ${weather.city}, ${weather.temp_c}°C.`,
      mitigation: 'Vẫn giữ kế hoạch dự phòng nhẹ (ô, bạt, nguồn điện dự phòng).',
    });
  }
  return risks;
}

function locationScore(vendor, weather) {
  const vendorLoc = normalize(`${vendor.location?.city || ''} ${vendor.location?.province || ''} ${vendor.address || ''}`);
  const eventLoc = normalize(`${weather.city} ${weather.region}`);
  if (!vendorLoc.trim()) return 0;
  if (vendorLoc.includes(normalize(weather.city)) || eventLoc.includes(normalize(vendor.location?.city))) return 28;
  if (vendorLoc.includes(normalize(weather.region)) || eventLoc.includes(normalize(vendor.location?.province))) return 22;
  return 4;
}

function categoryScore(vendor, eventType, prompt) {
  const haystack = normalize([
    ...(vendor.category || []),
    ...(vendor.tags || []),
    vendor.bio,
    ...(vendor.packages || []).flatMap((item) => [item.name, item.description, ...(item.features || [])]),
  ].join(' '));
  const terms = [...new Set(normalize(`${eventType} ${prompt}`).match(/[\p{L}\p{N}]{3,}/gu) || [])];
  if (!terms.length) return 8;
  const hits = terms.filter((term) => haystack.includes(term));
  return Math.min(30, hits.length * 6);
}

function weatherFitScore(vendor, weather) {
  const haystack = normalize([...(vendor.category || []), ...(vendor.tags || []), vendor.bio].join(' '));
  let score = 6;
  if ((weather.precip_mm || 0) >= 1 || (weather.chance_of_rain || 0) >= 50) {
    if (/nha bat|mai che|indoor|trong nha|nha hang|hoi truong/.test(haystack)) score += 10;
  }
  if ((weather.wind_kph || 0) >= 25 && /san khau|am thanh|anh sang|ket cau/.test(haystack)) score += 6;
  return score;
}

function ruleReason(vendor, weather, scored) {
  const reasons = [];
  if (scored.locationScore >= 20) reasons.push(`Cùng khu vực ${vendor.location?.city || vendor.location?.province || weather.city}, giảm chi phí vận chuyển và rủi ro setup trễ.`);
  if ((vendor.stats?.ratingAvg || 0) >= 4) reasons.push(`Đánh giá ${vendor.stats.ratingAvg.toFixed(1)}/5 từ ${vendor.stats.reviewCount || 0} lượt — uy tín vận hành.`);
  if (vendor.isVerified) reasons.push('Hồ sơ đã xác thực trên BridgC.');
  if (vendor.isPro) reasons.push('Tài khoản Pro, thường phản hồi và bổ sung gói dịch vụ đầy đủ hơn.');
  const price = startingPrice(vendor.packages);
  if (price != null) reasons.push(`Giá gói khởi điểm ${new Intl.NumberFormat('vi-VN').format(price)}đ, dễ đối chiếu ngân sách.`);
  if (scored.weatherScore >= 12) reasons.push(`Danh mục/tag phù hợp điều kiện thời tiết hiện tại (${weather.condition}).`);
  if (!reasons.length) reasons.push('Hồ sơ đang hoạt động trong database và khớp một phần yêu cầu sự kiện.');
  return reasons;
}

function serializeVendor(vendor, extras = {}) {
  const packages = vendor.packages || [];
  return {
    id: String(vendor._id),
    slug: vendor.slug,
    name: vendor.storeName,
    initials: vendor.storeName.slice(0, 1).toLocaleUpperCase(),
    bio: vendor.bio || '',
    location: [vendor.location?.city, vendor.location?.province].filter(Boolean).join(', '),
    address: vendor.address || '',
    categories: vendor.category || [],
    tags: vendor.tags || [],
    rating: vendor.stats?.ratingAvg || 0,
    reviewCount: vendor.stats?.reviewCount || 0,
    responseTime: vendor.stats?.responseTimeMinutes || 0,
    startingPrice: startingPrice(packages),
    packages: packages.map(({ name, price, description, features }) => ({ name, price, description, features })),
    logo: vendor.logo,
    coverImage: vendor.coverImage,
    isPro: vendor.isPro,
    isVerified: vendor.isVerified,
    ...extras,
  };
}

export async function buildEventPlan({ location, eventType, eventDate, guestCount, budgetMin, budgetMax, prompt }) {
  const weather = await getWeatherForLocation(location, eventDate);
  const activeVendorIds = await User.find({ role: 'vendor', status: 'active' }).distinct('_id');
  const profiles = await VendorProfile.find({ userId: { $in: activeVendorIds } })
    .populate({ path: 'userId', match: { status: 'active' }, select: '_id' })
    .limit(200)
    .lean();

  const scored = profiles
    .filter((profile) => profile.userId)
    .map((profile) => {
      const loc = locationScore(profile, weather);
      const cat = categoryScore(profile, eventType, prompt);
      const weatherScore = weatherFitScore(profile, weather);
      const ratingScore = Math.round((profile.stats?.ratingAvg || 0) * 6);
      const reviewScore = Math.min(profile.stats?.reviewCount || 0, 12);
      const price = startingPrice(profile.packages);
      let budgetScore = 4;
      if (price != null && budgetMax != null && price <= budgetMax) budgetScore = 10;
      if (price != null && budgetMin != null && price >= budgetMin) budgetScore += 2;
      const total = loc + cat + weatherScore + ratingScore + reviewScore + budgetScore + (profile.isVerified ? 8 : 0) + (profile.isPro ? 6 : 0);
      return {
        profile,
        total,
        locationScore: loc,
        categoryScore: cat,
        weatherScore,
      };
    })
    .sort((a, b) => b.total - a.total);

  const top = scored.slice(0, 5);
  const fallbackRisks = buildWeatherRisks(weather, `${eventType} ${prompt}`);
  const vendors = top.map((item) => serializeVendor(item.profile, {
    matchScore: Math.min(99, Math.round(item.total)),
    reasons: ruleReason(item.profile, weather, item),
  }));

  const compactVendors = vendors.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    location: vendor.location,
    categories: vendor.categories,
    tags: vendor.tags,
    rating: vendor.rating,
    reviewCount: vendor.reviewCount,
    startingPrice: vendor.startingPrice,
    packages: vendor.packages,
    isVerified: vendor.isVerified,
    isPro: vendor.isPro,
    reasons: vendor.reasons,
  }));

  const advice = await generateJsonAdvice(`Bạn là chuyên gia sản xuất sự kiện tại Việt Nam. Trả về JSON thuần, tiếng Việt.
Bối cảnh:
- Địa điểm người dùng nhập: ${location}
- Loại sự kiện: ${eventType || 'chưa nêu'}
- Ngày: ${eventDate || 'chưa nêu'}
- Số khách: ${guestCount || 'chưa nêu'}
- Ngân sách: ${budgetMin || '?'} - ${budgetMax || '?'}
- Mô tả thêm: ${prompt || 'không có'}
Thời tiết (WeatherAPI): ${JSON.stringify(weather)}
Vendor lấy từ database BridgC (chỉ được dùng các id này): ${JSON.stringify(compactVendors)}

Schema JSON:
{
  "weatherSummary": "string",
  "risks": [{"title":"","severity":"high|medium|low","detail":"","mitigation":""}],
  "recommendations": [{"vendorId":"","reason":"","fit":"high|medium|low"}],
  "comparison": {
    "winnerVendorId": "",
    "summary": "",
    "criteria": [{"name":"","notes":""}]
  }
}
Chỉ so sánh vendor trong danh sách. Lý do phải dựa trên dữ liệu hồ sơ, giá, địa điểm, đánh giá và thời tiết, không bịa thêm số liệu.`);

  const risks = Array.isArray(advice?.risks) && advice.risks.length ? advice.risks : fallbackRisks;
  const byId = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  if (Array.isArray(advice?.recommendations)) {
    for (const item of advice.recommendations) {
      const vendor = byId.get(String(item.vendorId));
      if (!vendor) continue;
      if (item.reason) vendor.reasons = [item.reason, ...vendor.reasons.filter((reason) => reason !== item.reason)].slice(0, 4);
      vendor.fit = item.fit || vendor.fit;
    }
  }

  const comparisonVendors = vendors.slice(0, 3);
  const winnerId = byId.has(String(advice?.comparison?.winnerVendorId))
    ? String(advice.comparison.winnerVendorId)
    : comparisonVendors[0]?.id || null;

  return {
    weather,
    weatherSummary: advice?.weatherSummary || `${weather.condition} tại ${weather.city}, ${weather.temp_c}°C, ẩm ${weather.humidity}%, gió ${weather.wind_kph} km/h.`,
    risks,
    vendors,
    comparison: {
      winnerVendorId: winnerId,
      summary: advice?.comparison?.summary
        || (comparisonVendors[0] ? `${comparisonVendors[0].name} phù hợp nhất dựa trên địa điểm, hồ sơ trong DB và điều kiện thời tiết hiện tại.` : 'Chưa có hồ sơ vendor trong database để so sánh.'),
      criteria: advice?.comparison?.criteria || [
        { name: 'Địa điểm', notes: 'Ưu tiên vendor cùng tỉnh/thành với nơi tổ chức.' },
        { name: 'Uy tín', notes: 'Đối chiếu rating, số review, xác thực và gói Pro trong DB.' },
        { name: 'Thời tiết', notes: 'Ưu tiên năng lực indoor/nhà bạt/thiết bị nếu trời mưa hoặc gió.' },
        { name: 'Ngân sách', notes: 'So giá gói khởi điểm với ngân sách người dùng nhập.' },
      ],
      vendors: comparisonVendors,
    },
  };
}
