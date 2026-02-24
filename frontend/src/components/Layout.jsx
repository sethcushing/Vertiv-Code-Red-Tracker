import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import {
  LayoutDashboard,
  TrendingUp,
  User,
  ChevronRight,
  BarChart3,
  Truck,
  Settings,
} from 'lucide-react';

const navigation = [
  { name: 'Code Red Pipeline', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Business Outcomes - demo', href: '/business-outcomes', icon: TrendingUp },
  { name: 'Delivery Pipeline', href: '/delivery-pipeline', icon: Truck },
  { name: 'Admin Settings', href: '/admin/settings', icon: Settings },
];

const Layout = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();

  // Get page title from path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Code Red Pipeline';
    if (path === '/delivery-pipeline') return 'Delivery Pipeline';
    if (path === '/business-outcomes') return 'Business Outcomes';
    if (path === '/admin/settings') return 'Admin Settings';
    if (path.includes('/projects/')) return 'Project Details';
    if (path.includes('/strategic-initiatives/new')) return 'New Initiative';
    if (path.includes('/strategic-initiatives/')) return 'Initiative Details';
    return 'Code Red Initiatives';
  };

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
    <div className="min-h-screen bg-gradient-mesh">
      {/* Sidebar - Glassmorphism Dark */}
      <aside className="fixed left-0 top-0 h-screen w-56 z-50 flex flex-col shadow-glass-xl" style={{ background: 'linear-gradient(180deg, rgba(31,31,31,0.98) 0%, rgba(23,23,23,0.99) 100%)', backdropFilter: 'blur(20px)' }}>
        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-xl flex items-center justify-center shadow-lg shadow-[#FE5B1B]/30">
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
        <nav className="flex-1 py-4 overflow-y-auto px-2">
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
                className={`flex items-center gap-2.5 px-3 py-2.5 mb-1 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'text-white shadow-lg shadow-[#FE5B1B]/25'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
                style={isActive ? { background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' } : {}}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-white/5">
          <div className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5">
            <div className="w-8 h-8 bg-gradient-to-br from-[#FE5B1B] to-[#E0480E] rounded-lg flex items-center justify-center shadow-md">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm text-white truncate font-medium">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.role || 'admin'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-56 min-h-screen">
        {/* Header - Glassmorphism */}
        <header className="sticky top-0 z-40 mx-4 mt-4 rounded-2xl shadow-glass" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)' }}>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-1 text-xs text-gray-500 mb-0.5 font-light">
                {getBreadcrumbs().map((crumb, index, arr) => (
                  <React.Fragment key={crumb.href}>
                    <Link 
                      to={crumb.href}
                      className={index === arr.length - 1 ? 'text-gray-900 font-medium' : 'hover:text-gray-700'}
                    >
                      {crumb.name}
                    </Link>
                    {index < arr.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                    )}
                  </React.Fragment>
                ))}
              </nav>
              <h1 className="text-xl font-bold text-gray-900 uppercase tracking-tight">
                {getPageTitle()}
              </h1>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
