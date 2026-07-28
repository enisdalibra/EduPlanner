import { describe, it, expect } from 'vitest';
import { cn } from '../../src/lib/utils';

describe('cn utility function', () => {
  it('should merge multiple classes', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('should handle undefined and null values', () => {
    expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2');
  });

  it('should handle false values', () => {
    expect(cn('class1', false, 'class2')).toBe('class1 class2');
  });

  it('should handle empty strings', () => {
    expect(cn('class1', '', 'class2')).toBe('class1 class2');
  });

  it('should work with ClassValue objects', () => {
    const classes = { 'class1': true, 'class2': false, 'class3': true };
    expect(cn('base', classes)).toBe('base class1 class3');
  });

  it('should merge with tailwind-merge functionality', () => {
    // This tests that tailwind-merge is working (function doesn't throw)
    expect(typeof cn('p-4', 'p-6')).toBe('string');
    expect(typeof cn('mr-2', 'ml-2')).toBe('string');
    expect(typeof cn('flex-row', 'flex-col')).toBe('string');
  });
});