import React, { useState } from 'react';
import { ArrowRight, Key, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { setStoredApiKey } from '../services/geminiService';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate network delay for "Signing In" feel
    await new Promise(r => setTimeout(r, 800));

    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
        setError("Please enter a valid API Key.");
        setIsLoading(false);
        return;
    }

    if (!trimmedKey.startsWith('AIza')) {
        setError("Invalid Key format. Google API Keys usually start with 'AIza'.");
        setIsLoading(false);
        return;
    }

    setStoredApiKey(trimmedKey);
    
    // Simulate verification success
    setTimeout(() => {
        setIsLoading(false);
        onLogin();
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full z-0">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse-slow" />
             <div className="absolute top-0 left-0 w-full h-full bg-white/10 backdrop-blur-[2px]" />
        </div>

        <div className="relative z-10 w-full max-w-md animate-fade-in">
            <div className="bg-white/70 dark:bg-black/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-2xl rounded-[40px] p-8 md:p-12">
                
                <div className="flex flex-col items-center text-center mb-10">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-6 rotate-3">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-syne font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                        Welcome to Kiko
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                        Your professional AI studio. Sign in to start creating.
                    </p>
                </div>

                <form onSubmit={handleConnect} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">
                            Google API Key
                        </label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                <Key className="w-5 h-5" />
                            </div>
                            <input 
                                type="password" 
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all font-medium"
                                placeholder="Paste your key here..."
                            />
                        </div>
                        <div className="mt-3 flex justify-end">
                             <a 
                                href="https://aistudio.google.com/app/apikey" 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                             >
                                Get a free key <ArrowRight className="w-3 h-3" />
                             </a>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <span className="loading loading-spinner loading-sm text-white"></span>
                                <span>Verifying...</span>
                            </>
                        ) : (
                            <>
                                <span>Connect Account</span>
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-200/50 dark:border-white/5 text-center">
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                        By connecting, you agree to store your API credentials locally on this device. Kiko communicates directly with Google's servers.
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Login;