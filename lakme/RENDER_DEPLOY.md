Render deployment and production notes

1) Overview
- This repo contains two deployable services: `backend` (Express API) and `frontend` (React app built with `react-scripts`).

2) Environment variables (set in Render dashboard)
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — JWT signing secret
- `RECAPTCHA_SECRET` — Google reCAPTCHA secret (optional)
- `REACT_APP_API_URL` — frontend -> backend base URL (e.g. https://lakme-backend.onrender.com/api)
- `REACT_APP_RECAPTCHA_SITE_KEY` — reCAPTCHA site key for client

3) Deploy using `render.yaml`
- In your Render project, connect the repo and choose "Deploy using render.yaml". Render will create two services: `lakme-backend` (web) and `lakme-frontend` (static).

4) Local production test
- Build frontend:
```
cd frontend
npm install
npm run build
```
- Start backend (production):
```
cd ../backend
npm install
npm start
```
- Serve frontend locally (optional):
```
npm run start:prod
```

5) Mobile responsiveness
- The app already includes responsive meta tag. Verify key pages (`Home`, `Booking`, `Chatbot`) on mobile and adjust CSS where needed. I can help patch specific components for better breakpoints.

6) Next recommended steps
- Add health checks and readiness probes for backend.
- Add CI pipeline to run `npm test` and `npm run build` before deploying.
- Configure logging (e.g., Logflare) and secret rotation in Render.
