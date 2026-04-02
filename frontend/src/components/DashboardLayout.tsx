import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const NAV_ITEMS = [
    { name: 'Home', path: '/lobby', icon: 'home' },
    { name: 'Lobby', path: '/lobby', icon: 'sports_esports', matchExact: true },
    { name: 'Tournaments', path: '/tournaments', icon: 'emoji_events' },
    { name: 'Store', path: '/store', icon: 'shopping_bag' },
    { name: 'Inventory', path: '/inventory', icon: 'inventory_2' },
    { name: 'Social', path: '/friends', icon: 'group' },
];

export default function DashboardLayout({ children, activePage }: { children: React.ReactNode; activePage?: string }) {
    const { user, logout } = useAuth() as any;
    const { socket } = useSocket() as any;
    const navigate = useNavigate();
    const location = useLocation();

    const [showSettings, setShowSettings] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [volume, setVolume] = useState(() => (localStorage.getItem('pref_volume') ? Number(localStorage.getItem('pref_volume')) : 80));
    const [musicVolume, setMusicVolume] = useState(() => (localStorage.getItem('pref_music') ? Number(localStorage.getItem('pref_music')) : 60));
    const [vibration, setVibration] = useState(() => (localStorage.getItem('pref_vibration') === 'false' ? false : true));
    const [notifications, setNotifications] = useState(() => (localStorage.getItem('pref_notify') === 'false' ? false : true));
    const [animations, setAnimations] = useState(() => (localStorage.getItem('pref_animations') === 'false' ? false : true));

    React.useEffect(() => {
        localStorage.setItem('pref_volume', volume.toString());
        localStorage.setItem('pref_music', musicVolume.toString());
        localStorage.setItem('pref_vibration', vibration.toString());
        localStorage.setItem('pref_notify', notifications.toString());
        localStorage.setItem('pref_animations', animations.toString());
    }, [volume, musicVolume, vibration, notifications, animations]);

    const isGuest = user?.isGuest || user?.is_guest;

    const handleLogout = () => {
        if (socket) socket.disconnect();
        logout();
        navigate('/');
    };

    const resolveActive = (item: typeof NAV_ITEMS[0]) => {
        if (activePage) return item.name === activePage;
        if (item.path === '#') return false;
        if (item.name === 'Home') return false;
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
                    <a onClick={() => setShowHelp(true)} className="flex items-center gap-4 px-6 py-2 text-on-surface/50 hover:text-on-surface transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-sm">help</span>
                        <span className="font-body text-sm font-medium">Support</span>
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
                            <a onClick={() => navigate('/tournaments')} className="text-on-surface/60 font-headline font-bold tracking-tight hover:text-primary-container transition-colors duration-300 cursor-pointer">Tournaments</a>
                            <a onClick={() => setShowHelp(true)} className="text-on-surface/60 font-headline font-bold tracking-tight hover:text-primary-container transition-colors duration-300 cursor-pointer">Support</a>
                        </nav>
                    </div>
                    <div className="flex items-center gap-6">
                        {/* User Balance */}
                        <div className="flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant/20">
                            <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
                            <span className="font-headline font-bold text-primary">{user?.coins?.toLocaleString() || '0'}</span>
                            <button onClick={() => navigate('/store')} className="ml-2 bg-primary-container text-on-primary text-[10px] px-2 py-0.5 rounded-full font-black uppercase">Add Coins</button>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="text-on-surface/60 hover:text-primary-container transition-all">
                                <span className="material-symbols-outlined">notifications</span>
                            </button>
                            <button onClick={() => setShowSettings(true)} className="text-on-surface/60 hover:text-primary-container transition-all">
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

            {/* ===== SETTINGS MODAL ===== */}
            {showSettings && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}>
                    <div className="bg-surface-container w-full max-w-lg rounded-3xl p-8 border border-outline-variant/15 shadow-2xl mx-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="font-headline text-3xl font-bold text-on-surface">Settings</h2>
                            <button onClick={() => setShowSettings(false)} className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center hover:bg-surface-bright transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-8">
                            {/* Sound Effects */}
                            <section>
                                <h3 className="font-headline text-sm font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">volume_up</span> Sound Effects
                                </h3>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-on-surface">Volume</span>
                                    <span className="text-sm font-bold text-primary">{volume}%</span>
                                </div>
                                <input type="range" min="0" max="100" value={volume} onChange={e => setVolume(parseInt(e.target.value))} className="w-full accent-primary-container" />
                            </section>

                            {/* Music */}
                            <section>
                                <h3 className="font-headline text-sm font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">music_note</span> Background Music
                                </h3>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-on-surface">Music Volume</span>
                                    <span className="text-sm font-bold text-primary">{musicVolume}%</span>
                                </div>
                                <input type="range" min="0" max="100" value={musicVolume} onChange={e => setMusicVolume(parseInt(e.target.value))} className="w-full accent-primary-container" />
                            </section>

                            {/* Toggles */}
                            <section className="space-y-4">
                                <h3 className="font-headline text-sm font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">tune</span> Preferences
                                </h3>
                                {[
                                    { label: 'Vibration', value: vibration, setter: setVibration, icon: 'vibration' },
                                    { label: 'Push Notifications', value: notifications, setter: setNotifications, icon: 'notifications_active' },
                                    { label: 'Animations', value: animations, setter: setAnimations, icon: 'animation' },
                                ].map(toggle => (
                                    <div key={toggle.label} className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/10">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-on-surface-variant text-lg">{toggle.icon}</span>
                                            <span className="text-sm font-medium">{toggle.label}</span>
                                        </div>
                                        <div
                                            onClick={() => toggle.setter(!toggle.value)}
                                            className={`w-14 h-7 rounded-full relative p-1 transition-colors cursor-pointer ${toggle.value ? 'bg-primary-container' : 'bg-surface-container-high'}`}
                                        >
                                            <div className={`w-5 h-5 bg-on-surface-variant rounded-full shadow-sm transition-transform ${toggle.value ? 'translate-x-7' : ''}`}></div>
                                        </div>
                                    </div>
                                ))}
                            </section>

                            {/* Account */}
                            <section>
                                <h3 className="font-headline text-sm font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">manage_accounts</span> Account
                                </h3>
                                <div className="space-y-3">
                                    <button onClick={() => { setShowSettings(false); navigate('/profile'); }} className="w-full py-3 bg-surface-container-lowest rounded-xl border border-outline-variant/10 text-sm font-medium hover:bg-surface-container-high transition-all text-left px-4 flex items-center gap-3">
                                        <span className="material-symbols-outlined text-on-surface-variant text-lg">person</span>
                                        Edit Profile
                                    </button>
                                    <button onClick={() => { setShowSettings(false); handleLogout(); }} className="w-full py-3 bg-surface-container-lowest rounded-xl border border-error/10 text-error text-sm font-medium hover:bg-error/5 transition-all text-left px-4 flex items-center gap-3">
                                        <span className="material-symbols-outlined text-lg">logout</span>
                                        Sign Out
                                    </button>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== HELP / SUPPORT MODAL ===== */}
            {showHelp && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowHelp(false); }}>
                    <div className="bg-surface-container w-full max-w-lg rounded-3xl p-8 border border-outline-variant/15 shadow-2xl mx-4">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="font-headline text-3xl font-bold text-on-surface">Support Center</h2>
                            <button onClick={() => setShowHelp(false)} className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center hover:bg-surface-bright transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="space-y-4">
                            {[
                                { icon: 'help', title: 'How to Play', desc: 'Learn the rules for Classic and All Fives (Turbo) game modes.' },
                                { icon: 'payments', title: 'Coins & Purchases', desc: 'Questions about coins, purchases, or missing items? Check here.' },
                                { icon: 'bug_report', title: 'Report a Bug', desc: 'Found something broken? Let us know so we can fix it.' },
                                { icon: 'shield', title: 'Safety & Privacy', desc: 'How we protect your account and personal information.' },
                                { icon: 'mail', title: 'Contact Us', desc: 'Reach our support team directly via email.' },
                            ].map(item => (
                                <div key={item.title} className="flex items-start gap-4 p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/10 hover:bg-surface-container-high transition-all cursor-pointer group">
                                    <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-container/20 transition-colors">
                                        <span className="material-symbols-outlined text-primary-container">{item.icon}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-headline font-bold text-sm mb-0.5">{item.title}</h4>
                                        <p className="text-xs text-on-surface-variant">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-center text-on-surface-variant/40 text-xs mt-6">Domino Orbit v2.4.0 • support@dominoorbit.gg</p>
                    </div>
                </div>
            )}
        </div>
    );
}
