# Deploy to Render (free tier)

This app runs as **one Web Service** on Render: the Node server serves both the API and the built Angular frontend.

## 1. Push code to GitHub

If you haven’t already:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 2. Create the service on Render

1. Go to [render.com](https://render.com) and sign in (or sign up with GitHub).
2. **Dashboard** → **New** → **Web Service**.
3. Connect your GitHub repo (the one that contains this project).
4. Use these settings:

   | Field | Value |
   |-------|--------|
   | **Name** | `employee-production-output` (or any name) |
   | **Region** | Choose nearest to you |
   | **Root Directory** | *(leave empty)* |
   | **Runtime** | Node |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm start` |
   | **Instance Type** | Free |

5. **Advanced** (optional):
   - Add env var `NODE_ENV` = `production` (Render often sets this automatically).

6. Click **Create Web Service**.

Render will install deps, run the build (frontend + copy to `backend/public`), then start the backend. The first deploy can take a few minutes.

## 3. Open the app

When the deploy is green, open the URL Render shows (e.g. `https://employee-production-output-xxxx.onrender.com`). You should see the app; the same URL serves both the UI and the API.

## 4. Data and free tier

- **Data:** The app stores data in `backend/data.json` on the server. On Render’s **free tier**, the filesystem is **ephemeral**: data can be reset on redeploys or after inactivity. For 3 users and non-critical data this is usually acceptable.
- **Sleep:** Free instances spin down after ~15 minutes of no traffic. The first request after that may take 30–60 seconds to respond.
- **Upgrades:** To keep the service always on and (where offered) persistent disk, use a paid plan (e.g. **Starter**).

## 5. Local development (unchanged)

- **Backend:** `cd backend && npm run start` (or `node server.js`).
- **Frontend:** `cd frontend && npm start` (Angular dev server with proxy to `localhost:3001`).
- Open **http://localhost:4200** – API calls are proxied to the backend.

## Troubleshooting

- **Build fails:** Check the Render build logs. Ensure both `frontend` and `backend` have a `package.json` and that `npm run build` in the repo root completes locally (`npm run build`).
- **Blank page:** Confirm the **Start Command** is `npm start` (runs `cd backend && node server.js`) and that the build step completed (so `backend/public` contains the Angular build).
- **API errors:** The frontend uses the relative path `/api`, so it must be served from the same host as the backend (single Web Service). Don’t put the frontend on a separate Static Site unless you change the API base URL and CORS.
