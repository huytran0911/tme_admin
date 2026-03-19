export type ProductCategoryInfo = {
  id: number;
  name: string | null;
};

export type Product = {
  id: number;
  code: string | null;
  name: string | null;
  nameEn: string | null;
  image: string | null;
  categories: ProductCategoryInfo[] | null;
  status: number;
  minPrice: number | null;
  maxPrice: number | null;
  totalVariants: number;
  totalStock: number;
  isNewProduct?: boolean;
  isCombo?: boolean;
  createdAt: string;
};

export type UpdateProductRequest = {
  code?: string | null;
  name?: string | null;
  nameEn?: string | null;
  image?: string | null;
  image2?: string | null;
  image3?: string | null;
  image4?: string | null;
  price1?: number | null;
  price2?: number | null;
  price3?: number | null;
  price4?: number | null;
  price5?: number | null;
  saleOff?: number | null;
  dateSaleOff?: string | null;
  pSaleOff?: boolean;
  shortContentEn?: string | null;
  shortContent?: string | null;
  contentEn?: string | null;
  content?: string | null;
  categoryIds?: number[] | null;
  unit?: string | null;
  unitEn?: string | null;
  weight?: number | null;
  quantity?: number | null;
  infoOther?: string | null;
  infoOtherEn?: string | null;
  sort?: number;
  status?: number;
  origin?: string | null;
  originEn?: string | null;
  author?: string | null;
  noPage?: number | null;
  dimension?: string | null;
  priceCover?: number | null;
  soluong1?: number;
  soluong2?: number;
  soluong3?: number;
  soluong4?: number;
  nhaCungCap?: number | null;
  documents?: string | null;
  pin?: string | null;
  packed?: string | null;
  type?: string | null;
  isNewProduct?: boolean;
  isCombo?: boolean;
  pointSave?: number;
};

export type GetProductListParams = {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: number;
};

export type PagedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// Types for Groups (used in dropdown)
export type Group = {
  id: number;
  name: string | null;
  nameEn: string | null;
  showStyle: number;
  slideStyle: number;
  image: string | null;
  sort: number;
};

// Types for Categories (used in dropdown)
export type Category = {
  id: number;
  name: string | null;
  nameEn: string | null;
  groupId: number | null;
  groupName: string | null;
  parentId: number;
  sortOrder: number;
  status: number | null;
};

export type GetCategoriesParams = {
  Keyword?: string;
  GroupId?: number;
  ParentId?: number;
  Page: number;
  PageSize: number;
};

export type GetGroupsParams = {
  Keyword?: string;
  Page: number;
  PageSize: number;
};

// Product Type (Brand, Color, Version, etc.)
export type ProductType = {
  id: number;
  name: string | null;
  nameEn: string | null;
  sort: number;
};

// Product Type Value
export type ProductTypeValue = {
  id: number;
  productTypeId: number;
  value: string | null;
  valueEn: string | null;
  sort: number;
};

// Product Variant
export type ProductVariant = {
  id: number;
  productId: number;
  sku: string | null;
  stock: number;
  status: number;
  attributes: ProductVariantAttribute[];
  priceTiers?: PriceTier[];
};

// Variant Attribute (relationship between variant and type/value)
export type ProductVariantAttribute = {
  productVariantId: number;
  productTypeId: number;
  productTypeValueId: number;
  productTypeName?: string | null;
  productTypeValueName?: string | null;
};

// Price Tier for variant
export type PriceTier = {
  id?: number;
  productVariantId: number;
  minQty: number;
  price: number;
};

// Inventory adjustment request
export type InventoryAdjustmentRequest = {
  variantId: number;
  adjustQuantity: number;
  reason: string;
  notes?: string;
};

// Detailed product type for edit page
export type ProductDetail = {
  id: number;
  code: string | null;
  name: string | null;
  nameEn: string | null;
  image: string | null;
  image2: string | null;
  image3: string | null;
  image4: string | null;
  categoryIds: number[] | null;
  categories?: ProductCategoryInfo[] | null;
  status: number;
  sort: number;
  isNewProduct: boolean;
  isCombo: boolean;
  pointSave: number;
  unit: string | null;
  unitEn: string | null;
  weight: number | null;
  origin: string | null;
  originEn: string | null;
  dimension: string | null;
  packed: string | null;
  documents: string | null;
  infoOther: string | null;
  infoOtherEn: string | null;
  pin: string | null;
  type: string | null;
  shortContent: string | null;
  shortContentEn: string | null;
  content: string | null;
  contentEn: string | null;
  price1: number | null;
  price2: number | null;
  price3: number | null;
  price4: number | null;
  price5: number | null;
  saleOff: number | null;
  dateSaleOff: string | null;
  pSaleOff: boolean;
  quantity: number | null;
  soluong1: number;
  soluong2: number;
  soluong3: number;
  soluong4: number;
  nhaCungCap: number | null;
  author: string | null;
  noPage: number | null;
  priceCover: number | null;
  createdAt?: string;
};

// Combo Item (component variant inside a combo product)
export type ComboItem = {
  id: number;
  productVariantId: number;
  sku: string | null;
  productName: string | null;
  productImage: string | null;
  quantity: number;
  sortOrder: number;
  stock?: number;
};
