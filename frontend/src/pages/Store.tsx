import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import './Store.css';

const STORE_ITEMS = [
    {
        id: 'golden-galaxy',
        name: 'Golden Galaxy Tiles',
        desc: 'Premium tiles with a persistent orbital gold glow effect during matches.',
        price: 50000,
        priceType: 'coins',
        rarity: 'Legendary',
        rarityColor: 'bg-primary text-on-primary',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOk6S5qeMWtlvanq5uE9CrQou7JF2cXcpfFQ-L3Xn7K5AP_B2tRioi92JdGEL5SlQREd06tNR2KREVqdZPtOzvqmvV1sXsTeAQPrxSwueSoHQPXJD0B924YNFl-frLV_IHLnmaRoHZXlNj2Ex3eQ44bDyv1uRk9sneOsF7H2KG0_rbl0WKf-xHbeE6wwakodTiiB6AMWHicMnC7GZbF-amQjjhGgnheDaQpoRwcPsXCyQyKvNDEE8FY54hlpRnbc_JC0VOxAdKEdg',
        skinId: 'gold',
        type: 'domino'
    },
    {
        id: 'mega-coin',
        name: 'Mega Coin Pack',
        desc: 'Get a head start with 1,000,000 credits to spend on any cosmetic item.',
        price: 19.99,
        originalPrice: 49.99,
        priceType: 'usd',
        rarity: 'Popular',
        rarityColor: 'bg-[#17d8ff] text-[#001f27]',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBk1GxNpTgU3rbOyKCXkyIHkMq-v9akeBCGxI8KbpBjWcgTSIyw-Mr5NOBQH_EQ7XbxMKMccrgcH4moVABIRZBy7KshxcEOi1l06Q5Jrjn-Gj5yFAyfW8wSAgB4yWWuXplU28FrkU6JNAqwwOaa-ABuVk8ctlajbo0MGJj5jWHKltiXh1081S0NKShUZIkRdgCtkZd53eggNJ3IkFMl7Tdz_W_0cOh5XoX4ahgJTsBZzJtBlKCKJua3lT3I9Op2zFeJr7SuIezkcws',
        skinId: null,
        type: 'coins'
    },
    {
        id: 'neon-trail',
        name: 'Neon Trail Effect',
        desc: 'Leave a streak of light behind your tiles as they move across the board.',
        price: 15000,
        priceType: 'coins',
        rarity: null,
        rarityColor: '',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC-3ZulDzpebp7e8AhRB2FlGmpAJGtDTXOwivnDhwx0goDGGdW4EhTWxkx3GQxAoJPe3o91eA9qs-9v9s5TSbXA6FtzEQvMNYKTdRxrfTR6dDFU6Q1RkZcL6uXNicpSmQXJ5apQqSzf4PtIm1aqQ0WqdQIs4sB0Uj98-gRhylAgrAbMFKc6-PaUHYnJ_RqveyYDeLC5PjKJTkGw6CZw69cqDMbeVwi5MiuzKu7DfWFlwASvlm0qhhLLkEaVkXhvzfSzMmi7KHzp0II',
        skinId: 'midnight',
        type: 'domino'
    },
    {
        id: 'royal-frame',
        name: 'Royal Avatar Frame',
        desc: 'Show your status with this limited edition gold-trimmed profile frame.',
        price: 5000,
        priceType: 'coins',
        rarity: 'Limited',
        rarityColor: 'bg-error text-on-error',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAapVaZ6OcvVBQXRCRzLGtKZgMxkJ29_8zRRXpHl1eFrlqAltmGw7UD97A0gvGu8XQN6DnrLgHcNpmBJFk-Z1257vM7mPepsF-j8iNNwyZ9Yb3sSkw75Cm09RbcNdmuQMBFJdaECCR8hd_v6x7xM3GlS19FWtmavWt7ySzWdY-KuMO6UHsxXjwHddhF8TIH7IYy7Vx71SKENtfc3KsY9VUJSgGD8-CgegSuVOurP4APiRwv9TCrpOTTyBB79ooft7sX69PaQrG7xpQ',
        skinId: 'crimson',
        type: 'domino'
    },
];

// Categories aligned to backend schema types
const CATEGORIES = ['All items', 'Tiles', 'Frames', 'Emojis'];

export default function Store() {
    const { user } = useAuth() as any;
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState('All items');
    const [storeItems, setStoreItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [inventory, setInventory] = useState<string[]>(() => {
        const saved = localStorage.getItem('inventory');
        return saved ? JSON.parse(saved) : ['classic', 'dark'];
    });

    useEffect(() => {
        const fetchItems = async () => {
            try {
                // Fetch dynamic store items from backend
                const res = await fetch('http://localhost:5001/store/items');
                if (res.ok) {
                    const data = await res.json();
                    // Use backend data if available, otherwise fall back to static items
                    setStoreItems(data && data.length > 0 ? data : STORE_ITEMS);
                } else {
                    setStoreItems(STORE_ITEMS);
                }
            } catch (err) {
                console.error("Failed to fetch store items", err);
                setStoreItems(STORE_ITEMS);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, []);

    if (user?.isGuest) {
        return (
            <DashboardLayout activePage="Store">
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">shopping_bag</span>
                    <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">Store Unavailable</h2>
                    <p className="text-on-surface-variant mb-6">Create or sign in to an account to access the Store.</p>
                    <button className="px-6 py-3 bg-primary-container text-on-primary rounded-xl font-bold" onClick={() => navigate('/lobby')}>Back to Lobby</button>
                </div>
            </DashboardLayout>
        );
    }

    const claimSkin = (item: any) => {
        if (!item.skinId) return;
        if (!inventory.includes(item.skinId)) {
            const updated = [...inventory, item.skinId];
            setInventory(updated);
            localStorage.setItem('inventory', JSON.stringify(updated));
            alert(`You have successfully purchased: ${item.name}`);
        }
    };

    const getFilteredItems = () => {
        if (activeCategory === 'All items') return storeItems;
        if (activeCategory === 'Tiles') return storeItems.filter(i => (i.category || i.type || '').toLowerCase() === 'tiles' || (i.category || i.type || '').toLowerCase() === 'domino');
        if (activeCategory === 'Frames') return storeItems.filter(i => (i.category || i.type || '').toLowerCase() === 'frames' || (i.category || i.type || '').toLowerCase() === 'table');
        if (activeCategory === 'Emojis') return storeItems.filter(i => (i.category || i.type || '').toLowerCase() === 'emojis' || (i.category || i.type || '').toLowerCase() === 'emotes');
        return storeItems;
    };

    const filteredItems = getFilteredItems();

    const getBadge = (item: any) => {
        if (item.discount > 0) return { text: `-${item.discount}% OFF`, color: 'bg-[#17d8ff] text-[#001f27]' };
        if (item.isLimited) return { text: 'LIMITED TIME', color: 'bg-error text-on-error' };
        if (item.isHot) return { text: 'POPULAR', color: 'bg-primary text-on-primary' };
        if (item.isNew) return { text: 'NEW', color: 'bg-tertiary text-on-tertiary' };
        return null;
    };

    return (
        <DashboardLayout activePage="Store">
            <div className="max-w-7xl mx-auto">
                {/* Store Header */}
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="font-headline text-5xl md:text-6xl font-bold tracking-tighter text-primary mb-2">Orbit Store</h1>
                        <p className="text-on-surface-variant max-w-lg font-light tracking-wide">Enhance your game with celestial tiles, exclusive coin packs, and legendary effects.</p>
                    </div>
                    <div className="flex items-center gap-4 bg-surface-container-high px-6 py-4 rounded-2xl border border-outline-variant/10">
                        <div className="flex flex-col">
                            <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">Your Balance</span>
                            <span className="text-2xl font-headline font-bold text-primary">{user?.coins?.toLocaleString() || '1,250'} COINS</span>
                        </div>
                        <button className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary active:scale-90 transition-transform">
                            <span className="material-symbols-outlined">add</span>
                        </button>
                    </div>
                </header>

                {/* Categories */}
                <div className="flex flex-wrap gap-4 mb-10 overflow-x-auto pb-2">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-8 py-3 rounded-full border font-medium text-sm transition-all ${
                                activeCategory === cat
                                    ? 'border-primary/40 bg-primary/10 text-primary font-bold'
                                    : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                    {loading ? (
                        <div className="col-span-full py-20 text-center text-on-surface-variant">Loading store contents...</div>
                    ) : filteredItems.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-on-surface-variant border-2 border-dashed border-outline-variant/10 rounded-3xl">
                            <span className="material-symbols-outlined text-5xl mb-4 opacity-50">production_quantity_limits</span>
                            <p className="font-headline font-bold text-xl">No items in this category</p>
                            <p className="text-sm opacity-60 mt-1">Check back later for new exclusive items!</p>
                        </div>
                    ) : (
                        filteredItems.map(item => {
                            const owned = item.skinId ? inventory.includes(item.skinId) : false;
                            const badge = getBadge(item);
                            
                            // Calculate final price based on discount
                            const finalPrice = item.discount ? Math.floor(item.price * (1 - item.discount / 100)) : item.price;
                            
                            return (
                                <div key={item.id} className="glass-card rounded-[2rem] p-6 flex flex-col group hover:bg-surface-container-highest/60 transition-all duration-500 border border-outline-variant/5">
                                    <div className="relative w-full aspect-square mb-6 rounded-2xl overflow-hidden bg-surface-container-lowest flex items-center justify-center">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <img alt={item.name} className="w-4/5 h-4/5 object-contain group-hover:scale-110 transition-transform duration-700" src={item.image} />
                                        {badge && (
                                            <div className={`absolute top-4 left-4 px-3 py-1 ${badge.color} text-[10px] font-bold rounded-full uppercase tracking-tighter`}>{badge.text}</div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-headline text-xl font-bold mb-1 group-hover:text-primary transition-colors">{item.name}</h3>
                                        <p className="text-primary text-[10px] font-bold uppercase tracking-widest mb-2">{item.category || item.type || 'Skin'}</p>
                                        <p className="text-on-surface-variant text-sm mb-6 font-light">{item.desc}</p>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            {item.priceType === 'coins' ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-primary text-sm">toll</span>
                                                    <div className="flex flex-col">
                                                        {item.discount > 0 && <span className="text-[10px] uppercase text-on-surface-variant line-through">{item.price.toLocaleString()}</span>}
                                                        <span className="font-bold text-lg">{finalPrice.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    {item.discount > 0 && <span className="text-[10px] uppercase text-on-surface-variant line-through">${item.price}</span>}
                                                    <span className="font-bold text-lg text-primary">${finalPrice}</span>
                                                </div>
                                            )}
                                        </div>
                                        {owned ? (
                                            <span className="flex-1 text-center py-3 rounded-xl font-bold text-sm text-on-surface-variant bg-surface-container-highest border border-outline-variant/10">Owned</span>
                                        ) : (
                                            <button
                                                onClick={() => claimSkin(item)}
                                                className={`bg-surface-container-highest hover:bg-surface-bright text-primary border border-primary/20 flex-1 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all`}
                                            >
                                                Buy
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Promotion Section */}
                <section className="mt-20 relative overflow-hidden rounded-[2.5rem] bg-surface-container h-80 flex items-center border border-outline-variant/10">
                    <div className="absolute top-0 right-0 w-1/2 h-full opacity-40 mix-blend-screen">
                        <img alt="Orbit Pass" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBi7ahTR-Rsi2iKNs7KNDpxYW3DIKUwdWlsKBcr1VqzaArLY9e4NYScRfUOQ9jD-HOueWSTKocnvByqgkwa9pAOtoSKhV18WPBoldDXSWklmtECHYkBsU3Z1GukvA-gKAAKvdLXPeM9kFgiccYeJU0fMUVXYElDsLLc9w7MoNHcttyXzWQ5aROSfg6APPIrQ5qesr5SWEigaMeGFYWtOPnclA-P6TT7cdupOSIK_jvyLO_FsjL9vPkwydCZOExkUXH80OwyPS90hO4" />
                    </div>
                    <div className="relative z-10 pl-12 pr-6 max-w-2xl">
                        <span className="text-xs font-bold text-primary tracking-[0.4em] uppercase mb-4 block">Seasonal Special</span>
                        <h2 className="font-headline text-4xl font-bold mb-4">UNLOCK THE ORBIT PASS</h2>
                        <p className="text-on-surface-variant mb-8 font-light leading-relaxed">Gain access to 50 tiers of exclusive rewards including unique domino skins, taunts, and bonus currency. Limited time offer for Season 4.</p>
                        <div className="flex gap-4">
                            <button className="liquid-gold-gradient px-8 py-3 rounded-xl font-bold text-on-primary shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all">Claim Now</button>
                            <button className="px-8 py-3 rounded-xl font-bold text-on-surface bg-surface-container-high hover:bg-surface-container-highest transition-all">Learn More</button>
                        </div>
                    </div>
                </section>
            </div>
        </DashboardLayout>
    );
}
