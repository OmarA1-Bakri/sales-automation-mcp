/**
 * Variable Replacer Utility
 *
 * Shared utility for replacing {{variable}} placeholders in templates.
 * Used by PostmarkEmailProvider, PhantombusterLinkedInProvider, and HeyGenVideoProvider.
 *
 * @see src/providers/postmark/PostmarkEmailProvider.js
 * @see src/providers/phantombuster/PhantombusterLinkedInProvider.js
 * @see src/providers/heygen/HeyGenVideoProvider.js
 */

/**
 * Replace template variables in a string
 *
 * @param {string} template - Template string containing {{variable}} placeholders
 * @param {Object} variables - Key-value pairs for replacement
 * @returns {string} Template with variables replaced
 *
 * @example
 * replaceTemplateVariables('Hello {{firstName}}!', { firstName: 'John' })
 * // Returns: 'Hello John!'
 */
export function replaceTemplateVariables(template, variables = {}) {
  if (!template || typeof template !== 'string') {
    return template || '';
  }

  let result = template;

  Object.entries(variables).forEach(([key, value]) => {
    // Escape special regex characters in key to prevent pattern breakage
    // Keys like "user.name" or "price$" would otherwise break the regex
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match {{key}} with optional whitespace: {{ key }} or {{key}}
    const regex = new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'g');
    result = result.replace(regex, value || '');
  });

  return result;
}

/**
 * Replace template variables in multiple strings
 *
 * @param {Object} templates - Object with template strings as values
 * @param {Object} variables - Key-value pairs for replacement
 * @returns {Object} Object with same keys, replaced values
 *
 * @example
 * replaceMultiple({ subject: 'Hi {{name}}', body: 'Welcome {{name}}!' }, { name: 'John' })
 * // Returns: { subject: 'Hi John', body: 'Welcome John!' }
 */
export function replaceMultiple(templates, variables = {}) {
  const result = {};

  for (const [key, template] of Object.entries(templates)) {
    result[key] = replaceTemplateVariables(template, variables);
  }

  return result;
}

export default { replaceTemplateVariables, replaceMultiple };
