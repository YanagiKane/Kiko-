import React, { useState } from 'react';
import { Menu, X, Home, Sparkles, LayoutGrid, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeContext';

interface HeaderProps {
    onNavigate: (page: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState('home');
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const getThemeIcon = () => {
    if (theme === 'system') return <Monitor size={18} />;
    if (theme === 'dark') return <Moon size={18} />;
    return <Sun size={18} />;
  };

  const handleLinkClick = (id: string) => {
    setActiveLink(id);
    setIsMenuOpen(false);
    onNavigate(id === 'home' ? 'top' : id);
  };

  const navLinks = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
  ];

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] w-[95%] max-w-5xl">
      <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-full shadow-2xl px-6 py-3 flex items-center justify-between transition-all duration-300">
        
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleLinkClick('home')}>
          <span className="text-white font-black text-2xl tracking-tight font-syne drop-shadow-md">Kiko</span>
        </div>

        {/* Desktop Navigation Pills */}
        <div className="hidden lg:flex items-center gap-2 bg-black/10 rounded-full p-1.5 backdrop-blur-sm">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeLink === link.id;
            
            return (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id)}
                className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all duration-300 font-bold text-sm ${
                  isActive 
                    ? 'bg-white text-blue-600 shadow-md scale-105' 
                    : 'text-white hover:bg-white/20'
                }`}
              >
                <Icon size={16} />
                {link.label}
              </button>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="hidden lg:flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
            title="Toggle Theme"
          >
             {getThemeIcon()}
          </button>

          <button 
            onClick={() => handleLinkClick('home')}
            className="bg-white text-blue-600 px-6 py-2.5 rounded-full hover:bg-blue-50 transition-all duration-300 font-black text-xs flex items-center gap-2 shadow-lg tracking-wide uppercase"
          >
            <Sparkles size={16} />
            Start Creating
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 lg:hidden">
            <button 
                onClick={toggleTheme}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
                {getThemeIcon()}
            </button>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white p-2.5 rounded-full hover:bg-white/20 transition-all"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="lg:hidden mt-3 bg-white/20 backdrop-blur-xl border border-white/30 rounded-[32px] shadow-2xl p-4 animate-fade-in">
          <div className="space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeLink === link.id;
              
              return (
                <button
                  key={link.id}
                  onClick={() => handleLinkClick(link.id)}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 font-bold ${
                    isActive 
                      ? 'bg-white text-blue-600 shadow-lg' 
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={20} />
                  {link.label}
                </button>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/20">
            <button 
                onClick={() => handleLinkClick('home')}
                className="w-full bg-white text-blue-600 px-5 py-4 rounded-2xl hover:bg-gray-50 transition-all duration-300 font-black flex items-center justify-center gap-2 shadow-lg uppercase tracking-wide"
            >
              <Sparkles size={20} />
              Start Creating
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Header;