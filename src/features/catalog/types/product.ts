export type ProductCategory = string;

export interface ProductCategoryMeta {
  id: ProductCategory;
  label: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: ProductCategory;
  description?: string;
  sizes?: string[];
  stock: number;
}
