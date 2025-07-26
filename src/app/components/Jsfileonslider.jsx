import React, { useState, useEffect } from 'react';

const Slider = () => {
  const slides = [
    { id: 1, content: 'Slide 1', color: '#FF6F61' },
    { id: 2, content: 'Slide 2', color: '#6B5B95' },
    { id: 3, content: 'Slide 3', color: '#88B04B' },
    { id: 4, content: 'Slide 4', color: '#F7CAC9' },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentIndex(prevIndex => (prevIndex + 1) % slides.length);
    }, 4000);

    return () => clearTimeout(timer);
  }, [currentIndex, slides.length]);

  const moveTo = (index) => {
    setCurrentIndex(index);
  };

  const moveNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
  };

  const movePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length);
  };

  return (
    <div className="slider-container">
      <div className="slide-group" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
        {slides.map((slide) => (
          <div key={slide.id} className="slide" style={{ backgroundColor: slide.color }}>
            <h2>{slide.content}</h2>
          </div>
        ))}
      </div>

      <div className="slide-buttons">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`slide-btn ${index === currentIndex ? 'active' : ''}`}
            onClick={() => moveTo(index)}
          >
            &bull;
          </button>
        ))}
      </div>

      <div className="nav-buttons">
        <button onClick={movePrev} className="previous-btn">Previous</button>
        <button onClick={moveNext} className="next-btn">Next</button>
      </div>

      <style jsx>{`
        .slider-container {
          position: relative;
          overflow: hidden;
          width: 100%;
          max-width: 600px;
          margin: 20px auto;
        }
        .slide-group {
          display: flex;
          transition: transform 0.5s ease-in-out;
          width: ${slides.length * 100}%;
        }
        .slide {
          flex: 0 0 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 2rem;
          height: 300px;
        }
        .slide-buttons {
          text-align: center;
          margin-top: 10px;
        }
        .slide-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          margin: 0 5px;
          opacity: 0.5;
        }
        .slide-btn.active {
          opacity: 1;
        }
        .nav-buttons {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
        }
        .nav-buttons button {
          padding: 10px 20px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default Slider;
