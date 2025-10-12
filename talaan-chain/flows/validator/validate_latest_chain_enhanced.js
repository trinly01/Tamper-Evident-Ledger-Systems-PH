/**
 * Enhanced Chain Validator with Semantic Error Codes
 * Validates latest entry plus 10 parent levels
 */

// Error code constants
const ERROR_CODES = {
  // Success
  VALID: 'VALID',
  
  // No data
  EMPTY: 'EMPTY',
  NO_ENTRIES: 'NO_ENTRIES',
  
  // Hash errors
  HASH_MISMATCH: 'HASH_MISMATCH',
  HASH_INVALID_FORMAT: 'HASH_INVALID_FORMAT',
  GENESIS_HASH_INVALID: 'GENESIS_HASH_INVALID',
  
  // Parent errors
  PARENT_NOT_FOUND: 'PARENT_NOT_FOUND',
  PARENT_HASH_MISMATCH: 'PARENT_HASH_MISMATCH',
  
  // Genesis errors
  GENESIS_NOT_FOUND: 'GENESIS_NOT_FOUND',
  GENESIS_UNREACHABLE: 'GENESIS_UNREACHABLE',
  GENESIS_INVALID_PARENT: 'GENESIS_INVALID_PARENT',
  
  // Structure errors
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  
  // General
  INVALID: 'INVALID'
};

// Severity levels
const SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

/**
 * Deterministically serializes JSON with sorted keys
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

/**
 * FNV-1a hash algorithm
 */
function fnv1aHash(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Hash JSON object
 */
function hashJson(json) {
  const serialized = serializeJson(json);
  return fnv1aHash(serialized);
}

/**
 * Validate single entry structure
 */
function validateEntryStructure(entry) {
  const required = ['id', 'parent_hash', 'current_hash', 'payload'];
  const missing = required.filter(field => !entry[field]);
  
  if (missing.length > 0) {
    return {
      valid: false,
      code: ERROR_CODES.MISSING_REQUIRED_FIELD,
      severity: SEVERITY.HIGH,
      message: `Missing required fields: ${missing.join(', ')}`
    };
  }
  
  // Validate hash format (8-char hex)
  const hashRegex = /^[0-9a-f]{8}$/;
  if (!hashRegex.test(entry.current_hash)) {
    return {
      valid: false,
      code: ERROR_CODES.HASH_INVALID_FORMAT,
      severity: SEVERITY.HIGH,
      message: `Invalid hash format: ${entry.current_hash}`
    };
  }
  
  return { valid: true };
}

/**
 * Validate hash computation
 */
function validateHash(entry) {
  try {
    const payload_hash = hashJson(entry.payload);
    const computed_hash = hashJson({
      parent: entry.parent_hash,
      payload: payload_hash
    });
    
    if (computed_hash !== entry.current_hash) {
      return {
        valid: false,
        code: ERROR_CODES.HASH_MISMATCH,
        severity: SEVERITY.CRITICAL,
        message: `Hash mismatch. Expected: ${computed_hash}, Got: ${entry.current_hash}`
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      code: ERROR_CODES.INVALID_PAYLOAD,
      severity: SEVERITY.HIGH,
      message: `Failed to compute hash: ${error.message}`
    };
  }
}

/**
 * Main validation function
 */
module.exports = async function(data) {
  const { read_recent_50 } = data;
  const TRACE_DEPTH = 10;
  
  // Check if empty
  if (!read_recent_50 || read_recent_50.length === 0) {
    return {
      status: ERROR_CODES.EMPTY,
      code: ERROR_CODES.NO_ENTRIES,
      severity: SEVERITY.LOW,
      summary: '⚠️ Empty chain - no entries to validate',
      validated: 0,
      invalid: [],
      depth_reached: 0,
      reached_genesis: false
    };
  }
  
  const results = {
    validated: 0,
    invalid: [],
    depth_reached: 0,
    reached_genesis: false
  };
  
  // Build lookup map
  const entryMap = {};
  read_recent_50.forEach(entry => {
    entryMap[entry.talaan_id] = entry;
  });
  
  // Trace from latest entry
  let current = read_recent_50[0];
  let depth = 0;
  
  while (current && depth < TRACE_DEPTH) {
    // Validate structure
    const structCheck = validateEntryStructure(current);
    if (!structCheck.valid) {
      results.invalid.push({
        id: current.id,
        depth: depth,
        code: structCheck.code,
        severity: structCheck.severity,
        reason: structCheck.message
      });
      break;
    }
    
    // Validate hash
    const hashCheck = validateHash(current);
    if (!hashCheck.valid) {
      results.invalid.push({
        id: current.id,
        depth: depth,
        code: hashCheck.code,
        severity: hashCheck.severity,
        reason: hashCheck.message
      });
      break;
    }
    
    results.validated++;
    results.depth_reached = depth + 1;
    
    // Check if genesis
    if (current.parent_id === null) {
      if (current.parent_hash !== 'likha_genesis') {
        results.invalid.push({
          id: current.id,
          depth: depth,
          code: ERROR_CODES.GENESIS_HASH_INVALID,
          severity: SEVERITY.CRITICAL,
          reason: `Genesis hash should be "likha_genesis", got "${current.parent_hash}"`
        });
        break;
      }
      results.reached_genesis = true;
      break;
    }
    
    // Find parent
    const parent = entryMap[current.parent_id];
    if (!parent) {
      results.invalid.push({
        id: current.id,
        depth: depth,
        parent_id: current.parent_id,
        code: ERROR_CODES.PARENT_NOT_FOUND,
        severity: SEVERITY.CRITICAL,
        reason: 'Parent entry not found in recent entries'
      });
      break;
    }
    
    // Validate parent hash match
    if (parent.current_hash !== current.parent_hash) {
      results.invalid.push({
        id: current.id,
        depth: depth,
        parent_id: current.parent_id,
        code: ERROR_CODES.PARENT_HASH_MISMATCH,
        severity: SEVERITY.CRITICAL,
        reason: `Parent hash mismatch. Expected: ${parent.current_hash}, Got: ${current.parent_hash}`
      });
      break;
    }
    
    current = parent;
    depth++;
  }
  
  // Generate summary
  const isValid = results.invalid.length === 0;
  
  if (isValid) {
    return {
      status: ERROR_CODES.VALID,
      code: ERROR_CODES.VALID,
      severity: null,
      summary: `✅ Valid! Checked ${results.validated} entries (depth: ${results.depth_reached})${results.reached_genesis ? ' to genesis' : ''}`,
      read_recent_50,
      ...results
    };
  } else {
    const firstError = results.invalid[0];
    return {
      status: ERROR_CODES.INVALID,
      code: firstError.code,
      severity: firstError.severity,
      summary: `❌ ${firstError.code}: ${firstError.reason}`,
      read_recent_50,
      ...results
    };
  }
}

