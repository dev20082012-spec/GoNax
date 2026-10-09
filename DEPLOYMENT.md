# GoNax Production Deployment, Security & Operations Guide

## 1. Architectural Overview & Environment Separation

GoNax operates across three distinct operational environments:

| Environment | Purpose | Database | Auth / Security | Logging |
| :--- | :--- | :--- | :--- | :--- |
| **Development** | Feature development & local testing | PostgreSQL or local JSON store (`data/gonax_local.json`) | Built-in dev tokens allowed; CORS open to local ports | Formatted readable console output |
| **Testing** | CI/CD pipelines & automated test suite | Fast in-memory relational store | Deterministic mock tokens | Structured test logs |
| **Production** | Hosted production web service | Managed PostgreSQL (RDS/Cloud SQL) with connection pooling | Strict JWT (min 32-char secret) + Admin Key; CORS restricted to whitelisted domains | Single-line JSON logs with credentials redacted |

---

## 2. Secrets Management & Environment Variables

### Production Mandatory Environment Variables:
- `JWT_SECRET`: Minimum 32-character cryptographically random string (`openssl rand -hex 32`). Required at server startup; server halts if missing or under 32 characters in production.
- `ADMIN_API_KEY`: Minimum 16-character administrative key for approving models and accessing audit logs (`openssl rand -hex 16`).
- `DATABASE_URL`: Connection string with non-default credentials (e.g. `postgresql://gonax_user:SECURE_PASS@db.internal:5432/gonax_prod`).
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of trusted production origins (e.g. `https://gonax.org,https://app.gonax.org`). **Wildcard `*` is strictly blocked in production.**
- `GEMINI_API_KEY`: Optional API key for Google Gemini generative assistant. If omitted, GoNax falls back seamlessly to its deterministic grounded scientific reasoning engine.

### Platform Secrets Integration:
- **AWS ECS / EKS**: Store secrets in AWS Secrets Manager or Parameter Store; inject as container environment variables.
- **GCP Cloud Run / GKE**: Store secrets in Google Secret Manager and bind via secret volumes or environment references.
- **GitHub Actions CI/CD**: Store secrets under Repository Settings -> Secrets and Variables -> Actions.

---

## 3. Database Reliability, Migrations & Backup Recovery

### Migrations:
Migrations are versioned SQL scripts located in `backend/src/database/migrations/`:
- `001_init.sql`: Core relational tables for species, models, datasets, observations, and predictions.
- `002_scientific_rag.sql`: Document chunking, vector embeddings, and atomic scientific claims.
- `003_production_hardening.sql`: Users, tenant isolation, and immutable governance audit logs.

Run migrations via:
```bash
npm run migrate
```

### Automated Backups & Integrity Verification:
Backups are created programmatically with SHA-256 integrity verification:
- **Endpoint**: `POST /api/v1/admin/backups` (requires admin auth).
- **Format**: Snapshot JSON containing all relational tables + companion `.sha256` checksum file.
- **Location**: `data/backups/`.
- **Restoration Testing**: `POST /api/v1/admin/backups/test-restore` generates a fresh backup, validates its SHA-256 hash, and verifies that table structures and records deserialize correctly.

---

## 4. Multi-Tenant Data Isolation & Privacy Controls

### Guest Demonstrations:
- Any user can run calculations, inspect species, and explore models without creating an account.
- Guest observations and predictions are tagged with `is_demo: true` and a client session ID.
- Demo data is retained for 90 days before automatic purge.

### Authenticated Researchers:
- Authenticated requests pass `Authorization: Bearer <token>`.
- Observations and predictions are stamped with the authenticated user's ID.
- Cross-user data access is strictly blocked: requesting another user's private prediction ID returns `403 Forbidden`.
- Users can export all their data via `GET /api/v1/auth/export-data` and delete all their data via `DELETE /api/v1/auth/data`.

---

## 5. Model Serving & LLM Safety Boundaries

1. **Path Traversal Protection**: Model requests with non-alphanumeric identifiers (e.g., `../../etc/passwd`) are rejected with `400 Bad Request`.
2. **Artifact Verification**: Only models registered in `models/registry/` with verified checksums can be served.
3. **Execution Timeouts**: Deterministic model predictions are bounded by a 5-second execution timeout to prevent resource starvation.
4. **LLM Prompt Injection Defense**:
   - Retrieved scientific document chunks are sanitized to remove jailbreak strings.
   - Text chunks are wrapped in `<untrusted_scientific_document>` tags.
   - External LLM calls are bounded by a 10-second timeout. If the external provider times out or fails, GoNax degrades gracefully to its deterministic scientific synthesizer without changing numerical outputs.

---

## 6. Health Checks, Monitoring & Rollback Procedures

### Health Endpoints:
- `GET /api/v1/health`: Basic liveness check.
- `GET /api/v1/health/ready`: Deep readiness probe verifying database connectivity, model count, and dataset count.
- `GET /api/v1/health/metrics`: Uptime and memory footprint.

### Zero-Downtime Rollback Procedure:
If a newly deployed container version fails health probes:
1. Orchestrator (Docker Compose, ECS, Kubernetes) detects readiness failure (`/api/v1/health/ready` returns 503).
2. Traffic remains routed to the previous stable container replica.
3. To rollback manually:
   ```bash
   git checkout <PREVIOUS_RELEASE_TAG>
   docker compose build backend
   docker compose up -d backend
   ```
4. If database restoration is required:
   ```bash
   curl -X POST http://localhost:5000/api/v1/admin/backups/test-restore \
     -H "X-Admin-Key: $ADMIN_API_KEY"
   ```
