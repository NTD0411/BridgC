import VendorProfile from '../models/VendorProfile.js';
import Review from '../models/Review.js';
import Lead from '../models/Lead.js';
import Rfp from '../models/Rfp.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const searchVendors = asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  if (req.query.q !== undefined && typeof req.query.q !== 'string') {
    return res.status(400).json({ message: 'q must be a string' });
  }
  const { category, province, city } = req.query;
  if ([category, province, city].some((value) => value !== undefined && typeof value !== 'string')) {
    return res.status(400).json({ message: 'category, province, and city must be strings' });
  }
  const numericFilters = ['budgetMin', 'budgetMax', 'ratingMin'];
  for (const name of numericFilters) {
    if (req.query[name] !== undefined && !Number.isFinite(Number(req.query[name]))) {
      return res.status(400).json({ message: `${name} must be a number` });
    }
  }

  const activeVendorIds = await User.find({ role: 'vendor', status: 'active' }).distinct('_id');
  const filters = { userId: { $in: activeVendorIds } };
  if (category) filters.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' };
  if (province) filters['location.province'] = { $regex: escapeRegex(province), $options: 'i' };
  if (city) filters['location.city'] = { $regex: escapeRegex(city), $options: 'i' };
  if (req.query.budgetMin !== undefined || req.query.budgetMax !== undefined) {
    const price = {};
    if (req.query.budgetMin !== undefined) price.$gte = Number(req.query.budgetMin);
    if (req.query.budgetMax !== undefined) price.$lte = Number(req.query.budgetMax);
    filters.packages = { $elemMatch: { price } };
  }
  if (req.query.ratingMin !== undefined) {
    filters['stats.ratingAvg'] = { $gte: Number(req.query.ratingMin) };
  }
  if (q.trim()) {
    const term = { $regex: escapeRegex(q.trim()), $options: 'i' };
    filters.$or = [{ storeName: term }, { category: term }, { tags: term }];
  }

  const requestedLimit = req.query.limit === undefined ? 24 : Number(req.query.limit);
  const requestedSkip = req.query.skip === undefined ? 0 : Number(req.query.skip);
  if (!Number.isInteger(requestedLimit) || !Number.isInteger(requestedSkip) || requestedSkip < 0) {
    return res.status(400).json({ message: 'limit and skip must be valid integers' });
  }
  const limit = Math.min(Math.max(requestedLimit, 1), 50);
  const profiles = await VendorProfile.find(filters)
    .populate({ path: 'userId', match: { status: 'active' }, select: '_id' })
    .sort({ isPro: -1, 'stats.ratingAvg': -1, createdAt: -1 })
    .limit(limit)
    .skip(requestedSkip)
    .lean();
  const total = await VendorProfile.countDocuments(filters);
  const profileIds = profiles.map(({ _id }) => _id);
  const fiveStarCounts = await Review.aggregate([
    { $match: { vendorId: { $in: profileIds } } },
    {
      $group: {
        _id: '$vendorId',
        count: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
      },
    },
  ]);
  const fiveStarsByVendor = new Map(fiveStarCounts.map(({ _id, count }) => [String(_id), count]));
  const vendors = profiles
    .filter((profile) => profile.userId)
    .map((profile) => {
      const stats = profile.stats || {};
      const packages = profile.packages || [];
      const portfolio = profile.portfolio || [];
      return {
        id: profile._id,
        slug: profile.slug,
        name: profile.storeName,
        initials: profile.storeName.slice(0, 1).toLocaleUpperCase(),
        location: [profile.location?.city, profile.location?.province].filter(Boolean).join(', '),
        categories: profile.category || [],
        rating: stats.ratingAvg || 0,
        reviewCount: stats.reviewCount || 0,
        fiveStarReviews: fiveStarsByVendor.get(String(profile._id)) || 0,
        startingPrice: packages.length ? Math.min(...packages.map((item) => item.price)) : 0,
        responseTime: stats.responseTimeMinutes || 0,
        packages,
        tags: profile.tags || [],
        logo: profile.logo,
        coverImage: profile.coverImage,
        portfolio: portfolio.slice(0, 3).map(({ type, url, title }) => ({ type, url, title })),
        isPro: profile.isPro,
        isVerified: profile.isVerified,
      };
    });

  const categoryCounts = await VendorProfile.aggregate([
    { $match: { userId: { $in: activeVendorIds } } },
    { $unwind: '$category' },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  return res.json({
    vendors,
    total,
    categories: categoryCounts.map(({ _id, count }) => ({ name: _id, count })),
  });
});

export const matchVendorsToRequest = asyncHandler(async (req, res) => {
  const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
  if (req.query.query !== undefined && typeof req.query.query !== 'string') {
    return res.status(400).json({ message: 'query must be a string' });
  }
  if (!query || query.length > 1000) {
    return res.status(400).json({ message: 'Nhập yêu cầu từ 1 đến 1000 ký tự' });
  }

  const stopWords = new Set([
    'cho', 'cần', 'mình', 'toi', 'tôi', 'với', 'và', 'có', 'ở', 'tại', 'là',
    'một', 'các', 'những', 'theo', 'ưu', 'tiên', 'ngân', 'sách', 'khoảng',
    'muốn', 'tìm', 'dịch', 'vụ', 'sự', 'kiện', 'event', 'need', 'find', 'for',
    'with', 'and', 'the', 'a', 'an', 'to', 'in', 'on', 'my', 'our',
  ]);
  const terms = [...new Set(
    query
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((term) => term.length > 1 && !stopWords.has(term)) || [],
  )].slice(0, 20);
  if (!terms.length) {
    return res.status(400).json({ message: 'Yêu cầu cần có tên dịch vụ, địa điểm hoặc mô tả cụ thể hơn' });
  }

  const activeVendorIds = await User.find({ role: 'vendor', status: 'active' }).distinct('_id');
  const termFilters = terms.map((term) => {
    const pattern = { $regex: escapeRegex(term), $options: 'i' };
    return {
      $or: [
        { storeName: pattern },
        { bio: pattern },
        { category: pattern },
        { tags: pattern },
        { 'location.province': pattern },
        { 'location.city': pattern },
        { 'packages.description': pattern },
        { 'packages.features': pattern },
      ],
    };
  });
  const profiles = await VendorProfile.find({
    userId: { $in: activeVendorIds },
    $or: termFilters,
  })
    .populate({ path: 'userId', match: { status: 'active' }, select: '_id' })
    .limit(200)
    .lean();

  const normalize = (value) => String(value || '').toLocaleLowerCase();
  const scored = profiles
    .filter((profile) => profile.userId)
    .map((profile) => {
      const fields = {
        storeName: normalize(profile.storeName),
        category: normalize((profile.category || []).join(' ')),
        tags: normalize((profile.tags || []).join(' ')),
        location: normalize(`${profile.location?.city || ''} ${profile.location?.province || ''}`),
        details: normalize([
          profile.bio,
          ...(profile.packages || []).flatMap((item) => [item.description, ...(item.features || [])]),
        ].join(' ')),
      };
      const matchedTerms = terms.filter((term) => Object.values(fields).some((field) => field.includes(term)));
      const score = matchedTerms.reduce((total, term) => {
        if (fields.category.includes(term)) return total + 5;
        if (fields.tags.includes(term)) return total + 4;
        if (fields.storeName.includes(term)) return total + 3;
        if (fields.location.includes(term)) return total + 2;
        return total + 1;
      }, 0);
      const packages = profile.packages || [];
      return {
        id: profile._id,
        slug: profile.slug,
        name: profile.storeName,
        initials: profile.storeName.slice(0, 1).toLocaleUpperCase(),
        location: [profile.location?.city, profile.location?.province].filter(Boolean).join(', '),
        categories: profile.category || [],
        rating: profile.stats?.ratingAvg || 0,
        reviewCount: profile.stats?.reviewCount || 0,
        startingPrice: packages.length ? Math.min(...packages.map((item) => item.price)) : 0,
        responseTime: profile.stats?.responseTimeMinutes || 0,
        packages,
        tags: profile.tags || [],
        logo: profile.logo,
        coverImage: profile.coverImage,
        portfolio: (profile.portfolio || []).slice(0, 3).map(({ type, url, title }) => ({ type, url, title })),
        isPro: profile.isPro,
        isVerified: profile.isVerified,
        matchScore: terms.length ? Math.round((matchedTerms.length / terms.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore || Number(b.isPro) - Number(a.isPro) || b.rating - a.rating)
    .slice(0, 30);

  return res.json({ vendors: scored, total: scored.length, query });
});

export const suggestVendors = asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) return res.json({ suggestions: [] });
  const term = { $regex: escapeRegex(q), $options: 'i' };
  const profiles = await VendorProfile.find({
    $or: [{ storeName: term }, { category: term }, { tags: term }],
  })
    .populate({ path: 'userId', match: { role: 'vendor', status: 'active' }, select: '_id' })
    .select('storeName category tags')
    .limit(20)
    .lean();
  const suggestions = [
    ...new Set(
      profiles
        .filter((profile) => profile.userId)
        .flatMap((profile) => [profile.storeName, ...profile.category, ...profile.tags])
        .filter((value) => value.toLocaleLowerCase().includes(q.toLocaleLowerCase())),
    ),
  ].slice(0, 8);
  return res.json({ suggestions });
});

export const getVendorBySlug = asyncHandler(async (req, res) => {
  const profile = await VendorProfile.findOne({ slug: req.params.slug })
    .populate({ path: 'userId', match: { role: 'vendor', status: 'active' }, select: 'fullName role' })
    .lean();
  if (!profile?.userId) return res.status(404).json({ message: 'Không tìm thấy hồ sơ vendor' });

  await VendorProfile.updateOne({ _id: profile._id }, { $inc: { 'stats.profileViews': 1 } });
  const reviews = await Review.find({ vendorId: profile._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('customerId', 'fullName avatar')
    .lean();

  return res.json({
    vendor: {
      _id: profile._id,
      storeName: profile.storeName,
      slug: profile.slug,
      logo: profile.logo,
      coverImage: profile.coverImage,
      bio: profile.bio,
      category: profile.category,
      location: profile.location,
      address: profile.address,
      tags: profile.tags,
      portfolio: profile.portfolio,
      embeds: profile.embeds,
      companyProfilePdfUrl: profile.companyProfilePdfUrl,
      cataloguePdfUrl: profile.cataloguePdfUrl,
      packages: profile.packages,
      availabilityCalendar: profile.availabilityCalendar,
      stats: profile.stats,
      isVerified: profile.isVerified,
      isPro: profile.isPro,
      owner: profile.userId,
      reviews: reviews.map((review) => ({
        id: review._id,
        rating: review.rating,
        comment: review.comment,
        photos: review.photos,
        isVerifiedDeal: review.isVerifiedDeal,
        createdAt: review.createdAt,
        customer: review.customerId,
      })),
    },
  });
});

export const compareVendors = asyncHandler(async (req, res) => {
  const ids = typeof req.query.ids === 'string'
    ? [...new Set(req.query.ids.split(',').map((id) => id.trim()).filter(Boolean))]
    : [];
  if (!ids.length || ids.length > 4 || ids.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
    return res.status(400).json({ message: 'Cần chọn từ 1 đến 4 vendor hợp lệ để so sánh' });
  }

  const profiles = await VendorProfile.find({ _id: { $in: ids } })
    .select('_id userId storeName slug logo category location packages portfolio stats isVerified isPro')
    .populate({ path: 'userId', match: { role: 'vendor', status: 'active' }, select: '_id' })
    .lean();
  const byId = new Map(profiles.filter((item) => item.userId).map((item) => [String(item._id), item]));
  return res.json({ vendors: ids.map((id) => byId.get(id)).filter(Boolean) });
});

export const getVendorDashboard = asyncHandler(async (req, res) => {
  const profile = await VendorProfile.findOne({ userId: req.user._id }).lean();
  if (!profile) return res.json({ profile: null, leads: [], opportunities: [] });

  const [leads, opportunities, leadCount, completedLeadCount] = await Promise.all([
    Lead.find({ vendorId: profile._id })
      .sort({ updatedAt: -1 })
      .limit(100)
      .populate('customerId', 'fullName email avatar')
      .populate('rfpId', 'title category description budgetMin budgetMax location eventDate deadline')
      .lean(),
    Rfp.find({ matchedVendorIds: profile._id, status: { $in: ['open', 'processing'] } })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('customerId', 'fullName')
      .lean(),
    Lead.countDocuments({ vendorId: profile._id }),
    Lead.countDocuments({ vendorId: profile._id, status: 'completed' }),
  ]);

  return res.json({
    profile,
    leads,
    opportunities,
    metrics: {
      impressions: profile.stats?.impressions || 0,
      profileViews: profile.stats?.profileViews || 0,
      leadCount,
      conversionRate: leadCount ? Math.round((completedLeadCount / leadCount) * 1000) / 10 : 0,
    },
  });
});

export const saveVendorProfile = asyncHandler(async (req, res) => {
  if (req.user.role !== 'vendor') {
    return res.status(403).json({ message: 'Chỉ vendor mới có thể cập nhật hồ sơ vendor' });
  }
  const storeName = typeof req.body.storeName === 'string' ? req.body.storeName.trim() : '';
  const slug = typeof req.body.slug === 'string' ? req.body.slug.trim().toLowerCase() : '';
  const category = Array.isArray(req.body.category)
    ? req.body.category.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const province = typeof req.body.location?.province === 'string'
    ? req.body.location.province.trim()
    : '';
  if (!storeName || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !category.length || !province) {
    return res.status(400).json({
      message: 'Tên gian hàng, slug hợp lệ, ít nhất một danh mục và tỉnh/thành là bắt buộc',
    });
  }
  if (req.body.packages !== undefined && !Array.isArray(req.body.packages)) {
    return res.status(400).json({ message: 'packages must be an array' });
  }
  if (req.body.portfolio !== undefined && !Array.isArray(req.body.portfolio)) {
    return res.status(400).json({ message: 'portfolio must be an array' });
  }
  if (req.body.tags !== undefined && (!Array.isArray(req.body.tags) || req.body.tags.some((tag) => typeof tag !== 'string'))) {
    return res.status(400).json({ message: 'tags must be an array of strings' });
  }
  if ((req.body.packages?.length || 0) > 20 || (req.body.portfolio?.length || 0) > 50) {
    return res.status(400).json({ message: 'Quá số lượng gói dịch vụ hoặc portfolio cho phép' });
  }

  const updates = {
    storeName,
    slug,
    category,
    location: {
      province,
      city: typeof req.body.location?.city === 'string' ? req.body.location.city.trim() : '',
    },
    bio: typeof req.body.bio === 'string' ? req.body.bio.trim() : '',
    logo: typeof req.body.logo === 'string' ? req.body.logo.trim() : '',
    coverImage: typeof req.body.coverImage === 'string' ? req.body.coverImage.trim() : '',
    tags: req.body.tags?.map((item) => item.trim()).filter(Boolean) || [],
  };
  if (req.body.packages !== undefined) updates.packages = req.body.packages;
  if (req.body.portfolio !== undefined) updates.portfolio = req.body.portfolio;

  const profile = await VendorProfile.findOneAndUpdate(
    { userId: req.user._id },
    {
      $set: updates,
      $setOnInsert: { userId: req.user._id },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return res.json({ profile });
});
