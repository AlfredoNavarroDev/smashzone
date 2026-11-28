import React from 'react';

interface KineticMarqueeProps {
  items: string[];
  variant?: 'rage' | 'volt' | 'dark';
}

export const KineticMarquee: React.FC<KineticMarqueeProps> = ({
  items,
  variant = 'rage',
}) => {
  const repeated = [...items, ...items, ...items];
  return (
    <div className={`keltic-marquee keltic-marquee--${variant}`}>
      <div className="keltic-marquee__track">
        {repeated.map((text, idx) => (
          <span key={idx} className="keltic-marquee__item">
            <span className="keltic-marquee__sep">//</span> {text}
          </span>
        ))}
      </div>
    </div>
  );
};

