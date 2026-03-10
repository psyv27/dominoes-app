import React from 'react';
import './Domino.css';

const Domino = ({ bone, onClick, isHorizontal = false, isInteractive = false }) => {
    const renderDots = (count) => {
        const dotsArray = Array(count).fill(0);
        return (
            <div className={`dots-grid dots-${count}`}>
                {dotsArray.map((_, i) => (
                    <div key={i} className="dot"></div>
                ))}
            </div>
        );
    };

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
