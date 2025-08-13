export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: 'basicas' | 'estampadas' | 'oversized';
  description?: string;
  sizes?: string[];
}

export interface CartItem extends Product {
  quantity: number;
  size?: string;
}

export interface CheckoutForm {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}