import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../db/supabaseClient';
import { 
  ChiliLogoIcon,
  MenuBookIcon,
  PosIcon,
  DashboardIcon, 
  OrdersIcon, 
  KitchenIcon, 
  TableServicesIcon, 
  InventoryIcon, 
  StaffIcon, 
  AccountingIcon, 
  SettingsIcon, 
  ShieldIcon, 
  LogoutIcon,
  CloseIcon,
  ReservationIcon,
  DeliveryIcon
} from '../common/Icons';

export type NavTab = 
  | 'dashboard' 
  | 'pos' 
  | 'orders' 
  | 'kitchen' 
  | 'tables' 
  | 'menu' 
  | 'inventory' 
  | 'staff' 
  | 'reports' 
  | 'settings'
  | 'superadmin'
  | 'terms'
  | 'privacy'
  | 'support';

interface AppLayoutProps {
  currentTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ currentTab, onNavigate, children }) => {
  const { currentUser, currentRestaurant, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Super Admin view
  if (currentUser?.role === 'superadmin') {
    return (
      <div className="min-h-screen bg-[#F5F6F5] text-[#171B18] flex flex-col antialiased">
        <header className="h-16 bg-white text-[#171B18] flex items-center justify-between px-6 border-b border-[#E7EBE8] flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <ChiliLogoIcon className="w-8 h-8" />
            <div>
              <span className="font-extrabold text-base tracking-tight text-[#171B18]">CHILI POS Super Admin</span>
              <span className="text-[11px] text-[#777F79] block -mt-0.5">Centralized Platform Control</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F0F8F3] border border-[#D8EFDF] text-xs font-semibold text-[#078F36]">
              <span className="w-2 h-2 rounded-full bg-[#078F36]"></span>
              <span>Platform Super Admin</span>
            </div>

            <button
              onClick={logout}
              className="text-[#777F79] hover:text-[#D94A43] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E7EBE8] hover:border-red-200 transition-colors font-medium"
            >
              <LogoutIcon className="w-3.5 h-3.5 text-[#D94A43]" />
              <span>Log out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    );
  }

  // Define navigational tabs matching the CHILI POS sidebar
  // Menu (POS/Billing), Menu Management, Table Services (Tables), Reservation (Orders), Delivery (Kitchen), Accounting (Reports), Settings
  const navItems = [
    { id: 'pos', label: 'Menu & POS', icon: PosIcon, roles: ['owner', 'cashier'] },
    { id: 'menu', label: 'Menu Management', icon: MenuBookIcon, roles: ['owner'] },
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, roles: ['owner'] },
    { id: 'tables', label: 'Table Services', icon: TableServicesIcon, roles: ['owner', 'cashier'] },
    { id: 'orders', label: 'Reservation', icon: ReservationIcon, roles: ['owner', 'cashier', 'kitchen'] },
    { id: 'kitchen', label: 'Delivery', icon: DeliveryIcon, roles: ['owner', 'kitchen'] },
    { id: 'reports', label: 'Accounting', icon: AccountingIcon, roles: ['owner'] },
    { id: 'inventory', label: 'Inventory', icon: InventoryIcon, roles: ['owner'] },
    { id: 'staff', label: 'Staff', icon: StaffIcon, roles: ['owner'] },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, roles: ['owner'] }
  ];

  const allowedNavItems = navItems.filter(item => item.roles.includes(currentUser?.role || ''));

  return (
    <div className="min-h-screen bg-[#F5F6F5] text-[#171B18] flex antialiased">
      {/* ---------------------------------------------------- */}
      {/* 1. LEFT SIDEBAR (White, matching CHILI POS)          */}
      {/* ---------------------------------------------------- */}
      <aside className="w-56 bg-white border-r border-[#E7EBE8] flex flex-col justify-between hidden md:flex flex-shrink-0 sticky top-0 h-screen select-none z-30 shadow-sm">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Logo & Name */}
          <div className="p-5 pb-6 flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate('pos')}>
            <ChiliLogoIcon className="w-8 h-8 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-[#171B18] tracking-tight leading-none uppercase">
                {currentRestaurant?.name || 'CHILI POS'}
              </span>
              <span className="text-[10px] text-[#777F79] font-medium tracking-wide mt-1">
                Restaurant POS
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1.5 pt-1">
            {allowedNavItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id as NavTab)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-semibold transition-all duration-150 text-left ${
                    isActive
                      ? 'bg-[#078F36] text-white font-bold shadow-md shadow-[#078F36]/25'
                      : 'text-[#777F79] hover:text-[#171B18] hover:bg-[#F0F8F3]'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#078F36]'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: Staff Chips & Logout */}
        <div className="p-3 border-t border-[#E7EBE8] space-y-2 bg-white">
          {/* User profile chips matching the FM / AM chips in screenshot */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#F5F6F5] border border-[#E7EBE8]">
            <div className="w-6 h-6 rounded-full bg-[#D8EFDF] text-[#078F36] font-bold flex items-center justify-center text-[10px] flex-shrink-0">
              {currentUser?.name?.slice(0, 2).toUpperCase() || 'FM'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[11px] text-[#171B18] truncate">
                {currentUser?.name || 'Floyd Miles'}
              </span>
              <span className="text-[9px] text-[#777F79] capitalize leading-none -mt-0.5">
                {currentUser?.role || 'Cashier'}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[#777F79] hover:text-[#D94A43] hover:bg-red-50 rounded-xl text-xs font-semibold transition-colors"
          >
            <LogoutIcon className="w-4 h-4 text-[#777F79] group-hover:text-[#D94A43]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ---------------------------------------------------- */}
      {/* 2. MAIN CONTENT AREA                                 */}
      {/* ---------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F5F6F5]">
        {/* Mobile Header */}
        <header className="h-14 bg-white border-b border-[#E7EBE8] flex md:hidden items-center justify-between px-4 z-20 shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg bg-[#F5F6F5] text-[#171B18] border border-[#E7EBE8]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <ChiliLogoIcon className="w-7 h-7" />
            <span className="font-bold text-xs text-[#171B18]">{currentRestaurant?.name || 'CHILI POS'}</span>
          </div>

          <button
            onClick={() => onNavigate('pos')}
            className="px-3 py-1 rounded-full bg-[#078F36] text-white font-bold text-xs"
          >
            POS
          </button>
        </header>

        {/* Workspace Canvas */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. MOBILE DRAWER                                     */}
      {/* ---------------------------------------------------- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative w-64 bg-white text-[#171B18] flex flex-col justify-between p-4 z-50 border-r border-[#E7EBE8] h-full shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E7EBE8]">
                <div className="flex items-center gap-2">
                  <ChiliLogoIcon className="w-8 h-8" />
                  <span className="font-extrabold text-sm text-[#171B18]">CHILI POS</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-[#777F79] hover:text-[#171B18]">
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-4 space-y-1">
                {allowedNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id as NavTab);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-semibold ${
                        isActive
                          ? 'bg-[#078F36] text-white font-bold'
                          : 'text-[#777F79] hover:bg-[#F0F8F3]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#078F36]'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#E7EBE8]">
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 px-3 rounded-full bg-red-50 text-[#D94A43] border border-red-100 flex items-center justify-center gap-2 font-bold text-xs"
              >
                <LogoutIcon className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
