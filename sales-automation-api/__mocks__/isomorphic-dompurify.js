/**
 * Manual mock for isomorphic-dompurify
 * Avoids jsdom/parse5 ESM compatibility issues in Jest
 *
 * This mock provides basic HTML tag stripping for testing validation logic
 * without requiring the full DOM purification functionality
 */

const DOMPurify = {
  sanitize: (dirty, config = {}) => {
    if (!dirty) return '';

    const str = String(dirty);

    // If ALLOWED_TAGS is empty array, strip all HTML tags
    if (config.ALLOWED_TAGS && config.ALLOWED_TAGS.length === 0) {
      // Strip HTML tags but keep content (KEEP_CONTENT: true)
      return str.replace(/<[^>]*>/g, '');
    }

    // Default: return as-is (for testing purposes)
    return str;
  }
};

export default DOMPurify;
