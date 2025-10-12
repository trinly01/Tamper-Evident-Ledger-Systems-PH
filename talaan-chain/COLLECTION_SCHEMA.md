# `talaan_chain` Collection Schema

Complete Directus collection schema for the Talaan Chain tamper-evident ledger system.

---

## Field Definitions

| Field | Type | Special | Description |
|-------|------|---------|-------------|
| `id` | UUID | Primary Key, Auto | Database ID (Directus auto-generated) |
| `sequence` | Integer | Auto-increment, Unique | Ledger entry number (1, 2, 3...) |
| `parent_id` | UUID | Foreign Key → `id`, Nullable | References parent entry (NULL for genesis) |
| `parent_hash` | String(8) | Required, Indexed | Hash of parent entry ("likha_genesis" for genesis) |
| `current_hash` | String(8) | Required, Indexed | Hash of this entry |
| `payload` | JSON | Required | Event data (trigger + accountability) |
| `date_created` | Timestamp | Auto | When entry was created |
| `date_updated` | Timestamp | Auto | When entry was updated (for Directus) |
| `user_created` | UUID | Auto | User who created (from Directus) |
| `user_updated` | UUID | Auto | User who updated (from Directus) |

---

## Directus Collection Setup

### Step 1: Create Collection

1. Go to **Settings → Data Model**
2. Click **+ Create Collection**
3. Collection Name: `talaan_chain`
4. **Primary Key Field:**
   - Type: `UUID`
   - Field Name: `id`
   - Auto-generate: ✅ Yes

### Step 2: Add `sequence` Field ⭐

**This is your ledger-specific ID!**

1. Click **+ Create Field** in `talaan_chain`
2. **Type:** Integer
3. **Field Name:** `sequence`
4. **Interface:** Input (read-only display)
5. **Schema:**
   - Nullable: ❌ No
   - Unique: ✅ Yes
   - Auto-increment: ✅ Yes
6. **Options:**
   - Minimum: 1
   - Font: Monospace
7. Save

**Result:** Directus will auto-generate: 1, 2, 3, 4, 5...

---

### Step 3: Add `parent_id` Field

1. **Type:** Many-to-One Relationship
2. **Field Name:** `parent_id`
3. **Related Collection:** `talaan_chain` (self-reference)
4. **Schema:**
   - Nullable: ✅ Yes (genesis entry has NULL)
   - On Delete: SET NULL (preserve chain even if parent manually deleted)
5. Save

---

### Step 4: Add `parent_hash` Field

1. **Type:** String
2. **Field Name:** `parent_hash`
3. **Interface:** Input
4. **Schema:**
   - Nullable: ❌ No
   - Max Length: 8
   - Default Value: `likha_genesis`
5. **Validation:**
   - Pattern: `^[a-f0-9]{8}$|^likha_genesis$`
6. **Display:**
   - Font: Monospace
7. **Index:** ✅ Yes (for fast parent lookups)
8. Save

---

### Step 5: Add `current_hash` Field

1. **Type:** String
2. **Field Name:** `current_hash`
3. **Interface:** Input
4. **Schema:**
   - Nullable: ❌ No
   - Max Length: 8
5. **Validation:**
   - Pattern: `^[a-f0-9]{8}$`
6. **Display:**
   - Font: Monospace
7. **Index:** ✅ Yes (for validation lookups)
8. Save

---

### Step 6: Add `payload` Field

1. **Type:** JSON
2. **Field Name:** `payload`
3. **Interface:** Code (JSON)
4. **Schema:**
   - Nullable: ❌ No
5. Save

---

### Step 7: System Fields (Auto-configured)

Directus automatically adds:
- `date_created` (timestamp)
- `date_updated` (timestamp)
- `user_created` (UUID → directus_users)
- `user_updated` (UUID → directus_users)

Keep these for audit trail!

---

## Example Data

### Genesis Entry (First Entry)

```json
{
  "id": "abc-123-def-456",
  "sequence": 1,
  "parent_id": null,
  "parent_hash": "likha_genesis",
  "current_hash": "c8ab12d2",
  "payload": {
    "$trigger": {
      "event": "test_table.items.create",
      "keys": ["xyz-789"],
      "collection": "test_table"
    },
    "$accountability": {
      "user": "user-uuid",
      "role": "role-uuid",
      "ip": "127.0.0.1"
    }
  },
  "date_created": "2025-10-10T10:00:00Z"
}
```

### Regular Entry (Child of Genesis)

```json
{
  "id": "ghi-789-jkl-012",
  "sequence": 2,
  "parent_id": "abc-123-def-456",
  "parent_hash": "c8ab12d2",
  "current_hash": "eb1a19a0",
  "payload": {
    "$trigger": {
      "event": "budgets.items.update",
      "keys": ["budget-uuid"],
      "collection": "budgets",
      "payload": {
        "amount": 1000000
      }
    },
    "$accountability": {
      "user": "user-uuid",
      "role": "admin-uuid",
      "ip": "192.168.1.100"
    }
  },
  "date_created": "2025-10-10T10:01:00Z"
}
```

### Tree Branch (Another Child of Genesis)

```json
{
  "id": "mno-345-pqr-678",
  "sequence": 3,
  "parent_id": "abc-123-def-456",
  "parent_hash": "c8ab12d2",
  "current_hash": "4b0d2893",
  "payload": {
    "$trigger": {
      "event": "allocations.items.create",
      "keys": ["allocation-uuid"],
      "collection": "allocations"
    },
    "$accountability": {
      "user": "another-user-uuid",
      "role": "admin-uuid",
      "ip": "192.168.1.101"
    }
  },
  "date_created": "2025-10-10T10:01:05Z"
}
```

**Note:** Entries #2 and #3 both reference entry #1 as parent - this is normal in tree/DAG structure!

---

## Indexes (Performance)

Create these indexes for optimal query performance:

```sql
-- For validation queries (find by hash)
CREATE INDEX idx_talaan_current_hash ON talaan_chain(current_hash);
CREATE INDEX idx_talaan_parent_hash ON talaan_chain(parent_hash);

-- For chronological queries
CREATE INDEX idx_talaan_sequence ON talaan_chain(sequence);
CREATE INDEX idx_talaan_date_created ON talaan_chain(date_created);

-- For tree traversal
CREATE INDEX idx_talaan_parent_id ON talaan_chain(parent_id);
```

Directus may auto-create some of these. Verify in your database.

---

## Field Usage

### `id` vs `sequence` - When to Use Each?

| Use Case | Use Field | Why |
|----------|-----------|-----|
| Foreign key relationships | `id` | Standard database practice |
| Display entry number to users | `sequence` | Human-readable (1, 2, 3...) |
| Sort chronologically | `sequence` or `date_created` | Both work, sequence is faster |
| Query range of entries | `sequence` | Fast integer comparison |
| Validation lookups | `current_hash` or `parent_hash` | Direct hash matching |
| API endpoints | `sequence` | Shorter, cleaner URLs |
| Logs and debugging | `sequence` | Easier to reference |

**Example:**
```javascript
// ✅ Good: Query by sequence range
filter: {
  sequence: {
    _gte: 1000,
    _lte: 2000
  }
}

// ✅ Good: Latest 50 entries
sort: ["-sequence"],
limit: 50

// ✅ Good: Display to user
console.log(`Entry #${entry.sequence}`);

// ✅ Good: API endpoint
GET /api/talaan/entries/12345  // sequence
GET /api/talaan/entries/abc-123-def-456  // id (also ok)

// ❌ Bad: Don't expose UUIDs to end users
"Check entry abc-123-def-456"  // Confusing

// ✅ Better: Use sequence
"Check entry #12345"  // Clear and short
```

---

## Validation Rules

### Genesis Entry Validation
```javascript
if (entry.parent_id === null) {
  // Must have genesis hash
  assert(entry.parent_hash === "likha_genesis");
  // Must be sequence 1
  assert(entry.sequence === 1);
}
```

### Regular Entry Validation
```javascript
if (entry.parent_id !== null) {
  // Must reference existing entry
  const parent = await getEntry(entry.parent_id);
  assert(parent !== null);
  
  // Parent hash must match
  assert(entry.parent_hash === parent.current_hash);
  
  // Sequence must be > 1
  assert(entry.sequence > 1);
}
```

### Hash Format Validation
```javascript
const hashRegex = /^[0-9a-f]{8}$/;
assert(hashRegex.test(entry.current_hash));
assert(hashRegex.test(entry.parent_hash) || entry.parent_hash === "likha_genesis");
```

---

## Permissions

**Recommended Directus permissions for `talaan_chain`:**

| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| **Public** | ❌ | ✅ | ❌ | ❌ |
| **User** | ❌ | ✅ | ❌ | ❌ |
| **Admin** | ⚠️ | ✅ | ❌ | ❌ |
| **Flow (System)** | ✅ | ✅ | ❌ | ❌ |

**Important:**
- ❌ **NEVER allow UPDATE** - chain entries are immutable
- ❌ **NEVER allow DELETE** - chain must be permanent
- ✅ **Only Flows can CREATE** - automated logging only
- ✅ **Everyone can READ** - transparency is key

---

## Migration from Existing Data

If you already have a `talaan_chain` collection **without** `sequence` field:

### Option 1: Add Field (Recommended)
```sql
-- Add sequence column with auto-increment
ALTER TABLE talaan_chain 
ADD COLUMN sequence SERIAL UNIQUE;

-- Backfill existing entries (ordered by date_created)
UPDATE talaan_chain 
SET sequence = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY date_created) as row_num
  FROM talaan_chain
) AS subquery
WHERE talaan_chain.id = subquery.id;

-- Set next sequence value
SELECT setval('talaan_chain_sequence_seq', (SELECT MAX(sequence) FROM talaan_chain));
```

### Option 2: Fresh Start
1. Delete all entries in `talaan_chain`
2. Add `sequence` field
3. Trigger flows to regenerate chain

---

## Testing Checklist

- [ ] Genesis entry created with `sequence = 1`, `parent_id = null`, `parent_hash = "likha_genesis"`
- [ ] Second entry created with `sequence = 2`, `parent_id = <genesis-id>`, `parent_hash = <genesis-hash>`
- [ ] Concurrent entries both reference same parent (tree structure works)
- [ ] Sequence auto-increments correctly
- [ ] Hashes are 8-character hex format
- [ ] Validation flow detects tampering
- [ ] Cannot manually update or delete entries

---

**Status:** ✅ Production Ready  
**Version:** 1.0  
**Last Updated:** 2025-10-10

