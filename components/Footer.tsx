import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-auto bg-white/10 dark:bg-black/20 backdrop-blur-lg border-t border-white/20">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col items-center text-center space-y-6">
            <h3 className="text-3xl font-syne font-black text-gray-900 dark:text-white tracking-tight">Kiko</h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium max-w-lg leading-relaxed">
              Advanced AI image enhancement for creators. Upscale, restore, and reimagine your visuals with state-of-the-art generative models.
            </p>

            <div className="flex flex-wrap justify-center gap-8 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pt-4">
                <a href="#" className="hover:text-blue-600 dark:hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-blue-600 dark:hover:text-white transition-colors">Terms</a>
                <a href="#" className="hover:text-blue-600 dark:hover:text-white transition-colors">Support</a>
                <a href="#" className="hover:text-blue-600 dark:hover:text-white transition-colors">API</a>
            </div>

            <div className="pt-8 border-t border-gray-200/50 dark:border-white/10 w-full flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                <p>© {new Date().getFullYear()} Kiko AI. All rights reserved.</p>
                <p>Powered by Gemini 3</p>
            </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;