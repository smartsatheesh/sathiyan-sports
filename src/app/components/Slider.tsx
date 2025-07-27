"use client";
import React from "react";
import Slider from "react-slick";
import Link from "next/link";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const sliderImages = [
  "Banner_final.png",
  "/image.jpg",
  "/image1.jpg",
  "/AbstractPeople.jpg",
  "/pexels-eberhardgross-1367192.jpg",
  "/registerpageimagesamble.png",
];

const Carousel = () => {
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
    <div className="custom-slider-container">
      <Slider {...settings}>
        {sliderImages.map((img, index) => (
          <div key={index} className="custom-slider-image-wrapper">
            <img
              src={img}
              alt={`Slide ${index + 1}`}
              className="custom-slider-image"
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />

            <div className="slider-register-overlay">
              <Link href="/register" passHref>
                <button className="slider-register-btn">REGISTER NOW</button>
              </Link>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default Carousel;
