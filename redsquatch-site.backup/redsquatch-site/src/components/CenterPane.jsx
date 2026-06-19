import { useState, useEffect } from 'react'
import { mockCarouselPlaceholders } from '../data/mockData';

const CenterPane = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);

  const handleDotClick = (index) => {
    setActiveSlide(index);
    setAutoRotate(false);
  };

  // Auto-rotate slides every 8 seconds
  useEffect(() => {
    if (!autoRotate) return;

    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % mockCarouselPlaceholders.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [autoRotate]);

  return (
    <div className="rs-center-pane">
      {/* Carousel Container */}
      <div className="rs-carousel-container">
        {/* Card Grid */}
        <div className="rs-carousel-grid">
          {mockCarouselPlaceholders.map((card, index) => (
            <div
              key={card.id}
              className={`rs-carousel-card ${index === activeSlide ? 'active' : ''}`}
              style={{
                transform: `translateX(${(index - activeSlide) * 100}%)`,
                transition: 'transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1)',
                position: index === activeSlide ? 'relative' : 'absolute',
              }}
            >
              <h3 style={{ 
                marginBottom: '8px',
                color: 'var(--accent-copper-light)',
                fontFamily: 'var(--font-header)',
              }}>
                {card.title}
              </h3>
              <p className="rs-carousel-placeholder">{card.description}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="rs-carousel-controls">
          {mockCarouselPlaceholders.map((_, index) => (
            <div
              key={index}
              className={`rs-carousel-dot ${index === activeSlide ? 'active' : ''}`}
              onClick={() => handleDotClick(index)}
              role="button"
              tabIndex={0}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Additional placeholder sections can be added here */}
    </div>
  );
};

export default CenterPane;
