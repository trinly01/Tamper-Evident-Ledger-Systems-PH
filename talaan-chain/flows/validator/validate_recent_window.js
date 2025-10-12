/**
 * Sliding Window Chain Validation
 * 
 * Purpose: Validate recent entries only (last N entries)
 * Use: Frequent monitoring (every 15-30 minutes)
 * 
 * Validates the most recent window of entries for quick detection
 * of any tampering or corruption in recent activity.
 */

function serializeJson(obj) {
  return JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted, key) => {
          sorted[key] = value[key];
          return sorted;
        }, {});
    }
    return value;
  });
}

function fnv1aHash(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function hashJson(json) {
  return fnv1aHash(serializeJson(json));
}

module.exports = async function(data) {
  const { read_recent_100, read_recent_150 } = data;
  const WINDOW_SIZE = 100; // Validate last 100 entries
  
  if (!read_recent_100 || read_recent_100.length === 0) {
    return {
      status: 'empty',
      message: 'No entries in chain yet'
    };
  }
  
  const results = {
    window_size: read_recent_100.length,
    validated: 0,
    invalid: [],
    orphans: []
  };
  
  // Build lookup map from 150 recent entries (covers parents of 100 entries)
  const entryMap = {};
  read_recent_150.forEach(entry => {
    entryMap[entry.talaan_id] = entry;
  });
  
  // Validate each entry in window
  read_recent_100.forEach(entry => {
    // 1. Validate hash computation
    const payload_hash = hashJson(entry.payload);
    const computed_hash = hashJson({
      parent: entry.parent_hash,
      payload: payload_hash
    });
    
    if (computed_hash !== entry.current_hash) {
      results.invalid.push({
        id: entry.id,
        reason: 'Hash mismatch',
        expected: computed_hash,
        actual: entry.current_hash
      });
      return;
    }
    
    // 2. Validate parent relationship
    if (entry.parent_id !== null) {
      const parent = entryMap[entry.parent_id];
      
      if (!parent) {
        results.orphans.push({
          id: entry.id,
          reason: 'Parent not found',
          parent_id: entry.parent_id
        });
        return;
      }
      
      if (parent.current_hash !== entry.parent_hash) {
        results.invalid.push({
          id: entry.id,
          reason: 'Parent hash mismatch',
          expected: parent.current_hash,
          actual: entry.parent_hash
        });
        return;
      }
    } else {
      // Validate genesis
      if (entry.parent_hash !== 'likha_genesis') {
        results.invalid.push({
          id: entry.id,
          reason: 'Invalid genesis hash',
          expected: 'likha_genesis',
          actual: entry.parent_hash
        });
        return;
      }
    }
    
    results.validated++;
  });
  
  // Generate summary
  const isValid = results.invalid.length === 0 && results.orphans.length === 0;
  const summary = isValid
    ? `✅ Valid! Checked ${results.validated} recent entries`
    : `❌ Invalid! Found ${results.invalid.length} errors and ${results.orphans.length} orphans`;
  
  return {
    status: isValid ? 'valid' : 'invalid',
    summary: summary,
    ...results
  };
}

