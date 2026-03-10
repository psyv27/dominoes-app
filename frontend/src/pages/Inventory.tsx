import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Backpack, ArrowLeft, Check } from 'lucide-react';
import './Inventory.css';

const ALL_SKINS: Record<string, { name: string; type: string; preview: string; color?: string; bg?: string }> = {
    classic: { name: 'Classic White', type: 'domino', preview: '#ffffff', color: '#000' },
    midnight: { name: 'Midnight Blue', type: 'domino', preview: '#1a237e', color: '#90caf9' },
    emerald: { name: 'Emerald Green', type: 'domino', preview: '#1b5e20', color: '#a5d6a7' },
    crimson: { name: 'Crimson Red', type: 'domino', preview: '#b71c1c', color: '#ef9a9a' },
    gold: { name: 'Royal Gold', type: 'domino', preview: '#f9a825', color: '#000' },
    purple: { name: 'Deep Purple', type: 'domino', preview: '#4a148c', color: '#ce93d8' },
    dark: { name: 'Dark Space', type: 'table', preview: '', bg: 'radial-gradient(circle, #111118, #050508)' },
    felt: { name: 'Green Felt', type: 'table', preview: '', bg: 'radial-gradient(circle, #1a3c1a, #0a1f0a)' },
    ocean: { name: 'Ocean Blue', type: 'table', preview: '', bg: 'radial-gradient(circle, #0d253f, #01111e)' },
    sunset: { name: 'Sunset Amber', type: 'table', preview: '', bg: 'radial-gradient(circle, #3e1a00, #1a0a00)' },
    royal: { name: 'Royal Purple', type: 'table', preview: '', bg: 'radial-gradient(circle, #2a1042, #120520)' },
    galaxy: { name: 'Galaxy', type: 'table', preview: '', bg: 'radial-gradient(circle, #0f0c29, #302b63, #24243e)' },
};

export default function Inventory() {
    const { user } = useAuth() as any;
    const navigate = useNavigate();

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
            <div className="inv-container">
                <div className="inv-blocked">
                    <Backpack size={64} opacity={0.3} />
                    <h2>Inventory Unavailable</h2>
                    <p>Create or sign in to an account to view your inventory.</p>
                    <button className="primary-btn" onClick={() => navigate('/lobby')}>Back to Lobby</button>
                </div>
            </div>
        );
    }

    const equip = (skinId: string, type: 'domino' | 'table') => {
        const updated = { ...equipped, [type]: skinId };
        setEquipped(updated);
        localStorage.setItem('equipped', JSON.stringify(updated));
    };

    const ownedDominos = inventory.filter(id => ALL_SKINS[id]?.type === 'domino');
    const ownedTables = inventory.filter(id => ALL_SKINS[id]?.type === 'table');

    return (
        <div className="inv-container">
            <header className="inv-header">
                <button className="back-btn" onClick={() => navigate('/lobby')}>
                    <ArrowLeft size={20} /> Back
                </button>
                <h1><Backpack size={24} /> Inventory</h1>
                <span></span>
            </header>

            <section className="inv-section">
                <h2>Domino Skins</h2>
                <div className="inv-grid">
                    {ownedDominos.map(id => {
                        const skin = ALL_SKINS[id];
                        const isEquipped = equipped.domino === id;
                        return (
                            <div key={id} className={`inv-card ${isEquipped ? 'equipped' : ''}`}>
                                <div className="inv-preview domino-preview" style={{ background: skin.preview, color: skin.color }}>
                                    <div className="preview-dots">⚄</div>
                                </div>
                                <div className="inv-info">
                                    <h3>{skin.name}</h3>
                                    {isEquipped ? (
                                        <span className="equipped-badge"><Check size={14} /> Equipped</span>
                                    ) : (
                                        <button className="equip-btn" onClick={() => equip(id, 'domino')}>
                                            Equip
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {ownedDominos.length === 0 && <p className="empty-inv">No domino skins. Visit the Store!</p>}
                </div>
            </section>

            <section className="inv-section">
                <h2>Table Backgrounds</h2>
                <div className="inv-grid">
                    {ownedTables.map(id => {
                        const skin = ALL_SKINS[id];
                        const isEquipped = equipped.table === id;
                        return (
                            <div key={id} className={`inv-card ${isEquipped ? 'equipped' : ''}`}>
                                <div className="inv-preview table-preview" style={{ background: skin.bg }}></div>
                                <div className="inv-info">
                                    <h3>{skin.name}</h3>
                                    {isEquipped ? (
                                        <span className="equipped-badge"><Check size={14} /> Equipped</span>
                                    ) : (
                                        <button className="equip-btn" onClick={() => equip(id, 'table')}>
                                            Equip
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {ownedTables.length === 0 && <p className="empty-inv">No table skins. Visit the Store!</p>}
                </div>
            </section>
        </div>
    );
}
