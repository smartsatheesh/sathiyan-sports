"use client";
import React from "react";
import Slider from "react-slick";
import { useRouter } from "next/navigation";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const sliderImages = [
 
  "/image.jpg",
  "/image1.jpg",
  "/AbstractPeople.jpg",
  "/pexels-eberhardgross-1367192.jpg",
  "/registerpageimagesamble.png",
   "/BannerCurrent.png",
];

const Carousel = () => {
  const router = useRouter();

  const handleRegisterClick = () => {
    router.push("/register");
  };

  const settings = {
    dots: true,
    infinite: true,
    speed: 400,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
  };

  return (
    <div className="custom-slider-container" style={{ position: 'relative', zIndex: 2 }}>
      <Slider {...settings}>
        {sliderImages.map((img, index) => (
          <div key={index} className="custom-slider-image-wrapper">
            <img
              src={img}
              alt={`Slide ${index + 1}`}
              className="custom-slider-image"
              style={{ 
                filter: 'brightness(0.85) contrast(1.1)',
                transition: 'all 0.3s ease'
              }}
            />
            <div className="slider-register-overlay">
              <button
                className="slider-register-btn"
                onClick={handleRegisterClick}
                style={{
                  background: 'linear-gradient(45deg, #8e24aa, #d81b60)',
                  boxShadow: '0 6px 20px rgba(142, 36, 170, 0.4)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                REGISTER NOW
              </button>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default Carousel;
