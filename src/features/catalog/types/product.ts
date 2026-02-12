export type ProductCategory = 'basicas' | 'estampadas' | 'oversized';

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
