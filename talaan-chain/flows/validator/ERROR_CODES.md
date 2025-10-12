# Error Codes Reference

Semantic error codes for Talaan Chain validation system.

---

## Status Codes

| Code | Severity | Description | HTTP Equivalent |
|------|----------|-------------|-----------------|
| `VALID` | - | Chain is valid | 200 OK |
| `INVALID` | CRITICAL | Chain has integrity issues | 400 Bad Request |
| `EMPTY` | LOW | No entries to validate | 204 No Content |

---

## Hash Errors (CRITICAL)

| Code | Severity | Description | Action Required |
|------|----------|-------------|-----------------|
| `HASH_MISMATCH` | CRITICAL | Computed hash doesn't match stored hash | Investigate tampering |
| `HASH_INVALID_FORMAT` | HIGH | Hash is not 8-character hex | Check data corruption |
| `HASH_COMPUTATION_FAILED` | HIGH | Cannot compute hash from payload | Check payload format |
| `GENESIS_HASH_INVALID` | CRITICAL | Genesis hash is not "likha_genesis" | Check genesis entry |

**Similar to:** `INVALID_SIGNATURE`, `CHECKSUM_FAILED`

---

## Parent Errors (CRITICAL)

| Code | Severity | Description | Action Required |
|------|----------|-------------|-----------------|
| `PARENT_NOT_FOUND` | CRITICAL | Referenced parent doesn't exist | Check chain integrity |
| `PARENT_HASH_MISMATCH` | CRITICAL | Parent's hash doesn't match reference | Investigate tampering |
| `PARENT_CIRCULAR_REF` | CRITICAL | Entry references itself | Data corruption |
| `PARENT_CHAIN_BROKEN` | CRITICAL | Cannot trace back through parents | Check missing entries |

**Similar to:** `REFERENCE_NOT_FOUND`, `BROKEN_LINK`

---

## Genesis Errors (CRITICAL)

| Code | Severity | Description | Action Required |
|------|----------|-------------|-----------------|
| `GENESIS_NOT_FOUND` | CRITICAL | No genesis entry exists | Initialize chain |
| `GENESIS_MULTIPLE` | CRITICAL | Multiple genesis entries detected | Remove duplicates |
| `GENESIS_UNREACHABLE` | CRITICAL | Cannot trace back to genesis | Check chain gaps |
| `GENESIS_INVALID_PARENT` | CRITICAL | Genesis has non-null parent_id | Fix genesis entry |

**Similar to:** `ROOT_NOT_FOUND`, `ANCHOR_MISSING`

---

## Structure Errors (HIGH)

| Code | Severity | Description | Action Required |
|------|----------|-------------|-----------------|
| `MISSING_REQUIRED_FIELD` | HIGH | Missing id, parent_hash, current_hash, or payload | Check data completeness |
| `INVALID_PAYLOAD` | HIGH | Payload is not valid JSON | Check data format |
| `INVALID_TIMESTAMP` | MEDIUM | Timestamp is malformed or impossible | Check date format |
| `INVALID_UUID` | MEDIUM | ID or parent_id is not valid UUID | Check ID generation |

**Similar to:** `BAD_REQUEST`, `INVALID_INPUT`, `MALFORMED_DATA`

---

## Chain Errors (HIGH)

| Code | Severity | Description | Action Required |
|------|----------|-------------|-----------------|
| `CHAIN_FORK_DETECTED` | MEDIUM | Multiple entries share same parent (normal in DAG) | Monitor for issues |
| `CHAIN_GAP_DETECTED` | HIGH | Missing entries in sequence | Check data loss |
| `CHAIN_TIMESTAMP_ERROR` | MEDIUM | Child created before parent | Check system clocks |
| `CHAIN_DEPTH_EXCEEDED` | MEDIUM | Chain too deep (possible loop) | Check for cycles |

**Similar to:** `CONFLICT`, `DATA_INCONSISTENCY`

---

## Validation Process (LOW/MEDIUM)

| Code | Severity | Description | Action Required |
|------|----------|-------------|-----------------|
| `NO_ENTRIES` | LOW | Empty chain, nothing to validate | Normal for new system |
| `VALIDATION_TIMEOUT` | MEDIUM | Validation took too long | Check performance |
| `INSUFFICIENT_DATA` | MEDIUM | Not enough entries to complete validation | Wait for more data |
| `VALIDATION_INTERRUPTED` | MEDIUM | Process was stopped | Retry validation |

**Similar to:** `NOT_FOUND`, `TIMEOUT`, `SERVICE_UNAVAILABLE`

---

## Severity Levels

| Severity | Description | Example Response |
|----------|-------------|------------------|
| **CRITICAL** | Chain integrity compromised, immediate action required | Block operations, alert COA |
| **HIGH** | Serious issue, investigate urgently | Create incident, notify admin |
| **MEDIUM** | Issue detected, monitor situation | Log warning, continue monitoring |
| **LOW** | Informational, no action needed | Log info |

---

## HTTP Status Code Mapping

| Talaan Code | HTTP Status | Meaning |
|-------------|-------------|---------|
| `VALID` | 200 OK | Success |
| `INVALID` | 400 Bad Request | Validation failed |
| `HASH_MISMATCH` | 409 Conflict | Data integrity issue |
| `PARENT_NOT_FOUND` | 404 Not Found | Reference missing |
| `MISSING_REQUIRED_FIELD` | 422 Unprocessable Entity | Invalid structure |
| `VALIDATION_TIMEOUT` | 408 Request Timeout | Took too long |
| `EMPTY` | 204 No Content | No data |

---

## Example Response Structure

### ✅ Valid Chain
```json
{
  "status": "VALID",
  "code": "VALID",
  "severity": null,
  "summary": "✅ Valid! Checked 5 entries (depth: 5) to genesis",
  "validated": 5,
  "invalid": [],
  "depth_reached": 5,
  "reached_genesis": true
}
```

### ❌ Hash Mismatch
```json
{
  "status": "INVALID",
  "code": "HASH_MISMATCH",
  "severity": "CRITICAL",
  "summary": "❌ HASH_MISMATCH: Computed hash doesn't match stored hash",
  "validated": 3,
  "invalid": [
    {
      "id": "abc-123",
      "depth": 3,
      "code": "HASH_MISMATCH",
      "severity": "CRITICAL",
      "reason": "Hash mismatch. Expected: 1a2b3c4d, Got: 5e6f7g8h"
    }
  ],
  "depth_reached": 3,
  "reached_genesis": false
}
```

### ❌ Parent Not Found
```json
{
  "status": "INVALID",
  "code": "PARENT_NOT_FOUND",
  "severity": "CRITICAL",
  "summary": "❌ PARENT_NOT_FOUND: Referenced parent doesn't exist",
  "validated": 1,
  "invalid": [
    {
      "id": "xyz-789",
      "depth": 1,
      "parent_id": "missing-parent",
      "code": "PARENT_NOT_FOUND",
      "severity": "CRITICAL",
      "reason": "Parent entry not found in recent entries"
    }
  ],
  "depth_reached": 1,
  "reached_genesis": false
}
```

---

## Usage in Code

### Condition Check (Directus Flow)
```javascript
// Simple check
{{$validate_script.status}} == "VALID"

// Or check specific error
{{$validate_script.code}} == "HASH_MISMATCH"

// Check severity
{{$validate_script.severity}} == "CRITICAL"
```

### Error Handling
```javascript
if (result.code === 'HASH_MISMATCH') {
  // Critical - possible tampering
  notifyCOA();
  createUrgentIncident();
}

if (result.code === 'PARENT_NOT_FOUND') {
  // Critical - chain broken
  alertAdmins();
  freezeOperations();
}

if (result.code === 'CHAIN_FORK_DETECTED') {
  // Normal in DAG structure
  logInfo('Fork is normal in tree structure');
}
```

---

## Recommended Condition for Directus

**Use this in your `check_status` condition:**

```javascript
{{$validate_script.status}} == "VALID"
```

**Or for specific severity:**
```javascript
{{$validate_script.severity}} != "CRITICAL"
```

**Or combined:**
```javascript
{{$validate_script.status}} == "VALID" || {{$validate_script.severity}} == "LOW"
```

---

## Best Practices

1. ✅ **Use semantic codes** - `HASH_MISMATCH` is clearer than `E001`
2. ✅ **Include severity** - Helps prioritize response
3. ✅ **Provide detailed reason** - Easier debugging
4. ✅ **Log all codes** - Create audit trail
5. ✅ **Map to HTTP** - Easier API integration

---

## Comparison with Common Patterns

| System | Example Codes | Talaan Equivalent |
|--------|---------------|-------------------|
| **HTTP** | `400 Bad Request` | `INVALID` |
| **HTTP** | `404 Not Found` | `PARENT_NOT_FOUND` |
| **HTTP** | `409 Conflict` | `HASH_MISMATCH` |
| **OAuth** | `invalid_grant` | `INVALID_PAYLOAD` |
| **OAuth** | `unauthorized_client` | `MISSING_REQUIRED_FIELD` |
| **Stripe** | `card_declined` | `HASH_MISMATCH` |
| **AWS** | `InvalidParameterValue` | `INVALID_PAYLOAD` |
| **JWT** | `SIGNATURE_INVALID` | `HASH_MISMATCH` |

---

**Status:** ✅ Production Ready  
**Last Updated:** 2025-10-10  
**Version:** 1.0

