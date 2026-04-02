import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';

const ALL_ITEMS: Record<string, { name: string; type: string; rarity: string; rarityColor: string; image: string }> = {
    classic: { name: 'Standard White', type: 'domino', rarity: 'Common', rarityColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAX3IOalyzDeHrNsu_SnJmvvEyIciYnLWzummik6_rdNeG2di6VqIfcOhE4QaZIQ9hDdVa9DGFNUwBzChhyGLFCn0VvXuMdH7EdBsSsKg76WWPkK8XADsZwj91GO4Xhd-zLzhpcqFEBtfLx9miA63eeEsjQnM8GwKobac-2789cXlYYg3AeuI72TmKlbMqxAzuNXiXrBFDS0ufUeSWFxeacZbtBE5MsqN_-xbm9J3o5SOIXO8stUDyUpqFtZne56H9U73DlExJOECc' },
    midnight: { name: 'Nebula Frame', type: 'domino', rarity: 'Epic', rarityColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdcn16hxHf88pAm0Kpbfol-r4ww2qBjp7KU11_9j2XOM9v-K21UvrDXxEL3_ubXPIk0sZG6DU_pFCBmsRsjMLScryMilcsgK340UCG27e5XsTvRX3mF8Lg_OeYjx5a7HXifvNdF-8mTxaloSzNdWzps0Pc8mErdScdG22OY1ojrxoZOjwUPUD9G1AI4GSEEt0pWeEUTCSixzEIJmha_kNZ8z26Bxz1GpEItqV0f2LAI4sLxVEaohe9C6CPyd6PRqpkE0PPMmg1XUI' },
    emerald: { name: 'Void Spark Effect', type: 'domino', rarity: 'Rare', rarityColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAU9yLOSkroR815wdGTaPdcv-kcNFVV_xfps5o_72QTGen-Xgq3UZspMGyjSc1Fx-Lh1qK4oKzIvFsf2iRB1gh0hrugcbH8ZH8D6ZbQumHbtBL3Mwid03DJ48aC1F98Fr2K0qt1_TogaUtT3iD5TZ-Bs62abE2MmlPekUV4xqQ0jDNmAjtIuYpFmixxRm1kT9dj5nEvu-Un39-1Xp6e3-pC79py1jHUnGy4pRh9LoS-sa8LqY8Ufp1ZAQVNEQfZBZikjtgJ8tvZ1d8' },
    crimson: { name: 'Obsidian Shard', type: 'domino', rarity: 'Epic', rarityColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDDuaAKEL4WsLJvbLfFejV034Ak0J4KW2aEfGMDq7eZbQdbubKdaF1jhSmrmJQza4f_pdpOXjXVPDxrgmmyTAtL6YjyaL1kJG_Un6jEKG5LTomz-1QG-O1Fmoz09q4S51gNqfQxmo9qacKOs593SM4ktUJtMZTOcq4Dd-n2L56Ds_LF4YN9AdSbvQkWCaS3YPninzjyRA6GLPdiZlFFhf0DGvhTQwzQXZJ52KlNJHQKZt57__UWZpMSxMAH0tlKsil94eT6i_ydG5M' },
    gold: { name: 'Golden Galaxy Tiles', type: 'domino', rarity: 'Legendary', rarityColor: 'bg-primary/20 text-primary border-primary/30', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRTTLZ48oywC1PrXwFMqo9VUaPGYs9Dd8U6iRneYx5h9E_KIPDD-A85dROFBAaT3VwFQfVO3JuyY05heweF_dpLCpSe2N9wNVFC077W50yekUd6kfp4OOmkNwJ7cHH5dfJZrWqPwYmb1BOa5kJ3IsQeTwzlZ-b_AXvOYGm-fWwVogQ7S2lJJc5bmg4FZbskSRSu56hUpihRXg_TnC5RAnWywXFSVPHRbzhIP19CM8rwnkkmNeiL_VOpWCdb-0gEOFB5kZFc9oNNRo' },
    purple: { name: 'Supernova Burst', type: 'domino', rarity: 'Legendary', rarityColor: 'bg-primary/20 text-primary border-primary/30', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFqJHI0aTAHJ9QhmccgEH48gL-FDudix529NU9SG_XY0G7OhRIsIukhpEvEzrjObHElyG6pAIr007Xdn1pCHWH3tcB2sI8JSvw6Ga3pgyapgiWXTmvjTvT6VJLlgQE_9smWGL2bosWjqJhIDKyYIEO0EeeU7jVYYGjkF8BlqZ38OJiT5C5AxnADfDdxB_o3IOqiWumJ4cUvEu4y5eTCVlqvSJDI5n6GdiVnZBrdmC9xt02Sfdp_oXXoWYGBtN0tLbO-WPefQhe1h0' },
    dark: { name: 'Slate Minimal Tiles', type: 'table', rarity: 'Common', rarityColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpDdajVqhMRE4hbfXTlPYteTsWG3rEMm12t_2en--asOaXjWFLjbGwHQaXyOPYdTovO3QoDbyI9Uy5NJycc8MN6QBLXpDaKRW5DqrEcumDX7fLoD5yZpub7WLAKeWhoRFTcM9esItXd1tf7KUoNDWHQNg4Wic0MklM4peQEWd04MU6cYZ334UsTHEMfs2y68UxbubCCrv_JAA3pAb6OxzutJKkI7RviKEvRTOj2kcVmhVKgT-tJWFj_Kh57Ud2JA_xB0Zx6ON5OB8' },
    ocean: { name: 'Cyber Grid Frame', type: 'table', rarity: 'Rare', rarityColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoczHtVAxwnH20F0CV-5dPWmCkTghytZpkzbmHBensgxWHMTvLHwl_DnsfZKxBwsYlUa65v8TJcTR19-phdWwR1y60AKaalhBGq54AxHlaYYC8yNCdwlvBJQD7ndl6lTUgtksIJIU1SE7UeLvB2khic5QjhosenpZ-8HuKpA8EHbLRook5pIAvc0Ljc563SlYPJmkzrezyhHBU41rwkzYcGp7t6fJbXr-ck7P9UeZT11gEeoWE9oFdsmuNMSiV9FqFqMCG2UCl848' },
};

const CATEGORIES = ['All', 'Tiles', 'Frames', 'Emotes', 'Effects'];

export default function Inventory() {
    const { user } = useAuth() as any;
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState('All');

    const [inventory] = useState<string[]>(() => {
        const saved = localStorage.getItem('inventory');
        return saved ? JSON.parse(saved) : ['classic', 'dark'];
    });

    const [equipped, setEquipped] = useState<{ domino: string; table: string }>(() => {
        const saved = localStorage.getItem('equipped');
        return saved ? JSON.parse(saved) : { domino: 'classic', table: 'dark' };
    });

    if (user?.isGuest) {
        return (
            <DashboardLayout activePage="Inventory">
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">inventory_2</span>
                    <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">Inventory Unavailable</h2>
                    <p className="text-on-surface-variant mb-6">Create or sign in to an account to view your inventory.</p>
                    <button className="px-6 py-3 bg-primary-container text-on-primary rounded-xl font-bold" onClick={() => navigate('/lobby')}>Back to Lobby</button>
                </div>
            </DashboardLayout>
        );
    }

    const equip = (skinId: string, type: 'domino' | 'table') => {
        const updated = { ...equipped, [type]: skinId };
        setEquipped(updated);
        localStorage.setItem('equipped', JSON.stringify(updated));
    };

    const ownedItems = inventory.filter(id => ALL_ITEMS[id]);

    return (
        <DashboardLayout activePage="Inventory">
            <div className="max-w-[1400px] mx-auto">
                {/* Editorial Header */}
                <header className="mb-12 relative">
                    <div className="absolute -top-10 -left-10 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
                    <h1 className="font-headline text-6xl font-bold tracking-tighter text-on-background mb-4">My Inventory</h1>
                    <p className="text-on-surface-variant/60 font-body text-lg max-w-2xl">Manage your celestial assets. Equip your rarest domino frames and digital effects to dominate the orbit with style.</p>
                </header>

                {/* Category Tabs */}
                <div className="flex flex-wrap gap-4 mb-12">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-8 py-3 rounded-full font-bold font-headline tracking-tight transition-all ${
                                activeCategory === cat
                                    ? 'bg-primary text-on-primary'
                                    : 'glass-panel text-on-surface hover:bg-white/10'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Inventory Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {ownedItems.map(id => {
                        const item = ALL_ITEMS[id];
                        if (!item) return null;
                        const isEquipped = (item.type === 'domino' && equipped.domino === id) || (item.type === 'table' && equipped.table === id);
                        return (
                            <div key={id} className={`glass-panel rounded-xl overflow-hidden border group relative transition-all ${isEquipped ? 'gold-glow border-primary/40' : 'border-outline-variant/10 hover:border-primary/20'}`}>
                                {/* Rarity Badge */}
                                <div className="absolute top-4 left-4 z-10">
                                    <span className={`backdrop-blur-md text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${item.rarityColor}`}>{item.rarity}</span>
                                </div>
                                {/* Equipped Badge */}
                                {isEquipped && (
                                    <div className="absolute top-4 right-4 z-10">
                                        <div className="bg-primary px-2 py-1 rounded text-[10px] font-bold text-on-primary uppercase">Equipped</div>
                                    </div>
                                )}
                                {/* Image */}
                                <div className="aspect-square relative overflow-hidden bg-surface-container-low">
                                    <img alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={item.image} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent opacity-80"></div>
                                </div>
                                {/* Info */}
                                <div className="p-6">
                                    <h3 className="font-headline text-xl font-bold mb-4">{item.name}</h3>
                                    {isEquipped ? (
                                        <button className="w-full py-3 bg-white/5 border border-white/10 rounded-lg text-on-surface-variant font-bold uppercase text-xs tracking-widest cursor-default">
                                            Currently Active
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => equip(id, item.type as 'domino' | 'table')}
                                            className="w-full py-3 glass-panel border border-primary/20 hover:bg-primary/20 text-primary font-bold uppercase text-xs tracking-widest transition-all"
                                        >
                                            Equip
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {ownedItems.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                            <span className="material-symbols-outlined text-6xl text-on-surface-variant/20 mb-4">inventory_2</span>
                            <p className="text-on-surface-variant">Your inventory is empty. Visit the Store to get items!</p>
                            <button onClick={() => navigate('/store')} className="mt-4 px-6 py-3 bg-primary-container text-on-primary rounded-xl font-bold">Go to Store</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Notification Toast */}
            {window.location.search.includes('quest') && (
                <div className="fixed bottom-10 right-10 z-[70] glass-panel p-4 rounded-xl border border-primary/20 gold-glow flex items-center gap-4 max-w-xs transition-all animate-pulse pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">info</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">New Item Found</p>
                        <p className="text-sm text-on-surface">You received "Cyber Flux Emote" from the Daily Quest!</p>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
