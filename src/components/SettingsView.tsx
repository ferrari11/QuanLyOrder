import React, { useState } from 'react';

interface SettingsViewProps {
  onResetData: () => void;
  notificationsEnabled: boolean;
  onNotificationToggle: () => void;
  // Google Sheets integration props
  googleUser: any;
  googleToken: string | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  isSyncing: boolean;
  gSheetsStatusMessage: string | null;
  onGoogleSignIn: () => void;
  onGoogleLogout: () => void;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onEmailSignUp: (email: string, password: string) => Promise<void>;
  onCreateNewSheet: () => void;
  onUnlinkSheet: () => void;
  onFullSync: () => void;
  onSyncMenu?: () => void;
}

export default function SettingsView({
  onResetData,
  notificationsEnabled,
  onNotificationToggle,
  googleUser,
  googleToken,
  spreadsheetId,
  spreadsheetUrl,
  isSyncing,
  gSheetsStatusMessage,
  onGoogleSignIn,
  onGoogleLogout,
  onEmailSignIn,
  onEmailSignUp,
  onCreateNewSheet,
  onUnlinkSheet,
  onFullSync,
  onSyncMenu,
}: SettingsViewProps) {
  const [storeOpen, setStoreOpen] = useState(true);
  const [autoPrint, setAutoPrint] = useState(true);
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');

  // Email Auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError('Vui lòng điền đầy đủ email và mật khẩu.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (authMode === 'login') {
        await onEmailSignIn(email, password);
      } else {
        await onEmailSignUp(email, password);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message;
      if (err.code === 'auth/invalid-email') {
        errMsg = 'Email không hợp lệ.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Mật khẩu phải tối thiểu 6 ký tự.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'Email này đã được sử dụng.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errMsg = 'Email hoặc mật khẩu không chính xác.';
      }
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="pb-24">
      {/* TopAppBar */}
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

      {/* Main Settings Container */}
      <main className="pt-18 px-4 max-w-md mx-auto space-y-5 animate-fade-in">
        {/* User Profile Block */}
        {googleUser ? (
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              {googleUser.photoURL ? (
                <img
                  src={googleUser.photoURL}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full border border-primary/10 shadow-xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 bg-primary-fixed text-primary font-extrabold rounded-full flex items-center justify-center text-lg border border-primary/10">
                  {googleUser.email ? googleUser.email.substring(0, 2).toUpperCase() : 'QL'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-[#1a1c1c] truncate">
                  {googleUser.displayName || 'Nhà Của Bắp'}
                </h2>
                <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
                  Quản lý: {googleUser.email}
                </p>
                <span className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary text-[10px] font-extrabold rounded-full mt-1.5">
                  Cấp bậc: Merchant Pro
                </span>
              </div>
            </div>

            <button
              onClick={onGoogleLogout}
              disabled={isSyncing}
              type="button"
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer active-press border border-gray-200/50 flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Đăng xuất
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <span className="material-symbols-outlined text-primary font-bold">lock_open</span>
              <h3 className="text-sm font-bold text-on-surface">Đăng nhập Cửa hàng</h3>
            </div>
            
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authError && (
                <div className="p-2.5 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-semibold">
                  {authError}
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Email</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-primary placeholder:text-gray-300"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Mật khẩu</label>
                <input
                  type="password"
                  required
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-primary placeholder:text-gray-300"
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer active-press disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {authLoading ? (
                    <>
                      <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                      Đang kết nối...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xs">
                        {authMode === 'login' ? 'login' : 'person_add'}
                      </span>
                      {authMode === 'login' ? 'Đăng nhập' : 'Đăng ký cửa hàng mới'}
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setAuthError(null);
                }}
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
              >
                {authMode === 'login' ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
              </button>
            </div>
          </div>
        )}

        {/* Operating status card */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3.5">
          <h3 className="text-xs font-bold text-on-surface-variant/75 uppercase tracking-wider">
            Vận hành cửa hàng
          </h3>

          {/* Store Switch */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-on-surface">Trạng thái mở cửa</p>
              <p className="text-xs text-gray-500">Cho phép khách đặt hàng qua App/Web</p>
            </div>
            <button
              onClick={() => setStoreOpen(!storeOpen)}
              className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                storeOpen ? 'bg-primary-container' : 'bg-gray-300'
              }`}
            >
              <div
                className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                  storeOpen ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Auto Print switch */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div>
              <p className="text-sm font-bold text-on-surface">Tự động in hóa đơn</p>
              <p className="text-xs text-gray-500">In phiếu gửi nhà bếp khi có đơn mới</p>
            </div>
            <button
              onClick={() => setAutoPrint(!autoPrint)}
              className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                autoPrint ? 'bg-primary-container' : 'bg-gray-300'
              }`}
            >
              <div
                className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                  autoPrint ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Notifications switch */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div>
              <p className="text-sm font-bold text-on-surface">Thông báo âm thanh</p>
              <p className="text-xs text-gray-500">Chuông báo động khi có đơn đặt gấp</p>
            </div>
            <button
              onClick={onNotificationToggle}
              className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                notificationsEnabled ? 'bg-primary-container' : 'bg-gray-300'
              }`}
            >
              <div
                className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* System Settings card */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-on-surface-variant/75 uppercase tracking-wider">
            Cấu hình hệ thống
          </h3>

          {/* Language select */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-on-surface">Ngôn ngữ</p>
              <p className="text-xs text-gray-500">Sử dụng trong hóa đơn và báo cáo</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-0.5 flex">
              <button
                onClick={() => setLanguage('vi')}
                className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer ${
                  language === 'vi' ? 'bg-white text-primary shadow-xs' : 'text-gray-500'
                }`}
              >
                Tiếng Việt
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer ${
                  language === 'en' ? 'bg-white text-primary shadow-xs' : 'text-gray-500'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {/* Google Sheets Live Database Connection */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-green-600 font-bold">grid_on</span>
            <h3 className="text-sm font-bold text-on-surface">Cơ sở dữ liệu Google Sheets</h3>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Kết nối ứng dụng với tài khoản Google Drive và Sheets của bạn để tự động lưu trữ và đồng bộ dữ liệu theo mô hình quan hệ chuẩn 5 bảng liên kết: <span className="font-bold text-gray-700">ĐƠN HÀNG</span>, <span className="font-bold text-gray-700">CHI TIẾT ĐƠN HÀNG</span>, <span className="font-bold text-gray-700">DANH MỤC MÓN</span>, <span className="font-bold text-gray-700">KHÁCH HÀNG</span> và <span className="font-bold text-gray-700">BÁO CÁO</span>.
          </p>

          {gSheetsStatusMessage && (
            <div className={`p-3 rounded-xl text-xs font-semibold border ${
              gSheetsStatusMessage.includes('Lỗi') 
                ? 'bg-red-50 text-red-700 border-red-200' 
                : 'bg-green-50 text-green-700 border-green-200 animate-pulse'
            }`}>
              {gSheetsStatusMessage}
            </div>
          )}

          <div className="space-y-3 pt-1">
            {!googleToken ? (
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs transition-all active-press cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Kết nối Google Workspace
              </button>
            ) : (
              <div className="space-y-3">
                {/* Connected user header */}
                <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-150 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    {googleUser?.photoURL ? (
                      <img src={googleUser.photoURL} alt="Avatar" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="material-symbols-outlined text-gray-500 text-lg">account_circle</span>
                    )}
                    <div className="truncate max-w-[180px]">
                      <p className="text-[#1a1c1c] font-bold">{googleUser?.displayName || 'Tài khoản Google'}</p>
                      <p className="text-[10px] text-gray-500 font-medium truncate">{googleUser?.email || 'Đã kết nối Sheets'}</p>
                    </div>
                  </div>
                  <button
                    onClick={onGoogleLogout}
                    type="button"
                    className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px] font-bold rounded-lg cursor-pointer transition-colors active-press"
                  >
                    Ngắt kết nối
                  </button>
                </div>

                {/* Spreadsheet status */}
                {!spreadsheetId ? (
                  <button
                    onClick={onCreateNewSheet}
                    disabled={isSyncing}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors active-press cursor-pointer disabled:opacity-50"
                  >
                    🚀 Khởi tạo Google Sheet Mới
                  </button>
                ) : (
                  <div className="space-y-2.5">
                    {/* Link to Spreadsheet */}
                    <a
                      href={spreadsheetUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 py-3 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-bold rounded-xl shadow-xs transition-colors active-press cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm font-bold">table_view</span>
                      Mở bảng tính Google Sheets
                      <span className="material-symbols-outlined text-xs">open_in_new</span>
                    </a>

                    {onSyncMenu && (
                      <button
                        onClick={onSyncMenu}
                        disabled={isSyncing}
                        className="w-full flex items-center justify-center gap-1.5 py-3 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors active-press cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-xs">restaurant_menu</span>
                        Đồng bộ Thực đơn từ Sheets
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {/* Manual Full Sync */}
                      <button
                        onClick={onFullSync}
                        disabled={isSyncing}
                        className="py-2.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl border border-primary/20 transition-colors active-press cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-xs">sync</span>
                        Đồng bộ lại
                      </button>

                      {/* Unlink sheet */}
                      <button
                        onClick={onUnlinkSheet}
                        disabled={isSyncing}
                        className="py-2.5 bg-red-50 hover:bg-red-100 text-[#ba1a1a] text-xs font-bold rounded-xl border border-red-200 transition-colors active-press cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-xs">link_off</span>
                        Hủy liên kết
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Data resetting card */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#ba1a1a]">Khu vực thử nghiệm</h3>
            <p className="text-xs text-gray-500 mt-1">
              Khôi phục dữ liệu mô phỏng mặc định ban đầu để thuận tiện kiểm tra đầy đủ các trạng thái và
              màn hình của G-Order Manager.
            </p>
          </div>

          <button
            onClick={onResetData}
            type="button"
            className="w-full py-2.5 bg-red-50 hover:bg-red-100/80 text-[#ba1a1a] text-xs font-bold rounded-lg border border-red-200 transition-colors active-press cursor-pointer"
          >
            Khôi phục Đơn hàng Mẫu
          </button>
        </div>

        {/* Application version info */}
        <div className="text-center pt-2">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            G-Order Manager • v2.4.0
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5">© 2026 G-Order Platform Co.</p>
        </div>
      </main>
    </div>
  );
}
