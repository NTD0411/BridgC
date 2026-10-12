import Lead from '../models/Lead.js';
import Pitch from '../models/Pitch.js';
import Review from '../models/Review.js';
import Rfp from '../models/Rfp.js';
import VendorProfile from '../models/VendorProfile.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const createReview = asyncHandler(async (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ message: 'Only customers can submit reviews' });
  }

  const { vendorId, rfpId, dealId, rating, comment = '', photos = [] } = req.body;
  if (!vendorId || (!rfpId && !dealId)) {
    return res.status(400).json({ message: 'vendorId and rfpId or dealId are required' });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'rating must be an integer from 1 to 5' });
  }
  if (!Array.isArray(photos) || photos.some((photo) => typeof photo !== 'string')) {
    return res.status(400).json({ message: 'photos must be an array of URLs' });
  }

  const vendor = await VendorProfile.findById(vendorId).select('_id');
  if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

  const leadQuery = {
    vendorId: vendor._id,
    customerId: req.user._id,
    status: 'completed',
  };
  if (dealId) leadQuery._id = dealId;
  if (rfpId) leadQuery.rfpId = rfpId;
  const lead = await Lead.findOne(leadQuery);
  if (!lead || (dealId && rfpId && String(lead._id) !== String(dealId))) {
    return res.status(403).json({
      message: 'A completed deal between this customer and vendor is required',
    });
  }

  const completedRfpId = rfpId || lead.rfpId;
  if (completedRfpId) {
    const rfp = await Rfp.findOne({
      _id: completedRfpId,
      customerId: req.user._id,
      status: 'completed',
    }).select('_id');
    if (!rfp) {
      return res.status(403).json({ message: 'The linked RFP must be completed first' });
    }
    const acceptedPitch = await Pitch.exists({
      rfpId: completedRfpId,
      vendorId: vendor._id,
      status: 'accepted',
    });
    if (!acceptedPitch) {
      return res.status(403).json({ message: 'An accepted vendor proposal is required' });
    }
  }

  const review = await Review.create({
    customerId: req.user._id,
    vendorId: vendor._id,
    rfpId: completedRfpId || null,
    dealId: lead._id,
    rating,
    comment,
    photos,
    isVerifiedDeal: true,
  });

  const [aggregate] = await Review.aggregate([
    { $match: { vendorId: vendor._id } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await VendorProfile.updateOne(
    { _id: vendor._id },
    { $set: { 'stats.ratingAvg': aggregate.average, 'stats.reviewCount': aggregate.count } },
  );

  return res.status(201).json({ review });
});
