# API Key Scopes: Security Quick Reference

## Scope Format

```
{action}:{resource}[:{sub-resource}]
```

## ✅ CORRECT (Secure)

| Scope | Access Granted | Use Case |
|-------|----------------|----------|
| `read:campaigns` | Read campaigns only | Analytics dashboard |
| `write:workflows` | Create/update workflows | Automation service |
| `admin:keys` | Manage API keys | Key rotation script |
| `read:*` | Read all resources | Monitoring system |
| `admin:*` | Full admin access | Emergency access only |

## ❌ INCORRECT (Insecure - DEPRECATED)

| Scope | Problem | Instead Use |
|-------|---------|-------------|
| `[]` | Grants FULL access | Add explicit scopes |
| `["read"]` | Grants `read:*` wildcard | `["read:campaigns"]` |
| `["write"]` | Grants `write:*` wildcard | `["write:workflows"]` |
| `["admin"]` | Grants unrestricted access | `["admin:keys"]` |

## Creating API Keys (Examples)

### Read-Only Analytics Key
```javascript
await ApiKey.generateKey(
  "analytics-dashboard",
  ["read:campaigns", "read:workflows"],
  90  // 90 days
);
```

### Service Account (Multi-Resource Write)
```javascript
await ApiKey.generateKey(
  "automation-service",
  ["read:campaigns", "write:campaigns", "write:workflows"],
  365  // 1 year
);
```

### Admin Key (Key Management Only)
```javascript
await ApiKey.generateKey(
  "key-rotation-script",
  ["admin:keys"],  // NOT "admin"
  30  // 30 days (rotate monthly)
);
```

### Emergency Super Admin (Use Sparingly!)
```javascript
await ApiKey.generateKey(
  "emergency-access",
  ["admin:*"],  // Super admin
  7  // 7 days only - rotate weekly
);
```

## Resource Names

| Resource | Endpoints |
|----------|-----------|
| `campaigns` | `/api/campaigns/*` |
| `workflows` | `/api/workflows/*` |
| `keys` | `/api/keys/*` |
| `admin` | `/api/admin/*` |
| `yolo` | `/api/yolo/*` |
| `jobs` | `/api/jobs/*` |

## Action Types

| Action | HTTP Methods | Description |
|--------|-------------|-------------|
| `read` | GET | Read-only access |
| `write` | POST, PUT, PATCH | Create/update |
| `delete` | DELETE | Delete resources |
| `admin` | ALL | Full resource control |

## Common Patterns

### Pattern 1: Least Privilege (Recommended)
```javascript
// Give ONLY what's needed
["read:campaigns"]  // Can only read campaigns
```

### Pattern 2: Service Account
```javascript
// Multiple resources, minimal permissions
["read:campaigns", "write:workflows", "read:jobs"]
```

### Pattern 3: Admin (Use Carefully)
```javascript
// Granular admin per resource
["admin:campaigns", "admin:workflows"]
// NOT: ["admin"]  ← Too broad!
```

### Pattern 4: Wildcard (Rare Use Only)
```javascript
// When truly needed for all resources
["read:*"]   // Read everything
["write:*"]  // Write everything
["admin:*"]  // Full admin (emergency only)
```

## Security Checklist

Before creating an API key:

- [ ] Is this the minimum scope needed?
- [ ] Can I use a granular scope instead of wildcard?
- [ ] Is `admin:*` truly necessary? (usually not)
- [ ] Have I set an appropriate expiration? (shorter = better)
- [ ] Do I need IP whitelisting? (recommended for production)
- [ ] Will this key be rotated regularly?

## Rate Limits

| Endpoint | Rate Limit (Prod) | Rate Limit (Dev) |
|----------|------------------|------------------|
| General API | 100 req / 15 min | 1000 req / 1 min |
| Chat `/api/chat` | 10 req / 1 min | 60 req / 1 min |
| Key Management | 20 req / 15 min | 20 req / 15 min |

## Troubleshooting

### Error: "Authentication failed" (403)
**Cause:** Insufficient scope for requested endpoint

**Check:**
```sql
SELECT id, name, scopes FROM api_keys WHERE prefix = 'sk_live_v2_...';
```

**Fix:** Add missing scope or use more specific endpoint

### Error: "Missing API key" (401)
**Cause:** No API key in request

**Fix:** Add header:
```bash
# Option 1: Bearer token
Authorization: Bearer sk_live_v2_abc123.xyz789

# Option 2: X-API-Key
X-API-Key: sk_live_v2_abc123.xyz789
```

## Migration from Old Format

### Old (INSECURE)
```javascript
// ❌ Don't do this
scopes: []          // Full access
scopes: ["read"]    // Wildcard read
scopes: ["admin"]   // Unrestricted
```

### New (SECURE)
```javascript
// ✅ Do this instead
scopes: ["read:campaigns", "read:workflows"]  // Explicit
scopes: ["read:*"]                            // Explicit wildcard
scopes: ["admin:keys", "admin:campaigns"]     // Granular admin
```

### Migration Command
```sql
-- Find keys with old format
SELECT id, name, scopes FROM api_keys
WHERE scopes = '[]'::jsonb
   OR scopes @> '["read"]'
   OR scopes @> '["write"]'
   OR scopes @> '["admin"]';

-- Update to new format (example)
UPDATE api_keys
SET scopes = '["read:campaigns", "write:workflows"]'::jsonb
WHERE id = 'your-key-id';
```

## Need Help?

- Full audit report: `SECURITY_AUDIT_REPORT.md`
- Executive summary: `SECURITY_FINDINGS_SUMMARY.md`
- Security team: security@company.com

---

**Last Updated:** 2025-11-26
**Version:** 2.0 (Post-Security Audit)
