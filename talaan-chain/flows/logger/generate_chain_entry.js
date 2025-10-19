/**
 * talaan_chain_system Flow Operation: generate_chain_entry
 * 
 * Purpose: Generate hash and build payload for chain entry
 * Input: $trigger, $accountability, read_parent_entry
 * Output: parent_id, parent_hash, current_hash, payload
 */

/**
 * Deterministically serializes a JSON object using JSON.stringify with sorted keys
 * This ensures the same object always produces the same string
 */
function serializeJson(obj) {
  return JSON.stringify(obj, (key, value) => {
    // Sort object keys to ensure consistent ordering
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

/**
 * FNV-1a hash algorithm - fast non-cryptographic hash
 */
function fnv1aHash(str) {
  let hash = 2166136261; // FNV offset basis (32-bit)
  
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime
  }
  
  // Convert to unsigned 32-bit hex string
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function hashJson(json) {
  const serialized = serializeJson(json);
  return fnv1aHash(serialized);
}

// Main flow operation
module.exports = async function(data) {
  const { $trigger, $accountability, read_parent_entry } = data;
  
  const parent_id = read_parent_entry && read_parent_entry.length > 0 
    ? read_parent_entry[0].id 
    : null;
    
  const parent_hash = read_parent_entry && read_parent_entry.length > 0 
    ? read_parent_entry[0].current_hash 
    : "likha_genesis";
    
  const payload = {
    $trigger,
    $accountability
  };
    
  const payload_hash = hashJson(payload);
  const current_hash = hashJson({
    parent: parent_hash,
    payload: payload_hash
  });
  
  return {
    parent_id,
    parent_hash,
    current_hash,
    payload
  };
}

