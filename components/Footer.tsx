import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-apple-gray dark:bg-black border-t border-gray-200 dark:border-white/10 py-12">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-600 mb-4">
          Copyright © {new Date().getFullYear()} LYNX. All rights reserved.
        </p>
        <div className="flex justify-center gap-6 text-xs text-gray-500 dark:text-gray-500">
           <a href="#" className="hover:underline">Privacy Policy</a>
           <a href="#" className="hover:underline">Terms of Use</a>
           <a href="#" className="hover:underline">Legal</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;