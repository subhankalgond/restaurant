import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../db/supabaseClient';
import { 
  DashboardIcon, 
  PosIcon, 
  OrdersIcon, 
  KitchenIcon, 
  TablesIcon, 
  MenuIcon, 
  InventoryIcon, 
  StaffIcon, 
  ReportsIcon, 
  SettingsIcon, 
  ShieldIcon, 
  LogoutIcon,
  CloseIcon 
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
  const { currentUser, currentRestaurant, logout, switchRoleTest } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  // Super Admin view
  if (currentUser?.role === 'superadmin') {
    return (
      <div className="min-h-screen bg-neutralBg flex flex-col antialiased">
        <header className="h-14 bg-forest-900 text-neutralBg flex items-center justify-between px-4 border-b border-forest-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-forest-700 text-white flex items-center justify-center font-bold text-xs tracking-wider">
              DF
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white">DineFlow Super Admin</span>
              <span className="text-[10px] text-charcoal-300 block -mt-0.5">Centralized Platform Control</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* Demonstration role switcher */}
            <div className="relative">
              <button
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                className="bg-forest-800 hover:bg-forest-700 text-neutralBg px-2.5 py-1 rounded text-xs flex items-center gap-1.5 border border-forest-700"
              >
                <span>Role Sandbox: <strong>Super Admin</strong></span>
                <span className="text-[10px]">&darr;</span>
              </button>
              {showRoleSwitcher && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white border border-surfaceBorder rounded shadow-md py-1 z-50 text-charcoal-900">
                  <div className="px-3 py-1 text-[10px] font-semibold text-charcoal-500 uppercase border-b border-surfaceBorder">
                    Switch Sandbox Role
                  </div>
                  {(['superadmin', 'owner', 'cashier', 'kitchen'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => {
                        switchRoleTest(r);
                        setShowRoleSwitcher(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface capitalize flex items-center justify-between"
                    >
                      <span>{r}</span>
                      {currentUser.role === r && <span className="text-[10px] text-forest-700 font-bold">&bull;</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={logout}
              className="text-neutralBg hover:text-earthRed flex items-center gap-1 px-2 py-1 rounded hover:bg-forest-800"
            >
              <LogoutIcon className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  // Define navigational tabs according to role
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, roles: ['owner'] },
    { id: 'pos', label: 'POS & Billing', icon: PosIcon, roles: ['owner', 'cashier'] },
    { id: 'orders', label: 'Orders', icon: OrdersIcon, roles: ['owner', 'cashier', 'kitchen'] },
    { id: 'kitchen', label: 'Kitchen Display', icon: KitchenIcon, roles: ['owner', 'kitchen'] },
    { id: 'tables', label: 'Table Management', icon: TablesIcon, roles: ['owner', 'cashier'] },
    { id: 'menu', label: 'Menu Management', icon: MenuIcon, roles: ['owner'] },
    { id: 'inventory', label: 'Inventory', icon: InventoryIcon, roles: ['owner'] },
    { id: 'staff', label: 'Staff Management', icon: StaffIcon, roles: ['owner'] },
    { id: 'reports', label: 'Sales Reports', icon: ReportsIcon, roles: ['owner'] },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, roles: ['owner'] }
  ];

  const allowedNavItems = navItems.filter(item => item.roles.includes(currentUser?.role || ''));

  return (
    <div className="min-h-screen bg-neutralBg flex flex-col antialiased">
      {/* Top Header */}
      <header className="h-14 bg-forest-800 text-neutralBg flex items-center justify-between px-3.5 border-b border-forest-900 shadow-xs z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded hover:bg-forest-900 text-neutralBg"
            aria-label="Toggle Navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Desktop sidebar toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex p-1.5 rounded hover:bg-forest-900 text-neutralBg"
            title="Toggle Sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h10M4 18h16" />
            </svg>
          </button>

          {/* Brand & Workspace Label */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate(currentUser?.role === 'kitchen' ? 'kitchen' : 'pos')}>
            <div className="w-7 h-7 rounded bg-forest-600 text-white flex items-center justify-center font-bold text-xs tracking-wider">
              DF
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-xs text-white tracking-wide">
                {currentRestaurant?.name || 'Restaurant Workspace'}
              </span>
              <span className="text-[10px] text-charcoal-300 font-normal">
                {currentRestaurant?.restaurantType || 'DineFlow POS'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Top Controls */}
        <div className="flex items-center gap-3 text-xs">
          {/* Cloud Sync Status Indicator */}
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium border border-forest-700 bg-forest-900/70 text-neutralBg hover:bg-forest-900 transition-colors"
            title={isSupabaseConfigured ? 'Supabase Realtime Cloud Connected' : 'Local Storage Engine. Click to configure Supabase cloud database.'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span>{isSupabaseConfigured ? 'Supabase Realtime' : 'Local DB'}</span>
          </button>

          {/* Role Sandbox Quick Switcher (Facilitates testing cashier vs owner vs kitchen) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="bg-forest-900 hover:bg-black/30 border border-forest-900 text-neutralBg px-2 py-1 rounded flex items-center gap-1.5 text-[11px]"
              title="Test permissions across staff roles"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-forest-100"></span>
              <span className="capitalize font-semibold">{currentUser?.role}</span>
              <span className="text-[9px] text-charcoal-300">&darr;</span>
            </button>

            {showRoleSwitcher && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-surfaceBorder rounded shadow-md py-1 z-50 text-charcoal-900">
                <div className="px-3 py-1 text-[10px] font-semibold text-charcoal-500 uppercase border-b border-surfaceBorder">
                  Switch Active Role Test
                </div>
                {(['owner', 'cashier', 'kitchen', 'superadmin'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => {
                      switchRoleTest(role);
                      setShowRoleSwitcher(false);
                      if (role === 'kitchen') onNavigate('kitchen');
                      else if (role === 'cashier') onNavigate('pos');
                      else if (role === 'superadmin') onNavigate('superadmin');
                      else onNavigate('dashboard');
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface flex items-center justify-between ${
                      currentUser?.role === role ? 'font-semibold text-forest-800 bg-surface' : ''
                    }`}
                  >
                    <span className="capitalize">{role === 'superadmin' ? 'Super Admin' : role}</span>
                    {currentUser?.role === role && <span className="text-[10px] text-forest-700">Active</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="hidden sm:flex items-center gap-1.5 text-charcoal-100">
            <div className="w-6 h-6 rounded-full bg-forest-700 text-white font-bold flex items-center justify-center text-[10px] border border-forest-600">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <span className="truncate max-w-[120px] font-medium text-[11px]">{currentUser?.name}</span>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={logout}
            className="text-neutralBg hover:text-earthRed flex items-center gap-1 p-1 rounded hover:bg-forest-900"
            title="Log Out"
          >
            <LogoutIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`${
            sidebarCollapsed ? 'w-14' : 'w-52'
          } hidden md:flex flex-col bg-surface border-r border-surfaceBorder transition-all duration-200 flex-shrink-0 select-none justify-between`}
        >
          {/* Navigation Links */}
          <div className="py-2.5 overflow-y-auto">
            <nav className="space-y-0.5 px-2">
              {allowedNavItems.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id as NavTab)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-xs transition-colors group relative ${
                      isActive
                        ? 'bg-forest-800 text-white font-semibold shadow-xs'
                        : 'text-charcoal-700 hover:text-charcoal-900 hover:bg-neutralBg'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-charcoal-500 group-hover:text-charcoal-900'}`} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Footer Info */}
          <div className="p-2.5 border-t border-surfaceBorder bg-neutralBg/60 text-[11px]">
            {!sidebarCollapsed ? (
              <div className="flex flex-col gap-1">
                <div className="font-semibold text-charcoal-900 truncate" title={currentRestaurant?.name}>
                  {currentRestaurant?.name}
                </div>
                <div className="flex items-center justify-between text-charcoal-500">
                  <span className="capitalize">{currentUser?.role}</span>
                  <span className="text-[10px] text-forest-700 font-mono font-semibold">Active</span>
                </div>
                <div className="pt-1 border-t border-surfaceBorder flex justify-between text-[10px] text-charcoal-500">
                  <button onClick={() => onNavigate('support')} className="hover:underline">Support</button>
                  <button onClick={() => onNavigate('terms')} className="hover:underline">Terms</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <span className="w-2 h-2 rounded-full bg-forest-700" title="Connected"></span>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Navigation Overlay Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            <div className="fixed inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)}></div>
            <div className="relative w-64 bg-surface text-charcoal-900 flex flex-col justify-between p-3 z-50 border-r border-surfaceBorder">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-surfaceBorder">
                  <div className="font-bold text-xs text-forest-800">{currentRestaurant?.name}</div>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-charcoal-500">
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>
                <nav className="mt-3 space-y-1">
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
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs ${
                          isActive ? 'bg-forest-800 text-white font-bold' : 'text-charcoal-700 hover:bg-neutralBg'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-3 border-t border-surfaceBorder">
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 text-earthRed text-xs font-semibold py-1.5"
                >
                  <LogoutIcon className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Application Area */}
        <main className="flex-1 overflow-y-auto bg-neutralBg text-charcoal-900 flex flex-col min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
