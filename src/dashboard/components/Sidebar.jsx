import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    Wallet,
    Coins,
    LayoutDashboard, 
    Calendar, 
    PlusCircle, 
    UserPlus, 
    Users, 
    CreditCard, 
    IdCard, 
    BarChart3, 
    Trophy, 
    Bell, 
    Shield, 
    Settings, 
    FileText,
    BookOpen,
    LogOut 
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { selectUnreadCount } from '../../store/slices/notificationsSlice';

const Sidebar = ({ isOpen, setIsOpen }) => {
    const { logout } = useAuth();
    // The same count the bell shows; the bell keeps it fresh.
    const unread = useSelector(selectUnreadCount);

    const menuItems = [
        { path: '/dashboard', name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
        { path: '/dashboard/my-events', name: 'My Events', icon: <Calendar className="w-5 h-5" /> },
        { path: '/events/create', name: 'Create Event', icon: <PlusCircle className="w-5 h-5" /> },
        { path: '/dashboard/forms', name: 'Forms', icon: <FileText className="w-5 h-5" /> },
        { path: '/events/registrations', name: 'Registrations', icon: <UserPlus className="w-5 h-5" /> },
        { path: '/dashboard/payments', name: 'Payments', icon: <CreditCard className="w-5 h-5" /> },
        { path: '/dashboard/wallet', name: 'RegX Paisa', icon: <Coins className="w-5 h-5" /> },
        { path: '/dashboard/payouts', name: 'Payouts', icon: <Wallet className="w-5 h-5" /> },
        { path: '/dashboard/certificates', name: 'ID Cards & Certificates', icon: <IdCard className="w-5 h-5" /> },
        { path: '/dashboard/reports', name: 'Reports & Exports', icon: <BarChart3 className="w-5 h-5" /> },
        { path: '/dashboard/operations', name: 'Tournament Operations', icon: <Trophy className="w-5 h-5" /> },
        { path: '/dashboard/notifications', name: 'Notifications', icon: <Bell className="w-5 h-5" />, badge: unread > 0 ? (unread > 99 ? '99+' : unread) : null },
        { path: '/dashboard/team-permissions', name: 'Team & Permissions', icon: <Shield className="w-5 h-5" /> },
        { path: '/dashboard/guide', name: 'Guide', icon: <BookOpen className="w-5 h-5" /> },
        { path: '/dashboard/settings', name: 'Profile & Settings', icon: <Settings className="w-5 h-5" /> },
    ];

    const baseClass = "flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors mb-1";
    const activeClass = "bg-regx-orange/10 text-regx-orange";
    const inactiveClass = "text-gray-600 hover:bg-gray-100 hover:text-gray-900";

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
            
            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
                <div className="h-16 flex items-center px-6 border-b border-gray-200">
                    <span className="text-2xl font-bold font-display text-regx-dark">
                        Reg<span className="text-regx-orange">X</span>
                    </span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <nav className="flex flex-col">
                        {menuItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/dashboard'}
                                onClick={() => setIsOpen(false)}
                                className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}
                            >
                                {item.icon}
                                <span className="text-sm flex-1">{item.name}</span>
                                {item.badge && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {item.badge}
                                    </span>
                                )}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div className="p-4 border-t border-gray-200">
                    {/* <div className="bg-gradient-to-br from-regx-dark to-gray-900 rounded-xl p-4 mb-4 border border-gray-800">
                        <div className="flex items-center gap-2 text-yellow-400 mb-2">
                            <Trophy className="w-5 h-5" />
                            <span className="font-bold text-sm">Upgrade to Pro</span>
                        </div>
                        <p className="text-xs text-gray-300 mb-3">Unlock more events, teams and advanced features.</p>
                        <button className="w-full bg-regx-orange text-white text-sm font-medium py-2 rounded-lg hover:bg-orange-600 transition-colors">
                            Upgrade Now
                        </button>
                    </div> */}

                    <button 
                        onClick={logout}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left text-sm"
                    >
                        <LogOut className="w-5 h-5" />
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
