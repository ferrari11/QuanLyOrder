import { ActiveTab } from '../types';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  pendingCount: number;
}

export default function Navigation({ activeTab, onTabChange, pendingCount }: NavigationProps) {
  const navItems = [
    { id: 'home' as ActiveTab, label: 'Home', icon: 'home' },
    { id: 'orders' as ActiveTab, label: 'Orders', icon: 'assignment', badge: true },
    { id: 'statistics' as ActiveTab, label: 'Statistics', icon: 'leaderboard' },
    { id: 'settings' as ActiveTab, label: 'Settings', icon: 'settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-white border-t border-gray-200 flex justify-around items-center px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
      <div className="max-w-md w-full flex justify-between items-center mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center transition-all duration-200 active-press py-1 px-3 ${
                isActive
                  ? 'bg-primary-container text-white rounded-full font-semibold scale-105'
                  : 'text-on-surface-variant hover:bg-gray-100 rounded-xl'
              }`}
            >
              <div className="relative">
                <span className={`material-symbols-outlined ${isActive ? 'material-filled text-white' : 'text-secondary'}`}>
                  {item.icon}
                </span>
                {item.badge && pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {pendingCount}
                  </span>
                )}
              </div>
              <span className="text-xs mt-0.5 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
