import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../db/supabaseClient';
import { 
  RestroLogoIcon,
  DashboardIcon, 
  PosIcon, 
  OrdersIcon, 
  KitchenIcon, 
  TablesIcon, 
  MenuIcon, 
  InventoryIcon, 
  CustomersIcon,
  StaffIcon, 
  ReportsIcon, 
  SettingsIcon, 
  ShieldIcon, 
  LogoutIcon,
  CloseIcon,
  SearchIcon,
  CalendarIcon,
  BellIcon,
  ChevronDownIcon
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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Super Admin view
  if (currentUser?.role === 'superadmin') {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-[#F8FAFC] flex flex-col antialiased">
        <header className="h-16 bg-[#080A0F] text-white flex items-center justify-between px-6 border-b border-[#1E2638] flex-shrink-0">
          <div className="flex items-center gap-3">
            <RestroLogoIcon className="w-8 h-8" />
            <div>
              <span className="font-bold text-base tracking-tight text-white">DineFlow Super Admin</span>
              <span className="text-[11px] text-gray-400 block -mt-0.5">Centralized Platform Control</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111622] border border-[#1E2638] text-xs text-white">
              <span className="w-2 h-2 rounded-full bg-[#00D26A]"></span>
              <span>Platform Super Admin</span>
            </div>

            <button
              onClick={logout}
              className="text-gray-300 hover:text-red-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111622] border border-[#1E2638] hover:border-red-900 transition-colors"
            >
              <LogoutIcon className="w-3.5 h-3.5" />
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

  // Sidebar navigation structure grouped exactly as in the reference design
  const navSections = [
    {
      group: '', // Main group (no header)
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, roles: ['owner'] },
        { id: 'pos', label: 'POS / New Order', icon: PosIcon, roles: ['owner', 'cashier'] },
        { id: 'orders', label: 'Orders', icon: OrdersIcon, roles: ['owner', 'cashier', 'kitchen'] },
        { id: 'tables', label: 'Tables', icon: TablesIcon, roles: ['owner', 'cashier'] },
      ]
    },
    {
      group: 'Management',
      items: [
        { id: 'menu', label: 'Menu', icon: MenuIcon, roles: ['owner'] },
        { id: 'inventory', label: 'Inventory', icon: InventoryIcon, roles: ['owner'] },
        { id: 'kitchen', label: 'Kitchen', icon: KitchenIcon, roles: ['owner', 'kitchen'] },
        { id: 'tables', label: 'Customers', icon: CustomersIcon, roles: ['owner'] }, // Reusable patron view
      ]
    },
    {
      group: 'Business',
      items: [
        { id: 'reports', label: 'Reports', icon: ReportsIcon, roles: ['owner'] },
        { id: 'staff', label: 'Staff', icon: StaffIcon, roles: ['owner'] },
      ]
    },
    {
      group: 'System',
      items: [
        { id: 'settings', label: 'Settings', icon: SettingsIcon, roles: ['owner'] },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F8FAFC] flex antialiased">
      {/* ---------------------------------------------------- */}
      {/* 1. LEFT SIDEBAR (Near-black, matching reference)     */}
      {/* ---------------------------------------------------- */}
      <aside className="w-64 bg-[#080A0F] border-r border-[#1E2638] flex flex-col justify-between hidden md:flex flex-shrink-0 sticky top-0 h-screen select-none z-30">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="p-5 pb-4 flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <RestroLogoIcon className="w-8 h-8 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-extrabold text-lg text-white tracking-tight leading-none">
                RestroPOS
              </span>
              <span className="text-[10px] text-gray-400 font-medium tracking-wide mt-1">
                Restaurant Management
              </span>
            </div>
          </div>

          {/* Navigation Links with Categorized Groups */}
          <nav className="px-3.5 space-y-4 pt-2">
            {navSections.map((section, idx) => {
              const visibleItems = section.items.filter(item => item.roles.includes(currentUser?.role || ''));
              if (visibleItems.length === 0) return null;

              return (
                <div key={idx} className="space-y-1">
                  {section.group && (
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
                      {section.group}
                    </div>
                  )}

                  {visibleItems.map(item => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;

                    return (
                      <button
                        key={item.id + (section.group || '')}
                        onClick={() => onNavigate(item.id as NavTab)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left ${
                          isActive
                            ? 'bg-[#00D26A] text-[#080A0F] font-bold shadow-lg shadow-[#00D26A]/20'
                            : 'text-gray-300 hover:text-white hover:bg-[#111622]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#080A0F]' : 'text-gray-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: Restaurant Card & User Profile */}
        <div className="p-3.5 border-t border-[#1E2638] space-y-3 bg-[#080A0F]">
          {/* Restaurant Card */}
          <div className="bg-[#111622] border border-[#1E2638] rounded-xl p-2.5 flex items-center gap-2.5">
            <img
              src="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=120&q=80"
              alt="Restaurant Thumbnail"
              className="w-10 h-10 object-cover rounded-lg border border-[#1E2638] flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs text-white truncate">
                {currentRestaurant?.name || 'Royal Bites'}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D26A]"></span>
                <span className="truncate">Open • 9:00 AM - 11:00 PM</span>
              </div>
            </div>
          </div>

          {/* User Profile Row */}
          <div className="relative">
            <div 
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center justify-between p-1.5 rounded-xl hover:bg-[#111622] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#1E2638] text-white font-bold flex items-center justify-center text-xs border border-gray-600 flex-shrink-0">
                  {currentUser?.name?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs text-white truncate">
                    {currentUser?.name || 'Admin'}
                  </span>
                  <span className="text-[10px] text-gray-400 capitalize">
                    {currentUser?.role === 'owner' ? 'Administrator' : currentUser?.role}
                  </span>
                </div>
              </div>
              <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" />
            </div>

            {/* Profile Dropdown Menu */}
            {userDropdownOpen && (
              <div className="absolute bottom-12 left-0 right-0 bg-[#111622] border border-[#1E2638] rounded-xl shadow-2xl py-1.5 z-50 text-xs">
                <div className="px-3 py-1.5 border-b border-[#1E2638] text-[10px] text-gray-400 font-semibold uppercase">
                  Signed in as {currentUser?.email}
                </div>
                <button
                  onClick={() => {
                    onNavigate('settings');
                    setUserDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-gray-200 hover:bg-[#161C2A] flex items-center gap-2"
                >
                  <SettingsIcon className="w-3.5 h-3.5 text-gray-400" />
                  <span>Restaurant Settings</span>
                </button>
                <button
                  onClick={() => {
                    onNavigate('support');
                    setUserDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-gray-200 hover:bg-[#161C2A] flex items-center gap-2"
                >
                  <ShieldIcon className="w-3.5 h-3.5 text-gray-400" />
                  <span>Support & Diagnostics</span>
                </button>
                <div className="border-t border-[#1E2638] my-1"></div>
                <button
                  onClick={() => {
                    logout();
                    setUserDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-950/30 flex items-center gap-2 font-semibold"
                >
                  <LogoutIcon className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ---------------------------------------------------- */}
      {/* 2. MAIN CONTENT COLUMN (Top Nav + Scrollable Canvas) */}
      {/* ---------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-[#0B0E14] border-b border-[#1E2638] flex items-center justify-between px-6 flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg bg-[#111622] text-gray-300 hover:text-white border border-[#1E2638]"
              aria-label="Toggle Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Global Search Field */}
            <div className="relative flex items-center w-64 sm:w-80 md:w-96">
              <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders, menu items..."
                className="w-full bg-[#111622] border border-[#1E2638] rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#00D26A] focus:ring-1 focus:ring-[#00D26A] transition-all"
              />
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Supabase Realtime Pill */}
            <div
              onClick={() => onNavigate('settings')}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111622] border border-[#1E2638] text-[11px] text-gray-300 cursor-pointer hover:border-[#00D26A] transition-colors"
              title="Cloud Database Status"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-[#00D26A] animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{isSupabaseConfigured ? 'Supabase Realtime' : 'Local Storage'}</span>
            </div>

            {/* Date Range Selector Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111622] border border-[#1E2638] text-xs text-gray-200 cursor-pointer hover:border-gray-600 transition-colors">
              <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-medium">Last 7 Days</span>
              <ChevronDownIcon className="w-3 h-3 text-gray-400 ml-0.5" />
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => onNavigate('orders')}
              className="w-9 h-9 rounded-lg bg-[#111622] border border-[#1E2638] flex items-center justify-center text-gray-300 hover:text-white relative hover:border-gray-600 transition-colors"
              title="Recent Activity"
            >
              <BellIcon className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-red-500 border border-[#0B0E14] absolute top-2 right-2"></span>
            </button>

            {/* User Avatar Circle */}
            <div 
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#1E2638] text-white font-bold flex items-center justify-center text-xs border border-gray-600">
                {currentUser?.name?.charAt(0).toUpperCase() || 'S'}
              </div>
              <ChevronDownIcon className="w-3 h-3 text-gray-400 hidden sm:block" />
            </div>
          </div>
        </header>

        {/* Scrollable Workspace Canvas */}
        <main className="flex-1 overflow-y-auto bg-[#0B0E14]">
          {children}
        </main>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. MOBILE NAVIGATION DRAWER                          */}
      {/* ---------------------------------------------------- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative w-72 bg-[#080A0F] text-white flex flex-col justify-between p-4 z-50 border-r border-[#1E2638] h-full">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#1E2638]">
                <div className="flex items-center gap-2.5">
                  <RestroLogoIcon className="w-7 h-7" />
                  <span className="font-bold text-base text-white">RestroPOS</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-white">
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-4 space-y-4">
                {navSections.map((section, idx) => {
                  const visible = section.items.filter(i => i.roles.includes(currentUser?.role || ''));
                  if (visible.length === 0) return null;

                  return (
                    <div key={idx} className="space-y-1">
                      {section.group && (
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
                          {section.group}
                        </div>
                      )}
                      {visible.map(item => {
                        const Icon = item.icon;
                        const isActive = currentTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              onNavigate(item.id as NavTab);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                              isActive
                                ? 'bg-[#00D26A] text-[#080A0F] font-bold'
                                : 'text-gray-300 hover:bg-[#111622]'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-[#080A0F]' : 'text-gray-400'}`} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#1E2638]">
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-red-950/40 text-red-400 border border-red-900/50 flex items-center justify-center gap-2 font-bold text-xs"
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
