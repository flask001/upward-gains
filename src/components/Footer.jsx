// src/components/Footer.jsx
import { LogsIcon } from "lucide-react";
import Logo from "../assets/Logo.png"
import React from "react";
import { FaBitcoin, FaEthereum } from "react-icons/fa";
import { SiTether } from "react-icons/si";

export default function Footer() {
  const companyLinks = [
    "Home",
    "About",
    "FAQ",
    "Pricing",
    "Coin Prices",
    "Contact",
  ];

  const supportLinks = [
    "Terms of Services",
    "Privacy Policy",
    "Register",
    "Login",
  ];

  const stats = [
    { value: "$108.76k", label: "Market Cap" },
    { value: "106K+", label: "Daily Transactions" },
    { value: "777K+", label: "Active Accounts" },
    { value: "147", label: "Supported Countries" },
  ];

  return (
    <footer className="bg-black text-gray-400 pt-16 pb-6">
      <div className="max-w-7xl mx-auto px-6">

        {/* Brand */}
        <div className="flex items-center gap-0 mb-12">
          <img
            src={Logo}
            alt="Upward Gain"
            className="h-10 w-10 object-contain"
          />
          <span className="text-white text-xl font-semibold tracking-wide">
            Upward-<span className="text-emerald-400">Gain</span>
          </span>
        </div>

        {/* Footer Grid */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-12">

          {/* Company */}
          <div>
            <h3 className="text-emerald-400 font-semibold mb-6 uppercase">
              Our Company
            </h3>

            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li
                  key={link}
                  className="hover:text-white transition cursor-pointer"
                >
                  {link}
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-emerald-400 font-semibold mb-6 uppercase">
              Help & Support
            </h3>

            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li
                  key={link}
                  className="hover:text-white transition cursor-pointer"
                >
                  {link}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-emerald-400 font-semibold mb-6 uppercase">
              Contact Us
            </h3>

            <p>24/7 Days</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-8">

            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-emerald-400 text-2xl font-bold">
                  {stat.value}
                </p>
                <p className="text-xs uppercase tracking-wide">
                  {stat.label}
                </p>
              </div>
            ))}

          </div>

        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 my-10"></div>

        {/* Payment Methods */}
        <div className="mb-10">
          <h4 className="uppercase text-sm text-gray-300 mb-4">
            Supported Payment Methods
          </h4>

          <div className="flex items-center gap-6 text-lg">

            <div className="text-gray-600 flex items-center gap-2 hover:text-yellow-400   cursor-pointer">
              <FaBitcoin />
              Bitcoin
            </div>

            <div className="text-gray-600 flex items-center gap-2 hover:text-gray-400 cursor-pointer">
              <FaEthereum />
              Ethereum
            </div>

            <div className="text-gray-600 flex items-center gap-2 hover:text-emerald-400 cursor-pointer">
              <SiTether />
              USDT
            </div>

          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 pt-6 text-center text-sm text-gray-500">
          Copyright © {new Date().getFullYear()} upward-gain All Rights Reserved
        </div>

      </div>
    </footer>
  );
}