// src/components/Navbar.jsx
import { Link } from "react-router-dom";
import { useState } from "react";
import Logo from "../assets/Logo.png";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { name: "Home", href: "/" },
    { name: "Investment Plans", href: "#investment-plans" },
    { name: "About", href: "#about" },
    { name: "FAQ", href: "#faq" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <nav className="bg-black backdrop-blur-md text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <div className="flex items-center m-0 gap-0 transition hover:scale-105">

            <img
              src={Logo}
              alt="Upwards Gains Logo"
              className="h-14 w-18 object-contain"
            />

            <span className="text-xl font-bold tracking-wide">
              Upwards-<span className="text-emerald-400">Gains</span>
            </span>

          </div>
        

          {/* Desktop Links */}
          <div className="hidden md:flex space-x-8">
            {links.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="relative group transition-all duration-300"
              >
                {link.name}

                <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-emerald-500 transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex space-x-4">
             <Link to='/login'>  
              
            <button className="px-4 py-2 text-sm border border-emerald-400 rounded-lg transition-all duration-300 hover:bg-emerald-800 hover:scale-105 hover:shadow-lg">
            
              Login
            
            </button>
              </Link>


<Link to='/register'> 
            <button  className="px-4 py-2 text-sm bg-gradient-to-r from-emerald-600 to-emerald-900 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/40"> 
              Register
            </button>
            </Link>
          </div>

          {/* Mobile Button */}
          <button
            className="md:hidden transition-transform duration-300"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Menu"
          >
            <svg
              className={`w-6 h-6 transition-transform duration-300 ${
                isOpen ? "rotate-90" : ""
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden bg-black overflow-hidden transition-all duration-500 ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-6 py-4 space-y-3">
          {links.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="block py-2 transition-all duration-300 hover:text-emerald-400 hover:translate-x-1"
            >
              {link.name}
            </a>
          ))}

          <div className="flex flex-col gap-2 pt-3">
        
            <button className="border border- py-2 rounded-lg transition-all duration-300 hover:bg-emerald-600 hover:shadow-lg">
                  <Link to="/login">
              Login
              </Link>
            </button>
            

        
            <button className="bg-gradient-to-r from-emerald-500 to-emerald-950 py-2 rounded-lg transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/40">
            <Link to="/register">
              Register
              </Link>
            </button>
          
          </div>
        </div>
      </div>
    </nav>
  );
}