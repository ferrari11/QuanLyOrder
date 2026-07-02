import { useState, useMemo } from 'react';
import { Order, OrderStatus } from '../types';

interface OrderListProps {
  orders: Order[];
  onAddOrderClick: () => void;
  onOrderClick: (order: Order) => void;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
}

export default function OrderList({
  orders,
  onAddOrderClick,
  onOrderClick,
  onUpdateStatus,
}: OrderListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'delivered' | 'urgent'>('all');

  // Multi-criteria client side search & filter
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Search text query match
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        order.customerName.toLowerCase().includes(query) ||
        order.phone.includes(query) ||
        order.items.some((item) => item.name.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // 2. Tab Filter match
      if (activeFilter === 'pending') {
        return order.status === 'Đang chờ' || order.status === 'Chuẩn bị';
      }
      if (activeFilter === 'delivered') {
        return order.status === 'Đã giao';
      }
      if (activeFilter === 'urgent') {
        return order.isUrgent === true;
      }
      return true; // 'all' (Hôm nay) matches everything in list
    });
  }, [orders, searchTerm, activeFilter]);

  // Formatter for Currency
  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN') + 'đ';
  };

  // Status badges mapping
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Đang chờ':
        return (
          <span className="px-3 py-1 bg-[#FEF9C3] text-[#854D0E] rounded-full text-xs font-semibold">
            Đang chờ
          </span>
        );
      case 'Chuẩn bị':
        return (
          <span className="px-3 py-1 bg-[#FFEBD6] text-[#C15000] rounded-full text-xs font-semibold">
            Chuẩn bị
          </span>
        );
      case 'Đã giao':
        return (
          <span className="px-3 py-1 bg-[#DCFCE7] text-[#166534] rounded-full text-xs font-semibold">
            Đã giao
          </span>
        );
      case 'Đã hủy':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
            Đã hủy
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pb-24">
      {/* Sticky TopAppBar */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 w-full z-40 h-14 flex items-center shadow-sm">
        <div className="max-w-md w-full mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary font-bold">store</span>
            <h1 className="text-xl font-bold text-primary tracking-tight">G-Order Manager</h1>
          </div>
          <button className="p-1.5 rounded-full hover:bg-gray-100 relative active-press">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          </button>
        </div>
      </header>

      {/* Sticky Filter Section */}
      <div className="bg-white sticky top-14 z-30 pt-4 pb-3 px-4 border-b border-gray-200 shadow-xs max-w-md mx-auto">
        {/* Search Input */}
        <div className="relative mb-3">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên, SĐT, món ăn..."
            className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/10 font-medium text-sm text-on-surface placeholder:text-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          )}
        </div>

        {/* Filter Chips Scrollable container */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex-none px-4 py-2 rounded-full text-xs font-semibold active-press transition-colors ${
              activeFilter === 'all'
                ? 'bg-primary-container text-white shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-gray-200'
            }`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => setActiveFilter('pending')}
            className={`flex-none px-4 py-2 rounded-full text-xs font-semibold active-press transition-colors ${
              activeFilter === 'pending'
                ? 'bg-primary-container text-white shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-gray-200'
            }`}
          >
            Chưa giao
          </button>
          <button
            onClick={() => setActiveFilter('delivered')}
            className={`flex-none px-4 py-2 rounded-full text-xs font-semibold active-press transition-colors ${
              activeFilter === 'delivered'
                ? 'bg-primary-container text-white shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-gray-200'
            }`}
          >
            Đã giao
          </button>
          <button
            onClick={() => setActiveFilter('urgent')}
            className={`flex-none px-4 py-2 rounded-full text-xs font-semibold active-press transition-colors ${
              activeFilter === 'urgent'
                ? 'bg-primary-container text-white shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-gray-200'
            }`}
          >
            Gấp / Theo giờ
          </button>
          <button
            onClick={() => {
              setSearchTerm('');
              setActiveFilter('all');
            }}
            className="flex-none w-8 h-8 flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:bg-gray-200 rounded-full active-press"
            title="Reset filters"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
          </button>
        </div>
      </div>

      {/* Main Order Cards Container */}
      <main className="px-4 mt-16 space-y-4 max-w-md mx-auto">
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">
              receipt_long
            </span>
            <p className="text-sm font-medium">Không tìm thấy đơn hàng nào khớp điều kiện.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            // Compile items string
            const itemsSummary = order.items
              .map((item) => `${item.quantity}x ${item.name}`)
              .join(', ');

            return (
              <div
                key={order.id}
                className={`bg-white border ${
                  order.isUrgent
                    ? 'border-red-200 ring-2 ring-red-500/5'
                    : 'border-gray-200 hover:border-gray-300'
                } rounded-xl p-4 shadow-xs relative overflow-hidden transition-all duration-200`}
              >
                {/* Urgent indicator label on top-right */}
                {order.isUrgent && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-[#ba1a1a] text-white px-2.5 py-0.5 rounded-bl-lg text-[10px] font-bold uppercase tracking-wider">
                      GẤP
                    </div>
                  </div>
                )}

                {/* Card header */}
                <div onClick={() => onOrderClick(order)} className="flex justify-between items-start mb-3 cursor-pointer">
                  <div>
                    <h2 className="text-base font-bold text-on-surface">{order.customerName}</h2>
                    <p className="text-xs text-secondary font-medium mt-0.5">{order.phone}</p>
                  </div>
                  <div className="text-right pr-6">
                    <span className="text-xs font-bold text-primary-container block">
                      {order.deliveryTime}
                    </span>
                    <p className="text-[10px] text-secondary font-medium">Hôm nay</p>
                  </div>
                </div>

                {/* Card body items */}
                <div
                  onClick={() => onOrderClick(order)}
                  className="py-2.5 border-t border-dashed border-gray-200 mb-3 cursor-pointer"
                >
                  <p className="text-xs text-on-surface-variant font-medium leading-relaxed line-clamp-2">
                    {itemsSummary}
                  </p>
                  {order.note && (
                    <p className="text-[10px] text-orange-800 font-medium bg-orange-50 px-2 py-0.5 rounded-md mt-1 w-fit line-clamp-1">
                      💡 {order.note}
                    </p>
                  )}
                </div>

                {/* Card footer actions */}
                <div className="flex justify-between items-center">
                  <div onClick={() => onOrderClick(order)} className="cursor-pointer">
                    {getStatusBadge(order.status)}
                  </div>

                  {/* Immediate interactive delivery switch */}
                  {order.status === 'Đang chờ' || order.status === 'Chuẩn bị' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(order.id, 'Đã giao');
                      }}
                      className="bg-primary-container hover:bg-opacity-95 text-white text-xs font-bold px-4 py-2 rounded-lg active-press shadow-sm"
                    >
                      Giao ngay
                    </button>
                  ) : (
                    <button
                      onClick={() => onOrderClick(order)}
                      className="text-secondary text-xs font-bold flex items-center gap-0.5 active-press"
                    >
                      Chi tiết <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={onAddOrderClick}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary-container text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 z-50 cursor-pointer"
        title="Tạo đơn hàng mới"
      >
        <span className="material-symbols-outlined text-3xl font-extrabold text-white">add</span>
      </button>
    </div>
  );
}
