import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, Check } from 'lucide-react';
import './Store.css';

const DOMINO_SKINS = [
    { id: 'classic', name: 'Classic White', preview: '#ffffff', color: '#000' },
    { id: 'midnight', name: 'Midnight Blue', preview: '#1a237e', color: '#90caf9' },
    { id: 'emerald', name: 'Emerald Green', preview: '#1b5e20', color: '#a5d6a7' },
    { id: 'crimson', name: 'Crimson Red', preview: '#b71c1c', color: '#ef9a9a' },
    { id: 'gold', name: 'Royal Gold', preview: '#f9a825', color: '#000' },
    { id: 'purple', name: 'Deep Purple', preview: '#4a148c', color: '#ce93d8' },
];

const TABLE_SKINS = [
    { id: 'dark', name: 'Dark Space', bg: 'radial-gradient(circle, #111118, #050508)' },
    { id: 'felt', name: 'Green Felt', bg: 'radial-gradient(circle, #1a3c1a, #0a1f0a)' },
    { id: 'ocean', name: 'Ocean Blue', bg: 'radial-gradient(circle, #0d253f, #01111e)' },
    { id: 'sunset', name: 'Sunset Amber', bg: 'radial-gradient(circle, #3e1a00, #1a0a00)' },
    { id: 'royal', name: 'Royal Purple', bg: 'radial-gradient(circle, #2a1042, #120520)' },
    { id: 'galaxy', name: 'Galaxy', bg: 'radial-gradient(circle, #0f0c29, #302b63, #24243e)' },
];

export default function Store() {
    const { user } = useAuth() as any;
    const navigate = useNavigate();

    // Load inventory from localStorage
    const [inventory, setInventory] = useState<string[]>(() => {
        const saved = localStorage.getItem('inventory');
        return saved ? JSON.parse(saved) : ['classic', 'dark'];
    });

    const [activeTab, setActiveTab] = useState<'domino' | 'table'>('domino');

    if (user?.isGuest) {
        return (
            <div className="store-container">
                <div className="store-blocked">
                    <ShoppingBag size={64} opacity={0.3} />
                    <h2>Store Unavailable</h2>
                    <p>Create or sign in to an account to access the Store and Inventory.</p>
                    <button className="primary-btn" onClick={() => navigate('/lobby')}>Back to Lobby</button>
                </div>
            </div>
        );
    }

    const claimSkin = (skinId: string) => {
        if (!inventory.includes(skinId)) {
            const updated = [...inventory, skinId];
            setInventory(updated);
            localStorage.setItem('inventory', JSON.stringify(updated));
        }
    };

    return (
        <div className="store-container">
            <header className="store-header">
                <button className="back-btn" onClick={() => navigate('/lobby')}>
                    <ArrowLeft size={20} /> Back
                </button>
                <h1><ShoppingBag size={24} /> Store</h1>
                <span className="free-label">All items are FREE!</span>
            </header>

            <div className="store-tabs">
                <button className={`tab ${activeTab === 'domino' ? 'active' : ''}`} onClick={() => setActiveTab('domino')}>
                    Domino Skins
                </button>
                <button className={`tab ${activeTab === 'table' ? 'active' : ''}`} onClick={() => setActiveTab('table')}>
                    Table Backgrounds
                </button>
            </div>

            <div className="store-grid">
                {activeTab === 'domino' && DOMINO_SKINS.map(skin => (
                    <div key={skin.id} className="skin-card">
                        <div className="skin-preview domino-preview" style={{ background: skin.preview, color: skin.color }}>
                            <div className="preview-dots">⚄</div>
                        </div>
                        <div className="skin-info">
                            <h3>{skin.name}</h3>
                            {inventory.includes(skin.id) ? (
                                <span className="owned-badge"><Check size={14} /> Owned</span>
                            ) : (
                                <button className="claim-btn" onClick={() => claimSkin(skin.id)}>
                                    Claim Free
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {activeTab === 'table' && TABLE_SKINS.map(skin => (
                    <div key={skin.id} className="skin-card">
                        <div className="skin-preview table-preview" style={{ background: skin.bg }}></div>
                        <div className="skin-info">
                            <h3>{skin.name}</h3>
                            {inventory.includes(skin.id) ? (
                                <span className="owned-badge"><Check size={14} /> Owned</span>
                            ) : (
                                <button className="claim-btn" onClick={() => claimSkin(skin.id)}>
                                    Claim Free
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
