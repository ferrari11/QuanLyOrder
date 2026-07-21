import { useState, useEffect } from 'react';
import { Order } from '../types';

interface StickyNote {
  id: string;
  content: string;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple';
  createdAt: string;
}

interface HomeDashboardProps {
  orders: Order[];
  onAddOrderClick: () => void;
  onViewAllOrdersClick: (category?: string) => void;
  onOrderClick: (order: Order) => void;
  onNotificationToggle: () => void;
  notificationsEnabled: boolean;
  googleUser: any;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  showSyncPulse?: boolean;
}

export default function HomeDashboard({
  orders,
  onAddOrderClick,
  onViewAllOrdersClick,
  onOrderClick,
  onNotificationToggle,
  notificationsEnabled,
  googleUser,
  spreadsheetId,
  spreadsheetUrl,
  showSyncPulse = false,
}: HomeDashboardProps) {
  // Sticky Notes state initialized with nice default notes
  const [notes, setNotes] = useState<StickyNote[]>(() => {
    const saved = localStorage.getItem('g_sticky_notes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    const defaultNotes: StickyNote[] = [
      {
        id: 'note-1',
        content: 'Nhắc nhở: Kiểm tra đơn ShopeeFood hẹn giờ 11h30 trưa nay ⏰',
        color: 'yellow',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'note-2',
        content: 'Hết nguyên liệu: Nhập thêm rau xà lách và dưa leo cho ngày mai 🥬',
        color: 'pink',
        createdAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem('g_sticky_notes', JSON.stringify(defaultNotes));
    return defaultNotes;
  });

  const [newNoteText, setNewNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState<'yellow' | 'green' | 'blue' | 'pink' | 'purple'>('yellow');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const saveNotes = (updated: StickyNote[]) => {
    setNotes(updated);
    localStorage.setItem('g_sticky_notes', JSON.stringify(updated));
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;

    if (editingNoteId) {
      const updated = notes.map((n) =>
        n.id === editingNoteId
          ? { ...n, content: newNoteText.trim(), color: selectedColor }
          : n
      );
      saveNotes(updated);
      setEditingNoteId(null);
    } else {
      const newNote: StickyNote = {
        id: `note-${Date.now()}`,
        content: newNoteText.trim(),
        color: selectedColor,
        createdAt: new Date().toISOString(),
      };
      saveNotes([...notes, newNote]);
    }

    setNewNoteText('');
    setSelectedColor('yellow');
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    saveNotes(updated);
    if (editingNoteId === id) {
      setEditingNoteId(null);
      setNewNoteText('');
    }
  };

  const handleEditNote = (note: StickyNote) => {
    setEditingNoteId(note.id);
    setNewNoteText(note.content);
    setSelectedColor(note.color);
  };

  const handleQuickTemplate = (text: string) => {
    if (newNoteText.includes(text)) return;
    setNewNoteText((prev) => (prev ? `${prev} • ${text}` : text));
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setNewNoteText('');
    setSelectedColor('yellow');
  };

  // Dynamic metrics computed in real-time
  const totalOrdersCount = orders.length;
  
  const pendingCount = orders.filter(
    (o) => o.status === 'Đang chờ' || o.status === 'Chuẩn bị'
  ).length;
  
  const deliveredCount = orders.filter((o) => o.status === 'Đã giao').length;
  
  // Total unique clients
  const uniquePhones = new Set(orders.map((o) => o.phone.replace(/\s+/g, '')));
  const totalCustomers = uniquePhones.size > 0 ? uniquePhones.size : 0;

  // Total portions
  const totalPortions = orders.reduce(
    (sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );

  // Counts of noodles, macaroni, rice, vermicelli in real-time
  const categoryCounts = {
    mi: { active: 0, total: 0 },
    nui: { active: 0, total: 0 },
    com: { active: 0, total: 0 },
    bun: { active: 0, total: 0 },
  };

  orders.forEach((o) => {
    const isActive = o.status === 'Đang chờ' || o.status === 'Chuẩn bị';
    o.items.forEach((item) => {
      const name = item.name.toLowerCase();
      const qty = item.quantity;
      if (name.includes('mì')) {
        categoryCounts.mi.total += qty;
        if (isActive) categoryCounts.mi.active += qty;
      } else if (name.includes('nui')) {
        categoryCounts.nui.total += qty;
        if (isActive) categoryCounts.nui.active += qty;
      } else if (name.includes('cơm')) {
        categoryCounts.com.total += qty;
        if (isActive) categoryCounts.com.active += qty;
      } else if (name.includes('bún')) {
        categoryCounts.bun.total += qty;
        if (isActive) categoryCounts.bun.active += qty;
      }
    });
  });

  // Best seller
  const itemCounts: Record<string, { count: number; name: string }> = {};
  orders.forEach((o) => {
    o.items.forEach((item) => {
      if (!itemCounts[item.id]) {
        itemCounts[item.id] = { count: 0, name: item.name };
      }
      itemCounts[item.id].count += item.quantity;
    });
  });
  
  let bestSeller = 'Mì xào bò + Trứng'; // Default fallback
  let maxCount = 0;
  Object.values(itemCounts).forEach((val) => {
    if (val.count > maxCount) {
      maxCount = val.count;
      bestSeller = val.name;
    }
  });

  // Get top 3 pending/preparing orders for quick view
  const recentPending = orders
    .filter((o) => o.status === 'Đang chờ' || o.status === 'Chuẩn bị')
    .slice(0, 3);

  // Formatter for Currency
  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN') + 'đ';
  };

  // Get initials for Avatars
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Human date formatting in Vietnamese
  const getVietnameseDate = () => {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const now = new Date();
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return `${dayName}, ${day} Tháng ${month}, ${year}`;
  };

  return (
    <div className="pb-24">
      {/* TopAppBar */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 h-14 shadow-sm">
        <div className="flex items-center gap-2 max-w-md w-full mx-auto justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary font-bold">store</span>
            <h1 className="text-xl font-bold text-primary tracking-tight">G-Order Manager</h1>
          </div>
          <button 
            onClick={onNotificationToggle}
            className="p-1.5 rounded-full hover:bg-gray-100 relative active-press"
            title="Toggle Notifications"
          >
            <span className="material-symbols-outlined text-on-surface-variant">
              {notificationsEnabled ? 'notifications_active' : 'notifications'}
            </span>
            {notificationsEnabled && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></span>
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="pt-20 px-4 max-w-md mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="animate-fade-in flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-[#1a1c1c]">Xin chào, Nhà Của Bắp!</h2>
            <p className="text-sm text-on-surface-variant font-medium mt-0.5">
              {getVietnameseDate()}
            </p>
          </div>
          {spreadsheetId && googleUser ? (
            <a
              href={spreadsheetUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all shadow-xs active-press ${
                showSyncPulse
                  ? 'bg-green-100 text-green-800 border-green-400 ring-4 ring-green-100 scale-105 duration-300'
                  : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
              }`}
              title="Mở Google Sheets quản lý đơn hàng"
            >
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 ${showSyncPulse ? 'animate-ping scale-200' : 'animate-pulse'}`}></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Sheets Live
              <span className="material-symbols-outlined text-[10px] font-bold">open_in_new</span>
            </a>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-400 text-xs font-bold rounded-xl border border-gray-200">
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              Offline
            </div>
          )}
        </div>

        {/* Pulse Auto-sync Notification Banner */}
        {showSyncPulse && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl p-3.5 flex items-center justify-between shadow-md animate-slide-up border border-emerald-400">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold">Hệ thống đã tự động đồng bộ</span>
                <span className="text-[10px] opacity-90 font-semibold">Tải thành công đơn hàng và thực đơn mới nhất</span>
              </div>
            </div>
            <div className="bg-white/20 px-2 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[11px] font-bold">done_all</span>
              Vừa xong
            </div>
          </div>
        )}

        {/* Bento Grid 2x3 */}
        <section className="grid grid-cols-2 gap-3">
          {/* Total Orders Card */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col justify-between h-28 shadow-sm hover:border-gray-300 transition-colors">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tổng đơn</span>
            <span className="text-3xl font-bold text-on-surface">{totalOrdersCount}</span>
          </div>

          {/* Pending Orders - High Contrast Alert */}
          <div className="bg-primary-container p-4 rounded-xl flex flex-col justify-between h-28 shadow-md text-white active-press">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-90">Chưa giao</span>
            <span className="text-3xl font-extrabold">{pendingCount}</span>
          </div>

          {/* Delivered Orders Card */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col justify-between h-28 shadow-sm">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Đã giao</span>
            <span className="text-3xl font-bold text-on-surface">{deliveredCount}</span>
          </div>

          {/* Total Customers Card */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col justify-between h-28 shadow-sm">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tổng khách</span>
            <span className="text-3xl font-bold text-on-surface">{totalCustomers}</span>
          </div>

          {/* Total portions count */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col justify-between h-28 shadow-sm">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tổng số phần</span>
            <span className="text-3xl font-bold text-on-surface">{totalPortions}</span>
          </div>

          {/* Best Seller Card */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col justify-between h-28 shadow-sm">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Món chạy nhất</span>
            <span className="text-sm font-bold text-on-surface line-clamp-2 leading-snug">{bestSeller}</span>
          </div>
        </section>

        {/* Real-time Category Portions Card */}
        <section className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary font-bold text-lg">restaurant</span>
              <h3 className="text-sm font-bold text-[#1a1c1c]">Định lượng món cần làm (Chưa giao)</h3>
            </div>
            <span className="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-full uppercase border border-red-150 animate-pulse">
              Live
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {/* Mì */}
            <button
              onClick={() => onViewAllOrdersClick('Mì')}
              className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-2 flex flex-col items-center justify-center text-center transition-all hover:shadow-xs hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
            >
              <span className="text-xl mb-1">🍜</span>
              <span className="text-xs font-bold text-[#92400E]">Mì</span>
              <div className="mt-1.5 flex flex-col items-center">
                <span className="text-xl font-black text-[#D97706]">{categoryCounts.mi.active}</span>
                <span className="text-[9px] text-[#B45309] font-semibold">Tổng: {categoryCounts.mi.total}</span>
              </div>
            </button>

            {/* Nui */}
            <button
              onClick={() => onViewAllOrdersClick('Nui')}
              className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-2 flex flex-col items-center justify-center text-center transition-all hover:shadow-xs hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
            >
              <span className="text-xl mb-1">🍝</span>
              <span className="text-xs font-bold text-[#1E40AF]">Nui</span>
              <div className="mt-1.5 flex flex-col items-center">
                <span className="text-xl font-black text-[#2563EB]">{categoryCounts.nui.active}</span>
                <span className="text-[9px] text-[#1D4ED8] font-semibold">Tổng: {categoryCounts.nui.total}</span>
              </div>
            </button>

            {/* Cơm */}
            <button
              onClick={() => onViewAllOrdersClick('Cơm')}
              className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-2 flex flex-col items-center justify-center text-center transition-all hover:shadow-xs hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
            >
              <span className="text-xl mb-1">🍚</span>
              <span className="text-xs font-bold text-[#065F46]">Cơm</span>
              <div className="mt-1.5 flex flex-col items-center">
                <span className="text-xl font-black text-[#059669]">{categoryCounts.com.active}</span>
                <span className="text-[9px] text-[#047857] font-semibold">Tổng: {categoryCounts.com.total}</span>
              </div>
            </button>

            {/* Bún */}
            <button
              onClick={() => onViewAllOrdersClick('Bún')}
              className="bg-[#FFF5F5] border border-[#FEB2B2] rounded-xl p-2 flex flex-col items-center justify-center text-center transition-all hover:shadow-xs hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
            >
              <span className="text-xl mb-1">🥗</span>
              <span className="text-xs font-bold text-[#9B2C2C]">Bún</span>
              <div className="mt-1.5 flex flex-col items-center">
                <span className="text-xl font-black text-[#E53E3E]">{categoryCounts.bun.active}</span>
                <span className="text-[9px] text-[#C53030] font-semibold">Tổng: {categoryCounts.bun.total}</span>
              </div>
            </button>
          </div>
          <p className="text-[10px] text-on-surface-variant font-medium text-center leading-normal">
            Số nổi bật là <strong className="text-primary">cần làm gấp (chưa giao)</strong>. Bấm vào thẻ bất kỳ để chuyển đến trang Danh sách Đơn hàng.
          </p>
        </section>

        {/* Primary Action Call */}
        <div className="pt-1">
          <button
            onClick={onAddOrderClick}
            className="w-full bg-primary-container hover:bg-opacity-95 text-white py-4 rounded-full flex items-center justify-center gap-2 font-semibold transition-all active-press shadow-md"
          >
            <span className="material-symbols-outlined font-bold text-white">add</span>
            Thêm đơn hàng mới
          </button>
        </div>

        {/* Sticky Notes (Ghi chú nhanh) */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary font-bold text-xl">push_pin</span>
              <h3 className="text-base font-bold text-[#1a1c1c]">Ghi chú nhanh trong ngày</h3>
            </div>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              {notes.length} ghi chú
            </span>
          </div>

          {/* Quick Notes Grid */}
          {notes.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl text-sm text-on-surface-variant bg-gray-50/50">
              <span className="material-symbols-outlined text-gray-300 text-3xl block mb-1">note_alt</span>
              Chưa có ghi chú nào hôm nay.<br />Hãy tạo ghi chú mới để lưu thông tin tạm thời!
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1">
              {notes.map((note) => {
                let colorClasses = '';
                switch (note.color) {
                  case 'green':
                    colorClasses = 'bg-emerald-50/90 border-emerald-200 text-emerald-950';
                    break;
                  case 'blue':
                    colorClasses = 'bg-blue-50/90 border-blue-200 text-blue-950';
                    break;
                  case 'pink':
                    colorClasses = 'bg-rose-50/90 border-rose-200 text-rose-950';
                    break;
                  case 'purple':
                    colorClasses = 'bg-purple-50/90 border-purple-200 text-purple-950';
                    break;
                  case 'yellow':
                  default:
                    colorClasses = 'bg-amber-50/95 border-amber-200 text-amber-950';
                    break;
                }

                return (
                  <div
                    key={note.id}
                    className={`p-3.5 rounded-xl border ${colorClasses} shadow-sm relative flex flex-col justify-between group transition-all hover:shadow-md min-h-[90px]`}
                  >
                    <p className="text-xs font-semibold leading-relaxed break-words whitespace-pre-wrap pr-4 pb-2">
                      {note.content}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-1 border-t border-black/5">
                      <span className="text-[9px] opacity-60 font-medium">
                        {new Date(note.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditNote(note)}
                          className="p-1 rounded-md hover:bg-black/5 text-inherit transition-colors"
                          title="Sửa ghi chú"
                        >
                          <span className="material-symbols-outlined text-xs font-bold block">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 rounded-md hover:bg-black/5 text-red-700 transition-colors"
                          title="Xóa ghi chú"
                        >
                          <span className="material-symbols-outlined text-xs font-bold block">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Tags / Templates */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-on-surface-variant font-bold tracking-wider uppercase">Mẫu ghi nhanh:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Giao gấp 🚀', text: 'Giao gấp!' },
                { label: 'Hết bún ❌', text: 'Hết bún!' },
                { label: 'Hết cơm ❌', text: 'Hết cơm!' },
                { label: 'Gọi shipper 🛵', text: 'Nhắc shipper giao đúng giờ' },
                { label: 'Gọi trước 📞', text: 'Gọi điện trước khi giao' },
                { label: 'Tránh hành 🌿', text: 'Khách không ăn hành' }
              ].map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickTemplate(tmpl.text)}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-250 border border-gray-200 rounded-full text-[11px] font-bold text-on-surface-variant transition-colors cursor-pointer"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note Input area */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-3">
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Nhập nội dung ghi chú nhanh hoặc lời dặn việc cần làm..."
              className="w-full bg-white border border-gray-250 rounded-lg p-2.5 text-xs font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-gray-400 min-h-[60px] resize-none"
            />

            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Color Picker dots */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase">Màu:</span>
                <div className="flex gap-1.5">
                  {(['yellow', 'green', 'blue', 'pink', 'purple'] as const).map((color) => {
                    let dotBg = '';
                    switch (color) {
                      case 'yellow': dotBg = 'bg-yellow-300'; break;
                      case 'green': dotBg = 'bg-emerald-300'; break;
                      case 'blue': dotBg = 'bg-blue-300'; break;
                      case 'pink': dotBg = 'bg-rose-300'; break;
                      case 'purple': dotBg = 'bg-purple-300'; break;
                    }
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`w-5.5 h-5.5 rounded-full ${dotBg} border transition-all flex items-center justify-center cursor-pointer ${
                          selectedColor === color ? 'border-primary scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                        }`}
                      >
                        {selectedColor === color && (
                          <span className="material-symbols-outlined text-[10px] font-black text-on-surface">done</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1.5">
                {editingNoteId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 bg-gray-250 text-on-surface-variant hover:bg-gray-300 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!newNoteText.trim()}
                  className={`px-3 py-1.5 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs ${
                    newNoteText.trim()
                      ? 'bg-primary hover:bg-opacity-95'
                      : 'bg-gray-300 cursor-not-allowed text-gray-500'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm font-bold">
                    {editingNoteId ? 'save' : 'add'}
                  </span>
                  {editingNoteId ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Pending Orders List Preview */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#1a1c1c]">Đơn hàng chưa giao</h3>
            <button
              onClick={() => onViewAllOrdersClick()}
              className="text-primary text-xs font-bold uppercase tracking-wider active-press hover:underline"
            >
              Xem tất cả
            </button>
          </div>

          <div className="space-y-3">
            {recentPending.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center text-on-surface-variant text-sm">
                Không có đơn hàng chưa giao. Tuyệt vời! 🎉
              </div>
            ) : (
              recentPending.map((order) => {
                const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <div
                    key={order.id}
                    onClick={() => onOrderClick(order)}
                    className="bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:border-primary-container/40 active-press transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-secondary font-bold text-sm border border-gray-200">
                        {getInitials(order.customerName)}
                      </div>
                      <div>
                        <p className="font-bold text-on-surface text-base">{order.customerName}</p>
                        <p className="text-xs text-on-surface-variant font-medium">
                          {totalQty} phần • {order.deliveryTime}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatCurrency(order.totalAmount)}</p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1 ${
                        order.status === 'Đang chờ'
                          ? 'bg-[#FEF9C3] text-[#854D0E]'
                          : 'bg-[#ffebd6] text-[#c15000]'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Bento style Promotional Card */}
        <section className="relative overflow-hidden rounded-xl h-44 bg-inverse-surface flex items-center p-6 shadow-md">
          {/* Hotlinked noodle shot background */}
          <div
            className="absolute inset-0 opacity-40 bg-cover bg-center transition-transform duration-700 hover:scale-105"
            style={{
              backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCyy4JYKX-0lvC2U4xh-jKJEcK2oJJKN_4RKNl35Rk8-Rbn2DGobsJDkszr_yJNyS9jpMzV_7nlHMB1nYKNWG1-BaSLjYg0cQQ_j3R14QA5vVyCjcFIXxn3QVFd-p5eSyjTNYqL1RSJ08V1fclPNrXEodJaZGF82lj_PVHP9VbvG8CLlakhHLzHRXr9E8KDI1esO91FVRFPVECgOhH4yb62XDaBzRvqj67t_AapcgvgQ422hG63GqWk2w')`
            }}
          />
          <div className="relative z-10 max-w-[260px] text-white">
            <h4 className="text-lg font-bold tracking-tight mb-1 text-white">Tối ưu quy trình</h4>
            <p className="text-xs text-white/80 leading-relaxed">
              Sử dụng tính năng in hóa đơn tự động để tiết kiệm 15 phút mỗi giờ cao điểm.
            </p>
          </div>
          <div className="absolute right-[-15px] bottom-[-15px] w-24 h-24 bg-primary-container rounded-full blur-2xl opacity-40"></div>
        </section>
      </main>
    </div>
  );
}
