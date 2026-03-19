// ============================================================================
// Product Variant Types - Shopee-inspired Admin
// ============================================================================

export type ProductType = {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
};

export type ProductTypeValue = {
  id: number;
  product_type_id: number;
  value: string;
  sort_order: number;
  is_active: boolean;
};

export type VariantOption = {
  product_type_id: number;
  product_type_value_id: number;
  type_code?: string;
  type_name?: string;
  value?: string;
};

export type PriceTier = {
  id?: number;
  product_variant_id?: number;
  min_qty: number;
  price: number;
};

export type ProductVariant = {
  id: number;
  product_id: number;
  sku: string | null;
  stock: number;
  status: boolean;
  options: VariantOption[];
  price_tier_summary?: {
    min_price: number;
    max_price: number;
    base_price: number;
  };
};

export type VariantDraft = {
  temp_id: string;
  sku: string | null;
  stock: number;
  status: boolean;
  options: VariantOption[];
  base_price?: number;
  tiers?: PriceTier[];
};

export type CreateVariantRequest = {
  sku?: string;
  stock: number;
  status: boolean;
  base_price?: number;
  options: Array<{
    product_type_id: number;
    product_type_value_id: number;
  }>;
};

export type UpdateVariantRequest = {
  sku?: string;
  stock?: number;
  status?: boolean;
};

export type SelectedType = {
  type: ProductType;
  selectedValues: ProductTypeValue[];
};

export type BulkApplyData = {
  stock?: number;
  base_price?: number;
};

export type AppliedPriceResponse = {
  applied_price: number;
};
