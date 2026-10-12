import Lead from '../models/Lead.js';
import VendorProfile from '../models/VendorProfile.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const allowedMoves = {
  new_lead: ['consulting', 'cancelled'],
  consulting: ['quoted', 'cancelled'],
  quoted: ['closed_won', 'cancelled'],
  closed_won: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const updateLeadStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== 'vendor') {
    return res.status(403).json({ message: 'Only vendors can update CRM leads' });
  }

  const profile = await VendorProfile.findOne({ userId: req.user._id }).select('_id');
  if (!profile) return res.status(404).json({ message: 'Vendor profile not found' });

  const { status, quotedAmount } = req.body;
  const lead = await Lead.findOne({ _id: req.params.id, vendorId: profile._id });
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  if (!Object.hasOwn(allowedMoves, status)) {
    return res.status(400).json({ message: 'Invalid lead status' });
  }
  if (status !== lead.status && !allowedMoves[lead.status].includes(status)) {
    return res.status(409).json({
      message: `Lead cannot move from ${lead.status} to ${status}`,
    });
  }
  if (
    quotedAmount !== undefined &&
    (typeof quotedAmount !== 'number' || !Number.isFinite(quotedAmount) || quotedAmount < 0)
  ) {
    return res.status(400).json({ message: 'quotedAmount must be a non-negative number' });
  }

  lead.status = status;
  if (quotedAmount !== undefined) lead.quotedAmount = quotedAmount;
  await lead.save();

  req.io?.to(`user:${lead.customerId}`).emit('crm:lead-updated', {
    leadId: lead._id,
    status: lead.status,
  });
  return res.json({ lead });
});
