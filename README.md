# Interview Copilot AI

Interview Copilot AI is a polished, AI-assisted interview preparation platform built with React, Vite, Node.js, and Express. It helps candidates practice company-specific interviews, solve DSA problems, refine resumes, and improve presentation skills through coaching and feedback.

## What it does

- Resume analysis and company-tailored interview prep
- Mock interview generation and answer evaluation
- Voice-style interview simulation
- DSA practice with guided help
- Career coach reports and readiness scoring
- Resume builder and job recommendation suggestions
- Resume-to-role matching
- Daily challenges for streak-based growth
- Speech coaching for filler-word awareness
- ATS-style resume scoring and learning-path generation
- Community challenges, gamification, leaderboards, and user progress tracking
- Authentication, admin tools, payments, and production-ready logging

## Features now included

- Personalized resume intelligence
- AI interview help chatbot
- Voice-style mock interviews
- DSA practice mode
- Recruiter-style answer scoring
- Personalized career growth roadmap
- Resume builder
- Job recommendation engine
- Resume-to-role match scoring
- ATS resume scoring
- Learning path generation
- Coding interview simulator
- Community challenge module
- Daily streak-style practice challenges
- Speech coaching feedback
- Gamified XP, streaks, badges, and leaderboards
- Auth, admin analytics, and payments hooks
- Structured server logging and health monitoring

## Tech stack

### Frontend
- React
- Vite
- CSS

### Backend
- Node.js
- Express
- dotenv
- CORS
- Helmet
- Rate limiting
- Multer
- JWT-based authentication

### Data & persistence
- SQLite via better-sqlite3 for local development
- PostgreSQL support through DATABASE_URL for production and managed databases

### AI & testing
- Optional Gemini AI integration
- Node.js built-in test runner
- Docker support for containerized deployment

## Project structure

- src/ - React frontend application
- server/ - Express backend and business logic
- server/routes/ - API routes for auth, interviews, coaching, payments, and admin tools
- server/db/ - database connection and schema helpers
- server/tests/ - backend regression tests
- docs/ - project documentation and file map
- scripts/ - helper scripts for local development

## Getting started

1. Install dependencies
   - npm install
   - npm --prefix src install

2. Create environment variables
   - Copy .env.example to .env and update the values

3. Start the app
   - npm run dev
   - Or use the helper script: powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1

4. Open the app in your browser
   - Frontend: http://localhost:5173
   - Backend: http://localhost:4000

## Production environment variables

Set these values in your deployment environment:

- PORT=4000
- HOST=0.0.0.0
- CORS_ORIGIN=https://your-domain.com,http://localhost:5173
- JWT_SECRET=interview-copilot-prod-secret-2026
- DATABASE_URL=postgresql://postgres:strong-password@your-db-host:5432/interviewcopilot?sslmode=require
- GEMINI_API_KEY=your_google_gemini_api_key_here
- GEMINI_MODEL=gemini-2.0-flash

### Database setup

- For local development, the app can run with SQLite when DATABASE_URL is empty.
- For production, connect a managed PostgreSQL database such as Neon, Supabase, Railway, or Azure Database for PostgreSQL by setting DATABASE_URL.

## Notes

The app gracefully falls back to local logic when Gemini is not configured, and it is ready for deployment with a managed database and secure production environment values.
