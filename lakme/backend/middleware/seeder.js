const Service = require('../models/Service');
const User = require('../models/User');

const services = [
  // Hair
  { name: 'Signature Haircut', category: 'Hair', description: 'Expert cut tailored to your face shape by our master stylists', price: 599, duration: 45, popular: true },
  { name: 'Hair Color (Global)', category: 'Hair', description: 'Full head color with premium Lakme professional products', price: 1999, duration: 120, popular: true },
  { name: 'Balayage & Highlights', category: 'Hair', description: 'Natural sun-kissed highlights with hand-painting technique', price: 3499, duration: 150, popular: true },
  { name: 'Keratin Smoothening', category: 'Hair', description: 'Professional keratin treatment for frizz-free, silky hair', price: 4999, duration: 180 },
  { name: 'Hair Spa', category: 'Hair', description: 'Deep conditioning & nourishing hair spa treatment', price: 1299, duration: 60 },
  { name: 'Nanoplastia', category: 'Hair', description: 'Advanced hair straightening for ultra-smooth results', price: 6999, duration: 240 },
  { name: 'Butterfly Haircut', category: 'Hair', description: 'Trendy layered butterfly cut for voluminous look', price: 799, duration: 60, popular: true },

  // Skin
  { name: 'Classic Facial', category: 'Skin', description: 'Deep cleansing facial with extraction and hydration', price: 999, duration: 60 },
  { name: 'Hydrafacial', category: 'Skin', description: 'Multi-step facial with cleansing, peeling, extraction & hydration', price: 2999, duration: 75, popular: true },
  { name: 'Korean Glass Skin', category: 'Skin', description: 'Advanced Korean treatment for luminous, translucent skin', price: 3499, duration: 90, popular: true },
  { name: 'Anti-Aging Treatment', category: 'Skin', description: 'Rejuvenating treatment to reduce fine lines & wrinkles', price: 2499, duration: 75 },
  { name: 'Tan Removal', category: 'Skin', description: 'Effective de-tanning treatment for even skin tone', price: 1299, duration: 60 },

  // Nails
  { name: 'Classic Manicure', category: 'Nails', description: 'Complete nail care with cuticle treatment and polish', price: 499, duration: 45 },
  { name: 'Gel Nail Extension', category: 'Nails', description: 'Beautiful gel extensions in your choice of design', price: 1499, duration: 90, popular: true },
  { name: 'Nail Art (10 nails)', category: 'Nails', description: 'Creative custom nail art by our expert technicians', price: 999, duration: 60 },
  { name: 'Pedicure Royale', category: 'Nails', description: 'Luxurious foot care with scrub, massage and polish', price: 799, duration: 60 },

  // Bridal
  { name: 'Pre-Bridal Package', category: 'Bridal', description: 'Complete 6-session bridal prep: facials, body polishing, hair', price: 15999, duration: 360, popular: true },
  { name: 'Bridal Makeup', category: 'Bridal', description: 'Full day bridal makeup with airbrush finish', price: 12999, duration: 180, popular: true },
  { name: 'Mehendi Application', category: 'Bridal', description: 'Intricate bridal mehendi design by expert artists', price: 2999, duration: 120 },

  // Makeup
  { name: 'Party Makeup', category: 'Makeup', description: 'Glamorous makeup for any special occasion', price: 2499, duration: 60 },
  { name: 'Natural Look Makeup', category: 'Makeup', description: 'Flawless everyday makeup with dewy finish', price: 1499, duration: 45 },

  // Spa
  { name: 'Full Body Massage', category: 'Spa', description: 'Relaxing Swedish or deep tissue full body massage', price: 2999, duration: 90 },
  { name: 'Body Polishing', category: 'Spa', description: 'Exfoliating body treatment for glowing skin', price: 2499, duration: 75 },
  { name: 'Foot Reflexology', category: 'Spa', description: 'Therapeutic foot massage for stress relief', price: 999, duration: 45 },
];

const seedDB = async () => {
  try {
    const serviceCount = await Service.countDocuments();
    if (serviceCount === 0) {
      await Service.insertMany(services);
      console.log('✅ Services seeded');
    }

    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({
        name: 'Lakme Admin',
        email: 'admin@lakmesalon.com',
        phone: '9999999999',
        password: 'Admin@123',
        role: 'admin'
      });
      console.log('✅ Admin seeded — email: admin@lakmesalon.com / password: Admin@123');
    }
  } catch (err) {
    console.error('Seeder error:', err.message);
  }
};

seedDB();
