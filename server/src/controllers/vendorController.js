import VendorProfile from '../models/VendorProfile.js';
import Review from '../models/Review.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const searchVendors = asyncHandler(async (req, res) => {
  const { q = '', category, province, city } = req.query;
  const numericFilters = ['budgetMin', 'budgetMax', 'ratingMin'];
  for (const name of numericFilters) {
    if (req.query[name] !== undefined && !Number.isFinite(Number(req.query[name]))) {
      return res.status(400).json({ message: `${name} must be a number` });
    }
  }

  const filters = {};
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

  const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 50);
  const profiles = await VendorProfile.find(filters)
    .populate({ path: 'userId', match: { status: 'active' }, select: '_id' })
    .limit(limit)
    .lean();
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
    .sort((a, b) => Number(Boolean(b.isPro)) - Number(Boolean(a.isPro)) || b.stats.ratingAvg - a.stats.ratingAvg)
    .map((profile) => ({
      id: profile._id,
      name: profile.storeName,
      initials: profile.storeName.slice(0, 1).toLocaleUpperCase(),
      location: [profile.location.city, profile.location.province].filter(Boolean).join(', '),
      categories: profile.category,
      rating: profile.stats.ratingAvg,
      reviewCount: profile.stats.reviewCount,
      fiveStarReviews: fiveStarsByVendor.get(String(profile._id)) || 0,
      startingPrice: profile.packages.length
        ? Math.min(...profile.packages.map((item) => item.price))
        : 0,
      responseTime: profile.stats.responseTimeMinutes,
      packages: profile.packages.map((item) => item.name),
      tags: profile.tags,
      portfolio: profile.portfolio.slice(0, 3).map(({ type, url, title }) => ({ type, url, title })),
      isPro: profile.isPro,
      isVerified: profile.isVerified,
    }));

  return res.json({ vendors });
});

export const suggestVendors = asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) return res.json({ suggestions: [] });
  const term = { $regex: escapeRegex(q), $options: 'i' };
  const profiles = await VendorProfile.find({
    $or: [{ storeName: term }, { category: term }, { tags: term }],
  })
    .populate({ path: 'userId', match: { status: 'active' }, select: '_id' })
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
