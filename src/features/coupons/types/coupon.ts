export interface Coupon {
  code: string;
  description: string;
  discountPercentage: number;
  isActive: boolean;
  createdAt: string;
}

export interface ValidatedCoupon {
  code: string;
  description: string;
  discountPercentage: number;
}

