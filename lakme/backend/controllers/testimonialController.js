const Testimonial = require('../models/Testimonial');

// GET /api/testimonials
exports.getTestimonials = async (req, res) => {
  try {
    const { approved } = req.query;
    const filter = {};
    if (approved === 'true') filter.approved = true;
    if (approved === 'false') filter.approved = false;
    const items = await Testimonial.find(filter).sort({ createdAt: -1 });
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
    const t = new Testimonial({ name, service, rating, text, imageUrl, approved: false });
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
    const updated = await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid data' });
  }
};

// DELETE /api/testimonials/:id
exports.deleteTestimonial = async (req, res) => {
  try {
    const removed = await Testimonial.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
