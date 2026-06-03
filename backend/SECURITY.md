# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Tascal, **please do not open a public GitHub issue**.

Send a detailed report to: **security@tascal.app**

Include:
- Description of the vulnerability and its potential impact
- Steps to reproduce
- Affected versions / endpoints
- Any proof-of-concept code (optional)

We aim to acknowledge reports within **48 hours** and issue a fix within **7 business days** for critical issues.

---

## Implemented Security Measures

### Authentication & Authorization
| Measure | Detail |
|---|---|
| Password strength enforcement | Minimum 8 characters, must contain both letters and digits (`validators.py`) |
| Login rate limiting | 5 failed attempts per IP triggers a 15-minute lockout (`rate_limit.py`) |
| JWT access token expiry | 15 minutes (`config.py`) |
| JWT refresh token expiry | 30 days (`config.py`) |
| Password storage | Werkzeug `generate_password_hash` (PBKDF2-HMAC-SHA256) |
| Route protection | All non-public endpoints require `@jwt_required()` |

### Injection Prevention
| Measure | Detail |
|---|---|
| SQLAlchemy ORM | All database queries go through SQLAlchemy ORM — no raw SQL string interpolation |
| Input validation | Task fields validated for type, length, and allowed values (`validators.py`) |
| ISO date parsing | `datetime.date.fromisoformat()` used for date filter inputs |

### XSS Prevention
| Measure | Detail |
|---|---|
| React JSX text binding | All user/AI content rendered via JSX text nodes, never `dangerouslySetInnerHTML` |
| `sanitizeText()` helper | Strips HTML tags from arbitrary strings (`frontend/src/utils/sanitize.ts`) |
| `sanitizeUrl()` helper | Blocks `javascript:` and other dangerous URL schemes |
| Content-Security-Policy | Strict CSP header prevents inline script execution and restricts source origins |

### CSRF
| Measure | Detail |
|---|---|
| JWT Bearer token auth | All state-changing API calls require a JWT in `Authorization: Bearer` header — CSRF tokens are not applicable to this authentication model |
| Stripe webhook signature | Every incoming webhook is verified with `stripe.Webhook.construct_event()` using `STRIPE_WEBHOOK_SECRET`; missing or invalid signatures return HTTP 400 |

### Security Headers (applied to all responses)
| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | Allows only `self`, Stripe JS, and Google AdSense origins |
| `Cache-Control` | `no-store` on all JSON API responses |

### Information Disclosure Prevention
| Measure | Detail |
|---|---|
| `password_hash` excluded | `User.to_dict()` never includes `password_hash` |
| Production error handlers | Generic error messages returned; stack traces are only logged server-side, never sent to clients |
| Debug mode disabled in prod | `DEBUG = False` in `ProductionConfig` |

---

## Periodic Audit Checklist

Run this checklist before every major release:

### Authentication
- [ ] Confirm `JWT_ACCESS_TOKEN_EXPIRES` ≤ 15 minutes in production config
- [ ] Confirm `JWT_REFRESH_TOKEN_EXPIRES` ≤ 30 days in production config
- [ ] Verify rate limiter thresholds are appropriate (`rate_limit.py`)
- [ ] Review `User.to_dict()` — ensure no sensitive fields (password_hash, internal IDs) are exposed

### Injection
- [ ] Grep for raw SQL: `grep -rn "db.session.execute\|text(" backend/app/`
- [ ] Confirm all user-supplied filter values go through ORM or explicit type coercion
- [ ] Review `validators.py` — verify length and allowlist checks cover all fields

### Frontend
- [ ] Grep for `dangerouslySetInnerHTML`: `grep -rn "dangerouslySetInnerHTML" frontend/src/`
- [ ] Confirm `sanitizeText` / `sanitizeUrl` are used for any externally-sourced URLs or HTML content
- [ ] Review CSP in `backend/app/__init__.py` — ensure no `'unsafe-eval'` or `'unsafe-inline'` for scripts

### Dependencies
- [ ] Run `pip-audit` (backend) and `npm audit` (frontend) — fix critical/high CVEs
- [ ] Pin all dependency versions in `requirements.txt` and `package.json`

### Infrastructure
- [ ] `SECRET_KEY` and `JWT_SECRET_KEY` are randomly generated and stored only in environment variables
- [ ] `STRIPE_WEBHOOK_SECRET` is set and not the default
- [ ] Database connection uses SSL in production (`?sslmode=require`)
- [ ] CORS `CORS_ORIGINS` is set to the exact production frontend URL
- [ ] HTTPS enforced at load balancer / Nginx level
- [ ] Nginx security headers configured (Strict-Transport-Security, etc.)

### Logging & Monitoring
- [ ] Error logs are centralised and monitored
- [ ] Unusual login failure spikes trigger alerts
- [ ] Stripe webhook errors are tracked and alerted
