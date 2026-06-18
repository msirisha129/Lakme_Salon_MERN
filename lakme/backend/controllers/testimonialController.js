const Testimonial = require('../models/Testimonial');

// GET /api/testimonials
exports.getTestimonials = async (req, res) => {
  try {
    const { approved } = req.query;
    const filter = {};
    if (approved === 'true') filter.approved = true;
    if (approved === 'false') filter.approved = false;
    const items = await Testimonial.find(filter).sort({ createdAt: -1 }).populate('user', 'name email');
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/testimonials
exports.createTestimonial = async (req, res) => {
  try {
    const { name, service, rating, text, imageUrl } = req.body;
    const userId = req.user && req.user._id;
    const t = new Testimonial({ name, service, rating, text, imageUrl, approved: false, user: userId });
    await t.save();
    res.status(201).json(t);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid data' });
  }
};

// PUT /api/testimonials/:id
exports.updateTestimonial = async (req, res) => {
  try {
    const t = await Testimonial.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });
    // allow if admin or owner
    if (req.user?.role !== 'admin' && String(t.user) !== String(req.user?._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    Object.assign(t, req.body);
    await t.save();
    res.json(t);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid data' });
  }
};

// DELETE /api/testimonials/:id
exports.deleteTestimonial = async (req, res) => {
  try {
    const t = await Testimonial.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });
    if (req.user?.role !== 'admin' && String(t.user) !== String(req.user?._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await t.remove();
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
