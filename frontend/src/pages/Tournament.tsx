import DashboardLayout from '../components/DashboardLayout';

const TOURNAMENTS = [
    {
        id: 't1',
        name: 'Orbit Grand Prix',
        status: 'live',
        mode: 'Classic',
        entryFee: 5000,
        prize: 100000,
        players: 128,
        maxPlayers: 128,
        startsAt: 'Live Now',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSbrfNLuwzCvA0E9ViyS4H097OJXIl8TxSpeaLF3iIP_Xj24E2-xJVrKs5wUa6AAD9qg5j0md9CftXoVbRF-lxpn2Lo1D8Ae-wAohCWDvxDuk5TCBR7DDrho3Im3rg5cCEphMb20eKMIbPzaWIg39NiMEKsQNTk546KU3_D3ncgOP1LzvMxJTqMLcECKgyIyy210fV1Ltu3xxjo-1BRVRBXgyMQzpv19GqbfUzCx9hDuyikAgKD97j9t57nX06DlU8x41ECzfS2fY',
    },
    {
        id: 't2',
        name: 'Turbo Blitz Championship',
        status: 'upcoming',
        mode: 'All Fives',
        entryFee: 10000,
        prize: 250000,
        players: 64,
        maxPlayers: 256,
        startsAt: 'Starts in 2h 30m',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAyOpj9k2POutfnxbWxh9fIEr63q42vFCZuejbKJMP3CltBq19Dqx4dM4IBUv13J9GNHwnWqsC0gcIxCjTlAVdUFPbZtNF2cEgoF8gwuUItn2R3vTiIYf_kQpgtaqd50MYtZD5CpFUj-o9Gh1zQgE8ncGTYUHSdi2EfFKDsA45RIzOVndfbYJJMr88M-kzk8ZIm_vp0KZNNy3eqFZ565KLDwe-venD0CIL49l0lOP3OGHzfXPXzFxjfJ7XYKhwc-1oufrI0C7XTJgc',
    },
    {
        id: 't3',
        name: 'Celestial Showdown',
        status: 'upcoming',
        mode: 'Classic',
        entryFee: 2000,
        prize: 50000,
        players: 32,
        maxPlayers: 64,
        startsAt: 'Starts in 6h',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPeWClc3YS66pXPc7FwAGjyvABo7UjGyhyIA_nYTDKjneN5HNvIF5VW5vnQOxyxrdEEUlCvsfFmHf8AbI0t1YKtrgLfElXiZskPnwqhopYRJBCf5NfJjBZIDWrck6sy7wZOVUkZy_u2KmXJ5UtGYgN0QpuYVOkAdpnXYcaWApTEnvLd7ftmKhT6HCfuSiVyaERZ-hNqsb7ySpV0Bopn-T_R9DIPo-cyhcUFCu-LZyKKJqhz9pjBoGJtAh5SVDVFUcMRr-WwXK6Zrw',
    },
    {
        id: 't4',
        name: 'Weekly Grind',
        status: 'completed',
        mode: 'Classic',
        entryFee: 500,
        prize: 15000,
        players: 256,
        maxPlayers: 256,
        startsAt: 'Ended Yesterday',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD61WiTSMjpPekPjyFCzLsDirEtzDHliaYUAxHRhKRuii-EqIApviGHektzRJqRce--aKxUEYq0Fm3h9uiYcEK9Pm3ODq3zYQ_EfVh5Ui4_Q9n2MzDd1QIDZeAYaniWKlMhhuFH8q_I7xExEm7Jbyovytd-z82lglwnxAPL-EBxM6SnRE7LGxvMGnvp2Mz4MYxBzK55DIJWZmDdOLrL6u_ib7f1OMHqQpCulxN-qflP9jbphIc47c5ZhYCIrfH34g4Vr_0jCnz-8Xw',
    },
];

export default function Tournament() {
    return (
        <DashboardLayout activePage="Tournaments">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-12 relative">
                    <div className="absolute -top-12 -right-12 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
                    <h1 className="font-headline text-5xl md:text-6xl font-bold tracking-tighter text-on-surface mb-2">Tournaments</h1>
                    <p className="text-on-surface-variant max-w-lg font-light tracking-wide">Compete in high-stakes bracket events for massive prize pools and legendary glory.</p>
                </header>

                {/* Status Filters */}
                <div className="flex flex-wrap gap-4 mb-10 overflow-x-auto pb-2">
                    {['All', 'Live', 'Upcoming', 'Completed'].map(f => (
                        <button key={f} className={`px-8 py-3 rounded-full border font-medium text-sm transition-all ${f === 'All' ? 'border-primary/40 bg-primary/10 text-primary font-bold' : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:text-on-surface'}`}>
                            {f}
                        </button>
                    ))}
                </div>

                {/* Featured Tournament (Live) */}
                {TOURNAMENTS.filter(t => t.status === 'live').map(t => (
                    <section key={t.id} className="relative overflow-hidden rounded-[2.5rem] bg-surface-container h-80 flex items-center border border-primary/20 mb-12 group">
                        <div className="absolute top-0 right-0 w-1/2 h-full opacity-30 mix-blend-screen">
                            <img alt={t.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={t.image} />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-surface-container via-surface-container/80 to-transparent"></div>
                        <div className="relative z-10 pl-12 pr-6 max-w-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_12px_rgba(255,184,0,0.8)]"></div>
                                <span className="text-xs font-black text-primary tracking-[0.4em] uppercase">Live Now</span>
                            </div>
                            <h2 className="font-headline text-4xl md:text-5xl font-bold mb-3 tracking-tight">{t.name}</h2>
                            <div className="flex flex-wrap items-center gap-6 mb-6">
                                <div>
                                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Prize Pool</p>
                                    <p className="text-2xl font-headline font-black text-primary">{t.prize.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Players</p>
                                    <p className="text-lg font-headline font-bold">{t.players}/{t.maxPlayers}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Mode</p>
                                    <p className="text-lg font-headline font-bold">{t.mode}</p>
                                </div>
                            </div>
                            <button className="bg-gradient-to-r from-primary-container to-primary px-8 py-3 rounded-xl font-bold text-on-primary shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all">
                                Spectate Live
                            </button>
                        </div>
                    </section>
                ))}

                {/* Tournament Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {TOURNAMENTS.filter(t => t.status !== 'live').map(t => {
                        const isCompleted = t.status === 'completed';
                        return (
                            <div key={t.id} className={`group relative overflow-hidden rounded-[2rem] bg-surface-container-high transition-all duration-500 hover:-translate-y-2 ${isCompleted ? 'opacity-60 hover:opacity-100' : 'hover:bg-surface-container-highest'}`}>
                                <div className="h-40 relative">
                                    <img alt={t.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={t.image} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-surface-container-high/40 to-transparent"></div>
                                    <div className="absolute top-4 left-4">
                                        <span className={`inline-block text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase ${
                                            t.status === 'upcoming'
                                                ? 'bg-tertiary-container/20 text-tertiary border border-tertiary/30'
                                                : 'bg-surface-container-highest text-on-surface-variant'
                                        }`}>
                                            {t.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-4 left-6">
                                        <h3 className="text-xl font-headline font-bold text-on-surface">{t.name}</h3>
                                        <p className="text-xs text-on-surface-variant">{t.startsAt}</p>
                                    </div>
                                </div>
                                <div className="p-6 pt-2">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Prize Pool</p>
                                            <div className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
                                                <span className="text-xl font-headline font-black text-primary tracking-tight">{t.prize.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Entry</p>
                                            <span className="text-sm font-headline font-bold">{t.entryFee.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="w-full h-1.5 bg-surface-container-lowest rounded-full mb-2">
                                        <div className="h-full bg-gradient-to-r from-primary-container to-primary rounded-full transition-all" style={{ width: `${(t.players / t.maxPlayers) * 100}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-on-surface-variant mb-4">
                                        <span>{t.players}/{t.maxPlayers} players</span>
                                        <span>{t.mode}</span>
                                    </div>
                                    <button
                                        disabled={isCompleted}
                                        className={`w-full py-3 rounded-xl font-headline font-bold text-sm transition-all ${
                                            isCompleted
                                                ? 'bg-surface-container-lowest text-on-surface/30 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-primary-container to-primary text-on-primary hover:shadow-lg hover:shadow-primary-container/20 active:scale-95'
                                        }`}
                                    >
                                        {isCompleted ? 'View Results' : 'Register'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
}
