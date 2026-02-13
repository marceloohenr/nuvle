export type ProductCategory = string;

export interface ProductCategoryMeta {
  id: ProductCategory;
  label: string;
  createdAt: string;
}

export interface SizeGuideRow {
  size: string;
  widthCm: number;
  lengthCm: number;
  sleeveCm: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  image: string;
  category: ProductCategory;
  description?: string;
  sizes?: string[];
  stockBySize?: Record<string, number>;
  sizeGuide?: SizeGuideRow[];
  stock: number;
}
