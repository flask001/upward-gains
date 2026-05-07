"use client"

import { useRef, useState, useEffect } from "react"
import emailjs from "@emailjs/browser"
import { FaRegMessage } from "react-icons/fa6"

export default function ContactForm() {
  const formRef = useRef()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")
  const [stars, setStars] = useState([])

  useEffect(() => {
    const generatedStars = Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 3,
      duration: Math.random() * 5 + 2,
    }))
    setStars(generatedStars)
  }, [])

  const sendEmail = (e) => {
    e.preventDefault()
    setLoading(true)

    emailjs
      .sendForm(
        import.meta.env.VITE_SERVICE_ID,
        import.meta.env.VITE_TEMPLATE_ID,
        formRef.current,
        import.meta.env.VITE_PUBLIC_KEY
      )
      .then(
        () => {
          setLoading(false)
          setStatus("Message sent successfully ✅")
          formRef.current.reset()
        },
        (error) => {
          setLoading(false)
          setStatus("Failed to send ❌")
          console.error(error)
        }
      )
  }

  return (
    <div id="contact" className="relative min-h-screen bg-black/10 overflow-hidden backdrop-blur-md">

      <div className="absolute inset-0 web3-grid opacity-30"></div>

      {stars.map((star) => (
        <span
          key={star.id}
          className="absolute bg-white rounded-full animate-pulse"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col md:flex-row min-h-screen">

        {/* LEFT SIDE */}
        <div className="md:w-1/2 flex items-center justify-center p-8">
          <div className="text-center space-y-6">

            {/* FLOATING CHAT BUBBLE */}
            <div className="bubble-container">
              <div className="chat-bubble">
                <FaRegMessage size={45}/>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-white">
              Contact Support
            </h2>

            <p className="text-gray-300 max-w-md text-sm leading-relaxed">
              If you encounter any issue with deposits, withdrawals, account
              verification, or platform access, please contact our support team.
              Provide clear details about your request and our team will review
              your message carefully. We are committed to assisting members of
              our Web3 investment community and ensuring a smooth and secure
              experience on the platform.
            </p>

          </div>
        </div>

        {/* FORM SIDE */}
        <div className="md:w-1/2 flex items-center justify-center p-6">
          <form
            ref={formRef}
            onSubmit={sendEmail}
            className="w-full max-w-md bg-white/6 border border-white/10 backdrop-blur-2xl p-8 rounded-2xl shadow-2xl space-y-6"
          >
            <h3 className="text-2xl font-semibold text-white text-center">
              Send a Message
            </h3>

            <input
              type="text"
              name="name"
              placeholder="Full Name"
              required
              className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-400 outline-none focus:border-emerald-400 transition"
            />

            <input
              type="email"
              name="email"
              placeholder="Email Address"
              required
              className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-400 outline-none focus:border-emerald-400 transition"
            />

            <textarea
              name="message"
              placeholder="Describe your issue or inquiry..."
              required
              rows="5"
              className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-400 outline-none focus:border-emerald-400 transition"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-black to-emerald-800 text-white py-3 rounded-lg font-semibold hover:scale-105 transition"
            >
              {loading ? "Sending..." : "Submit Request"}
            </button>

            {status && (
              <p className="text-center text-sm text-white">{status}</p>
            )}
          </form>
        </div>
      </div>

      <style jsx>{`

        .web3-grid{
          background-image:
            linear-gradient(rgba(16,185,129,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.15) 1px, transparent 1px);
          background-size: 60px 60px;
          animation: gridMove 20s linear infinite;
        }

        @keyframes gridMove{
          from{ transform: translateY(0px); }
          to{ transform: translateY(60px); }
        }

        .bubble-container{
          display:flex;
          justify-content:center;
          perspective:1000px;
        }

        .chat-bubble{
          width:120px;
          height:120px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          color:white;
          background: linear-gradient(135deg,#000000,#065f46);
          box-shadow:
            0 0 30px rgba(16,185,129,0.7),
            inset 0 0 20px rgba(255,255,255,0.1);
          animation: floatBubble 4s ease-in-out infinite;
          transform-style: preserve-3d;
        }

        .chat-bubble::after{
          content:"";
          position:absolute;
          bottom:-12px;
          width:20px;
          height:20px;
          background:#065f46;
          transform:rotate(45deg);
        }

        @keyframes floatBubble{
          0%{ transform: translateY(0px) rotateY(0deg); }
          50%{ transform: translateY(-15px) rotateY(180deg); }
          100%{ transform: translateY(0px) rotateY(360deg); }
        }

      `}</style>
    </div>
  )
}