# RedSquatch Architecture & Technology Decisions

**Document Version:** 1.0  
**Last Updated:** June 2026  
**Author:** Darryl (CTO)  
**Status:** Current

---

## 1. Executive Summary

RedSquatch is a self-hosted command and control dashboard built on **React (TypeScript) + Node.js (Express)** backend, deployed on a personal VPS using **Docker** and **Coolify** for orchestration. We chose this stack to balance rapid feature development, maintainability, and operational simplicity for a single-developer platform business.

**Core Value:** Fast iteration on features (widgets, integrations, analytics) while keeping infrastructure costs low and deployment friction minimal.

---

## 2. Technology Stack Overview

```
Frontend:    React 18+ (TypeScript) + Vite
Backend:     Node.js + Express (TypeScript)
Database:    PostgreSQL + MariaDB (legacy)
Hosting:     Self-hosted VPS (Ubuntu 24)
Orchestration: Docker + Docker Compose → Coolify
CI/CD:       GitHub Actions (planned)
Auth:        Custom session-based + JWT strategy
```

---

## 3. Frontend: React + TypeScript

### Why React?

**1. Component Reusability**
- RedSquatch is a dashboard of widgets (weather, sports scores, quotes, etc.). Each widget is a self-contained React component.
- Widgets share common patterns: data fetching, error states, loading states, styling.
- React's component model makes it natural to build, reuse, and combine these patterns.

**2. Ecosystem Maturity**
- Rich library ecosystem for: routing (React Router), state management (if needed), form handling, charting, animations.
- Large community means solutions already exist for common problems.
- TypeScript support is first-class, not bolted on.

**3. Developer Experience**
- Fast feedback loop with Vite (instant HMR).
- DevTools are excellent.
- Learning curve is gentler than Vue or Svelte for someone coming from vanilla JS.

**4. Hiring & Collaboration**
- If RedSquatch ever needs contractors or a second developer, React is the most recognizable name.
- Resume value for you personally.

### Why TypeScript?

**Safety Without Overhead**
- Catches bugs at compile time (typos, wrong argument types, missing properties).
- Makes refactoring easier and less scary.
- Self-documents code—types are documentation.
- Performance: TypeScript compiles away; no runtime cost.

**Trade-off:** Slightly slower initial development (typing takes time) but pays off fast on medium+ projects.

### What We Didn't Choose & Why

| Framework | Why We Passed |
|-----------|---------------|
| **Vue** | Smaller ecosystem, less portable skills |
| **Svelte** | Great performance, but ecosystem is smaller; riskier for hiring later |
| **Angular** | Overkill for a dashboard; too opinionated; verbose |
| **Plain HTML/CSS/JS** | No modularity; would become unmaintainable fast as features grow |

---

## 4. Backend: Node.js + Express

### Why Node.js?

**1. JavaScript Everywhere**
- Same language on frontend and backend = shared code patterns, shared mental model.
- Shared libraries (utilities, type definitions) across the full stack.
- One toolchain (npm, TypeScript compiler, linting rules).

**2. Non-Blocking I/O**
- Perfect for I/O-heavy work: proxying API calls (weather, sports), database queries, file operations.
- Handles many concurrent requests without threads.
- Scales well for a solo operator.

**3. Express Ecosystem**
- Minimal, unopinionated framework—you control the structure.
- Thousands of well-maintained middleware packages.
- Simple to debug: linear request-response flow, no magic.

**4. Rapid Development**
- Less boilerplate than Java/C#.
- Hot-reload friendly (nodemon).
- Easy to prototype APIs.

### Why Express (Not Next.js API Routes)?

You're using **Next.js on the frontend**, so this is a fair question.

**Separation of Concerns**
- Frontend and backend can scale independently.
- Backend can be deployed separately, restarted without rebuilding frontend.
- Clear API contract (REST or GraphQL) instead of implicit file-system routing.

**Operational Simplicity**
- Express runs in its own container; frontend is static assets.
- Easier to debug and profile.
- Can swap out backend without touching frontend.

**Trade-off:** More moving parts (two services instead of one), but Coolify and Docker Compose make this painless.

### What We Didn't Choose & Why

| Framework | Why We Passed |
|-----------|---------------|
| **Next.js API Routes** | Good for small projects; becomes messy when frontend and backend grow independently |
| **Django/Flask** | Different language; would fragment the skillset |
| **Rails** | Different language; more opinionated; slower to iterate |
| **Go (Gin, Echo)** | Compiled language adds deployment complexity; overkill for widget proxying |

---

## 5. Database: PostgreSQL + Docker

### Why PostgreSQL?

**Reliability & Features**
- ACID guarantees: transactions work correctly.
- JSON support (JSONB) for semi-structured data.
- Full-text search, arrays, custom types if needed.
- Excellent query planner and indexes.

**Operational**
- Open source; no licensing surprises.
- Runs well in Docker.
- Great tooling (pgAdmin, psql CLI).
- Can handle complex queries you might throw at it later.

### Legacy: MariaDB

Your original stack used MariaDB. Sticking with it until a clear reason to migrate emerges (e.g., JSONB features needed, performance issues). No urgency to switch.

---

## 6. Infrastructure: Docker + Coolify + VPS

### Why Self-Hosted on a VPS?

**Cost**
- Fixed monthly VPS cost (~$10–30/month) vs. AWS/Vercel per-request pricing.
- No surprise bills; perfect for a bootstrapped company.

**Control**
- Full root access; can run anything (n8n, Vercel CLI, custom services).
- Data stays on your hardware.
- No vendor lock-in.

**Learning**
- You own the ops; great education.
- Mistakes are learning moments at low cost.

### Why Docker?

**Reproducibility**
- Same image runs locally and on VPS.
- Easy to add services (new database, cache, task queue) without manual config.

**Isolation**
- Frontend, backend, database are separate containers.
- One crashes, others stay up.
- Easy to restart, rebuild, or swap without touching the whole system.

### Why Coolify?

**Self-Hosted PaaS**
- One-click deployments from GitHub.
- Automatic SSL (Let's Encrypt).
- Free alternative to Heroku/Railway.
- Traefik reverse proxy handles routing and load balancing.

**Trade-off:** You're responsible for backups, monitoring, and uptime. For a bootstrapped project, that's acceptable.

---

## 7. Deployment & DevOps

### Current Flow

1. Push to GitHub → Coolify webhook triggers
2. Coolify pulls latest code, runs `docker build`
3. New container(s) are spun up
4. Traefik routes traffic (SSL termination, subdomain routing)
5. Old containers are torn down

### Future Improvements

- **CI/CD Automation:** GitHub Actions for testing before deploy.
- **Monitoring:** Sentry for error tracking, simple uptime monitoring.
- **Backups:** Automated PostgreSQL backups to S3-compatible storage.
- **Logging:** Centralized logs (e.g., Loki or ELK stack).

---

## 8. Authentication & Authorization

### Current Approach

Custom session-based auth with JWT tokens for API access.

**Rationale:**
- Simple for single-user dashboard (just you).
- No third-party dependency (Auth0, Okta).
- Full control over token scope and expiry.

**Security Considerations:**
- Tokens stored securely (HttpOnly cookies).
- Short expiry times (15 min); refresh tokens have longer life.
- Rate limiting on login endpoints.
- CORS properly configured.

### Scaling Auth

When RedSquatch onboards users:
- Consider OAuth2 (GitHub, Google) for simplicity.
- Role-based access control (RBAC) in the database.
- Audit logs for compliance.

---

## 9. API Design (REST)

### Rationale for REST (Not GraphQL)

**Simplicity**
- Standard HTTP methods (GET, POST, PUT, DELETE).
- Caching works out of the box (ETags, Last-Modified).
- Debugging with curl, Postman, browser DevTools.

**Maintenance**
- Versioning is straightforward (e.g., `/api/v1/`, `/api/v2/`).
- No overfetching / underfetching issues for your current widget-fetching use case.

**Scaling Decision:** If the API becomes complex (nested resources, many client types), GraphQL is a future option.

---

## 10. State Management & Frontend Architecture

### Why No Global State Library (Yet)?

- React's Context + useState handles widget-level state.
- Props drill is fine for shallow trees.
- No Redux/Zustand overhead until needed.

### When to Add One

If you have:
- Deeply nested components needing shared state.
- Complex state transitions (e.g., multi-step forms).
- Undo/redo or time-travel debugging needs.

**Recommendation:** Zustand over Redux (simpler, less boilerplate).

---

## 11. Testing Strategy

### Current State

Minimal formal testing (tests exist but not comprehensive).

### Recommended Approach

**Unit Tests (Jest)**
- Critical business logic: auth, calculations, data transforms.
- Aim for 70%+ coverage, not 100%.

**Integration Tests (Supertest)**
- API endpoints: happy path + error cases.
- Database interactions.

**E2E Tests (Playwright/Cypress)**
- User flows: login → view widgets → interact → logout.
- Run in CI/CD before deploy.

**Implementation Priority:**
1. Auth flows (highest risk).
2. Widget data-fetching (external API failures).
3. Core features as you add them.

---

## 12. Monitoring & Observability

### Current Gaps

- No centralized logging.
- No error tracking.
- Manual uptime checks.

### Recommended Stack (Low-Cost)

| Tool | Purpose | Cost |
|------|---------|------|
| **Sentry** | Error tracking & alerting | Free tier adequate |
| **Uptime Robot** | Monitor VPS health | Free |
| **CloudFlare Analytics Engine** (if using CF) | Traffic & performance | Free |
| **PostgreSQL Logs** | Database debugging | Built-in |

### Dashboard Ideas

- Sentry dashboard for errors.
- Grafana dashboard for system metrics (CPU, memory, disk).
- Simple status page (Updown.io or custom).

---

## 13. Security Baseline

### Implemented

- HTTPS everywhere (Coolify + Let's Encrypt).
- CORS properly configured.
- Input validation on all endpoints.
- SQL injection prevention (prepared statements in all DB queries).

### To Add

- CSRF protection (token-based or SameSite cookies).
- Rate limiting (express-rate-limit).
- Helmet.js (HTTP security headers).
- Dependency scanning (Dependabot).
- Secrets management (environment variables, not hardcoded).

### Audit Schedule

- Quarterly: review access logs, rotate secrets.
- Annually: dependency audit, security review.

---

## 14. Scalability Roadmap

### Phase 1 (Current): Single User, Single VPS

- Sufficient for you + ~100 concurrent users.
- Database: PostgreSQL can handle millions of rows.
- Backend: Node.js can handle ~1000s of req/sec on modest hardware.

### Phase 2: Multi-User, Same VPS

- Add user authentication & isolation.
- Database schema changes for multi-tenancy.
- Rate limiting per user.

### Phase 3: Scale Out

- Database: Read replicas, connection pooling.
- Backend: Kubernetes or bare Docker Swarm.
- Frontend: CDN for static assets.
- Cache layer: Redis for sessions, API responses.

---

## 15. Development Workflow

### Local Environment

```bash
# Clone repo
git clone https://github.com/RedSquatch/dashboard.git
cd dashboard

# Install dependencies
npm install

# Start services (Docker Compose)
docker-compose up -d

# Run frontend dev server
npm run dev

# Run backend dev server (separate terminal)
npm run dev:server
```

### Code Standards

- **Linting:** ESLint + Prettier.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, etc.).
- **Branches:** `main` (production), `develop` (staging), feature branches (`feat/widget-name`).
- **PRs:** Self-review before merge; run tests locally first.

---

## 16. Decision Log

| Decision | Date | Rationale | Status |
|----------|------|-----------|--------|
| React + TypeScript | June 2024 | Component model, ecosystem, type safety | ✅ Active |
| Node.js + Express | June 2024 | Full-stack JS, non-blocking I/O, rapid dev | ✅ Active |
| PostgreSQL | June 2024 | Reliability, JSON support, ACID guarantees | ✅ Active |
| Self-hosted VPS | June 2024 | Cost control, full access, learning opportunity | ✅ Active |
| Coolify for orchestration | June 2024 | One-click deploys, built-in reverse proxy, free | ✅ Active |
| No global state lib (yet) | June 2024 | Props drilling sufficient; avoid premature optimization | ⏳ Revisit Q3 2026 |
| REST API (not GraphQL) | June 2024 | Simplicity, standard caching, future flexibility | ✅ Active |

---

## 17. Frequently Asked Questions

**Q: Why not use a managed database (RDS, Railway, Supabase)?**  
A: Cost. On a VPS, PostgreSQL is included in the fixed monthly fee. Managed services add per-GB costs.

**Q: Should we use TypeScript everywhere?**  
A: Yes. It's a small upfront cost that pays dividends as the codebase grows.

**Q: When should we add caching (Redis)?**  
A: When you see repeated database queries for the same data (e.g., user profile, widget config). Start with in-memory caching in Node.js; add Redis if needed.

**Q: How do we handle database migrations?**  
A: Use an ORM (Knex.js, Sequelize) or migration tool (Alembic, Flyway). Current approach: manual SQL files with version control.

**Q: Is this stack suitable for a SaaS?**  
A: Yes, with changes. Current architecture is single-tenant; scaling to multi-tenant requires schema design work (separate databases per user or row-level isolation).

---

## 18. Conclusion & Next Steps

RedSquatch's stack is deliberately chosen for **rapid iteration by a solo founder** while maintaining the flexibility to scale. The tech is boring (which is good)—focus is on product, not infrastructure.

### Immediate Priorities

1. Document the database schema (`SCHEMA.md`).
2. Create runbooks for common ops tasks (backup, deploy, troubleshoot).
3. Add monitoring (Sentry for errors, Uptime Robot for health).
4. Set up GitHub Actions for CI/CD.

### Long-Term Vision

- Build RedSquatch into a platform others can self-host or SaaS subscribe to.
- Expand widget ecosystem (integrations, third-party plugins).
- Monetize via premium features or managed hosting option.

---

**Questions or clarifications?** Open a GitHub issue or discussion. Documentation evolves with the product.
