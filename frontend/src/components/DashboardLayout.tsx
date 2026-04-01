import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const NAV_ITEMS = [
    { name: 'Home', path: '/lobby', icon: 'home' },
    { name: 'Lobby', path: '/lobby', icon: 'sports_esports', matchExact: true },
    { name: 'Tournaments', path: '#', icon: 'emoji_events' },
    { name: 'Store', path: '/store', icon: 'shopping_bag' },
    { name: 'Inventory', path: '/inventory', icon: 'inventory_2' },
    { name: 'Social', path: '/friends', icon: 'group' },
    { name: 'Settings', path: '#', icon: 'settings' },
];

export default function DashboardLayout({ children, activePage }: { children: React.ReactNode; activePage?: string }) {
    const { user, logout } = useAuth() as any;
    const { socket } = useSocket() as any;
    const navigate = useNavigate();
    const location = useLocation();

    const isGuest = user?.isGuest || user?.is_guest;

    const handleLogout = () => {
        if (socket) socket.disconnect();
        logout();
        navigate('/');
    };

    const resolveActive = (item: typeof NAV_ITEMS[0]) => {
        if (activePage) return item.name === activePage;
        if (item.path === '#') return false;
        if (item.name === 'Home') return false; // Home is never highlighted separately
        return location.pathname === item.path;
    };

    return (
        <div className="bg-background text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container overflow-hidden">
            {/* SideNavBar */}
            <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container shadow-2xl shadow-black/20 flex flex-col py-8 gap-4 z-50">
                {/* Profile Card */}
                <div className="px-6 mb-8">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/profile')}>
                        <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-primary-container/20 bg-surface-container-highest flex items-center justify-center">
                            <img
                                alt="Player Profile"
                                className="w-full h-full object-cover"
                                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.nickname}`}
                            />
                        </div>
                        <div>
                            <p className="font-headline font-bold text-on-surface leading-tight">{user?.nickname || 'Player'}</p>
                            <p className="font-label text-xs text-on-surface/50">
                                {isGuest ? 'Guest' : `Level ${user?.rank_level || 1}`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-2">
                    {NAV_ITEMS.map(item => {
                        const isActive = resolveActive(item);
                        return (
                            <a
                                key={item.name}
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (item.path !== '#') navigate(item.path);
                                }}
                                href={item.path}
                                className={`flex items-center gap-4 px-6 py-3 transition-all duration-200 translate-x-1 hover:translate-x-2 cursor-pointer ${
                                    isActive
                                        ? 'bg-primary-container/10 text-primary-container border-r-4 border-primary-container rounded-l-none rounded-r-lg'
                                        : 'text-on-surface/50 hover:text-on-surface hover:bg-surface-container-high'
                                }`}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                >
                                    {item.icon}
                                </span>
                                <span className="font-body text-sm font-medium">{item.name}</span>
                            </a>
                        );
                    })}
                </nav>

                {/* Bottom Actions */}
                <div className="mt-auto px-4">
                    <button
                        onClick={() => navigate('/lobby')}
                        className="w-full bg-gradient-to-r from-primary-container to-primary text-on-primary font-headline font-bold py-3 rounded-xl hover:scale-[1.02] active:opacity-80 transition-all"
                    >
                        Play Now
                    </button>
                </div>
                <div className="mt-4 border-t border-outline-variant/10 pt-4 space-y-1">
                    <a onClick={() => {}} className="flex items-center gap-4 px-6 py-2 text-on-surface/50 hover:text-on-surface transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-sm">help</span>
                        <span className="font-body text-sm font-medium">Help</span>
                    </a>
                    <a onClick={handleLogout} className="flex items-center gap-4 px-6 py-2 text-on-surface/50 hover:text-on-surface transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-sm">logout</span>
                        <span className="font-body text-sm font-medium">Logout</span>
                    </a>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="ml-64 min-h-screen flex flex-col relative">
                {/* TopNavBar */}
                <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl flex justify-between items-center w-full px-8 py-4">
                    <div className="flex items-center gap-8">
                        <h1 className="text-2xl font-black text-primary-container italic font-headline tracking-tight">DOMINO ORBIT</h1>
                        <nav className="hidden md:flex items-center gap-6">
                            <a onClick={() => navigate('/store')} className="text-on-surface/60 font-headline font-bold tracking-tight hover:text-primary-container transition-colors duration-300 cursor-pointer">Shop</a>
                            <a className="text-on-surface/60 font-headline font-bold tracking-tight hover:text-primary-container transition-colors duration-300 cursor-pointer">VIP</a>
                            <a className="text-on-surface/60 font-headline font-bold tracking-tight hover:text-primary-container transition-colors duration-300 cursor-pointer">Support</a>
                        </nav>
                    </div>
                    <div className="flex items-center gap-6">
                        {/* User Balance */}
                        <div className="flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant/20">
                            <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
                            <span className="font-headline font-bold text-primary">{user?.coins?.toLocaleString() || '0'}</span>
                            <button className="ml-2 bg-primary-container text-on-primary text-[10px] px-2 py-0.5 rounded-full font-black uppercase">Add Coins</button>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="text-on-surface/60 hover:text-primary-container transition-all">
                                <span className="material-symbols-outlined">notifications</span>
                            </button>
                            <button onClick={() => navigate('/profile')} className="text-on-surface/60 hover:text-primary-container transition-all">
                                <span className="material-symbols-outlined">settings</span>
                            </button>
                            <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center p-0.5 cursor-pointer" onClick={() => navigate('/profile')}>
                                <img
                                    alt="User avatar"
                                    className="w-full h-full object-cover rounded-full"
                                    src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.nickname}`}
                                />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-8 flex-1 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
