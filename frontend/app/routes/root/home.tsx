import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import Lottie from "lottie-react";
import agendaAnimation from "@/assets/Agenda5.json";
import { Moon, Sun } from "lucide-react";

const Homepage = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [activeKey, setActiveKey] = useState<number | null>(null);
  
  const handleKeyPress = (index: number) => {
    setActiveKey(index);
    setTimeout(() => setActiveKey(null), 200);
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row items-center justify-between px-4 md:px-16 relative overflow-hidden transition-colors duration-300 ${darkMode
      ? "bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 text-white"
      : "bg-gradient-to-br from-gray-50 to-blue-50 text-gray-900"
      }`} style={{ overflow: 'hidden' }}>
      
      {/* Dark mode toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        className={`absolute top-6 right-6 z-50 p-2 rounded-full ${darkMode
          ? "bg-gray-700 hover:bg-gray-600 text-yellow-300"
          : "bg-gray-200 hover:bg-gray-300 text-gray-700"
          } transition-all duration-300 shadow-md`}
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Background glow - Reduced for mobile */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className={`absolute top-1/4 left-1/4 w-32 h-32 md:w-64 md:h-64 rounded-full filter blur-3xl opacity-40 ${darkMode ? "bg-blue-900" : "bg-blue-100"
          }`}></div>
        <div className={`absolute bottom-1/3 right-1/3 w-40 h-40 md:w-80 md:h-80 rounded-full filter blur-3xl opacity-40 ${darkMode ? "bg-purple-900" : "bg-purple-100"
          }`}></div>
      </div>

      {/* Left Section - Mobile optimized */}
      <div className="w-full md:w-1/2 z-10 py-8 px-4 md:px-8 mt-4 md:mt-0">
        <div className="max-w-lg mx-auto md:mx-0">
          <h1 className={`text-3xl md:text-5xl font-bold mb-4 leading-tight ${darkMode ? "text-white" : "text-gray-900"
            }`}>
            Your fastest path <br /> to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Productivity
            </span>
          </h1>
          <p className={`text-sm md:text-md mb-6 ${darkMode ? "text-gray-300" : "text-gray-600"
            }`}>
            Build, organize, and manage your tasks with ease using TaskSync. From individual users to teams.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Link to="/sign-in" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto px-6 py-3 md:px-8 md:py-4 text-md md:text-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                Login
              </Button>
            </Link>
            <Link to="/sign-up" className="w-full sm:w-auto">
              <Button
                variant={darkMode ? "secondary" : "outline"}
                className={`w-full sm:w-auto px-6 py-3 md:px-8 md:py-4 text-md md:text-lg rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ${darkMode
                  ? "bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
                  : "border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400"
                  }`}
              >
                Sign Up
              </Button>
            </Link>
          </div>

          {/* Mobile-friendly animation */}
          <div className="w-full max-w-xs mx-auto md:max-w-md md:-ml-8">
            <Lottie
              animationData={agendaAnimation}
              loop
              className="scale-100 md:scale-110"
            />
          </div>
        </div>
      </div>

      {/* Right: Animated grid - Mobile version */}
      <div className="block md:hidden w-full h-64 relative z-0 mt-8 overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-12 grid-rows-4 gap-1 perspective-1000">
          {Array.from({ length: 48 }).map((_, i) => {
            const depth = Math.random() * 30;
            const delay = Math.random() * 2;
            const duration = 3 + Math.random() * 3;

            const bgClass = darkMode
              ? i % 5 === 0
                ? "bg-purple-900/30"
                : i % 7 === 0
                  ? "bg-blue-900/30"
                  : "bg-gray-700/20"
              : i % 5 === 0
                ? "bg-purple-500/20"
                : i % 7 === 0
                  ? "bg-blue-500/20"
                  : "bg-gray-200/20";

            return (
              <div
                key={i}
                className={`w-full h-full rounded-sm ${bgClass} cursor-pointer transition-all duration-100 ease-out ${activeKey === i
                    ? darkMode
                      ? "ring-1 ring-blue-400 scale-105 brightness-125"
                      : "ring-1 ring-blue-500 scale-105 brightness-110"
                    : "hover:brightness-110"
                  }`}
                style={{
                  transform: `translateZ(${depth}px)`,
                  animation: `float3d ${duration}s ease-in-out ${delay}s infinite alternate`,
                  boxShadow: darkMode
                    ? "0 0 5px rgba(0,0,0,0.2)"
                    : "0 0 5px rgba(0,0,0,0.05)",
                }}
                onClick={() => handleKeyPress(i)}
              ></div>
            );
          })}
        </div>
      </div>

      {/* Right: Animated grid - Desktop version */}
      <div className="hidden md:block w-full md:w-1/2 h-full absolute right-0 top-0 bottom-0 z-0 overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 gap-1.5 perspective-1000">
          {Array.from({ length: 72 }).map((_, i) => {
            const depth = Math.random() * 50;
            const delay = Math.random() * 2;
            const duration = 3 + Math.random() * 3;

            const bgClass = darkMode
              ? i % 5 === 0
                ? "bg-purple-900/30"
                : i % 7 === 0
                  ? "bg-blue-900/30"
                  : "bg-gray-700/20"
              : i % 5 === 0
                ? "bg-purple-500/20"
                : i % 7 === 0
                  ? "bg-blue-500/20"
                  : "bg-gray-200/20";

            return (
              <div
                key={i}
                className={`w-full h-full rounded-sm ${bgClass} cursor-pointer transition-all duration-100 ease-out ${activeKey === i
                    ? darkMode
                      ? "ring-2 ring-blue-400 scale-105 brightness-125"
                      : "ring-2 ring-blue-500 scale-105 brightness-110"
                    : "hover:brightness-110"
                  }`}
                style={{
                  transform: `translateZ(${depth}px)`,
                  animation: `float3d ${duration}s ease-in-out ${delay}s infinite alternate`,
                  boxShadow: darkMode
                    ? "0 0 10px rgba(0,0,0,0.2)"
                    : "0 0 10px rgba(0,0,0,0.05)",
                }}
                onClick={() => handleKeyPress(i)}
              ></div>
            );
          })}
        </div>

        {/* Floating cards - Desktop only */}
        <div className={`absolute top-[20%] right-[25%] w-48 h-32 rounded-xl shadow-lg p-4 transform rotate-3 animate-float ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white"
          }`}>
          <div className={`h-3 w-3/4 rounded-full mb-2 ${darkMode ? "bg-blue-900/50" : "bg-blue-100"
            }`}></div>
          <div className={`h-3 w-1/2 rounded-full ${darkMode ? "bg-blue-900/50" : "bg-blue-100"
            }`}></div>
        </div>
        <div className={`absolute top-[28%] right-[30%] w-56 h-40 rounded-xl shadow-lg p-4 transform -rotate-2 animate-float-delay ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white"
          }`}>
          <div className="flex items-center mb-2">
            <div className={`h-3 w-3 rounded-full mr-2 ${darkMode ? "bg-green-500" : "bg-green-400"
              }`}></div>
            <div className={`h-3 w-1/2 rounded-full ${darkMode ? "bg-green-900/50" : "bg-green-100"
              }`}></div>
          </div>
          <div className={`h-3 w-3/4 rounded-full mb-2 ${darkMode ? "bg-green-900/50" : "bg-green-100"
            }`}></div>
          <div className={`h-3 w-1/3 rounded-full ${darkMode ? "bg-green-900/50" : "bg-green-100"
            }`}></div>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes float3d {
          0% {
            transform: translateZ(0px) rotateX(0deg) rotateY(0deg);
            opacity: 0.8;
          }
          100% {
            transform: translateZ(30px) rotateX(5deg) rotateY(5deg);
            opacity: 1;
          }
        }
        @keyframes float {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(2deg);
          }
          100% {
            transform: translateY(0px) rotate(0deg);
          }
        }
        @keyframes float-delay {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(-3deg);
          }
          100% {
            transform: translateY(0px) rotate(0deg);
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delay {
          animation: float-delay 7s ease-in-out 1s infinite;
        }
      `}</style>
    </div>
  );
};

export default Homepage;