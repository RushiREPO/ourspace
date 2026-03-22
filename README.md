# 💞 Just Us — Private Couples Chat

A real-time, end-to-end private chat app built exclusively for two people.
No sign-up, no third parties, no ads. Just you and your partner.

---

## Features

- 🔒 Private login — only your two accounts exist
- ⚡ Real-time messages via WebSockets (Socket.IO)
- 💬 Typing indicators & online presence
- ❤️ Double-tap reactions on any message
- 📅 Message grouping by date & sender
- 🌙 Beautiful dark romantic UI
- 📱 Mobile-friendly responsive layout
- 🐳 One-command Docker deployment

---

## Quick Start (Local)

### Prerequisites
- Node.js 18+
- npm

### 1. Clone / unzip the project

```bash
cd couple-chat
```

### 2. Set up the backend

```bash
cd backend
npm install
node server.js
```

Server starts on **http://localhost:3001**
Default credentials printed in the terminal.

### 3. Set up the frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend starts on **http://localhost:5173**

### 4. Open in two browser tabs / devices

- Tab 1 → login as **Riya** / `riya123`
- Tab 2 → login as **Arjun** / `arjun123`

---

## Customise Credentials

### Option A — Environment Variables (recommended)

Copy `.env.example` to `.env` and edit:

```bash
cp .env.example .env
```

```env
USER1_NAME=YourName
USER1_PASS=yourStrongPassword1

USER2_NAME=PartnerName
USER2_PASS=partnerStrongPassword2

JWT_SECRET=a-very-long-random-secret-string
```

Then restart the backend.

### Option B — Edit server.js directly

In `backend/server.js`, find the `USERS` array and change `username` and `password` values.

---

## 🚀 Quick Free Worldwide Deployment (Railway)

**Railway** is the easiest way to deploy worldwide for free with WebSocket support.

### 1. Create Railway Account
- Go to [railway.app](https://railway.app)
- Sign up with GitHub (free)

### 2. Deploy Your App
- Click **"New Project"** → **"Deploy from GitHub repo"**
- Connect your GitHub repo (or upload zip)
- Railway will auto-detect and deploy

### 3. Set Environment Variables
In Railway dashboard → **Variables** tab:
```
JWT_SECRET=your-super-long-random-secret-here
USER1_NAME=Sarojana
USER1_PASS=love24
USER2_NAME=Rushi
USER2_PASS=love24
NODE_ENV=production
```

### 4. Get Your Live URL
Railway gives you a **free worldwide URL** like: `https://couple-chat-production.up.railway.app`

**Share this URL with your partner!** ✨

---

## Production Deployment (Docker)

### Prerequisites
- A VPS / server (DigitalOcean, Hetzner, AWS EC2, etc.)
- Docker + Docker Compose installed
- A domain name pointed to your server (optional but recommended)

### Steps

#### 1. Copy files to your server

```bash
scp -r couple-chat/ user@your-server-ip:/home/user/
```

Or use Git:
```bash
git init && git add . && git commit -m "init"
# push to private GitHub repo, then pull on server
```

#### 2. Create your `.env` on the server

```bash
cd couple-chat
cp .env.example .env
nano .env   # fill in real passwords and JWT_SECRET
```

Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

#### 3. Launch with Docker Compose

```bash
docker-compose up -d --build
```

App is now live on port **80**.

#### 4. (Optional) Add HTTPS with Certbot + nginx

On your server (outside Docker):

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d chat.yourdomain.com
```

Or use Caddy as a reverse proxy — it handles TLS automatically:

```bash
# Install Caddy, then create /etc/caddy/Caddyfile:
chat.yourdomain.com {
    reverse_proxy localhost:80
}
```

---

## Deployment on Render.com (Free Tier)

### Backend

1. Create new **Web Service** → connect your repo
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add environment variables from `.env.example`
6. Copy the service URL (e.g. `https://couple-chat-backend.onrender.com`)

### Frontend

1. Create new **Static Site** → connect your repo
2. Root directory: `frontend`
3. Build command: `npm install && npm run build`
4. Publish directory: `dist`
5. Add env var: `VITE_API_URL=https://couple-chat-backend.onrender.com`

---

## Deployment on Railway.app

1. New project → Deploy from GitHub repo
2. Railway auto-detects the `railway.json` config
3. Set environment variables:
   - `JWT_SECRET`: Long random string (generate with `openssl rand -hex 32`)
   - `USER1_NAME` & `USER1_PASS`: Your credentials
   - `USER2_NAME` & `USER2_PASS`: Partner's credentials
   - `NODE_ENV=production`
4. Railway assigns a free worldwide domain automatically
5. Frontend builds and serves from the same domain

**Pro tip**: Railway's free tier includes 512MB RAM, 1GB disk, and worldwide CDN!

---

## Deployment on Fly.io

```bash
# Install flyctl, then:
cd backend && fly launch --name couple-chat-api
cd ../frontend && fly launch --name couple-chat-ui
```

---

## Architecture

```
Browser (Riya)          Browser (Arjun)
      │                       │
      └──────────┬────────────┘
                 │  HTTPS / WSS
           ┌─────▼──────┐
           │   nginx     │  (port 80/443)
           │  (Docker)   │
           └─────┬───────┘
                 │
           ┌─────▼────────────┐
           │  Node.js backend │
           │  Express + WS    │
           │  Socket.IO       │
           │  JWT Auth        │
           └──────────────────┘
```

Messages are stored **in-memory** on the server. They persist as long as the server runs.
For permanent message history, swap the `messages` array in `server.js` with a database (SQLite, PostgreSQL, etc.).

---

## Security Notes

- Change default passwords before deploying
- Use a strong random `JWT_SECRET` (48+ chars)
- Add HTTPS in production (Certbot / Caddy)
- The `noindex, nofollow` meta tag prevents search engine indexing
- No message data is sent to any third party

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, CSS |
| Backend | Node.js, Express |
| Real-time | Socket.IO (WebSockets) |
| Auth | JWT (jsonwebtoken) |
| Serving | nginx |
| Deployment | Docker + Docker Compose |

---

## Troubleshooting

**"Cannot connect to server"** — Make sure the backend is running (`node server.js`) and the `VITE_API_URL` in frontend matches.

**Messages lost on restart** — Normal — messages are in-memory. Add a database for persistence.

**CORS errors** — Set `CLIENT_URL` env var on the backend to match your frontend's URL exactly.

**WebSocket fails in production** — Ensure your nginx config proxies `/socket.io/` with `Upgrade` headers (already done in the provided `nginx.conf`).
