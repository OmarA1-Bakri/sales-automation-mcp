import React from 'react';
import PropTypes from 'prop-types';
import {
  LayoutDashboard,
  MessageSquare,
  Megaphone,
  Users,
  FileUp,
  Target,
  Settings,
  Zap,
  ChevronLeft,
} from 'lucide-react';
import useStore from '../store/useStore';

/**
 * Main navigation sidebar
 * Visual, icon-based navigation for non-technical users
 */
function Sidebar() {
  const { currentView, setCurrentView, sidebarOpen, toggleSidebar, yoloMode } = useStore();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview and stats',
    },
    {
      id: 'chat',
      label: 'AI Assistant',
      icon: MessageSquare,
      description: 'Chat with AI helper',
      badge: 'NEW',
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      icon: Megaphone,
      description: 'Manage outreach',
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: Users,
      description: 'View and manage contacts',
    },
    {
      id: 'import',
      label: 'Import',
      icon: FileUp,
      description: 'Import contacts',
    },
    {
      id: 'icp',
      label: 'ICP Profiles',
      icon: Target,
      description: 'Ideal customer profiles',
    },
  ];

  const bottomNavItems = [
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'App settings',
    },
  ];

  return (
    <aside
      className={`w-64 bg-slate-950 border-r border-slate-800 flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-64'
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute right-0 top-16 transform translate-x-full bg-slate-800 p-1 rounded-r hover:bg-slate-700 transition-colors z-50"
      >
        <ChevronLeft
          size={16}
          className={`text-slate-400 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* YOLO Mode indicator */}
      {yoloMode.enabled && (
        <div className="m-4 p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <Zap size={16} className="text-green-400 animate-pulse" />
            <div className="flex-1">
              <div className="text-xs font-medium text-green-400">YOLO Mode Active</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {yoloMode.paused ? 'Paused' : 'Running'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              isActive={currentView === item.id}
              onClick={() => setCurrentView(item.id)}
            />
          ))}
        </div>
      </nav>

      {/* Bottom navigation */}
      <div className="px-3 py-4 border-t border-slate-800">
        {bottomNavItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={currentView === item.id}
            onClick={() => setCurrentView(item.id)}
          />
        ))}
      </div>
    </aside>
  );
}

function NavItem({ item, isActive, onClick }) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
        isActive
          ? 'bg-rtgs-blue text-white shadow-lg shadow-blue-500/20'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
      <div className="flex-1 text-left">
        <div className="text-sm font-medium">{item.label}</div>
        {!isActive && (
          <div className="text-xs text-slate-500 group-hover:text-slate-400">
            {item.description}
          </div>
        )}
      </div>
      {item.badge && (
        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
          {item.badge}
        </span>
      )}
    </button>
  );
}

NavItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    description: PropTypes.string.isRequired,
    badge: PropTypes.string,
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default Sidebar;
