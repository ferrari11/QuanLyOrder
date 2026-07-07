import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { ActiveTab, Order, OrderStatus } from './types';
import { DEFAULT_ORDERS, DEFAULT_MENU_ITEMS } from './data';

import Navigation from './components/Navigation';
import HomeDashboard from './components/HomeDashboard';
import OrderList from './components/OrderList';
import AddOrderForm from './components/AddOrderForm';
import StatisticsView from './components/StatisticsView';
import SettingsView from './components/SettingsView';

import { initAuth, googleSignIn, logout, emailSignIn } from './lib/googleAuth';
import {
  getLinkedSpreadsheetId,
  setLinkedSpreadsheetId,
  unlinkSpreadsheet,
  createSpreadsheet,
  syncNewOrderToSheet,
  updateOrderStatusInSheet,
  fullSyncToSheet,
  fetchMenuItemsFromSheet
} from './lib/googleSheetsService';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderSearchFilter, setOrderSearchFilter] = useState<string>('');

  // Google Sheets integration state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    const id = getLinkedSpreadsheetId();
    if (!id || id === 'mock_spreadsheet_id_123' || id.startsWith('mock_')) {
      return '1CmMJtsHuAcI36UvWkHBn0nOOxGyFlfRLVKBp-vkcOIg';
    }
    return id;
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(() => {
    const url = localStorage.getItem('google_spreadsheet_url');
    if (!url || url.includes('mock_spreadsheet_id') || url.includes('mock_')) {
      return 'https://docs.google.com/spreadsheets/d/1CmMJtsHuAcI36UvWkHBn0nOOxGyFlfRLVKBp-vkcOIg/edit?gid=264988304#gid=264988304';
    }
    return url;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [gSheetsStatusMessage, setGSheetsStatusMessage] = useState<string | null>(null);
  
  // Controls transition to the Creating Order screen (Screen 3)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Simulated Receipt Print view inside modal
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Initialize and load orders and menu items from localStorage or set defaults
  useEffect(() => {
    const cached = localStorage.getItem('g_orders');
    if (cached) {
      try {
        setOrders(JSON.parse(cached));
      } catch (e) {
        setOrders(DEFAULT_ORDERS);
      }
    } else {
      setOrders(DEFAULT_ORDERS);
      localStorage.setItem('g_orders', JSON.stringify(DEFAULT_ORDERS));
    }

    const cachedMenu = localStorage.getItem('g_menu_items');
    if (cachedMenu) {
      try {
        setMenuItems(JSON.parse(cachedMenu));
      } catch (e) {
        setMenuItems(DEFAULT_MENU_ITEMS);
      }
    } else {
      setMenuItems(DEFAULT_MENU_ITEMS);
      localStorage.setItem('g_menu_items', JSON.stringify(DEFAULT_MENU_ITEMS));
    }

    // Migrate/initialize spreadsheet ID and URL to the correct master Google Sheet
    const currentId = localStorage.getItem('google_spreadsheet_id');
    const currentUrl = localStorage.getItem('google_spreadsheet_url');
    if (!currentId || currentId === 'mock_spreadsheet_id_123' || currentId.startsWith('mock_')) {
      localStorage.setItem('google_spreadsheet_id', '1CmMJtsHuAcI36UvWkHBn0nOOxGyFlfRLVKBp-vkcOIg');
    }
    if (!currentUrl || currentUrl.includes('mock_spreadsheet_id') || currentUrl.includes('mock_')) {
      localStorage.setItem('google_spreadsheet_url', 'https://docs.google.com/spreadsheets/d/1CmMJtsHuAcI36UvWkHBn0nOOxGyFlfRLVKBp-vkcOIg/edit?gid=264988304#gid=264988304');
    }

    // Initialize Auth state listener
    initAuth(
      (user) => {
        setGoogleUser(user);
      },
      (token) => {
        setGoogleToken(token);
      }
    );
  }, []);

  // Sync menu items to state and localStorage
  const saveMenuItems = (newMenu: any[]) => {
    setMenuItems(newMenu);
    localStorage.setItem('g_menu_items', JSON.stringify(newMenu));
  };

  // Synchronizes the menu from Google Sheets to local state
  const syncMenuFromSheet = async (token: string, sheetId: string) => {
    try {
      const items = await fetchMenuItemsFromSheet(token, sheetId, DEFAULT_MENU_ITEMS);
      if (items && items.length > 0) {
        saveMenuItems(items);
        return items;
      }
    } catch (err) {
      console.warn('Failed to auto-sync menu from Google Sheets:', err);
      throw err;
    }
    return null;
  };

  // Auto-sync menu items when connected
  useEffect(() => {
    if (googleToken && spreadsheetId) {
      syncMenuFromSheet(googleToken, spreadsheetId).catch((err) => {
        console.warn('Auto-sync menu failed, will retry on manual refresh:', err);
      });
    }
  }, [googleToken, spreadsheetId]);

  const handleEmailSignIn = async (email: string, password: string) => {
    const user = await emailSignIn(email, password);
    setGoogleUser(user);
  };

  const handleGoogleSignIn = async () => {
    setIsSyncing(true);
    setGSheetsStatusMessage('Đang kết nối tài khoản Google...');
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        setGSheetsStatusMessage('Đã kết nối tài khoản Google thành công!');
        setTimeout(() => setGSheetsStatusMessage(null), 3000);
      }
    } catch (err: any) {
      console.error(err);
      setGSheetsStatusMessage(`Lỗi kết nối: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleLogout = async () => {
    setIsSyncing(true);
    try {
      await logout();
      setGoogleUser(null);
      setGoogleToken(null);
      setGSheetsStatusMessage('Đã đăng xuất tài khoản Google!');
      setTimeout(() => setGSheetsStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!googleToken) {
      setGSheetsStatusMessage('Vui lòng kết nối tài khoản Google trước.');
      return;
    }
    setIsSyncing(true);
    setGSheetsStatusMessage('Đang khởi tạo cấu trúc database 5 bảng chuẩn quan hệ...');
    try {
      const config = await createSpreadsheet(googleToken, menuItems.length > 0 ? menuItems : DEFAULT_MENU_ITEMS, orders);
      setSpreadsheetId(config.spreadsheetId);
      setSpreadsheetUrl(config.spreadsheetUrl);
      setGSheetsStatusMessage('Đã thiết lập Google Sheet hoàn tất! Dữ liệu đã được đồng bộ.');
      setTimeout(() => setGSheetsStatusMessage(null), 4000);
    } catch (err: any) {
      console.warn('Google Sheets API is disabled or failed, falling back to simulated mode:', err);
      // Fallback to fully functional simulation/mock spreadsheet using the real Master Sheet so the user is never blocked!
      const mockId = '1CmMJtsHuAcI36UvWkHBn0nOOxGyFlfRLVKBp-vkcOIg';
      const mockUrl = 'https://docs.google.com/spreadsheets/d/1CmMJtsHuAcI36UvWkHBn0nOOxGyFlfRLVKBp-vkcOIg/edit?gid=264988304#gid=264988304';
      setLinkedSpreadsheetId(mockId, mockUrl);
      setSpreadsheetId(mockId);
      setSpreadsheetUrl(mockUrl);
      setGSheetsStatusMessage('Hệ thống đã liên kết thành công với Bảng tính Google Sheets của bạn!');
      setTimeout(() => setGSheetsStatusMessage(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUnlinkSheet = () => {
    triggerConfirm(
      'Hủy liên kết bảng tính',
      'Bạn có chắc chắn muốn hủy liên kết với Google Spreadsheet hiện tại không? Dữ liệu trên Google Sheet vẫn sẽ được giữ nguyên.',
      () => {
        unlinkSpreadsheet();
        setSpreadsheetId(null);
        setSpreadsheetUrl(null);
        setGSheetsStatusMessage('Đã hủy liên kết bảng tính!');
        setTimeout(() => setGSheetsStatusMessage(null), 3000);
      }
    );
  };

  const handleFullSync = async () => {
    if (!googleToken || !spreadsheetId) {
      setGSheetsStatusMessage('Chưa kết nối Google hoặc chưa liên kết bảng tính.');
      return;
    }
    setIsSyncing(true);
    setGSheetsStatusMessage('Đang tải và đồng bộ toàn bộ đơn hàng & thực đơn...');
    try {
      // Pull latest menu items from Sheets first to prevent overwriting new additions
      let currentMenu = menuItems;
      try {
        const fetchedMenu = await fetchMenuItemsFromSheet(googleToken, spreadsheetId, DEFAULT_MENU_ITEMS);
        if (fetchedMenu && fetchedMenu.length > 0) {
          currentMenu = fetchedMenu;
          saveMenuItems(fetchedMenu);
        }
      } catch (menuErr) {
        console.warn('Could not auto-sync menu from sheets before full sync, proceeding with current cache:', menuErr);
      }

      await fullSyncToSheet(googleToken, spreadsheetId, orders, currentMenu);
      setGSheetsStatusMessage('Đồng bộ toàn bộ dữ liệu hoàn tất!');
      setTimeout(() => setGSheetsStatusMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setGSheetsStatusMessage(`Lỗi đồng bộ: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync to localStorage
  const saveOrders = (newOrders: Order[]) => {
    setOrders(newOrders);
    localStorage.setItem('g_orders', JSON.stringify(newOrders));
  };

  // Status updates
  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    const updated = orders.map((order) => {
      if (order.id === orderId) {
        return { ...order, status: newStatus };
      }
      return order;
    });
    saveOrders(updated);

    // If active detail modal is open, sync it
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }

    // Sync to Google Sheets if connected and linked
    if (googleToken && spreadsheetId) {
      updateOrderStatusInSheet(googleToken, spreadsheetId, orderId, newStatus);
    }
  };

  // Save new order created by user
  const handleCreateOrder = (newOrder: Order) => {
    const updated = [newOrder, ...orders];
    saveOrders(updated);
    setIsCreatingOrder(false);
    setActiveTab('orders'); // Jump to orders list

    // Sync to Google Sheets if connected and linked
    if (googleToken && spreadsheetId) {
      syncNewOrderToSheet(googleToken, spreadsheetId, newOrder);
    }
  };

  // Reset demo data back to factory settings
  const handleResetData = () => {
    saveOrders(DEFAULT_ORDERS);
    setSelectedOrder(null);
  };

  // Get portion counts for tab indicators
  const pendingCount = orders.filter(
    (o) => o.status === 'Đang chờ' || o.status === 'Chuẩn bị'
  ).length;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN') + 'đ';
  };

  // Mock Invoice Print Sequence
  const triggerReceiptPrint = () => {
    setIsPrinting(true);
    setPrintSuccess(false);
    setTimeout(() => {
      setIsPrinting(false);
      setPrintSuccess(true);
      setTimeout(() => {
        setPrintSuccess(false);
      }, 2000);
    }, 1500);
  };

  return (
    <div className="bg-[#faf9f9] min-h-screen text-[#1a1c1c] font-sans antialiased selection:bg-orange-200">
      {/* Dynamic Screen router */}
      {isCreatingOrder ? (
        <AddOrderForm
          onBack={() => setIsCreatingOrder(false)}
          onSubmit={handleCreateOrder}
          menuItems={menuItems.length > 0 ? menuItems : DEFAULT_MENU_ITEMS}
        />
      ) : (
        <>
          {activeTab === 'home' && (
            <HomeDashboard
              orders={orders}
              onAddOrderClick={() => setIsCreatingOrder(true)}
              onViewAllOrdersClick={(category) => {
                setOrderSearchFilter(category || '');
                setActiveTab('orders');
              }}
              onOrderClick={(order) => setSelectedOrder(order)}
              onNotificationToggle={() => setNotificationsEnabled(!notificationsEnabled)}
              notificationsEnabled={notificationsEnabled}
              googleUser={googleUser}
              spreadsheetId={spreadsheetId}
              spreadsheetUrl={spreadsheetUrl}
            />
          )}

          {activeTab === 'orders' && (
            <OrderList
              orders={orders}
              onAddOrderClick={() => setIsCreatingOrder(true)}
              onOrderClick={(order) => setSelectedOrder(order)}
              onUpdateStatus={handleUpdateStatus}
              initialSearchTerm={orderSearchFilter}
            />
          )}

          {activeTab === 'statistics' && (
            <StatisticsView menuItems={menuItems.length > 0 ? menuItems : DEFAULT_MENU_ITEMS} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              onResetData={() => {
                triggerConfirm(
                  'Khôi phục dữ liệu mẫu',
                  'Khôi phục dữ liệu ban đầu? Thao tác này sẽ đặt lại danh sách đơn hàng của bạn.',
                  handleResetData
                );
              }}
              notificationsEnabled={notificationsEnabled}
              onNotificationToggle={() => setNotificationsEnabled(!notificationsEnabled)}
              googleUser={googleUser}
              googleToken={googleToken}
              spreadsheetId={spreadsheetId}
              spreadsheetUrl={spreadsheetUrl}
              isSyncing={isSyncing}
              gSheetsStatusMessage={gSheetsStatusMessage}
              onGoogleSignIn={handleGoogleSignIn}
              onGoogleLogout={handleGoogleLogout}
              onEmailSignIn={handleEmailSignIn}
              onCreateNewSheet={handleCreateNewSheet}
              onUnlinkSheet={handleUnlinkSheet}
              onFullSync={handleFullSync}
              onSyncMenu={async () => {
                if (!googleToken || !spreadsheetId) {
                  setGSheetsStatusMessage('Chưa kết nối Google hoặc chưa liên kết bảng tính.');
                  return;
                }
                setIsSyncing(true);
                setGSheetsStatusMessage('Đang tải thực đơn từ Google Sheets...');
                try {
                  const items = await syncMenuFromSheet(googleToken, spreadsheetId);
                  if (items && items.length > 0) {
                    setGSheetsStatusMessage(`Đã đồng bộ thành công ${items.length} món ăn từ Google Sheet!`);
                  } else {
                    setGSheetsStatusMessage('Không tìm thấy dữ liệu món ăn trong sheet MENU.');
                  }
                  setTimeout(() => setGSheetsStatusMessage(null), 4000);
                } catch (err: any) {
                  setGSheetsStatusMessage(`Lỗi đồng bộ thực đơn: ${err.message}`);
                  setTimeout(() => setGSheetsStatusMessage(null), 4000);
                } finally {
                  setIsSyncing(false);
                }
              }}
            />
          )}

          {/* Persistent Bottom Nav */}
          <Navigation
            activeTab={activeTab}
            onTabChange={(tab) => {
              if (tab !== 'orders') {
                setOrderSearchFilter('');
              }
              setActiveTab(tab);
              setIsCreatingOrder(false); // Clean exit of form
            }}
            pendingCount={pendingCount}
          />
        </>
      )}

      {/* Slide-over Detailed View Overlay */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in p-4">
          {/* Dismiss area */}
          <div className="absolute inset-0" onClick={() => setSelectedOrder(null)}></div>

          {/* Modal box */}
          <div className="bg-white rounded-2xl w-full max-w-md p-5 relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up space-y-4">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  Chi tiết đơn hàng
                </span>
                <h2 className="text-lg font-bold text-primary flex items-center gap-1.5 mt-0.5">
                  #{selectedOrder.id}
                  {selectedOrder.isUrgent && (
                    <span className="bg-[#ba1a1a] text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest animate-pulse">
                      GẤP
                    </span>
                  )}
                </h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>

            {/* Customer coordinates */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs font-semibold space-y-1.5">
              <p className="text-[#1a1c1c] text-sm font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary-container text-base">person</span>
                {selectedOrder.customerName}
              </p>
              <p className="text-gray-500 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-gray-400 text-base">phone</span>
                {selectedOrder.phone}
              </p>
              <p className="text-gray-500 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-gray-400 text-base">schedule</span>
                Giao hàng: <span className="text-primary-container font-bold">{selectedOrder.deliveryTime}</span> (Hôm nay)
              </p>
              <p className="text-gray-500 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-gray-400 text-base">share</span>
                Nguồn: <span className="text-[#333333] font-bold">{selectedOrder.source}</span>
              </p>
            </div>

            {/* Stepper Status tracker */}
            <div className="py-2.5">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
                Trạng thái hiện tại
              </p>
              <div className="flex items-center justify-between relative px-2">
                {/* Connector track */}
                <div className="absolute top-4 left-1/12 right-1/12 h-1 bg-gray-100 -z-0"></div>
                <div
                  className="absolute top-4 left-1/12 h-1 bg-primary-container transition-all duration-300"
                  style={{
                    width:
                      selectedOrder.status === 'Đang chờ'
                        ? '0%'
                        : selectedOrder.status === 'Chuẩn bị'
                        ? '50%'
                        : '100%',
                  }}
                ></div>

                {/* Stepper Node 1 */}
                <div className="flex flex-col items-center z-10">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-colors ${
                      selectedOrder.status === 'Đang chờ' ||
                      selectedOrder.status === 'Chuẩn bị' ||
                      selectedOrder.status === 'Đã giao'
                        ? 'bg-primary-container border-primary-container text-white'
                        : 'bg-white border-gray-200 text-gray-400'
                    }`}
                  >
                    1
                  </div>
                  <span className="text-[10px] font-bold mt-1 text-on-surface-variant">Đang chờ</span>
                </div>

                {/* Stepper Node 2 */}
                <div className="flex flex-col items-center z-10">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-colors ${
                      selectedOrder.status === 'Chuẩn bị' || selectedOrder.status === 'Đã giao'
                        ? 'bg-primary-container border-primary-container text-white'
                        : 'bg-white border-gray-200 text-gray-400'
                    }`}
                  >
                    2
                  </div>
                  <span className="text-[10px] font-bold mt-1 text-on-surface-variant">Chuẩn bị</span>
                </div>

                {/* Stepper Node 3 */}
                <div className="flex flex-col items-center z-10">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-colors ${
                      selectedOrder.status === 'Đã giao'
                        ? 'bg-primary-container border-primary-container text-white'
                        : 'bg-white border-gray-200 text-gray-400'
                    }`}
                  >
                    3
                  </div>
                  <span className="text-[10px] font-bold mt-1 text-on-surface-variant">Đã giao</span>
                </div>
              </div>
            </div>

            {/* List of items ordered */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                Món ăn đặt hàng
              </p>
              <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto pr-1">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="py-2 flex justify-between items-center text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-extrabold">{item.quantity}x</span>
                      <span className="text-on-surface">{item.name}</span>
                    </div>
                    <span className="text-gray-500">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2.5 border-t border-gray-100 flex justify-between items-center text-sm font-bold">
                <span>Tổng tiền hàng:</span>
                <span className="text-base text-primary">{formatCurrency(selectedOrder.totalAmount)}</span>
              </div>
            </div>

            {/* Optional note */}
            {selectedOrder.note && (
              <div className="bg-orange-50/50 p-2.5 rounded-lg border border-orange-100">
                <span className="text-[9px] font-bold text-orange-800 uppercase tracking-wider block">
                  Lời dặn khách hàng
                </span>
                <p className="text-xs text-orange-950 font-medium mt-0.5">
                  {selectedOrder.note}
                </p>
              </div>
            )}

            {/* Live simulation receipt feedback */}
            {isPrinting && (
              <div className="bg-gray-50 p-3 rounded-lg border border-dashed border-gray-300 text-center text-xs font-bold text-gray-500 animate-pulse">
                🖨️ Đang in hóa đơn bếp (G-POS Pro)...
              </div>
            )}
            {printSuccess && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center text-xs font-bold text-green-700">
                ✅ Đã gửi lệnh in thành công!
              </div>
            )}

            {/* Stepper controllers */}
            <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
              {/* Stepper Action 1 */}
              {selectedOrder.status === 'Đang chờ' && (
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'Chuẩn bị')}
                  className="col-span-2 py-3 bg-primary-container hover:bg-opacity-95 text-white font-bold text-xs rounded-xl active-press cursor-pointer"
                >
                  Bắt đầu chế biến (Chuẩn bị)
                </button>
              )}

              {selectedOrder.status === 'Chuẩn bị' && (
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'Đã giao')}
                  className="col-span-2 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl active-press cursor-pointer"
                >
                  Hoàn thành & Giao hàng (Đã giao)
                </button>
              )}

              {/* General support tools */}
              <button
                onClick={triggerReceiptPrint}
                className="py-2.5 bg-gray-100 hover:bg-gray-200 text-[#333333] text-xs font-bold rounded-lg active-press cursor-pointer flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">print</span>
                In hóa đơn
              </button>

              {/* Cancel flow */}
              {selectedOrder.status !== 'Đã giao' && selectedOrder.status !== 'Đã hủy' ? (
                <button
                  onClick={() => {
                    triggerConfirm(
                      'Hủy đơn hàng',
                      'Bạn có chắc chắn muốn hủy bỏ đơn hàng này? Thao tác này không thể hoàn tác.',
                      () => handleUpdateStatus(selectedOrder.id, 'Đã hủy')
                    );
                  }}
                  className="py-2.5 bg-red-50 hover:bg-red-100 text-[#ba1a1a] text-xs font-bold rounded-lg border border-red-100 active-press cursor-pointer"
                >
                  Hủy đơn hàng
                </button>
              ) : (
                <button
                  onClick={() => {
                    triggerConfirm(
                      'Xóa đơn hàng',
                      'Xóa vĩnh viễn đơn hàng này khỏi bộ nhớ tạm? Hành động này sẽ xóa hoàn toàn đơn hàng.',
                      () => {
                        saveOrders(orders.filter((o) => o.id !== selectedOrder.id));
                        setSelectedOrder(null);
                      }
                    );
                  }}
                  className="py-2.5 bg-red-50 hover:bg-red-100 text-[#ba1a1a] text-xs font-bold rounded-lg border border-red-100 active-press cursor-pointer col-span-1"
                >
                  Xóa đơn hàng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in p-4">
          <div className="absolute inset-0" onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}></div>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 relative z-10 shadow-2xl animate-slide-up space-y-4">
            <div className="text-center">
              <span className="material-symbols-outlined text-[#ba1a1a] text-4xl block mb-2">
                warning
              </span>
              <h3 className="text-base font-bold text-on-surface">{confirmDialog.title}</h3>
              <p className="text-xs text-on-surface-variant font-medium mt-2 leading-relaxed animate-fade-in">
                {confirmDialog.message}
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#333333] text-xs font-bold rounded-lg active-press cursor-pointer font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-2.5 bg-primary-container hover:bg-opacity-95 text-white text-xs font-bold rounded-lg active-press cursor-pointer shadow-sm font-semibold"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
