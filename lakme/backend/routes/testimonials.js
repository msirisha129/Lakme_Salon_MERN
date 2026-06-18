const express = require('express');
const router = express.Router();
const {
  getTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial
} = require('../controllers/testimonialController');
const { protect, adminOnly } = require('../middleware/auth');

// Public listing (filter by ?approved=true)
router.get('/', getTestimonials);

// Allow authenticated users to submit testimonials (starts unapproved)
router.post('/', protect, createTestimonial);

// Admin controls: update (including approve) and delete
// Allow owners to edit/delete their own reviews; admin can edit/delete any
router.put('/:id', protect, updateTestimonial);
router.delete('/:id', protect, deleteTestimonial);

module.exports = router;
