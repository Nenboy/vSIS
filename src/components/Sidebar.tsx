import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User, CreditCard, LayoutDashboard, Users, Search,
  Settings, Layers, History, LogOut, Menu, X, UserCircle
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user, role, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { id: 'register', label: 'Register Student', icon: User, roles: ['admin'] },
    { id: 'search', label: 'Records', icon: Users, roles: ['admin'] },
    { id: 'students', label: 'Search', icon: Search, roles: ['admin'] },
    { id: 'cards', label: 'Batch Cards', icon: Layers, roles: ['admin'] },
    { id: 'activity', label: 'Activity Logs', icon: History, roles: ['admin'] },
    { id: 'my-card', label: 'My ID Card', icon: CreditCard, roles: ['student'] },
    { id: 'profile', label: 'My Profile', icon: UserCircle, roles: ['student'] },  // ✅ NEW
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'] },        // ✅ Admin only
  ];

  const visibleTabs = tabs.filter(tab => tab.roles.includes(role || 'student'));

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <>
      {/* ============ MOBILE TOP BAR ============ */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-1 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <span className="font-bold text-gray-900 text-sm">ID System</span>
        </div>
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-blue-700 font-semibold text-xs">
            {user?.email?.[0].toUpperCase()}
          </span>
        </div>
      </div>

      {/* ============ MOBILE BACKDROP ============ */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ============ SIDEBAR ============ */}
      <aside
        className={`
          group fixed top-0 left-0 h-screen z-50
          bg-white border-r border-gray-200
          flex flex-col
          transition-all duration-300 ease-in-out
          w-64
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:w-16 md:hover:w-64
        `}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <CreditCard className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <span className="font-bold text-gray-900 whitespace-nowrap opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
              ID System
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 text-gray-500 hover:bg-gray-100 rounded"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 transition-colors duration-150
                  ${isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
                title={tab.label}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer: user + logout */}
        <div className="border-t border-gray-200 p-3 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2 overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 font-medium text-xs">
                {user?.email?.[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
              <p className="text-xs text-gray-700 truncate">{user?.email}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
              Logout
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}