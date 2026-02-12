import { Product } from '../../catalog/types/product';

export interface CartItem extends Product {
  quantity: number;
  size?: string;
}
