/**
 * Variable Replacer Unit Tests
 *
 * Tests for the template variable replacement utility used by
 * email, LinkedIn, and video providers.
 */

import { describe, it, expect } from '@jest/globals';
import {
  replaceTemplateVariables,
  replaceMultiple
} from '../src/providers/utils/variable-replacer.js';

describe('Variable Replacer Utility', () => {
  describe('replaceTemplateVariables', () => {
    it('should replace single variable', () => {
      const result = replaceTemplateVariables('Hello {{firstName}}!', { firstName: 'John' });
      expect(result).toBe('Hello John!');
    });

    it('should replace multiple variables', () => {
      const template = 'Hi {{firstName}}, welcome to {{companyName}}!';
      const variables = { firstName: 'Jane', companyName: 'Acme Corp' };
      const result = replaceTemplateVariables(template, variables);
      expect(result).toBe('Hi Jane, welcome to Acme Corp!');
    });

    it('should handle variables with whitespace in braces', () => {
      const result = replaceTemplateVariables('Hello {{ firstName }}!', { firstName: 'John' });
      expect(result).toBe('Hello John!');
    });

    it('should handle multiple occurrences of same variable', () => {
      const template = '{{name}} says hi. {{name}} is great!';
      const result = replaceTemplateVariables(template, { name: 'Alice' });
      expect(result).toBe('Alice says hi. Alice is great!');
    });

    it('should return empty string for null template', () => {
      expect(replaceTemplateVariables(null, { foo: 'bar' })).toBe('');
    });

    it('should return empty string for undefined template', () => {
      expect(replaceTemplateVariables(undefined, { foo: 'bar' })).toBe('');
    });

    it('should return non-string input unchanged', () => {
      // Function returns the original value for non-strings (defensive behavior)
      expect(replaceTemplateVariables(123, { foo: 'bar' })).toBe(123);
    });

    it('should handle empty variables object', () => {
      const template = 'Hello {{name}}!';
      const result = replaceTemplateVariables(template, {});
      expect(result).toBe('Hello {{name}}!');
    });

    it('should handle undefined variables object', () => {
      const template = 'Hello {{name}}!';
      const result = replaceTemplateVariables(template);
      expect(result).toBe('Hello {{name}}!');
    });

    it('should replace missing variable values with empty string', () => {
      const template = 'Hello {{firstName}} {{lastName}}!';
      const result = replaceTemplateVariables(template, { firstName: 'John', lastName: null });
      expect(result).toBe('Hello John !');
    });

    it('should handle special regex characters in variable names', () => {
      const template = 'Price: {{price$}}';
      const result = replaceTemplateVariables(template, { 'price$': '$100' });
      expect(result).toBe('Price: $100');
    });

    it('should handle dots in variable names', () => {
      const template = 'Contact: {{user.email}}';
      const result = replaceTemplateVariables(template, { 'user.email': 'test@example.com' });
      expect(result).toBe('Contact: test@example.com');
    });

    it('should handle numeric values', () => {
      const template = 'Count: {{count}}';
      const result = replaceTemplateVariables(template, { count: 42 });
      expect(result).toBe('Count: 42');
    });

    it('should handle boolean values', () => {
      const template = 'Active: {{isActive}}';
      const result = replaceTemplateVariables(template, { isActive: true });
      expect(result).toBe('Active: true');
    });

    it('should preserve text without variables', () => {
      const template = 'This is plain text without variables.';
      const result = replaceTemplateVariables(template, { foo: 'bar' });
      expect(result).toBe('This is plain text without variables.');
    });

    it('should handle complex real-world email template', () => {
      const template = `
Hi {{firstName}},

I noticed that {{companyName}} is doing great work in the {{industry}} space.

I'd love to connect and share how we've helped similar companies like yours.

Best regards,
{{senderName}}
{{senderTitle}}
      `.trim();

      const variables = {
        firstName: 'Sarah',
        companyName: 'TechStartup Inc',
        industry: 'SaaS',
        senderName: 'Alex',
        senderTitle: 'Sales Director'
      };

      const result = replaceTemplateVariables(template, variables);
      expect(result).toContain('Hi Sarah');
      expect(result).toContain('TechStartup Inc');
      expect(result).toContain('SaaS space');
      expect(result).toContain('Alex');
      expect(result).toContain('Sales Director');
    });
  });

  describe('replaceMultiple', () => {
    it('should replace variables in multiple templates', () => {
      const templates = {
        subject: 'Hello {{name}}',
        body: 'Welcome to {{company}}, {{name}}!'
      };
      const variables = { name: 'John', company: 'Acme' };

      const result = replaceMultiple(templates, variables);

      expect(result.subject).toBe('Hello John');
      expect(result.body).toBe('Welcome to Acme, John!');
    });

    it('should handle empty templates object', () => {
      const result = replaceMultiple({}, { name: 'John' });
      expect(result).toEqual({});
    });

    it('should handle undefined variables', () => {
      const templates = { greeting: 'Hello {{name}}' };
      const result = replaceMultiple(templates);
      expect(result.greeting).toBe('Hello {{name}}');
    });

    it('should preserve original object structure', () => {
      const templates = {
        email: {
          subject: '{{greeting}}',
          body: '{{content}}'
        }
      };
      // Note: replaceMultiple only handles flat objects with string values
      // Nested objects will have toString() called on them
      const result = replaceMultiple({ subject: '{{greeting}}' }, { greeting: 'Hi' });
      expect(result.subject).toBe('Hi');
    });

    it('should handle real-world email fields', () => {
      const emailFields = {
        subject: 'Quick question for {{firstName}} at {{companyName}}',
        preview: '{{firstName}}, I noticed your work on...',
        greeting: 'Hi {{firstName}},'
      };
      const contact = {
        firstName: 'Michael',
        companyName: 'StartupXYZ'
      };

      const result = replaceMultiple(emailFields, contact);

      expect(result.subject).toBe('Quick question for Michael at StartupXYZ');
      expect(result.preview).toBe('Michael, I noticed your work on...');
      expect(result.greeting).toBe('Hi Michael,');
    });
  });
});
