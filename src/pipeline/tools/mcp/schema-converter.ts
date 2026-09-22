// ────────────────────────────────────────
// MCP JSON Schema to Zod Converter
// ────────────────────────────────────────

import { z } from 'zod';
import type { ZodTypeAny } from 'zod';

export interface JsonSchemaProperty {
  type?: string | string[];
  description?: string;
  default?: unknown;
  enum?: unknown[];
  items?: JsonSchemaProperty | JsonSchemaProperty[];
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  anyOf?: JsonSchemaProperty[];
  oneOf?: JsonSchemaProperty[];
  minimum?: number;
  maximum?: number;
  [key: string]: unknown;
}

/**
 * Converts a JSON Schema property/object into a Zod schema.
 */
export function jsonSchemaToZod(schema?: JsonSchemaProperty | null): ZodTypeAny {
  if (!schema || typeof schema !== 'object') {
    return z.any();
  }

  // Handle anyOf / oneOf
  const unionOptions = schema.anyOf ?? schema.oneOf;
  if (Array.isArray(unionOptions) && unionOptions.length > 0) {
    const zodOptions = unionOptions.map((opt) => jsonSchemaToZod(opt));
    let unionSchema: ZodTypeAny;
    if (zodOptions.length === 1) {
      unionSchema = zodOptions[0]!;
    } else {
      unionSchema = z.union([
        zodOptions[0]!,
        zodOptions[1]!,
        ...zodOptions.slice(2),
      ]);
    }
    if (schema.description) {
      unionSchema = unionSchema.describe(schema.description);
    }
    return unionSchema;
  }

  // Handle enum
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const allStrings = schema.enum.every((item) => typeof item === 'string');
    let enumSchema: ZodTypeAny;
    if (allStrings) {
      const stringValues = schema.enum as string[];
      if (stringValues.length === 1) {
        enumSchema = z.literal(stringValues[0]!);
      } else {
        enumSchema = z.enum([stringValues[0]!, ...stringValues.slice(1)]);
      }
    } else {
      enumSchema = z.any().refine(
        (val) => schema.enum!.includes(val),
        { message: `Value must be one of: ${schema.enum.map(String).join(', ')}` },
      );
    }
    if (schema.description) {
      enumSchema = enumSchema.describe(schema.description);
    }
    return enumSchema;
  }

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  let baseSchema: ZodTypeAny;

  switch (type) {
    case 'string':
      baseSchema = z.string();
      break;

    case 'number': {
      let numSchema = z.number();
      if (typeof schema.minimum === 'number') {
        numSchema = numSchema.min(schema.minimum);
      }
      if (typeof schema.maximum === 'number') {
        numSchema = numSchema.max(schema.maximum);
      }
      baseSchema = numSchema;
      break;
    }

    case 'integer': {
      let intSchema = z.number().int();
      if (typeof schema.minimum === 'number') {
        intSchema = intSchema.min(schema.minimum);
      }
      if (typeof schema.maximum === 'number') {
        intSchema = intSchema.max(schema.maximum);
      }
      baseSchema = intSchema;
      break;
    }

    case 'boolean':
      baseSchema = z.boolean();
      break;

    case 'null':
      baseSchema = z.null();
      break;

    case 'array': {
      let itemSchema: ZodTypeAny = z.any();
      if (schema.items) {
        if (Array.isArray(schema.items)) {
          // Tuple or multi-type
          itemSchema = schema.items.length > 0 ? jsonSchemaToZod(schema.items[0]) : z.any();
        } else {
          itemSchema = jsonSchemaToZod(schema.items);
        }
      }
      baseSchema = z.array(itemSchema);
      break;
    }

    case 'object':
    default: {
      if (schema.properties && typeof schema.properties === 'object') {
        const shape: Record<string, ZodTypeAny> = {};
        const requiredSet = new Set<string>(schema.required ?? []);

        for (const [key, prop] of Object.entries(schema.properties)) {
          let propZod = jsonSchemaToZod(prop);
          const isRequired = requiredSet.has(key);

          if (!isRequired) {
            if (prop.default !== undefined) {
              propZod = propZod.default(prop.default);
            } else {
              propZod = propZod.optional();
            }
          }
          shape[key] = propZod;
        }

        baseSchema = z.object(shape).passthrough();
      } else if (type === 'object') {
        baseSchema = z.record(z.any());
      } else {
        baseSchema = z.any();
      }
      break;
    }
  }

  if (schema.description && baseSchema.describe) {
    baseSchema = baseSchema.describe(schema.description);
  }

  return baseSchema;
}

/**
 * Specifically converts top-level MCP tool inputSchema to a Zod Object Schema.
 * Guarantees a ZodObject return so it satisfies AI SDK tool parameter expectations.
 */
export function jsonSchemaToZodObject(schema?: JsonSchemaProperty | null): z.ZodObject<Record<string, ZodTypeAny>> {
  if (!schema || typeof schema !== 'object' || !schema.properties) {
    return z.object({});
  }

  const converted = jsonSchemaToZod(schema);
  if (converted instanceof z.ZodObject) {
    return converted as z.ZodObject<Record<string, ZodTypeAny>>;
  }

  return z.object({});
}
