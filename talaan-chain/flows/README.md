# Flow Scripts

This directory contains the scripts and configurations for the Talaan Chain Directus flow.

## Files

### Core Flow Operations

| File | Type | Purpose |
|------|------|---------|
| [`logger/generate_chain_entry.js`](logger/generate_chain_entry.js) | JavaScript | Main hash generation script - creates chain entries with FNV-1a hash |
| [`logger/read_parent_entry.json`](logger/read_parent_entry.json) | JSON Config | Query configuration to read the most recent chain entry |
| [`logger/create_chain_entry.json`](logger/create_chain_entry.json) | JSON Config | Create operation to insert new entry into talaan_chain |

### Verification

| File | Type | Purpose |
|------|------|---------|
| [`validator/validate_latest_chain.js`](validator/validate_latest_chain.js) | JavaScript | Quick validation - latest entry + 10 parent levels |
| [`validator/validate_random_sample.js`](validator/validate_random_sample.js) | JavaScript | Random sampling - 10 random chains for statistical confidence |
| [`validator/validate_recent_window.js`](validator/validate_recent_window.js) | JavaScript | Sliding window - validate recent 100 entries |
| [`validator/verify_chain_tree.js`](validator/verify_chain_tree.js) | JavaScript | Full chain verification - comprehensive audit |

**See [VALIDATION_STRATEGIES.md](../VALIDATION_STRATEGIES.md) for detailed usage and scheduling recommendations.**

## Usage in Directus

### Complete Flow Guides

📖 **[Talaan Chain Logger](logger/README.md)** - Chain creation & replication flow  
- 8 operations (with JWT signing + webhook)
- Automatic event logging
- JWT-authenticated replication
- Multi-node replication support
- Performance: < 100ms per event

📖 **[Talaan Chain Monitor](validator/README.md)** - Chain validation flow  
- 5 operations (with error handling)
- Scheduled every 15 seconds
- Throws error on validation failure
- Performance: < 0.5 sec, 1 DB query

📖 **[Talaan Mirror Receiver](mirror/README.md)** - Replication receiver flow  
- 7 operations (with JWT verification)
- Webhook-triggered
- JWT authentication
- Validates & stores replicated entries
- Multi-node architecture support

📖 **[Validation Strategies](../VALIDATION_STRATEGIES.md)** - All validation approaches
- Latest + Parents - Quick 15-second checks
- Random Sample - Daily audits  
- Full Chain - Monthly comprehensive verification

---

### Quick Start

**1. Create "Talaan Chain Logger" flow:**
- Follow [logger/README.md](logger/README.md)
- Copy scripts from `logger/` directory
- Configure collections to track (e.g., test_table)
- Set webhook URL (localhost for testing)

**2. Create "Talaan Chain Monitor" flow:**
- Follow [validator/README.md](validator/README.md)
- Copy `validate_latest_chain.js` from `validator/` directory
- Schedule: `*/15 * * * *` (every 15 seconds)
- Throws error on validation failure

**3. Create "Talaan Mirror Receiver" flow (Multi-Node):**
- Follow [mirror/README.md](mirror/README.md)
- Webhook trigger for receiving entries from other nodes
- Validates and stores in `talaan_mirror` collection

**4. Test the chain:**
- Trigger an event on tracked collection
- Check `talaan_chain` for new entry
- Monitor runs automatically every 15 seconds
- Check logs for validation results

## Important Notes

- All scripts use **plain JavaScript** (not TypeScript) for Directus compatibility
- Genesis hash is `"likha_genesis"`
- Hash algorithm: FNV-1a (non-cryptographic, optimized for speed)
- Tree/DAG structure prevents race conditions
- **Never include `talaan_chain` in the trigger collections** - prevents infinite loops
- `emitEvents: false` in create operation provides extra safety

## Customization

### To change tracked collections:

Edit the flow trigger configuration to include/exclude collections:
```json
{
  "collections": ["budgets", "allocations", "departments", "your_collection"]
}
```

### To change genesis hash:

Update the genesis hash in `generate_chain_entry.js`:
```javascript
const parent_hash = read_parent_entry && read_parent_entry.length > 0 
  ? read_parent_entry[0].current_hash 
  : "your_custom_genesis_hash";
```

### To use cryptographic hash (SHA-256):

Replace the FNV-1a implementation with:
```javascript
const crypto = require('crypto');

function hashJson(json) {
  const serialized = serializeJson(json);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}
```

## Testing

Test with a simple collection first before deploying to production collections:

1. Create a test collection
2. Configure flow to track only test collection
3. Perform CRUD operations
4. Verify entries in `talaan_chain`
5. Run verification script
6. Once validated, add production collections

