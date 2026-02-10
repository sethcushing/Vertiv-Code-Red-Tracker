import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import {
  LayoutDashboard,
  AlertTriangle,
  DollarSign,
  Grid3X3,
  List,
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
  { name: 'Code Red', href: '/code-red', icon: AlertTriangle },
  { name: 'Financial Exposure', href: '/financial', icon: DollarSign },
  { name: 'Risk Heatmap', href: '/risk-heatmap', icon: Grid3X3 },
  { name: 'All Initiatives', href: '/initiatives', icon: List },
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
    if (path === '/code-red') return 'Code Red Initiatives';
    if (path === '/financial') return 'Financial Exposure';
    if (path === '/risk-heatmap') return 'Risk Heatmap';
    if (path === '/initiatives') return 'All Initiatives';
    if (path.includes('/initiatives/new')) return 'New Initiative';
    if (path.includes('/edit')) return 'Edit Initiative';
    if (path.includes('/initiatives/')) return 'Initiative Details';
    return 'Control Tower';
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
      <aside className="fixed left-0 top-0 h-screen w-64 bg-[#1A1A1A] text-gray-300 z-50 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FE5B1B] rounded-sm flex items-center justify-center">
              <span className="text-white font-bold text-lg font-heading">V</span>
            </div>
            <div>
              <h1 className="text-white font-heading font-bold text-lg tracking-tight uppercase">
                Vertiv
              </h1>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Control Tower</p>
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
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
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
          <div className="px-4 mt-4">
            <Button
              onClick={() => navigate('/initiatives/new')}
              data-testid="nav-add-initiative"
              className="w-full bg-[#FE5B1B] hover:bg-[#E0480E] text-white rounded-sm font-semibold text-sm uppercase tracking-wide"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Initiative
            </Button>
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-800">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                data-testid="user-menu-trigger"
                className="w-full flex items-center gap-3 p-2 rounded-sm hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-700 rounded-sm flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.role}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={handleLogout}
                data-testid="logout-btn"
                className="text-red-600 cursor-pointer"
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
              <nav className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                {getBreadcrumbs().map((crumb, index, arr) => (
                  <React.Fragment key={crumb.href}>
                    <Link 
                      to={crumb.href}
                      className={index === arr.length - 1 ? 'text-gray-900 font-medium' : 'hover:text-gray-700'}
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
              <span className="text-xs text-gray-500 uppercase tracking-wider">
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
