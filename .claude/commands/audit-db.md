# Audit-DB — Database Audit Specialist

Deep audit database schema, indexes, query perf, data integrity. Read-only.

## Input
$ARGUMENTS — scope: `schema`, `indexes`, `queries`, `integrity` (default: all)

## Scope

- Schema design (Prisma models)
- Indexes coverage
- Foreign key integrity
- Query performance (slow queries)
- Data integrity (orphans, duplicates)
- Migration history consistency

## Checklist

### CRITICAL
1. **Missing FK constraint** — field yang reference ID tanpa `@relation`
2. **No index on FK columns** — filter/join slow
3. **Orphan records** — child rows tanpa parent
4. **Duplicate unique data** — violating unique constraint yang seharusnya ada
5. **Unmigrated changes** — schema.prisma beda dengan DB

### HIGH
6. **No index on sering-filtered fields** (status, publishedAt, authorId)
7. **N+1 query patterns** di server components
8. **Soft-delete tanpa index di `deletedAt`**
9. **JSON field over-indexed** — query JSON tanpa proper GIN index
10. **Cascade delete missing** — mengakibatkan orphans

### MEDIUM
11. **Enum values yang tidak digunakan** di DB
12. **Nullable field yang harusnya required** (atau sebaliknya)
13. **String field terlalu panjang** (VARCHAR tanpa limit)
14. **Missing `@db.Text` untuk long content** — pakai VARCHAR default
15. **No composite index** untuk frequent multi-field queries

### LOW
16. **Inconsistent naming** — camelCase vs snake_case
17. **Missing `@updatedAt` auto** di timestamp fields
18. **UUID vs CUID inconsistency**

## Metodologi

```bash
# 1. Schema consistency check
npx prisma db pull --print
# Compare with schema.prisma

# 2. Migration status
npx prisma migrate status

# 3. Slow query log (di VPS)
ssh root@145.79.15.99 "sudo -u postgres psql -c \"SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20;\""

# 4. Index usage
ssh root@145.79.15.99 "sudo -u postgres psql -d jhb -c \"SELECT indexname, idx_scan FROM pg_stat_user_indexes ORDER BY idx_scan ASC;\""

# 5. Table sizes
ssh root@145.79.15.99 "sudo -u postgres psql -d jhb -c \"SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;\""

# 6. Orphan detection (example)
npx prisma studio
# atau query manual untuk articles tanpa author
```

## Output Format

Standard + DB metrics:

```
### 📊 DB Metrics
- Total tables: [N]
- Total rows: [N]
- DB size: [N] MB
- Index count: [N] | Unused indexes: [N]
- Slow queries (> 100ms): [N]
- Orphan records: [N]
- Missing FK constraints: [N]

### Largest Tables
| Table | Rows | Size |
|---|---|---|
| Article | 1,234 | 45 MB |
| [...] |

### Slowest Queries
1. [query] — avg [ms], calls [N]
```

## Chain ke

- `/db-query` — optimize slow queries
- `/db-migrate` — fix schema issues
- `/clean` — hapus orphan/duplicates
- `/backup` — backup sebelum cleanup
- `/audit-all` — return

## Aturan

- READ-ONLY di DB (jangan modify data)
- Backup sebelum ada recommendation delete
- JANGAN expose full query dengan sensitive data