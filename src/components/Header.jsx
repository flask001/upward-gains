// src/components/HeaderSlider.jsx

import { useState, useEffect } from "react";

import slide1 from "../assets/image/Img1.jpg";
import slide2 from "../assets/image/Img2.jpg";
import slide3 from "../assets/image/Img3.jpg";

export default function HeaderSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      image: slide1,
      title: "Secure Digital Investment Platform",
      desc: "Upwards Gains provides a professional investment environment where advanced trading strategies and financial technologies generate consistent and sustainable profits for global investors.",
    },
    {
      image: slide2,
      title: "Diversified Smart Investment Plans",
      desc: "Our carefully structured investment plans allow investors of all levels to participate in profitable opportunities backed by market research and strategic asset management.",
    },
    {
      image: slide3,
      title: "Instant Withdrawals & 24/7 System",
      desc: "Experience fast withdrawals, real-time account monitoring, and automated transactions powered by our secure financial infrastructure.",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <header className="relative w-full h-[70vh] lg:h-[90vh] overflow-hidden">

      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === currentSlide ? "opacity-100 z-10" : "opacity-20"
          }`}
        >
          {/* Background Image with Ken Burns animation */}
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover animate-[zoom_12s_linear_infinite]"
          />
          


          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/80 flex items-center justify-center text-center px-6">

         <div className={`max-w-4xl text-white space-y-6 transition-all duration-700
${index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}
`}>

              <h1
                className="font-bold leading-tight
                text-3xl
                sm:text-4xl
                md:text-5xl
                lg:text-6xl
                xl:text-7xl"
              >
                {slide.title}
              </h1>

              <p
                className="text-gray-200 leading-relaxed
                text-sm
                sm:text-base
                md:text-lg
                lg:text-xl
                max-w-3xl mx-auto"
              >
                {slide.desc}
              </p>
{slide.title.split(slide.highlight)[0]}
<span className="text-emerald-400">{slide.highlight}</span>
{slide.title.split(slide.highlight)[1]}  <br/>    
   <button
                className="mt-4 px-6 py-3 md:px-8 md:py-4
                text-sm md:text-lg
                bg-emerald-600 rounded-lg
                hover:bg-emerald-700
                transition
                shadow-xl
                hover:scale-105"
              >
                Start Investing
              </button>

            </div>

          </div>
        </div>
      ))}

      {/* Permanent Slide Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full z-30 shadow-lg">

        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={`relative w-4 h-4 md:w-5 md:h-5 rounded-full border border-white transition-all duration-300 ${
              currentSlide === index
                ? "bg-emerald-600 scale-125 shadow-md"
                : "bg-white/40 hover:bg-white"
            }`}
          />
        ))}

      </div>

    </header>
  );
}