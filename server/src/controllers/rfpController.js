import Rfp from '../models/Rfp.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { findMatchingVendors } from '../services/matchingService.js';

export const createRfp = asyncHandler(async (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ message: 'Only customers can create an RFP' });
  }

  const {
    category,
    title,
    description,
    budgetMin,
    budgetMax,
    location,
    eventDate,
    deadline,
    dynamicFields = {},
    tags = [],
  } = req.body;

  if (!dynamicFields || typeof dynamicFields !== 'object' || Array.isArray(dynamicFields)) {
    return res.status(400).json({ message: 'dynamicFields must be an object' });
  }
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
    return res.status(400).json({ message: 'tags must be an array of strings' });
  }

  const rfp = new Rfp({
    customerId: req.user._id,
    category,
    title,
    description,
    budgetMin,
    budgetMax,
    location,
    eventDate,
    deadline,
    dynamicFields,
    tags,
  });
  await rfp.validate();

  const matchedVendors = await findMatchingVendors(rfp);
  rfp.matchedVendorIds = matchedVendors.map(({ _id }) => _id);
  await rfp.save();

  for (const vendor of matchedVendors) {
    req.io?.to(`user:${vendor.userId._id}`).emit('lead:matched', {
      rfpId: rfp._id,
      title: rfp.title,
      category: rfp.category,
      location: rfp.location,
      budgetMin: rfp.budgetMin,
      budgetMax: rfp.budgetMax,
    });
  }

  return res.status(201).json({
    rfp,
    matchedVendorCount: matchedVendors.length,
  });
});
