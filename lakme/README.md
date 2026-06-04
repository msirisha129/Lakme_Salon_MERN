# Lakmé Salon MERN Application

A luxury salon management system featuring an AI Beauty Assistant, Voice-activated booking, and automated appointment reminders.

## Render Deployment Guide

### 1. Backend Configuration
Deploy the `backend` folder as a **Web Service**.

| Variable | Description | Example/Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `5000` (Render detects this automatically) |
| `MONGO_URI` | MongoDB Atlas Connection String | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for auth tokens | `your_random_long_string` |
| `GROQ_API_KEY` | API Key from Groq Console (for AI) | `gsk_...` |
| `RESEND_API_KEY` | API Key from Resend.com (for Email) | `re_...` |
| `EMAIL_FROM` | Verified sender email in Resend | `onboarding@resend.dev` |
| `RECAPTCHA_SECRET` | Google reCAPTCHA v3 Secret Key | `6Le...` |
| `REDIS_URL` | (Optional) Render Redis URL for rate limiting | `rediss://...` |
| `USER_BOOKINGS_PER_DAY` | Max bookings allowed per user | `3` |
| `GUEST_EMAIL_BOOKINGS_PER_DAY` | Max bookings per guest email | `2` |

#### Optional SMS/WhatsApp (Twilio)
If you wish to enable mobile notifications:
| Variable | Description |
| :--- | :--- |
| `TWILIO_ACCOUNT_SID` | Your Twilio SID |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token |
| `TWILIO_PHONE` | Your Twilio Phone Number |
| `TWILIO_WHATSAPP` | Your Twilio WhatsApp Number |

---

### 2. Frontend Configuration
Deploy the `frontend` folder as a **Static Site**.

| Variable | Description | Value |
| :--- | :--- | :--- |
| `REACT_APP_API_URL` | The URL of your deployed Backend | `https://your-backend.onrender.com/api` |
| `REACT_APP_RECAPTCHA_SITE_KEY` | Google reCAPTCHA v3 Site Key | `6Le...` |

**Important:** Ensure your `REACT_APP_API_URL` ends with `/api` as the frontend utilities expect this prefix.

---

### 3. Key Functionalities implemented

*   **AI Voice Assistant**: Hands-free booking flow using Web Speech API and Groq LLM.
*   **Logical Noise Gate**: Frontend audio analyzer to filter background noise during voice interaction.
*   **Profanity Filtering**: Multi-layer (client & server) rejection of vulgar or irrelevant prompts.
*   **Booking Validation**: Prevents double-booking same slots and blocks past-date selections.
*   **Rate Limiting**: Protects your API and prevents spam via Redis or In-Memory sliding windows.
*   **Email Notifications**: Professional HTML templates for confirmations and reminders.
*   **Admin Dashboard**: Real-time stats, log monitoring (Booking, User, Error, App), and service management.

### 4. Local Setup

1.  **Backend**:
    ```bash
    cd backend
    npm install
    npm start
    ```
2.  **Frontend**:
    ```bash
    cd frontend
    npm install
    npm start
    ```

### 5. Troubleshooting
*   **Microphone not working?** Ensure the site is served over `https`. Browsers block microphone access on insecure `http` connections.
*   **Emails not sending?** Verify your `RESEND_API_KEY` and ensure the `EMAIL_FROM` address is verified in your Resend dashboard.
*   **Reminders not firing?** On Render's Free Tier, services spin down after inactivity. Background cron jobs (`reminderJob.js`) will not run while the service is asleep.

---
*Developed for Lakmé Salon — Premium Beauty Experience.*