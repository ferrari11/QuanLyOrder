import { useState, FormEvent } from 'react';
import { Order, OrderItem, OrderSource, MenuItem } from '../types';
import { DEFAULT_MENU_ITEMS } from '../data';

interface AddOrderFormProps {
  onBack: () => void;
  onSubmit: (newOrder: Order) => void;
  menuItems: MenuItem[];
}

export default function AddOrderForm({ onBack, onSubmit, menuItems }: AddOrderFormProps) {
  // Client state
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<OrderSource>('Facebook');
  const [deliveryTime, setDeliveryTime] = useState('12:00');
  
  // Current date as default yyyy-MM-dd
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const [deliveryDate, setDeliveryDate] = useState(getTodayDateString());
  const [note, setNote] = useState('');

  // Cart state starting with first and second items
  const [cartItems, setCartItems] = useState<OrderItem[]>(() => {
    const itemsSource = menuItems && menuItems.length >= 2 ? menuItems : DEFAULT_MENU_ITEMS;
    const firstItem = itemsSource[0];
    const secondItem = itemsSource[1];
    return [
      {
        id: firstItem.id,
        name: firstItem.name,
        price: firstItem.price,
        quantity: 2,
        image: firstItem.image,
      },
      {
        id: secondItem.id,
        name: secondItem.name,
        price: secondItem.price,
        quantity: 1,
        image: secondItem.image,
      }
    ];
  });

  // Menu Modal State
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  // Cart operations
  const updateQuantity = (itemId: string, change: number) => {
    setCartItems((prevItems) => {
      return prevItems
        .map((item) => {
          if (item.id === itemId) {
            const newQty = item.quantity + change;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const addMenuItemToCart = (menuItem: MenuItem) => {
    setCartItems((prevItems) => {
      const existing = prevItems.find((item) => item.id === menuItem.id);
      if (existing) {
        return prevItems.map((item) =>
          item.id === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [
          ...prevItems,
          {
            id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1,
            image: menuItem.image,
          },
        ];
      }
    });
    setIsMenuModalOpen(false);
  };

  // Cart summaries
  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Form Submission
  const handleSaveOrder = (e: FormEvent) => {
    e.preventDefault();
    if (!customerName || cartItems.length === 0) return;

    // Create a robust new order
    const newId = 'ORD' + Math.floor(100 + Math.random() * 900);
    const newOrder: Order = {
      id: newId,
      customerName,
      phone: phone.trim(),
      source,
      items: cartItems,
      totalAmount: totalCartAmount,
      deliveryTime,
      deliveryDate,
      status: 'Đang chờ',
      note,
      isUrgent: deliveryTime < '12:15' && deliveryTime > '11:15', // Automatically make it urgent if around noon
      createdAt: new Date().toISOString(),
    };

    setSuccessMessage(true);
    setTimeout(() => {
      onSubmit(newOrder);
    }, 1200);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN') + 'đ';
  };

  return (
    <div className="pb-36 bg-surface min-h-screen">
      {/* TopAppBar */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 w-full z-40 h-14 flex items-center shadow-sm">
        <div className="max-w-md w-full mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1 hover:bg-gray-100 rounded-full active-press flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-primary font-bold">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold text-on-surface">Tạo Đơn Hàng Mới</h1>
          </div>
          <button className="p-1.5 rounded-full hover:bg-gray-100 active-press">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="pt-18 px-4 max-w-md mx-auto">
        <form onSubmit={handleSaveOrder} className="space-y-5">
          {/* Customer Details Section */}
          <section className="space-y-3 bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
            <label className="block text-xs font-bold text-on-surface-variant/75 uppercase tracking-wider">
              Thông tin khách hàng
            </label>
            <div className="space-y-3">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Tên khách hàng"
                required
                className="w-full h-11 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Số điện thoại (không bắt buộc)"
                className="w-full h-11 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
              />
            </div>

            {/* Source Selection */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-on-surface-variant/75 uppercase tracking-wider">
                Nguồn đơn hàng
              </label>
              <div className="flex flex-wrap gap-2">
                {(['Facebook', 'Zalo', 'Gọi điện', 'Khách quen'] as OrderSource[]).map((src) => {
                  const isSelected = source === src;
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setSource(src)}
                      className={`px-4 py-2 rounded-full border text-xs font-semibold transition-all active-press cursor-pointer ${
                        isSelected
                          ? 'bg-primary-container text-white border-primary-container shadow-xs'
                          : 'bg-white text-[#333333] border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {src}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Delivery & Time Selection */}
          <section className="space-y-3 bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-on-surface-variant/75 uppercase tracking-wider">
                  Giờ giao hàng
                </label>
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full h-11 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-on-surface-variant/75 uppercase tracking-wider">
                  Ngày giao
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full h-11 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                />
              </div>
            </div>

            {/* Note area */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-on-surface-variant/75 uppercase tracking-wider">
                Ghi chú đơn hàng
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Ít cay, không lấy hành..."
                className="w-full p-3 rounded-lg border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container h-20 resize-none"
              />
            </div>
          </section>

          {/* Cart Food Items Selection */}
          <section className="space-y-3 bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
            <div className="flex justify-between items-end pb-1">
              <label className="block text-xs font-bold text-on-surface-variant/75 uppercase tracking-wider">
                Món ăn đã chọn
              </label>
              <span className="text-xs font-bold text-primary">{cartItems.length} món</span>
            </div>

            <div className="space-y-3">
              {cartItems.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-xs font-medium border border-dashed border-gray-200 rounded-lg">
                  Chưa chọn món nào. Vui lòng bấm Thêm món dưới đây.
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden border border-gray-200 flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-on-surface leading-tight">{item.name}</h3>
                        <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                          {formatCurrency(item.price)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-7 h-7 flex items-center justify-center text-primary-container hover:bg-gray-50 rounded-full font-bold active-press cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">remove</span>
                      </button>
                      <span className="text-xs font-bold w-4 text-center text-[#1a1c1c]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-7 h-7 flex items-center justify-center text-primary-container hover:bg-gray-50 rounded-full font-bold active-press cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">add</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Trigger menu modal */}
            <button
              type="button"
              onClick={() => setIsMenuModalOpen(true)}
              className="w-full py-3 border-2 border-dashed border-primary/20 rounded-xl text-primary font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-primary/5 active-press transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm font-bold">add_circle</span>
              Thêm món từ Menu
            </button>
          </section>
        </form>
      </main>

      {/* Floating Success Alert */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-600 text-white font-bold text-sm px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-white text-base">check_circle</span>
          ĐƠN HÀNG LƯU THÀNH CÔNG!
        </div>
      )}

      {/* Fixed Bottom Footer Action */}
      <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-md mx-auto space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-medium text-on-surface-variant">
              Tổng cộng ({totalItemCount} phần)
            </span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(totalCartAmount)}
            </span>
          </div>
          <button
            onClick={handleSaveOrder}
            disabled={cartItems.length === 0 || !customerName}
            type="button"
            className="w-full h-13 bg-primary-container hover:bg-opacity-95 text-white font-bold rounded-xl shadow-md active-press flex items-center justify-center gap-1.5 uppercase tracking-wide cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            LƯU ĐƠN HÀNG
            <span className="material-symbols-outlined font-bold text-white text-lg">check_circle</span>
          </button>
        </div>
      </footer>

      {/* Gorgeous Slide-up Menu Modal / Sheet */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center transition-opacity animate-fade-in">
          {/* Dismiss Backgrop Click */}
          <div className="absolute inset-0" onClick={() => setIsMenuModalOpen(false)}></div>

          {/* Modal Container */}
          <div className="bg-white rounded-t-2xl w-full max-w-md p-5 relative z-10 max-h-[80vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary">restaurant_menu</span>
                Danh sách thực đơn
              </h2>
              <button
                onClick={() => setIsMenuModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>

            <div className="space-y-3.5 py-4">
              {(menuItems && menuItems.length > 0 ? menuItems : DEFAULT_MENU_ITEMS).map((item) => {
                const quantityInCart = cartItems.find((i) => i.id === item.id)?.quantity || 0;
                return (
                  <div
                    key={item.id}
                    onClick={() => addMenuItemToCart(item)}
                    className="flex items-center justify-between p-2.5 hover:bg-orange-50/50 border border-gray-100 rounded-xl cursor-pointer transition-colors active-press"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-on-surface">{item.name}</h3>
                        <p className="text-[10px] text-gray-500 font-medium mt-0.5">{item.category}</p>
                        <p className="text-xs font-bold text-primary-container mt-1">
                          {formatCurrency(item.price)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2">
                      {quantityInCart > 0 && (
                        <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          {quantityInCart} phần
                        </span>
                      )}
                      <span className="material-symbols-outlined text-primary-container text-xl font-bold">
                        add_circle
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
