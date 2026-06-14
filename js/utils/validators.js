/** Strategy pattern: maps each field name to a pure validation function.
 *  Returns true when valid, or an error string when invalid.
 *  No side effects — safe to test in isolation.
 */
export const validators = {
  name:    (v) => v.trim().length >= 2 || 'Name must be at least 2 characters.',
  email:   (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Please enter a valid email address.',
  message: (v) => v.trim().length >= 10 || 'Message must be at least 10 characters.',
};
