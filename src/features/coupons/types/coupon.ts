export interface Coupon {
  code: string;
  description: string;
  discountPercentage: number;
  maxUsesPerCustomer: number;
  isActive: boolean;
  createdAt: string;
}

export interface ValidatedCoupon {
  code: string;
  description: string;
  discountPercentage: number;
  maxUsesPerCustomer: number;
}
