/**
 * UTILIDAD PARA PARSEO SEGURO DE JSON
 * Previene inyección de datos maliciosos en localStorage
 */

import { z } from 'zod';

/**
 * Parsea JSON de forma segura con validación de esquema opcional
 * @param data - Cadena JSON a parsear
 * @param schema - Esquema Zod opcional para validar la estructura
 * @param defaultValue - Valor por defecto si falla el parseo
 */
export function safeJsonParse<T>(
  data: string | null | undefined,
  schema?: z.ZodType<T>,
  defaultValue: T | null = null
): T | null {
  if (!data) {
    return defaultValue;
  }

  try {
    const parsed = JSON.parse(data);
    
    // Si hay esquema, validar estructura
    if (schema) {
      const result = schema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
      console.warn('JSON no cumple con el esquema esperado:', result.error.message);
      return defaultValue;
    }
    
    return parsed as T;
  } catch (error) {
    console.warn('Error parseando JSON:', error);
    return defaultValue;
  }
}

/**
 * Parsea un array JSON de forma segura con validación de esquema
 */
export function safeJsonParseArray<T>(
  data: string | null | undefined,
  itemSchema: z.ZodType<T>
): T[] {
  if (!data) {
    return [];
  }

  try {
    const parsed = JSON.parse(data);
    
    // Verificar que es un array
    if (!Array.isArray(parsed)) {
      console.warn('JSON parseado no es un array');
      return [];
    }
    
    // Filtrar y validar cada item con el esquema
    const validItems: T[] = [];
    for (const item of parsed) {
      const result = itemSchema.safeParse(item);
      if (result.success) {
        validItems.push(result.data);
      }
    }
    
    return validItems;
  } catch (error) {
    console.warn('Error parseando array JSON:', error);
    return [];
  }
}

/**
 * Parsea un Map desde JSON de forma segura
 */
export function safeJsonParseMap<K extends string, V>(
  data: string | null | undefined,
  valueSchema?: z.ZodType<V>
): Map<K, V> {
  if (!data) {
    return new Map();
  }

  try {
    const parsed = JSON.parse(data);
    
    // Verificar que es un array de tuplas
    if (!Array.isArray(parsed)) {
      console.warn('JSON parseado para Map no es un array de tuplas');
      return new Map();
    }
    
    // Validar cada entrada si hay esquema
    if (valueSchema) {
      const validEntries = parsed.filter(([_, value]) => {
        const result = valueSchema.safeParse(value);
        return result.success;
      }) as [K, V][];
      return new Map(validEntries);
    }
    
    return new Map(parsed as [K, V][]);
  } catch (error) {
    console.warn('Error parseando Map JSON:', error);
    return new Map();
  }
}
