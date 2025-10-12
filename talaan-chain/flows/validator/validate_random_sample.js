/**
 * Random Sampling Chain Validation
 * 
 * Purpose: Statistical validation by checking random entries
 * Use: Daily/weekly audits for broader coverage
 * 
 * Picks random entries and validates each one's complete chain
 * back to genesis. Provides statistical confidence in chain integrity.
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
  const { read_all_entries } = data;
  const SAMPLE_SIZE = 10; // Number of random entries to check
  
  if (!read_all_entries || read_all_entries.length === 0) {
    return {
      status: 'empty',
      message: 'No entries in chain yet'
    };
  }
  
  const results = {
    total_entries: read_all_entries.length,
    sample_size: Math.min(SAMPLE_SIZE, read_all_entries.length),
    chains_validated: 0,
    chains_invalid: [],
    total_validations: 0
  };
  
  // Build lookup map using talaan_id
  const entryMap = {};
  read_all_entries.forEach(entry => {
    entryMap[entry.talaan_id] = entry;
  });
  
  // Pick random samples
  const shuffled = [...read_all_entries].sort(() => Math.random() - 0.5);
  const samples = shuffled.slice(0, results.sample_size);
  
  // Validate each sample's complete chain
  samples.forEach(entry => {
    let current = entry;
    let chainLength = 0;
    let chainValid = true;
    let errorReason = null;
    
    // Trace to genesis
    while (current) {
      // Validate hash
      if (!validateSingleEntry(current)) {
        chainValid = false;
        errorReason = `Hash mismatch at depth ${chainLength}`;
        break;
      }
      
      chainLength++;
      results.total_validations++;
      
      // Check if genesis
      if (current.parent_id === null) {
        if (current.parent_hash !== 'likha_genesis') {
          chainValid = false;
          errorReason = 'Invalid genesis hash';
        }
        break;
      }
      
      // Move to parent
      const parent = entryMap[current.parent_id];
      if (!parent) {
        chainValid = false;
        errorReason = `Parent not found at depth ${chainLength}`;
        break;
      }
      
      if (parent.current_hash !== current.parent_hash) {
        chainValid = false;
        errorReason = `Parent hash mismatch at depth ${chainLength}`;
        break;
      }
      
      current = parent;
    }
    
    if (chainValid) {
      results.chains_validated++;
    } else {
      results.chains_invalid.push({
        entry_id: entry.id,
        chain_length: chainLength,
        reason: errorReason
      });
    }
  });
  
  // Generate summary
  const isValid = results.chains_invalid.length === 0;
  const coverage = ((results.sample_size / results.total_entries) * 100).toFixed(1);
  
  const summary = isValid
    ? `✅ Valid! Checked ${results.sample_size} random chains (${coverage}% coverage), ${results.total_validations} total validations`
    : `❌ Invalid! ${results.chains_invalid.length} of ${results.sample_size} chains failed`;
  
  return {
    status: isValid ? 'valid' : 'invalid',
    summary: summary,
    coverage_percent: parseFloat(coverage),
    ...results
  };
}

