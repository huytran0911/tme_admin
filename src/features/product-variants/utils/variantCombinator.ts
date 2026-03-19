// ============================================================================
// Variant Combinator - Generate Cartesian Product
// ============================================================================

import { customAlphabet } from "nanoid";
import type { SelectedType, VariantDraft, VariantOption } from "../types";

// Generate unique SKU suffix - excludes O, 0, I, 1, L to avoid confusion when reading
const generateSkuSuffix = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

/**
 * Remove Vietnamese diacritics and convert to ASCII
 */
function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Sanitize SKU: remove diacritics and keep only A-Z, 0-9, hyphen, underscore
 */
function sanitizeSku(value: string): string {
  return removeVietnameseDiacritics(value)
    .toUpperCase()
    .replace(/[^A-Z0-9\-_]/g, "");
}

/**
 * Generate all possible variant combinations from selected types and values
 * @param selectedTypes Array of selected product types with their values
 * @returns Array of variant drafts with all combinations
 */
export function generateVariantCombinations(selectedTypes: SelectedType[]): VariantDraft[] {
  if (selectedTypes.length === 0) return [];

  // Filter out types with no selected values
  const validTypes = selectedTypes.filter(st => st.selectedValues.length > 0);
  if (validTypes.length === 0) return [];

  // Generate cartesian product
  const combinations = cartesianProduct(
    validTypes.map(st => st.selectedValues.map(v => ({
      type_id: st.type.id,
      type_code: st.type.code,
      type_name: st.type.name,
      value_id: v.id,
      value: v.value,
    })))
  );

  // Convert to variant drafts
  return combinations.map((combo, index) => {
    const options: VariantOption[] = combo.map(item => ({
      product_type_id: item.type_id,
      product_type_value_id: item.value_id,
      type_code: item.type_code,
      type_name: item.type_name,
      value: item.value,
    }));

    // Generate SKU suggestion based on values (sanitized, no Vietnamese diacritics) + unique suffix
    const valuePart = combo.map(c => sanitizeSku(c.value).substring(0, 3)).join('-');
    const uniquePart = generateSkuSuffix();

    return {
      temp_id: `draft-${Date.now()}-${index}`,
      sku: `SKU-${valuePart}-${uniquePart}`,
      stock: 0,
      status: true,
      options,
      base_price: undefined,
    };
  });
}

/**
 * Cartesian product helper
 */
function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return arrays[0].map(item => [item]);

  const [first, ...rest] = arrays;
  const restProduct = cartesianProduct(rest);

  return first.flatMap(item =>
    restProduct.map(combo => [item, ...combo])
  );
}

/**
 * Check if variant combination already exists
 */
export function isDuplicateCombination(
  newOptions: VariantOption[],
  existingVariants: Array<{ options: VariantOption[] }>
): boolean {
  return existingVariants.some(variant =>
    areOptionsEqual(newOptions, variant.options)
  );
}

/**
 * Compare two option arrays for equality
 */
function areOptionsEqual(options1: VariantOption[], options2: VariantOption[]): boolean {
  if (options1.length !== options2.length) return false;

  const sorted1 = [...options1].sort((a, b) =>
    a.product_type_id - b.product_type_id ||
    a.product_type_value_id - b.product_type_value_id
  );

  const sorted2 = [...options2].sort((a, b) =>
    a.product_type_id - b.product_type_id ||
    a.product_type_value_id - b.product_type_value_id
  );

  return sorted1.every((opt, idx) =>
    opt.product_type_id === sorted2[idx].product_type_id &&
    opt.product_type_value_id === sorted2[idx].product_type_value_id
  );
}

/**
 * Format variant options to display string
 */
export function formatVariantOptions(options: VariantOption[]): string {
  return options
    .map(opt => `${opt.type_name || 'Type'}: ${opt.value || 'Value'}`)
    .join(', ');
}

/**
 * Apply bulk changes to variant drafts
 */
export function applyBulkChanges(
  variants: VariantDraft[],
  changes: {
    sku_prefix?: string;
    stock?: number;
    base_price?: number;
  }
): VariantDraft[] {
  return variants.map((variant, index) => {
    const updated = { ...variant };

    if (changes.sku_prefix !== undefined) {
      const suffix = variant.sku?.split('-').pop() || index;
      updated.sku = `${changes.sku_prefix}-${suffix}`;
    }

    if (changes.stock !== undefined) {
      updated.stock = changes.stock;
    }

    if (changes.base_price !== undefined) {
      updated.base_price = changes.base_price;
    }

    return updated;
  });
}
