# Audit — Audit Log Analysis Specialist

Specialist agent untuk analisis audit trail dan activity logs.

## Input

$ARGUMENTS — filter: `user [userId]`, `action [create/update/delete]`, `today`, `week`, `suspicious`

## Tugas Spesifik

- Baca dan analisis audit log dari `AuditLog` table
- Detect suspicious activity
- Generate compliance reports
- Track role changes

API: `src/app/api/audit-logs/route.ts`

## Audit Log Schema

```
AuditLog {
  id, userId, action, resource, resourceId,
  description, ipAddress, userAgent, createdAt
}

action: CREATE | UPDATE | DELETE | LOGIN | LOGOUT | ROLE_CHANGE | ...
resource: article | user | comment | setting | ...
```

## Operasi

### user [userId] — Aktivitas user tertentu
```
GET /api/audit-logs?userId=[id]&limit=100
```
Timeline aktivitas:
- Login/logout pattern
- Artikel yang dibuat/diedit
- Role changes
- Setting changes

### action [action] — Filter by action type

```
GET /api/audit-logs?action=DELETE&limit=50
```
Khusus untuk action destructive:
- DELETE: siapa hapus apa, kapan
- ROLE_CHANGE: siapa ubah role siapa

### today / week — Dashboard aktivitas

```
GET /api/audit-logs?from=[today]
```
Stats:
- Total actions
- Top users (by activity)
- Most modified resources
- Anomali (aktivitas di luar jam kerja?)

### suspicious — Deteksi suspicious activity

Patterns yang di-flag:

**Pattern 1: Brute force login**
- Multiple LOGIN fails dari IP sama dalam 10 menit

**Pattern 2: Privilege escalation**
- User baru dapat SUPER_ADMIN role
- ROLE_CHANGE dari USER ke EDITOR tanpa REPORTER dulu

**Pattern 3: Bulk delete**
- > 10 DELETE actions dari user yang sama dalam 1 jam

**Pattern 4: Off-hour admin activity**
- Admin login/action di luar 06.00-23.00 WIB

**Pattern 5: IP anomaly**
- Login dari IP baru yang tidak pernah terpakai

## Report Format

### Daily Audit Report
```
## Audit Report — [Date]

### Stats
- Total actions: X
- Unique users: X
- Most active: [user] ([N] actions)

### Actions Breakdown
CREATE: X | UPDATE: X | DELETE: X
LOGIN: X | ROLE_CHANGE: X

### 🚨 Suspicious Activity
[flagged items dengan alasan]

### 📊 Top Resources Modified
1. article — X changes
2. user — X changes
```

### Compliance Report (bulanan)
```
### User Lifecycle Events
- New users: X
- Role changes: X (detail per user)
- Deactivated: X

### Content Actions
- Articles created: X
- Articles deleted: X (who, why)
- Comments moderated: X

### Sensitive Actions
- Password resets: X
- Email changes: X
- Setting changes: X (detail)
```

## Chain ke

- `/users` — untuk tindak lanjut user suspicious
- `/notify` — kirim alert ke admin jika suspicious pattern terdeteksi
- `/monitor` — include audit summary di health check

## Aturan

- JANGAN delete audit log (immutable by design)
- Simpan audit log minimum 1 tahun (compliance)
- Untuk suspicious activity, laporkan tapi JANGAN auto-block
- Log sensitif (password reset, role change) simpan lebih detail
- Personal info di log harus dianonimkan di shared reports