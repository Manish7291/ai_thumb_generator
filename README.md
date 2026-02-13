# ThumbnailAI — AI-Powered Thumbnail Generator (SaaS)

Generate stunning YouTube thumbnails with AI. Describe your content, enhance with Gemini, create with Hugging Face.

## Features

- **User:** Register, login, JWT auth
- **AI Thumbnails:** Prompt enhancement (Gemini) + Image generation (Hugging Face)
- **Free tier:** 2 generations
- **Premium:** Razorpay (TEST MODE), unlimited generations
- **Dashboard:** Thumbnail gallery, download
- **Email:** Notification when thumbnail is ready
- **Admin:** View users, generations, payments; toggle premium

## Getting Started

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env.local` and fill in:

```env
MONGODB_URI=          # MongoDB Atlas connection string
JWT_SECRET=           # Min 32 chars (use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
GEMINI_API_KEY=       # Google AI Studio
HUGGINGFACE_API_KEY=  # Hugging Face (hf_xxx)
RAZORPAY_KEY_ID=      # rzp_test_xxx (TEST MODE)
RAZORPAY_KEY_SECRET=  # TEST secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=            # Gmail
SMTP_PASS=            # App password
```

### 3. Create Admin

```bash
npm run seed:admin
```

Default: `admin@thumbnailai.test` / `admin123`

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Scripts

- `npm run dev` — Development
- `npm run build` — Production build
- `npm run start` — Production server
- `npm run seed:admin` — Create admin user

## Tech Stack

- Next.js 14 (App Router)
- MongoDB + Mongoose
- Tailwind + ShadCN UI
- Gemini (prompt enhancement)
- Hugging Face (image generation)
- Razorpay (TEST MODE)
- Nodemailer

## Deployment

1. Set all env vars in your hosting (Vercel, etc.)
2. Add `NEXT_PUBLIC_APP_URL` (e.g. `https://yourdomain.com`) for emails
3. Run `npm run build` and `npm run start`
