import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import {
  LayoutDashboard,
  TrendingUp,
  User,
  ChevronRight,
  BarChart3,
  Gauge,
  Truck,
} from 'lucide-react';

const navigation = [
  { name: 'Executive Dashboard', href: '/executive', icon: Gauge },
  { name: 'Code Red Pipeline', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Business Outcomes', href: '/business-outcomes', icon: TrendingUp },
  { name: 'Delivery Pipeline', href: '/delivery-pipeline', icon: Truck },
  { name: 'Reporting', href: '/reporting', icon: BarChart3 },
];

const Layout = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();

  // Get page title from path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/executive') return 'Executive Dashboard';
    if (path === '/' || path === '/dashboard') return 'Code Red Pipeline';
    if (path === '/delivery-pipeline') return 'Delivery Pipeline';
    if (path === '/business-outcomes') return 'Business Outcomes';
    if (path === '/reporting') return 'Reporting Dashboard';
    if (path.includes('/projects/')) return 'Project Details';
    if (path.includes('/strategic-initiatives/new')) return 'New Initiative';
    if (path.includes('/strategic-initiatives/')) return 'Initiative Details';
    return 'Code Red Initiatives';
  };

  const isAdmin = user?.role === 'admin';

  // Get breadcrumbs
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const crumbs = [{ name: 'Home', href: '/' }];
    
    if (path.includes('/projects/')) {
      crumbs.push({ name: 'Project', href: path });
    } else if (path.includes('/strategic-initiatives/new')) {
      crumbs.push({ name: 'New Initiative', href: path });
    } else if (path.includes('/strategic-initiatives/')) {
      crumbs.push({ name: 'Initiative', href: path });
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
      <aside className="fixed left-0 top-0 h-screen w-56 text-gray-300 z-50 flex flex-col" style={{ background: 'linear-gradient(180deg, #1F1F1F 0%, #171717 100%)' }}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm font-heading">CR</span>
            </div>
            <div>
              <h1 className="text-white font-heading font-bold text-sm tracking-tight">
                CODE RED
              </h1>
              <p className="text-[10px] text-gray-500">Initiatives</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href === '/dashboard' && location.pathname === '/') ||
              (item.href === '/business-outcomes' && location.pathname.startsWith('/business-outcomes'));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex items-center gap-2.5 px-3 py-2.5 mx-2 rounded-lg text-sm font-lato-regular transition-all duration-300 ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                style={isActive ? { background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' } : {}}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
          
          {/* Admin Navigation - Only show for admins */}
          {isAdmin && (
            <>
              <div className="mx-3 my-3 border-t border-gray-800/50" />
              <p className="px-5 text-[10px] text-gray-500 uppercase tracking-wider mb-2">Admin</p>
              {adminNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`flex items-center gap-2.5 px-3 py-2.5 mx-2 rounded-lg text-sm font-lato-regular transition-all duration-300 ${
                      isActive
                        ? 'text-white shadow-lg'
                        : 'text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                    style={isActive ? { background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' } : {}}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-gray-800/50">
          <div 
            className="w-full flex items-center gap-2.5 p-2.5 rounded-lg"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-lg flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm text-white truncate font-lato-regular">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.role || 'admin'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-56 min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-5 py-3">
          <div className="flex items-center justify-between">
            <div>
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-1 text-xs text-gray-500 mb-0.5 font-lato-light">
                {getBreadcrumbs().map((crumb, index, arr) => (
                  <React.Fragment key={crumb.href}>
                    <Link 
                      to={crumb.href}
                      className={index === arr.length - 1 ? 'text-gray-900 font-lato-regular' : 'hover:text-gray-700'}
                    >
                      {crumb.name}
                    </Link>
                    {index < arr.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                    )}
                  </React.Fragment>
                ))}
              </nav>
              <h1 className="text-xl font-heading font-bold text-gray-900 uppercase tracking-tight">
                {getPageTitle()}
              </h1>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-5">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
