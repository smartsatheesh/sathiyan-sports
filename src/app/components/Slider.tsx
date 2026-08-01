"use client";
import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const sliderImages = [
  "/S1.jpeg", "/S2.jpeg", "/S3.jpeg", "/S4.jpeg", "/S5.jpeg",
  "/S6.jpeg", "/S7.jpeg", "/S9.jpeg", "/S10.jpeg", "/S11.jpeg",
  "/S12.jpeg", "/S13.jpeg", "/S14.jpeg", "/S15.jpeg", "/S16.jpeg",
  "/S17.jpeg", "/S18.jpeg", "/S19.jpeg", "/S20.jpeg", "/S21.jpeg",
  "/S22.jpeg", "/S23.jpeg", "/S24.jpeg", "/S25.jpeg", "/S26.jpeg",
  "/S27.jpeg", "/S28.jpeg", "/S29.jpeg",
];

const Carousel = () => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: false,
    lazyLoad: 'ondemand' as const,
  };

  return (
    <div className="custom-slider-container" style={{ position: 'relative', zIndex: 2 }}>
      <Slider {...settings}>
        {sliderImages.map((img, index) => (
          <div key={index} className="custom-slider-image-wrapper">
            <img
              src={img}
              alt={`Facility ${index + 1}`}
              className="custom-slider-image"
              style={{ 
                objectPosition: 'center center',
                transition: 'all 0.3s ease'
              }}
            />
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default Carousel;
