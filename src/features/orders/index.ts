export {
  addLocalOrder,
  advanceLocalOrderStatus,
  canEditDeliveryAddressByStatus,
  clearLocalOrders,
  getLocalOrderById,
  getLocalOrders,
  removeLocalOrder,
  updateLocalOrderDeliveryAddress,
  updateLocalOrderStatus,
} from './storage/localOrders';
export type { DeliveryAddressUpdatePayload } from './storage/localOrders';
export type {
  LocalOrder,
  LocalOrderCustomer,
  LocalOrderItem,
  OrderPaymentMethod,
  OrderStatus,
} from './types/order';
export { orderPaymentLabel, orderStatusLabel, orderStatusTimeline } from './types/statusMeta';
