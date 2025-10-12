/**
 * Validate & Verify Hash - Talaan Mirror Receiver
 * 
 * Combined validation: checks payload structure AND verifies hash
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
  const { $trigger } = data;
  const body = $trigger.body;
  
  // 1. VALIDATE STRUCTURE
  
  // Check required fields
  const required = ['talaan_id', 'parent_id', 'parent_hash', 'current_hash', 'payload'];
  const missing = required.filter(field => body[field] === undefined);
  
  if (missing.length > 0) {
    return {
      valid: false,
      error: 'MISSING_FIELDS',
      message: `Missing required fields: ${missing.join(', ')}`,
      status: 400
    };
  }
  
  // Validate UUID format for talaan_id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(body.talaan_id)) {
    return {
      valid: false,
      error: 'INVALID_TALAAN_ID',
      message: 'talaan_id must be a valid UUID',
      status: 400
    };
  }
  
  // Validate hash format (8-char hex)
  const hashRegex = /^[0-9a-f]{8}$/;
  if (!hashRegex.test(body.current_hash)) {
    return {
      valid: false,
      error: 'INVALID_HASH_FORMAT',
      message: 'current_hash must be 8-character hex',
      status: 400
    };
  }
  
  // Validate parent_hash
  if (body.parent_hash !== 'likha_genesis' && !hashRegex.test(body.parent_hash)) {
    return {
      valid: false,
      error: 'INVALID_PARENT_HASH',
      message: 'parent_hash must be 8-character hex or "likha_genesis"',
      status: 400
    };
  }
  
  // Validate payload is object
  if (typeof body.payload !== 'object' || body.payload === null) {
    return {
      valid: false,
      error: 'INVALID_PAYLOAD',
      message: 'payload must be a JSON object',
      status: 400
    };
  }
  
  // 2. VERIFY HASH
  
  // Compute expected hash
  const payload_hash = hashJson(body.payload);
  const computed_hash = hashJson({
    parent: body.parent_hash,
    payload: payload_hash
  });
  
  // Check if hash matches
  if (computed_hash !== body.current_hash) {
    return {
      valid: false,
      error: 'HASH_MISMATCH',
      message: `Hash verification failed. Expected: ${computed_hash}, Got: ${body.current_hash}`,
      status: 422
    };
  }
  
  // 3. ALL VALID
  return {
    valid: true,
    entry: body
  };
}

