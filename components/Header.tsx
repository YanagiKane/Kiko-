import React, { useState } from 'react';
import { X, Sun, Moon, Monitor, FileCode } from 'lucide-react';
import { useTheme } from './ThemeContext';

const TwoLineMenu = ({ className }: { className?: string }) => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <line x1="4" x2="20" y1="9" y2="9" />
    <line x1="4" x2="20" y1="15" y2="15" />
  </svg>
);

interface HeaderProps {
    onNavigate: (page: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleNavClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    onNavigate(id);
    setIsMenuOpen(false);
  };

  const getThemeIcon = () => {
    if (theme === 'system') return <Monitor size={16} className="fill-current" />;
    if (theme === 'dark') return <Moon size={16} className="fill-current" />;
    return <Sun size={16} className="fill-current" />;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] px-4 py-4 flex justify-center">
      <div className="w-full max-w-5xl">
        {/* 
            Glassmorphic container based on Mobbin reference.
        */}
        <div className={`
            relative backdrop-blur-xl 
            bg-gray-200/80 dark:bg-black/70 
            border border-white/40 dark:border-white/10 
            shadow-none dark:shadow-xl
            rounded-[2rem]
            transition-all duration-300 ease-in-out
        `}>
          <div className="flex items-center justify-between px-6 py-3">
            {/* Logo */}
            <div className="flex items-center">
              <a href="#" onClick={(e) => handleNavClick(e, 'top')} className="text-xl font-black tracking-tight font-syne group">
                <span className="bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
                  LYNX
                </span>
              </a>
            </div>

            {/* Desktop Menu - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#overview" onClick={(e) => handleNavClick(e, 'overview')} className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                Overview
              </a>
              <a href="#docs" onClick={(e) => handleNavClick(e, 'docs')} className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5" />
                Documentation
              </a>
              
              <button 
                onClick={toggleTheme}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                 {getThemeIcon()}
              </button>

              <button 
                onClick={() => onNavigate('top')}
                className="bg-black dark:bg-white text-white dark:text-black px-5 py-2 rounded-full text-xs font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                Start Enhancing
              </button>
            </div>

            {/* Mobile Actions & Menu Button */}
            <div className="flex items-center gap-3 md:hidden">
                 <button 
                    onClick={toggleTheme}
                    className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                    {isDark ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isMenuOpen ? (
                    <X className="w-6 h-6 text-gray-900 dark:text-white" />
                  ) : (
                    <TwoLineMenu className="w-6 h-6 text-gray-900 dark:text-white" />
                  )}
                </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-gray-200/10 dark:border-white/5">
              <div className="px-6 py-4 space-y-4 animate-fade-in">
                <a href="#overview" onClick={(e) => handleNavClick(e, 'overview')} className="block text-lg font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors">
                  Overview
                </a>
                <a href="#docs" onClick={(e) => handleNavClick(e, 'docs')} className="block text-lg font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors flex items-center gap-2">
                  <FileCode className="w-5 h-5" />
                  Documentation
                </a>
                <button 
                  onClick={() => { onNavigate('top'); setIsMenuOpen(false); }}
                  className="w-full bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
                >
                  Start Enhancing
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Header;