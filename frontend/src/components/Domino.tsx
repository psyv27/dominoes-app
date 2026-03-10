import React from 'react';
import './Domino.css';

const Domino = ({ bone, onClick, isHorizontal = false, isInteractive = false, faceDown = false, skinUrl, skinColor }: {
    bone: { left: number; right: number };
    onClick?: () => void;
    isHorizontal?: boolean;
    isInteractive?: boolean;
    faceDown?: boolean;
    skinUrl?: string;
    skinColor?: string;
}) => {
    const renderDots = (count: number) => {
        const dotsArray = Array(count).fill(0);
        return (
            <div className={`dots-grid dots-${count}`}>
                {dotsArray.map((_, i) => (
                    <div key={i} className="dot"></div>
                ))}
            </div>
        );
    };

    if (faceDown) {
        return (
            <div
                className={`domino face-down ${isHorizontal ? 'horizontal' : 'vertical'}`}
                style={{
                    backgroundColor: skinColor || '#c1a57b',
                    backgroundImage: skinUrl ? `url(${skinUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="domino-logo">🂠</div>
            </div>
        );
    }

    return (
        <div
            className={`domino ${isHorizontal ? 'horizontal' : 'vertical'} ${isInteractive ? 'interactive' : ''}`}
            onClick={onClick}
        >
            <div className="half">
                {renderDots(bone.left)}
            </div>
            <div className="divider"></div>
            <div className="half">
                {renderDots(bone.right)}
            </div>
        </div>
    );
};

export default Domino;
