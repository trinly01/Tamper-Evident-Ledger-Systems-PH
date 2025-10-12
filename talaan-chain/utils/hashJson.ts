/**
 * Fast, non-cryptographic hash function for JSON objects
 * Uses FNV-1a algorithm for speed and simplicity
 */

/**
 * Deterministically serializes a JSON object using JSON.stringify with sorted keys
 * This ensures the same object always produces the same string
 */
function serializeJson(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    // Sort object keys to ensure consistent ordering
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted: any, key) => {
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
function fnv1aHash(str: string): string {
  let hash = 2166136261; // FNV offset basis (32-bit)
  
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime
  }
  
  // Convert to unsigned 32-bit hex string
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Hash a JSON object to produce a unique hash string
 * Same JSON content will always produce the same hash
 * 
 * Features:
 * - Nested objects: Keys sorted at all levels
 * - Arrays: Order is preserved (important!)
 * - Objects in arrays: Keys sorted within each object
 * - Dates: Converted to ISO strings
 * - undefined: Omitted (same as JSON.stringify behavior)
 * - Functions: Omitted (not JSON-serializable)
 * - Circular refs: Will throw error (use try-catch if needed)
 * 
 * @param json - Any JSON-serializable object
 * @returns 8-character hexadecimal hash string
 * 
 * @example
 * const hash1 = hashJson({ name: "John", age: 30 });
 * const hash2 = hashJson({ age: 30, name: "John" }); // Same hash as hash1
 * console.log(hash1 === hash2); // true
 * 
 * // Nested objects work too
 * const nested1 = { user: { name: "John", age: 30 }, meta: { id: 1 } };
 * const nested2 = { meta: { id: 1 }, user: { age: 30, name: "John" } };
 * console.log(hashJson(nested1) === hashJson(nested2)); // true
 * 
 * // Array order matters
 * console.log(hashJson({ arr: [1, 2, 3] }) === hashJson({ arr: [3, 2, 1] })); // false
 */
export function hashJson(json: any): string {
  const serialized = serializeJson(json);
  return fnv1aHash(serialized);
}

/**
 * Hash a JSON object to produce a longer hash (for lower collision probability)
 * Uses FNV-1a algorithm twice with different salts
 * 
 * @param json - Any JSON-serializable object
 * @returns 16-character hexadecimal hash string
 */
export function hashJsonLong(json: any): string {
  const serialized = serializeJson(json);
  const hash1 = fnv1aHash(serialized);
  const hash2 = fnv1aHash(serialized + hash1);
  return hash1 + hash2;
}

