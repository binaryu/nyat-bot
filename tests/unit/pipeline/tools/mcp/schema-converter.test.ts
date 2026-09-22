import { describe, expect, it } from 'vitest';
import { jsonSchemaToZod, jsonSchemaToZodObject } from '../../../../../src/pipeline/tools/mcp/schema-converter.js';

describe('MCP schema-converter', () => {
  it('converts primitive string, number, integer, boolean', () => {
    const stringSchema = jsonSchemaToZod({ type: 'string', description: 'user name' });
    expect(stringSchema.parse('Alice')).toBe('Alice');
    expect(() => stringSchema.parse(123)).toThrow();

    const intSchema = jsonSchemaToZod({ type: 'integer', minimum: 0, maximum: 100 });
    expect(intSchema.parse(42)).toBe(42);
    expect(() => intSchema.parse(3.14)).toThrow();
    expect(() => intSchema.parse(-1)).toThrow();
    expect(() => intSchema.parse(101)).toThrow();

    const boolSchema = jsonSchemaToZod({ type: 'boolean' });
    expect(boolSchema.parse(true)).toBe(true);
    expect(() => boolSchema.parse('true')).toThrow();
  });

  it('converts enum to zod enum or literal', () => {
    const multiEnum = jsonSchemaToZod({ type: 'string', enum: ['celsius', 'fahrenheit'] });
    expect(multiEnum.parse('celsius')).toBe('celsius');
    expect(() => multiEnum.parse('kelvin')).toThrow();

    const singleEnum = jsonSchemaToZod({ type: 'string', enum: ['fixed'] });
    expect(singleEnum.parse('fixed')).toBe('fixed');
    expect(() => singleEnum.parse('other')).toThrow();
  });

  it('converts arrays with item types', () => {
    const arraySchema = jsonSchemaToZod({
      type: 'array',
      items: { type: 'string' },
    });
    expect(arraySchema.parse(['a', 'b'])).toEqual(['a', 'b']);
    expect(() => arraySchema.parse([1, 2])).toThrow();
  });

  it('converts object schema with required and optional fields', () => {
    const objSchema = jsonSchemaToZodObject({
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Target city' },
        days: { type: 'integer', default: 3 },
        details: { type: 'boolean' },
      },
      required: ['city'],
    });

    const validParsed = objSchema.parse({ city: 'Tokyo' });
    expect(validParsed.city).toBe('Tokyo');
    expect(validParsed.days).toBe(3);
    expect(validParsed.details).toBeUndefined();

    expect(() => objSchema.parse({})).toThrow();
  });

  it('handles anyOf and oneOf unions', () => {
    const unionSchema = jsonSchemaToZod({
      anyOf: [{ type: 'string' }, { type: 'number' }],
    });
    expect(unionSchema.parse('hello')).toBe('hello');
    expect(unionSchema.parse(123)).toBe(123);
    expect(() => unionSchema.parse(true)).toThrow();
  });

  it('handles nested objects', () => {
    const nestedSchema = jsonSchemaToZodObject({
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
      },
      required: ['user'],
    });

    expect(nestedSchema.parse({ user: { name: 'Nyat' } })).toEqual({
      user: { name: 'Nyat' },
    });
    expect(() => nestedSchema.parse({ user: {} })).toThrow();
  });

  it('handles null, undefined, empty, or missing schemas gracefully', () => {
    const empty1 = jsonSchemaToZodObject(null);
    expect(empty1.parse({})).toEqual({});

    const empty2 = jsonSchemaToZodObject(undefined);
    expect(empty2.parse({})).toEqual({});

    const empty3 = jsonSchemaToZodObject({} as unknown as Parameters<typeof jsonSchemaToZodObject>[0]);
    expect(empty3.parse({})).toEqual({});
  });
});
