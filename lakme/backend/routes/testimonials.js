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
router.put('/:id', protect, adminOnly, updateTestimonial);
router.delete('/:id', protect, adminOnly, deleteTestimonial);

module.exports = router;
