import { useNavigate } from 'react-router-dom';

export default function Home() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background text-on-surface font-body overflow-hidden relative">
            {/* Ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary-container/5 rounded-full blur-[200px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-tertiary-container/5 rounded-full blur-[150px] pointer-events-none"></div>

            {/* Nav */}
            <nav className="fixed top-0 w-full z-50 bg-background/60 backdrop-blur-xl flex justify-between items-center px-8 md:px-16 h-20">
                <span className="text-2xl font-black text-primary-container italic font-headline tracking-tight">DOMINO ORBIT</span>
                <div className="hidden md:flex items-center gap-8 font-headline tracking-tight text-sm">
                    <a href="#features" className="text-on-surface/60 hover:text-primary transition-colors">Features</a>
                    <a href="#modes" className="text-on-surface/60 hover:text-primary transition-colors">Game Modes</a>
                    <a href="#community" className="text-on-surface/60 hover:text-primary transition-colors">Community</a>
                </div>
                <button
                    onClick={() => navigate('/')}
                    className="bg-gradient-to-r from-primary-container to-primary text-on-primary px-6 py-2.5 rounded-xl font-headline font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary-container/20"
                >
                    Play Now
                </button>
            </nav>

            {/* Hero */}
            <section className="pt-32 pb-20 px-8 md:px-16 flex flex-col items-center text-center relative z-10">
                <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">Season 4 is Live</span>
                </div>

                <h1 className="font-headline text-6xl md:text-8xl font-black tracking-tighter text-on-surface mb-6 leading-[0.9]">
                    Dominate the<br />
                    <span className="bg-gradient-to-r from-primary-container to-primary bg-clip-text text-transparent">Orbital Arena</span>
                </h1>

                <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mb-12 font-light leading-relaxed">
                    The ultimate real-time dominoes experience. Play against friends or rivals worldwide with stunning visuals, competitive rankings, and exclusive rewards.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-16">
                    <button
                        onClick={() => navigate('/')}
                        className="px-10 py-4 bg-gradient-to-r from-primary-container to-primary text-on-primary font-headline font-black text-lg rounded-2xl shadow-[0_10px_40px_rgba(255,184,0,0.3)] hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                    >
                        Start Playing
                    </button>
                    <button className="px-10 py-4 border border-outline-variant/30 text-on-surface font-headline font-bold rounded-2xl hover:bg-surface-container-high transition-all">
                        Watch Trailer
                    </button>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap justify-center gap-12">
                    {[
                        { value: '50K+', label: 'Active Players' },
                        { value: '2M+', label: 'Games Played' },
                        { value: '99.9%', label: 'Uptime' },
                    ].map(stat => (
                        <div key={stat.label} className="text-center">
                            <p className="text-3xl font-headline font-black text-primary">{stat.value}</p>
                            <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section id="features" className="py-20 px-8 md:px-16">
                <div className="max-w-6xl mx-auto">
                    <h2 className="font-headline text-4xl font-bold tracking-tighter text-center mb-4">Why Domino Orbit?</h2>
                    <p className="text-on-surface-variant text-center max-w-xl mx-auto mb-16">Everything you need for the ultimate domino experience, crafted with precision.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: 'bolt', title: 'Real-Time Multiplayer', desc: 'Play against real opponents worldwide with zero-latency matchmaking and live game state sync.' },
                            { icon: 'palette', title: 'Premium Cosmetics', desc: 'Unlock legendary tile skins, avatar frames, and visual effects to stand out on the board.' },
                            { icon: 'emoji_events', title: 'Ranked Seasons', desc: 'Climb the competitive ladder, earn seasonal rewards, and prove you are the Grandmaster.' },
                        ].map(f => (
                            <div key={f.title} className="group bg-surface-container-high/40 backdrop-blur-md p-8 rounded-3xl border border-outline-variant/10 hover:border-primary/20 hover:-translate-y-2 transition-all duration-500">
                                <div className="w-14 h-14 rounded-2xl bg-primary-container/10 flex items-center justify-center mb-6 group-hover:bg-primary-container/20 transition-colors">
                                    <span className="material-symbols-outlined text-3xl text-primary-container">{f.icon}</span>
                                </div>
                                <h3 className="font-headline text-xl font-bold mb-3">{f.title}</h3>
                                <p className="text-on-surface-variant text-sm leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Game Modes */}
            <section id="modes" className="py-20 px-8 md:px-16">
                <div className="max-w-6xl mx-auto">
                    <h2 className="font-headline text-4xl font-bold tracking-tighter text-center mb-16">Game Modes</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            { mode: 'Classic', desc: 'Traditional domino rules. Match tiles, clear your hand first, and outscore your opponents.', icon: 'style', color: 'from-primary-container to-primary' },
                            { mode: 'All Fives (Turbo)', desc: 'Score points by making the open ends of the chain add up to multiples of 5. Fast-paced action.', icon: 'bolt', color: 'from-[#17d8ff] to-tertiary' },
                        ].map(m => (
                            <div key={m.mode} className="relative overflow-hidden rounded-3xl bg-surface-container p-8 border border-outline-variant/10 group hover:-translate-y-1 transition-all">
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${m.color} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity`}></div>
                                <span className="material-symbols-outlined text-5xl text-on-surface/10 mb-4 block">{m.icon}</span>
                                <h3 className="font-headline text-2xl font-bold mb-3">{m.mode}</h3>
                                <p className="text-on-surface-variant text-sm leading-relaxed">{m.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section id="community" className="py-20 px-8 md:px-16 text-center">
                <div className="max-w-3xl mx-auto bg-surface-container-high/40 backdrop-blur-md rounded-[2.5rem] p-12 border border-outline-variant/10 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-container/10 rounded-full blur-3xl pointer-events-none"></div>
                    <h2 className="font-headline text-4xl md:text-5xl font-bold tracking-tighter mb-4">Ready to Play?</h2>
                    <p className="text-on-surface-variant mb-8 max-w-lg mx-auto">Join thousands of players in the most premium domino experience ever built. Create your account in seconds.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-12 py-4 bg-gradient-to-r from-primary-container to-primary text-on-primary font-headline font-black rounded-2xl shadow-[0_10px_40px_rgba(255,184,0,0.3)] hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                    >
                        Create Free Account
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-8 md:px-16 border-t border-outline-variant/10 text-center">
                <p className="text-on-surface-variant/40 text-sm">© 2026 Domino Orbit. All rights reserved.</p>
            </footer>
        </div>
    );
}
