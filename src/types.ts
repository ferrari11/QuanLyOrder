export type OrderStatus = 'Đang chờ' | 'Chuẩn bị' | 'Đã giao' | 'Đã hủy';
export type OrderSource = 'Facebook' | 'Zalo' | 'Gọi điện' | 'Khách quen';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  source: OrderSource;
  items: OrderItem[];
  totalAmount: number;
  deliveryTime: string;
  deliveryDate: string;
  status: OrderStatus;
  note: string;
  isUrgent?: boolean;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  salesCount: number;
  revenue: number;
  trend: number; // percentage change
}

export type ActiveTab = 'home' | 'orders' | 'statistics' | 'settings';
