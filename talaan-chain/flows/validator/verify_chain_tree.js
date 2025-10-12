/**
 * Chain Verification Script
 * 
 * Purpose: Verify the integrity of the entire talaan_chain tree
 * Can be used in a manual or scheduled Directus flow
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
  const { read_all_entries } = data;
  
  const results = {
    total: read_all_entries.length,
    valid: 0,
    invalid: [],
    orphans: [],
    summary: ''
  };
  
  // Build parent lookup map using talaan_id
  const entryMap = {};
  read_all_entries.forEach(entry => {
    entryMap[entry.talaan_id] = entry;
  });
  
  // Verify each entry
  read_all_entries.forEach(entry => {
    // 1. Verify hash computation
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
    
    // 2. Verify parent relationship
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
    }
    
    results.valid++;
  });
  
  // Generate summary
  if (results.invalid.length === 0 && results.orphans.length === 0) {
    results.summary = `✅ All ${results.total} entries are VALID!`;
  } else {
    results.summary = `❌ Found ${results.invalid.length} invalid entries and ${results.orphans.length} orphans out of ${results.total} total entries.`;
  }
  
  return results;
}

