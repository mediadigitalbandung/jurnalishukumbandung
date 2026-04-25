# Env — Environment Variables Specialist

Specialist agent untuk manage environment variables di local dan VPS.

## Input

$ARGUMENTS — aksi: `list`, `check [name]`, `diff`, `sync`, `add [name]`

## Tugas Spesifik

- Audit env vars yang dibutuhkan
- Compare local vs VPS
- Validate env completeness
- Secret rotation

TIDAK menangani: deploy (→ `/deploy`), code changes (→ `/code`).

## Env Vars JHB (wajib ada)

### Core
```
DATABASE_URL              — PostgreSQL connection
DIRECT_URL                — PostgreSQL direct (untuk Prisma migrations)
NEXTAUTH_SECRET           — NextAuth JWT secret
NEXTAUTH_URL              — Base URL untuk NextAuth
NEXT_PUBLIC_APP_URL       — Public app URL
```

### AI / External
```
OPENAI_API_KEY            — untuk AI features (jika pakai OpenAI)
DEEPSEEK_API_KEY          — primary AI provider
ANTHROPIC_API_KEY         — Claude API (jika pakai)
```

### Analytics & SEO
```
GOOGLE_SEARCH_CONSOLE_EMAIL — service account email
GOOGLE_SEARCH_CONSOLE_KEY   — private key (PEM format)
GA4_PROPERTY_ID             — Google Analytics property
CF_API_TOKEN                — Cloudflare API token
CF_ZONE_ID                  — Cloudflare zone ID
```

### Storage
```
SMTP_HOST                  — email delivery
SMTP_USER                  — email user
SMTP_PASS                  — email password
```

### Security
```
CRON_SECRET                — auth untuk cron endpoints
REVALIDATE_SECRET          — ISR revalidation
```

### Features
```
AUTO_ARTICLE_ENABLED       — feature flag
NEXT_PUBLIC_GA_ID          — Google Analytics ID (client-side)
```

## Operasi

### list — Daftar env vars yang dibutuhkan
Output dengan status: set/missing/weak.

### check [name] — Validasi 1 env var

```bash
ssh root@145.79.15.99 "cd /var/www/jhb && grep -c '^[VARNAME]=' .env"
```

Checks:
- Variable exists
- Not empty value
- Format valid (URL format untuk URLs, dll)
- Tidak pakai default value weak

### diff — Compare local vs VPS

```bash
# VPS env list (names only, jangan expose values)
ssh root@145.79.15.99 "grep -E '^[A-Z_]+' /var/www/jhb/.env | cut -d'=' -f1 | sort"

# Local env list
grep -E '^[A-Z_]+' .env | cut -d'=' -f1 | sort
```

Tampilkan:
- Di local tapi tidak di VPS
- Di VPS tapi tidak di local
- Mismatch pattern (naming beda)

### sync — Sync env baru ke VPS

**Jangan sync secrets via SSH openly — lebih aman:**

```bash
# 1. Edit .env di VPS langsung
ssh root@145.79.15.99 "nano /var/www/jhb/.env"

# 2. Atau via Hostinger Terminal (copy-paste value)

# 3. Restart PM2 setelah update env
ssh root@145.79.15.99 "pm2 restart jhb --update-env"
```

### add [name] — Guide tambah env baru

Langkah:
1. Tambah ke `.env.example` (pattern tanpa value)
2. Tambah ke `.env` local
3. Tambah ke VPS `.env`
4. Update `env.d.ts` (jika ada type definitions)
5. Dokumentasikan di CLAUDE.md jika critical

## Security Rules

### JANGAN commit
```
.env                      # actual secrets
.env.local                # actual secrets
.env.production           # actual secrets
```

### BOLEH commit
```
.env.example              # template dengan dummy values
.env.test                 # test-only values
```

### Cek .gitignore
```
[ ] .env di .gitignore
[ ] .env.local di .gitignore
[ ] .env.production di .gitignore
[ ] hanya .env.example yang ter-commit
```

### Git history cleanup

Jika pernah accidentally commit secrets:
```bash
# Rotate secret segera (jangan delay!)
# Kemudian clean history:
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all
```

## Secret Rotation

Rotate secrets secara berkala (recommended every 90 hari):

1. **NEXTAUTH_SECRET** — generate new: `openssl rand -base64 32`
2. **CRON_SECRET** — generate new, update crontab
3. **Database password** — update DATABASE_URL
4. **API keys** — regenerate di provider dashboard

After rotation:
- Update .env di VPS
- `pm2 restart jhb --update-env`
- Verify semua service masih jalan
- Old secret revoke (untuk API keys)

## Validation di Runtime

Di `src/lib/env.ts` (atau similar):
```typescript
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  CRON_SECRET: z.string().min(16),
  // ...
});

export const env = envSchema.parse(process.env);
```

Jika env invalid, app fail fast at startup (lebih baik daripada fail at runtime).

## Chain ke

- `/deploy` — setelah update env, deploy
- `/vps` — restart PM2 dengan `--update-env`
- `/audit` — log env changes

## Aturan

- JANGAN commit .env ever
- JANGAN log env values
- JANGAN expose secret via client (kecuali dengan prefix NEXT_PUBLIC_)
- WAJIB validate env di startup
- Rotate secrets jika suspected leak
- Document env requirements di .env.example