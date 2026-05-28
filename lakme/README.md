# 💄 Lakmé Salon — Full Stack MERN App

A complete luxury salon web application with AI hairstyle advisor, booking system, chatbot, and admin panel.

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

---

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set your MONGO_URI and JWT_SECRET
npm run dev
```

> Backend runs on **http://localhost:5000**
>
> ✅ Auto-seeds: 24 services + admin account on first run
>
> **Admin login:** admin@lakmesalon.com / Admin@123

---

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
```

> Frontend runs on **http://localhost:3000**

---

## 📱 Pages & Features

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Hero, services, AI banner, testimonials |
| Services | `/services` | Browse all services with category filters |
| Booking | `/booking` | 4-step appointment booking flow |
| AI Stylist | `/hairstyle` | AI hairstyle recommendations |
| Contact | `/contact` | Multi-channel: WhatsApp, Call, Email, SMS |
| Login | `/login` | Authentication |
| Register | `/register` | New account creation |
| Dashboard | `/dashboard` | User bookings, loyalty points, feedback |
| Admin | `/admin` | Full admin panel (admin only) |

---

## 🤖 AI Features

### Hairstyle Advisor (`/hairstyle`)
- Select face shape, hair type, desired length, occasion
- Gets top 3 personalized style recommendations
- Each recommendation includes color suggestion + bookable service

### Virtual Assistant Chatbot
- Floating chat widget on all pages
- Handles: booking, pricing, services, hours, contact, hairstyle suggestions
- Quick reply buttons for common questions
- Navigate-to-page actions

---

## 🔐 API Endpoints

```
POST   /api/auth/register         Register user
POST   /api/auth/login            Login
GET    /api/auth/me               Get current user

GET    /api/services              List services (filter by ?category=Hair)
POST   /api/services              Create service (admin)
PUT    /api/services/:id          Update service (admin)
DELETE /api/services/:id          Delete service (admin)

GET    /api/bookings/slots?date=  Get available time slots
POST   /api/bookings              Create booking
GET    /api/bookings/my           My bookings
PUT    /api/bookings/:id/cancel   Cancel booking
PUT    /api/bookings/:id/feedback Submit feedback
GET    /api/bookings/admin/all    All bookings (admin)
PUT    /api/bookings/:id/status   Update status (admin)

POST   /api/ai/hairstyle          AI hairstyle recommendations
POST   /api/ai/chat               Chatbot response

POST   /api/contact               Send contact message
GET    /api/admin/stats           Dashboard stats (admin)
```

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--gold` | #C9A84C | Primary accent |
| `--rose` | #C8003B | Lakmé red |
| `--black` | #0A0A0A | Dark backgrounds |
| `--cream` | #FDF8F0 | Light backgrounds |
| Font Display | Cormorant Garamond | Headings |
| Font Body | DM Sans | Body text |

---

## 🚢 Deployment

### Backend (Render)
1. Create new Web Service on Render
2. Connect GitHub repo, set root to `/backend`
3. Build: `npm install` | Start: `npm start`
4. Add environment variables from `.env.example`
5. Set MONGO_URI to MongoDB Atlas connection string

### Frontend (Vercel)
1. Import repo to Vercel, set root to `/frontend`
2. Set `REACT_APP_API_URL` to your Render backend URL
3. Update `proxy` in `package.json` or use env variable

---

## 📊 Demo Credentials
- **Admin:** admin@lakmesalon.com / Admin@123
- **User:** Register any account at `/register`
