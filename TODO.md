- [ ] Inspect remaining DB usages (getDb() prepare/get/run/all) across server routes/services
- [ ] Update server/db/database.js to provide a unified adapter for SQLite + Postgres
- [ ] Implement Postgres schema creation + seeding in initializeDatabase() when DATABASE_URL is set
- [ ] Refactor routes/services to use new DB adapter (no direct better-sqlite3 prepare().run/get/all)
- [ ] Fix any SQL/param-style issues (SQLite '?' -> Postgres $1) and time functions
- [ ] Update Dockerfile / docs if needed for DATABASE_URL and init
- [ ] Run tests (npm test + server tests)
- [ ] Quick manual smoke: start server with Postgres URL; hit /api/health and auth endpoints

