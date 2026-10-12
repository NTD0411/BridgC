import VendorProfile from '../models/VendorProfile.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function findMatchingVendors(rfp) {
  const filters = {
    category: { $regex: `^${escapeRegex(rfp.category)}$`, $options: 'i' },
    'location.province': { $regex: `^${escapeRegex(rfp.location.province)}$`, $options: 'i' },
  };

  if (rfp.location.city) {
    filters['location.city'] = {
      $regex: `^${escapeRegex(rfp.location.city)}$`,
      $options: 'i',
    };
  }

  const candidates = await VendorProfile.find(filters)
    .populate('userId', '_id status')
    .limit(300);
  const requestedTags = new Set(
    (rfp.tags || []).map((tag) => tag.trim().toLocaleLowerCase()).filter(Boolean),
  );

  return candidates
    .filter((vendor) => vendor.userId?.status === 'active')
    .filter((vendor) => {
      const min = rfp.budgetMin;
      const max = rfp.budgetMax;
      if (min == null && max == null) return true;
      return vendor.packages.some(
        ({ price }) => (min == null || price >= min) && (max == null || price <= max),
      );
    })
    .filter((vendor) => {
      if (requestedTags.size === 0) return true;
      return vendor.tags.some((tag) => requestedTags.has(tag.trim().toLocaleLowerCase()));
    })
    .sort((a, b) => Number(b.isPro) - Number(a.isPro) || b.stats.ratingAvg - a.stats.ratingAvg);
}
