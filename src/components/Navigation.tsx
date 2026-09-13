import { useAuth } from '../context/AuthContext';
import { User, CreditCard, LayoutDashboard, Users, Search, Settings, Layers, History, LogOut } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  // ✅ Destructure 'signOut' along with 'user' and 'role'
  const { user, role, signOut } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { id: 'register', label: 'Register', icon: User, roles: ['admin'] },
    { id: 'search', label: 'Records', icon: Users, roles: ['admin'] },
    { id: 'students', label: 'Search', icon: Search, roles: ['admin'] },
    { id: 'cards', label: 'Batch Cards', icon: Layers, roles: ['admin'] },
    { id: 'activity', label: 'Activity Logs', icon: History, roles: ['admin'] },
    { id: 'my-card', label: 'My ID Card', icon: CreditCard, roles: ['student'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'] },
  ];

  const visibleTabs = tabs.filter(tab => tab.roles.includes(role || 'student'));

  const handleLogout = async () => {
    try {
      await signOut(); // This clears the session and triggers the Login screen
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand */}
          <div className="flex items-center space-x-2">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-gray-900 text-lg hidden sm:inline">
              ID
            </span>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex items-center space-x-1">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`
                    relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    flex items-center space-x-2
                    ${isActive 
                      ? 'text-blue-700 bg-blue-50' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right side - User info & Logout */}
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-700 font-medium text-xs">
                    {user.email?.[0].toUpperCase()}
                  </span>
                </div>
                <span className="hidden sm:inline text-gray-600 max-w-[150px] truncate">
                  {user.email}
                </span>
              </div>
            )}
            
            {/* ✅ Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Tabs (horizontal scroll) */}
        <div className="md:hidden overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
          <div className="flex space-x-2 min-w-max">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap
                    flex items-center space-x-1
                    ${isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  <Icon className="h-3 w-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}