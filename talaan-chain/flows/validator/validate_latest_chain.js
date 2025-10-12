/**
 * Lightweight Chain Validation - Latest Entry + Parent Chain
 * 
 * Purpose: Quick validation of recent chain activity
 * Use: Frequent checks (every hour or on-demand)
 * 
 * This validates the most recent entry and traces back through
 * parent relationships up to a specified depth.
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

function validateSingleEntry(entry) {
  const payload_hash = hashJson(entry.payload);
  const computed_hash = hashJson({
    parent: entry.parent_hash,
    payload: payload_hash
  });
  
  return computed_hash === entry.current_hash;
}

module.exports = async function(data) {
  const { read_recent_50 } = data;
  const TRACE_DEPTH = 10; // Validate last 10 levels
  
  if (!read_recent_50 || read_recent_50.length === 0) {
    return {
      status: 'empty',
      message: 'No entries in chain yet'
    };
  }
  
  const results = {
    validated: 0,
    invalid: [],
    depth_reached: 0,
    reached_genesis: false
  };
  
  // Build lookup map from recent 50 entries using talaan_id
  const entryMap = {};
  read_recent_50.forEach(entry => {
    entryMap[entry.talaan_id] = entry;
  });
  
  // Trace back from latest entry (first in sorted array)
  let current = read_recent_50[0];
  let depth = 0;
  
  while (current && depth < TRACE_DEPTH) {
    // Validate current entry
    if (!validateSingleEntry(current)) {
      results.invalid.push({
        talaan_id: current.talaan_id,
        depth: depth,
        reason: 'Hash mismatch'
      });
      break;
    }
    
    results.validated++;
    results.depth_reached = depth + 1;
    
    // Check if we reached genesis
    if (current.parent_id === null) {
      // Verify genesis hash
      if (current.parent_hash !== 'likha_genesis') {
        results.invalid.push({
          talaan_id: current.talaan_id,
          depth: depth,
          reason: 'Genesis hash should be "likha_genesis"'
        });
        break;
      }
      results.reached_genesis = true;
      break;
    }
    
    // Move to parent (parent_id stores parent's talaan_id)
    const parent = entryMap[current.parent_id];
    if (!parent) {
      results.invalid.push({
        talaan_id: current.talaan_id,
        depth: depth,
        reason: 'Parent not found',
        parent_id: current.parent_id
      });
      break;
    }
    
    // Verify parent hash matches
    if (parent.current_hash !== current.parent_hash) {
      results.invalid.push({
        talaan_id: current.talaan_id,
        depth: depth,
        reason: 'Parent hash mismatch'
      });
      break;
    }
    
    current = parent;
    depth++;
  }
  
  // Generate summary
  const isValid = results.invalid.length === 0;
  const summary = isValid
    ? `✅ Valid! Checked ${results.validated} entries (depth: ${results.depth_reached})${results.reached_genesis ? ' to genesis' : ''}`
    : `❌ Invalid! Found ${results.invalid.length} errors at depth ${results.invalid[0].depth}`;
  
  return {
    read_recent_50,
    status: isValid ? 'valid' : 'invalid',
    summary: summary,
    ...results
  };
}

