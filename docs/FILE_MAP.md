# Project File Map

## Root level
- package.json — shared scripts for testing, building, and launching the app
- .env.example — environment template for both frontend and backend configuration
- README.md — project overview and setup instructions
- .gitignore — ignores dependencies, local env files, and build artifacts

## Server
- server/server.js — Express entry point and middleware setup
- server/routes/ — auth, interview, coach, payment, and admin APIs
- server/db/ — SQLite database connection and schema helpers
- server/services/ — business logic helpers such as payments and gamification
- server/tests/ — regression tests for interview logic

## Frontend
- src/src/App.jsx — main app UI and feature flows
- src/src/Landing.jsx — landing page experience
- src/src/AdminDashboard.jsx — admin interface
- src/src/styles.css — shared styling
- src/vite.config.js — Vite configuration
