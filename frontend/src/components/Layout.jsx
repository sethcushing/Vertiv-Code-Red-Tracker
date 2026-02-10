import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import {
  LayoutDashboard,
  Target,
  Layers,
  Calendar,
  GitBranch,
  AlertTriangle,
  Plus,
  LogOut,
  User,
  ChevronRight,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const navigation = [
  { name: 'Executive Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Enterprise Metrics', href: '/enterprise-metrics', icon: Target },
  { name: 'Initiatives', href: '/initiatives', icon: Layers },
  { name: 'Milestones', href: '/milestones', icon: Calendar },
  { name: 'Pipeline Process', href: '/pipeline', icon: GitBranch },
  { name: 'Risk', href: '/risk-heatmap', icon: AlertTriangle },
];

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get page title from path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Executive Dashboard';
    if (path === '/enterprise-metrics') return 'Enterprise Metrics';
    if (path.includes('/enterprise-metrics/')) return 'Metric Details';
    if (path === '/pipeline') return 'Pipeline Process';
    if (path === '/milestones') return 'All Milestones';
    if (path === '/risk-heatmap') return 'Risk Heatmap';
    if (path === '/initiatives') return 'All Initiatives';
    if (path.includes('/initiatives/new')) return 'New Initiative';
    if (path.includes('/edit')) return 'Edit Initiative';
    if (path.includes('/initiatives/')) return 'Initiative Details';
    return 'Code Red Initiatives';
  };

  // Get breadcrumbs
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const crumbs = [{ name: 'Home', href: '/' }];
    
    if (path.includes('/initiatives')) {
      crumbs.push({ name: 'Initiatives', href: '/initiatives' });
      if (path.includes('/new')) {
        crumbs.push({ name: 'New', href: path });
      } else if (path.includes('/edit')) {
        crumbs.push({ name: 'Edit', href: path });
      } else if (path !== '/initiatives') {
        crumbs.push({ name: 'Details', href: path });
      }
    } else if (path.includes('/enterprise-metrics')) {
      crumbs.push({ name: 'Enterprise Metrics', href: '/enterprise-metrics' });
      if (path !== '/enterprise-metrics') {
        crumbs.push({ name: 'Details', href: path });
      }
    } else if (path !== '/' && path !== '/dashboard') {
      const nav = navigation.find(n => n.href === path);
      if (nav) {
        crumbs.push({ name: nav.name, href: path });
      }
    }
    
    return crumbs;
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 text-gray-300 z-50 flex flex-col" style={{ background: 'linear-gradient(180deg, #1F1F1F 0%, #171717 100%)' }}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl font-heading">V</span>
            </div>
            <div>
              <h1 className="text-white font-heading font-bold text-lg tracking-tight">
                VERTIV
              </h1>
              <p className="text-xs text-gray-500">Control Tower</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href === '/dashboard' && location.pathname === '/');
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex items-center gap-3 px-4 py-3.5 mx-3 rounded-xl text-sm font-lato-regular transition-all duration-300 ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                style={isActive ? { background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' } : {}}
              >
                <Icon className="w-5 h-5" />
                {item.name}
                {item.name === 'Code Red' && (
                  <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </Link>
            );
          })}

          {/* Add Initiative Button */}
          <div className="px-4 mt-6">
            <Button
              onClick={() => navigate('/initiatives/new')}
              data-testid="nav-add-initiative"
              className="w-full text-white rounded-xl font-lato-bold text-sm py-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Initiative
            </Button>
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-800/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                data-testid="user-menu-trigger"
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all duration-300"
              >
                <div className="w-9 h-9 bg-gray-700 rounded-xl flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm text-white truncate font-lato-regular">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate font-lato-light">{user?.role}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={handleLogout}
                data-testid="logout-btn"
                className="text-red-600 cursor-pointer font-lato-regular"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-1 text-sm text-gray-500 mb-1 font-lato-light">
                {getBreadcrumbs().map((crumb, index, arr) => (
                  <React.Fragment key={crumb.href}>
                    <Link 
                      to={crumb.href}
                      className={index === arr.length - 1 ? 'text-gray-900 font-lato-regular' : 'hover:text-gray-700'}
                    >
                      {crumb.name}
                    </Link>
                    {index < arr.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </React.Fragment>
                ))}
              </nav>
              <h1 className="text-2xl font-heading font-bold text-gray-900 uppercase tracking-tight">
                {getPageTitle()}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-lato-light">
                Enterprise Initiative Control Tower
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
