import { useState } from 'react';
import { MenuItem } from '../types';
import { DEFAULT_MENU_ITEMS } from '../data';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface StatisticsViewProps {
  onBack?: () => void;
  menuItems?: MenuItem[];
}

export default function StatisticsView({ onBack, menuItems }: StatisticsViewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | '7days' | '30days' | 'custom'>('today');

  // Interactive state for the hourly orders chart
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Dynamic calculation of revenue by category from menuItems
  const itemsSource = menuItems && menuItems.length > 0 ? menuItems : DEFAULT_MENU_ITEMS;

  const categoryRevenueMap: Record<string, number> = {};
  itemsSource.forEach((item) => {
    let cat = item.category ? item.category.trim() : 'Khác';
    if (cat.toLowerCase() === 'bún') cat = 'Bún';
    if (cat.toLowerCase() === 'mì') cat = 'Mì';
    if (cat.toLowerCase() === 'nui') cat = 'Nui';
    if (cat.toLowerCase() === 'cơm') cat = 'Cơm';
    if (cat.toLowerCase() === 'thập cẩm') cat = 'Thập cẩm';

    categoryRevenueMap[cat] = (categoryRevenueMap[cat] || 0) + (item.revenue || 0);
  });

  const pieData = Object.entries(categoryRevenueMap)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalCategoryRevenue = pieData.reduce((sum, d) => sum + d.value, 0);

  // High quality theme-consistent colors
  const COLORS: Record<string, string> = {
    'Mì': '#F59E0B',      // Amber
    'Nui': '#3B82F6',     // Blue
    'Cơm': '#10B981',     // Emerald
    'Bún': '#EF4444',     // Red
    'Thập cẩm': '#8B5CF6', // Purple
    'Khác': '#6B7280',    // Gray
  };

  // Hardcoded or dynamic values for periods to demonstrate operational changes
  const periodData = {
    today: {
      revenue: 12450000,
      revenueChange: '+12%',
      orders: 142,
      completedOrders: 135,
      successRate: '95%',
      canceledOrders: 7,
      hourlyData: [12, 18, 24, 31, 20, 14], // [08:00, 10:00, 12:00, 14:00, 16:00, 18:00]
    },
    '7days': {
      revenue: 82100000,
      revenueChange: '+8.4%',
      orders: 980,
      completedOrders: 945,
      successRate: '96.4%',
      canceledOrders: 35,
      hourlyData: [84, 110, 145, 195, 130, 92],
    },
    '30days': {
      revenue: 341000000,
      revenueChange: '+15.2%',
      orders: 4120,
      completedOrders: 3950,
      successRate: '95.8%',
      canceledOrders: 170,
      hourlyData: [320, 480, 640, 780, 520, 390],
    },
    custom: {
      revenue: 15800000,
      revenueChange: '+2.1%',
      orders: 195,
      completedOrders: 182,
      successRate: '93.3%',
      canceledOrders: 13,
      hourlyData: [15, 22, 38, 45, 28, 19],
    }
  };

  const activeData = periodData[selectedPeriod];

  // Top 5 sellers (using default data sorting)
  const topSellers: MenuItem[] = [...(menuItems && menuItems.length > 0 ? menuItems : DEFAULT_MENU_ITEMS)]
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 5);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN') + 'đ';
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

      {/* Main Container */}
      <main className="pt-18 px-4 max-w-md mx-auto space-y-5">
        {/* Period Selector Segmented Control */}
        <div className="bg-surface-container-low rounded-xl p-1 flex items-center gap-1 border border-gray-200/50 shadow-2xs">
          <button
            onClick={() => setSelectedPeriod('today')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              selectedPeriod === 'today'
                ? 'bg-white text-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-gray-200/60'
            }`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => setSelectedPeriod('7days')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              selectedPeriod === '7days'
                ? 'bg-white text-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-gray-200/60'
            }`}
          >
            7 ngày
          </button>
          <button
            onClick={() => setSelectedPeriod('30days')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              selectedPeriod === '30days'
                ? 'bg-white text-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-gray-200/60'
            }`}
          >
            30 ngày
          </button>
          <button
            onClick={() => setSelectedPeriod('custom')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              selectedPeriod === 'custom'
                ? 'bg-white text-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-gray-200/60'
            }`}
          >
            Tùy chọn
          </button>
        </div>

        {/* Stats Bento Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Estimated Revenue - Full Width */}
          <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-gray-300 transition-colors">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
              Doanh thu ước tính
            </span>
            <span className="text-2xl font-extrabold text-primary block leading-none">
              {formatCurrency(activeData.revenue)}
            </span>
            <div className="flex items-center gap-1 text-green-700 text-xs font-bold mt-1.5 bg-green-50 w-fit px-2 py-0.5 rounded-full">
              <span className="material-symbols-outlined text-xs font-bold">trending_up</span>
              <span>{activeData.revenueChange} so với kỳ trước</span>
            </div>
          </div>

          {/* Total Orders */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
              Tổng đơn hàng
            </span>
            <span className="text-2xl font-bold text-on-surface block leading-none mb-1">
              {activeData.orders}
            </span>
            <span className="text-[10px] text-gray-500 font-semibold block">
              {activeData.completedOrders} hoàn thành
            </span>
          </div>

          {/* Success rate */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
              Tỷ lệ thành công
            </span>
            <span className="text-2xl font-bold text-green-700 block leading-none mb-1">
              {activeData.successRate}
            </span>
            <span className="text-[10px] text-gray-500 font-semibold block">
              {activeData.canceledOrders} đã hủy
            </span>
          </div>
        </div>

        {/* Charts: Orders by hour */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-on-surface mb-5">Đơn hàng theo giờ</h3>

          {/* Pure CSS/SVG Bar Chart */}
          <div className="h-44 flex items-end justify-between gap-3 px-1 relative">
            {activeData.hourlyData.map((val, idx) => {
              const maxVal = Math.max(...activeData.hourlyData);
              const heightPercent = maxVal > 0 ? (val / maxVal) * 100 : 0;
              const isMax = val === maxVal;
              const isHovered = hoveredBarIndex === idx;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                  className="flex-1 flex flex-col justify-end items-center h-full group cursor-pointer relative"
                >
                  {/* Tooltip on Top */}
                  <div
                    className={`absolute -top-7 bg-inverse-surface text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md pointer-events-none transition-all duration-200 ${
                      isHovered || isMax ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                    }`}
                  >
                    {val} đơn
                  </div>

                  {/* Colored Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-xs transition-all duration-500 ${
                      isMax
                        ? 'bg-primary-container shadow-xs shadow-orange-500/20'
                        : isHovered
                        ? 'bg-primary'
                        : 'bg-primary/20'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Time axis */}
          <div className="flex justify-between mt-3 px-1 text-[10px] text-on-surface-variant font-bold">
            <span>08:00</span>
            <span>10:00</span>
            <span>12:00</span>
            <span>14:00</span>
            <span>16:00</span>
            <span>18:00</span>
          </div>
        </div>

        {/* Biểu đồ tròn Recharts: Doanh thu theo danh mục */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-lg">pie_chart</span>
              Tỷ lệ doanh thu theo danh mục
            </h3>
            <span className="text-[10px] text-primary font-bold bg-primary/10 px-2.5 py-0.5 rounded-full">
              {formatCurrency(totalCategoryRevenue)}
            </span>
          </div>

          <div className="h-56 flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[entry.name] || COLORS['Khác']} 
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Doanh thu']}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Custom overlay in the center of Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-10px]">
              <span className="text-[10px] text-gray-400 font-bold tracking-wider uppercase">Tổng cộng</span>
              <span className="text-sm font-black text-on-surface leading-none mt-0.5 text-center px-4 max-w-[120px] truncate">
                {formatCurrency(totalCategoryRevenue)}
              </span>
            </div>
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-gray-100">
            {pieData.map((entry) => {
              const pct = totalCategoryRevenue > 0 ? ((entry.value / totalCategoryRevenue) * 100).toFixed(1) : '0';
              const color = COLORS[entry.name] || COLORS['Khác'];
              return (
                <div key={entry.name} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-3 h-3 rounded-xs flex-shrink-0" style={{ backgroundColor: color }}></div>
                    <span className="text-xs font-semibold text-on-surface truncate">{entry.name}</span>
                  </div>
                  <span className="text-xs font-extrabold text-[#1a1c1c] flex-shrink-0">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Donut Chart: Nguồn đơn */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-on-surface mb-5">Nguồn đơn</h3>

          <div className="flex items-center justify-around">
            {/* Inline SVG Donut Chart */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg width="120" height="120" viewBox="0 0 40 40" className="transform -rotate-90">
                {/* Background Track */}
                <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="#f1f0f0" strokeWidth="4" />
                {/* Segment 1: App 65% (stroke-dasharray="percent gap") */}
                <circle
                  cx="20"
                  cy="20"
                  r="15.915"
                  fill="transparent"
                  stroke="#ff6b00"
                  strokeWidth="4"
                  strokeDasharray="65 35"
                  strokeDashoffset="0"
                />
                {/* Segment 2: Website 20% */}
                <circle
                  cx="20"
                  cy="20"
                  r="15.915"
                  fill="transparent"
                  stroke="#ffb693"
                  strokeWidth="4"
                  strokeDasharray="20 80"
                  strokeDashoffset="-65"
                />
                {/* Segment 3: Tại quầy 15% */}
                <circle
                  cx="20"
                  cy="20"
                  r="15.915"
                  fill="transparent"
                  stroke="#e4e2e1"
                  strokeWidth="4"
                  strokeDasharray="15 85"
                  strokeDashoffset="-85"
                />
              </svg>

              {/* Total overlay label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent">
                <span className="text-[10px] text-gray-500 font-bold tracking-wider uppercase">Tổng</span>
                <span className="text-lg font-bold text-on-surface leading-none mt-0.5">
                  {activeData.orders}
                </span>
              </div>
            </div>

            {/* Legend with matching colors */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary-container"></div>
                <span className="text-xs font-semibold text-on-surface">App (65%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary-fixed-dim"></div>
                <span className="text-xs font-semibold text-on-surface">Website (20%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary-container"></div>
                <span className="text-xs font-semibold text-on-surface">Tại quầy (15%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top 5 selling menu items */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-bold text-on-surface">Top 5 món bán chạy</h3>
            <button className="text-primary text-xs font-bold hover:underline">Xem tất cả</button>
          </div>

          <div className="divide-y divide-gray-100">
            {topSellers.map((item, idx) => (
              <div
                key={item.id}
                className="px-5 py-3.5 flex items-center gap-3.5 hover:bg-gray-50 transition-colors"
              >
                {/* High quality photography loaded with referrerPolicy */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-on-surface truncate leading-tight">
                    {idx + 1}. {item.name}
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                    {item.salesCount} đơn hàng • {formatCurrency(item.revenue)}
                  </div>
                </div>

                {/* Performance Badge */}
                <div className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  item.trend > 0
                    ? 'bg-[#DCFCE7] text-[#166534]'
                    : item.trend < 0
                    ? 'bg-red-50 text-red-700'
                    : 'bg-[#FEF9C3] text-[#854D0E]'
                }`}>
                  {item.trend !== 0 && (
                    <span className="material-symbols-outlined text-[10px] font-bold">
                      {item.trend > 0 ? 'trending_up' : 'trending_down'}
                    </span>
                  )}
                  <span>{item.trend > 0 ? `+${item.trend}%` : `${item.trend}%`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
