import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ImageUploader from './components/ImageUploader';
import EnhancementControls from './components/EnhancementControls';
import ComparisonView from './components/ComparisonView';
import BatchQueue from './components/BatchQueue';
import SplitText from './components/SplitText';
import Login from './components/Login';
import { ThemeProvider } from './components/ThemeContext';
import { EnhancementConfig, EnhancementType, AspectRatio, ProcessedImage, BatchItem } from './types';
import { enhanceImage, getStoredApiKey, setStoredApiKey, clearStoredApiKey } from './services/geminiService';
import { enhanceWithFal } from './services/falService';
import { enhanceWithCloudinary } from './services/cloudinaryService';
import { AlertCircle, X, Home, Download, MoreHorizontal, ArrowLeft, Image as ImageIcon, Trash2, Wand2, Sparkles, Upload, Hash, Layout, Monitor, Instagram, Smartphone, Youtube, RefreshCcw, Zap, Layers, Settings, Key, LogOut } from 'lucide-react';

const TAGLINES = [
    { title: "Refine reality.", subtitle: "Instantly." },
    { title: "Dream deeper.", subtitle: "Create." },
    { title: "Illuminate.", subtitle: "Your Vision." },
    { title: "Kiko", subtitle: "Shining Light." },
    { title: "Reimagine.", subtitle: "Everything." }
];

const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mode, setMode] = useState<'landing' | 'single' | 'batch'>('landing');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [processedResult, setProcessedResult] = useState<ProcessedImage | null>(null);
  const cancelSingleRef = useRef(false);
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const cancelBatchRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [tagline, setTagline] = useState(TAGLINES[0]);
  const [landingTab, setLandingTab] = useState<'enhance' | 'generate'>('enhance');
  const [genPrompt, setGenPrompt] = useState('');
  const [genReference, setGenReference] = useState<string | undefined>(undefined);
  const genRefInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState<EnhancementConfig>({
    types: [EnhancementType.GENERAL],
    aspectRatio: AspectRatio.AUTO,
    imageCount: 1,
    model: 'gemini-2.5-flash-image'
  });

  useEffect(() => {
    const random = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
    setTagline(random);
    
    // Check Auth
    const key = getStoredApiKey();
    if (key) {
        setApiKey(key);
        setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
      const key = getStoredApiKey();
      setApiKey(key);
      setIsAuthenticated(true);
  };

  const handleSignOut = () => {
      clearStoredApiKey();
      setApiKey('');
      setIsAuthenticated(false);
      handleReset();
  };

  // ... (Other handlers like getRatioIcon, getDimensions, etc. same as before)
  const getRatioIcon = (ratio: AspectRatio) => {
    switch(ratio) {
        case AspectRatio.SQUARE: return <Instagram className="w-3 h-3" />;
        case AspectRatio.TALL: return <Smartphone className="w-3 h-3" />;
        case AspectRatio.WIDE: return <Youtube className="w-3 h-3" />;
        case AspectRatio.PORTRAIT: return <Layout className="w-3 h-3" />;
        case AspectRatio.LANDSCAPE: return <Monitor className="w-3 h-3" />;
        default: return <Layout className="w-3 h-3" />;
    }
  };

  const handleNavigate = (page: string) => {
      if (page === 'top' || page === 'overview') {
          setMode('landing');
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const getDimensions = (src: string): Promise<{w: number, h: number}> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 0, h: 0 });
        img.src = src;
    });
  };

  const handleImageSelect = (base64: string, initialPrompt?: string) => {
    setHistory([base64]);
    setHistoryIndex(0);
    setProcessedResult(null); 
    setError(null);
    setMode('single');

    if (initialPrompt && initialPrompt.trim().length > 0) {
        setConfig(prev => ({ ...prev, types: [EnhancementType.EDIT], customPrompt: initialPrompt }));
    } else {
        setConfig(prev => ({ ...prev, types: [EnhancementType.GENERAL], customPrompt: '' }));
    }
  };

  const handleReplaceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  handleImageSelect(ev.target.result as string);
                  setShowMenu(false);
              }
          };
          reader.readAsDataURL(file);
      }
      if (replaceInputRef.current) replaceInputRef.current.value = '';
  };

  const handleBatchSelect = async (files: File[]) => {
    const newItems: BatchItem[] = await Promise.all(files.map(async (file) => {
      const preview = URL.createObjectURL(file);
      const dims = await getDimensions(preview);
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview, 
        status: 'pending',
        originalDims: dims
      };
    }));
    setBatchQueue(prev => [...prev, ...newItems]);
    setMode('batch');
    setError(null);
  };
  
  const handleAddMoreToBatch = async (files: File[]) => {
    const newItems: BatchItem[] = await Promise.all(files.map(async (file) => {
        const preview = URL.createObjectURL(file);
        const dims = await getDimensions(preview);
        return {
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview, 
            status: 'pending',
            originalDims: dims
        };
    }));
    setBatchQueue(prev => [...prev, ...newItems]);
  };

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90; 
        const remaining = 95 - prev;
        return prev + (remaining * 0.05) + 0.2; 
      });
    }, 150);
    return interval;
  };

  const handleGenReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setGenReference(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateImage = async () => {
    if (!genPrompt.trim()) return;
    setIsProcessing(true);
    setStatusMessage("Dreaming...");
    setError(null);
    const progressInterval = simulateProgress();
    const startTime = Date.now();

    try {
        const genConfig: EnhancementConfig = {
            ...config,
            types: [EnhancementType.GENERATION],
            model: 'gemini-2.5-flash-image',
            customPrompt: genPrompt,
            referenceImage: genReference
        };

        const results = await enhanceImage('', genConfig, setStatusMessage);
        const endTime = Date.now();

        if (results && results.length > 0) {
             const primary = results[0];
             setHistory([primary]);
             setHistoryIndex(0);
             if (results.length > 1) {
                 const dims = await getDimensions(primary);
                 setProcessedResult({
                    original: primary, 
                    enhanced: results,
                    config: genConfig,
                    originalDims: dims,
                    enhancedDims: dims,
                    processingTime: endTime - startTime
                 });
             } else {
                 setProcessedResult(null);
             }
             setMode('single');
             setConfig(prev => ({ 
                 ...prev, 
                 types: [EnhancementType.VARIATION], 
                 customPrompt: genPrompt,
                 model: 'gemini-2.5-flash-image',
                 imageCount: genConfig.imageCount
             }));
        }
    } catch (err: any) {
        if (err.message === 'MISSING_API_KEY') {
            setIsAuthenticated(false); // Log out to force login
        } else {
            setError(err.message || 'Generation failed.');
        }
    } finally {
        clearInterval(progressInterval);
        setIsProcessing(false);
        setProgress(0);
        setStatusMessage("Idle");
    }
  };

  const handleProcessSingle = async () => {
    if (historyIndex < 0 || !history[historyIndex]) return;
    setIsProcessing(true);
    cancelSingleRef.current = false;
    setStatusMessage("Starting engine...");
    setError(null);
    const progressInterval = simulateProgress();
    const startTime = Date.now();

    try {
      const currentImage = history[historyIndex];
      let enhancedBase64List: string[] = [];
      const onStatusUpdate = (msg: string) => setStatusMessage(msg);
      
      const effectiveConfig = { ...config };

      if (config.model === 'fal-ai/drct-super-resolution') {
        enhancedBase64List = await enhanceWithFal(currentImage, onStatusUpdate);
      } else if (config.model === 'cloudinary-ai') {
        enhancedBase64List = await enhanceWithCloudinary(currentImage, effectiveConfig, onStatusUpdate);
      } else {
        enhancedBase64List = await enhanceImage(currentImage, effectiveConfig, onStatusUpdate);
      }
      
      if (cancelSingleRef.current) {
        clearInterval(progressInterval);
        setIsProcessing(false);
        setProgress(0);
        return;
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      clearInterval(progressInterval);
      setProgress(100);
      setStatusMessage("Finalizing...");
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (cancelSingleRef.current) {
        setIsProcessing(false);
        return;
      }

      const originalDims = await getDimensions(currentImage);
      const enhancedDims = await getDimensions(enhancedBase64List[0]);

      setProcessedResult({
        original: currentImage,
        enhanced: enhancedBase64List,
        config: config,
        originalDims,
        enhancedDims,
        processingTime
      });
    } catch (err: any) {
      if (!cancelSingleRef.current) {
        console.error(err);
        if (err.message === 'MISSING_API_KEY') {
            setIsAuthenticated(false);
        } else {
            setError(err.message || 'Failed to process image. Please try again.');
        }
      }
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      setStatusMessage("Idle");
    }
  };

  const handleCancelSingle = () => {
    cancelSingleRef.current = true;
    setIsProcessing(false);
    setStatusMessage("Cancelled");
    setProgress(0);
  };

  const handleProcessBatch = async () => {
    const pendingItems = batchQueue.filter(i => i.status === 'pending');
    if (pendingItems.length === 0) return;
    setIsProcessing(true);
    cancelBatchRef.current = false;
    setError(null);

    for (const item of batchQueue) {
      if (item.status !== 'pending') continue;
      if (cancelBatchRef.current) break;

      setBatchQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));
      
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(item.file);
        });

        if (cancelBatchRef.current) break;

        let resultBase64List: string[] = [];
        const onStatusUpdate = (msg: string) => {}; 
        
        const effectiveConfig = { ...config };

        if (config.model === 'fal-ai/drct-super-resolution') {
          resultBase64List = await enhanceWithFal(base64, onStatusUpdate);
        } else if (config.model === 'cloudinary-ai') {
          resultBase64List = await enhanceWithCloudinary(base64, effectiveConfig, onStatusUpdate);
        } else {
          resultBase64List = await enhanceImage(base64, effectiveConfig, onStatusUpdate);
        }

        if (cancelBatchRef.current) break;

        const enhancedDims = await getDimensions(resultBase64List[0]);
        setBatchQueue(prev => prev.map(i => i.id === item.id ? { 
            ...i, 
            status: 'completed', 
            result: resultBase64List[0],
            enhancedDims: enhancedDims
        } : i));

      } catch (err: any) {
        if (cancelBatchRef.current) break;
        if (err.message === 'MISSING_API_KEY') {
            setIsAuthenticated(false);
            break;
        }
        setBatchQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'failed', error: err.message || 'Error' } : i));
      }
    }
    setIsProcessing(false);
  };

  const handleCancelBatch = () => {
    cancelBatchRef.current = true;
    setIsProcessing(false);
    setBatchQueue(prev => prev.map(i => i.status === 'processing' ? { ...i, status: 'pending' } : i));
  };

  const handleRemoveBatchItem = (id: string) => setBatchQueue(prev => prev.filter(i => i.id !== id));
  const handleClearBatch = () => setBatchQueue([]);
  
  const handleApply = (selectedImage: string) => {
    if (processedResult) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(selectedImage);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setProcessedResult(null);
    }
  };

  const handleDiscard = () => {
      setShowDiscardDialog(false);
      setProcessedResult(null);
  }
  
  const requestDiscard = () => setShowDiscardDialog(true);
  const confirmDiscardProject = () => {
      handleReset();
      setShowDiscardDialog(false);
  };

  const handleUndo = () => historyIndex > 0 && (setHistoryIndex(historyIndex - 1), setProcessedResult(null));
  const handleRedo = () => historyIndex < history.length - 1 && (setHistoryIndex(historyIndex + 1), setProcessedResult(null));

  const handleReset = () => {
    setHistory([]);
    setHistoryIndex(-1);
    setProcessedResult(null);
    setBatchQueue([]);
    setMode('landing');
    setError(null);
    setGenPrompt('');
    setGenReference(undefined);
    setConfig({
        types: [EnhancementType.GENERAL],
        aspectRatio: AspectRatio.AUTO,
        imageCount: 1,
        model: 'gemini-2.5-flash-image'
    });
  };
  
  const handleDownloadCurrent = () => {
      const active = history[historyIndex];
      if (!active) return;
      const link = document.createElement('a');
      link.href = active;
      link.download = `kiko-original-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowMenu(false);
  };

  const handleSaveApiKey = () => {
      setStoredApiKey(apiKey);
      setShowSettings(false);
      setError(null);
  };

  const activeImage = historyIndex >= 0 ? history[historyIndex] : null;

  // --- Auth Gate ---
  if (!isAuthenticated) {
      return (
          <ThemeProvider>
              <div className="relative z-10 min-h-screen flex flex-col font-sans text-gray-900 dark:text-white">
                 <Login onLogin={handleLogin} />
                 <Footer />
              </div>
          </ThemeProvider>
      );
  }

  return (
    <div className="min-h-screen relative font-sans transition-colors duration-300 text-gray-900 dark:text-white pb-20">
      <div className="relative z-10 min-h-screen flex flex-col">
        <Header onNavigate={handleNavigate} onOpenSettings={() => setShowSettings(true)} />

        <main className="flex-grow pt-40 px-4 pb-12">
          
          {mode === 'landing' && (
            <div className="flex flex-col lg:flex-row justify-center items-start lg:gap-12" id="top">
              <div className="max-w-4xl w-full text-center mt-6 lg:mt-12 flex-1">
                
                <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white drop-shadow-sm mb-6 leading-tight font-sans">
                  <SplitText text={tagline.title} className="inline-block" delay={40} />
                  <br className="hidden md:inline" />
                  <SplitText text={tagline.subtitle} className="inline-block text-white/80" delay={40} />
                </h1>
                
                <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto font-medium leading-relaxed animate-fade-in drop-shadow-sm" style={{ animationDelay: '0.4s' }}>
                  Professional AI image enhancement.
                </p>

                {isProcessing && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
                      <div className="flex flex-col items-center">
                          <span className="loading loading-spinner loading-lg text-white mb-4"></span>
                          <span className="text-lg font-bold text-white mb-2">{statusMessage}</span>
                          <div className="w-64 h-1.5 bg-white/20 rounded-full overflow-hidden">
                              <div className="h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
                          </div>
                      </div>
                  </div>
                )}
                
                <div className="w-full max-w-[500px] mx-auto animate-fade-in relative" style={{ animationDelay: '0.6s' }}>
                  <div className="flex justify-center mb-8">
                      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-lg border border-white/30 rounded-full p-1.5 shadow-2xl">
                          <button onClick={() => setLandingTab('enhance')} className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-all duration-300 font-medium text-sm ${landingTab === 'enhance' ? 'bg-white text-blue-600 shadow-lg scale-105' : 'text-white hover:bg-white/20'}`}>
                            <ImageIcon className="w-4 h-4" /> Enhance
                          </button>
                          <button onClick={() => setLandingTab('generate')} className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-all duration-300 font-medium text-sm ${landingTab === 'generate' ? 'bg-white text-blue-600 shadow-lg scale-105' : 'text-white hover:bg-white/20'}`}>
                            <Wand2 className="w-4 h-4" /> Generate
                          </button>
                      </div>
                  </div>

                  {landingTab === 'enhance' ? (
                     <ImageUploader onImageSelect={handleImageSelect} onBatchSelect={handleBatchSelect} />
                  ) : (
                     <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-[32px] shadow-2xl p-6">
                        <div className="mb-4">
                           <label className="text-xs font-bold text-white/90 uppercase tracking-wider mb-2 block flex items-center gap-2">
                              <Sparkles className="w-3.5 h-3.5 text-white" /> Describe
                           </label>
                           <textarea className="w-full bg-white/10 dark:bg-black/20 border border-white/20 rounded-2xl p-4 text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none resize-none min-h-[120px] text-base" placeholder="A futuristic city..." value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} />
                        </div>
                        <div className="mb-4">
                            <label className="text-[10px] font-bold text-white/80 uppercase tracking-wider mb-2 block">Aspect Ratio</label>
                            <div className="grid grid-cols-5 gap-2">
                                {[AspectRatio.SQUARE, AspectRatio.PORTRAIT, AspectRatio.LANDSCAPE, AspectRatio.WIDE, AspectRatio.TALL].map((ratio) => (
                                    <button key={ratio} onClick={() => setConfig(prev => ({ ...prev, aspectRatio: ratio }))} className={`flex flex-col items-center justify-center py-2 rounded-xl border transition-all ${config.aspectRatio === ratio ? 'bg-white text-blue-600 border-transparent shadow-md' : 'bg-white/10 border-transparent text-white/70 hover:bg-white/20'}`}>
                                        {getRatioIcon(ratio)}
                                        <span className="text-[9px] font-bold mt-1">{ratio}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white/10 dark:bg-black/20 rounded-xl p-4 border border-white/20 mb-4">
                           <div className="flex justify-between items-center mb-4">
                               <label className="text-[10px] font-bold text-white/90 uppercase tracking-wider flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" />Count</label>
                               <span className="text-[10px] font-bold text-blue-600 bg-white px-2 py-1 rounded-md border border-white/20">{config.imageCount} / 5</span>
                           </div>
                           <div className="relative h-8 flex items-center select-none">
                               <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white transition-all duration-300 ease-out" style={{ width: `${(config.imageCount - 1) * 25}%` }} /></div>
                               <div className="absolute left-0 right-0 flex justify-between px-0.5">
                                   {[1, 2, 3, 4, 5].map((num) => (
                                      <button key={num} onClick={() => setConfig(prev => ({ ...prev, imageCount: num }))} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 border-2 ${config.imageCount >= num ? 'bg-white text-blue-600 border-white scale-110 shadow-sm' : 'bg-white/10 text-white/50 border-white/10 hover:border-white/30'}`}>{num}</button>
                                   ))}
                               </div>
                           </div>
                        </div>
                        <button onClick={handleGenerateImage} disabled={!genPrompt.trim()} className="w-full py-4 bg-white text-blue-600 rounded-2xl font-bold text-base shadow-lg hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            <Wand2 className="w-5 h-5" /> Generate Image
                        </button>
                     </div>
                  )}
                </div>
              </div>

              <div className="hidden lg:block w-80 mt-12 animate-fade-in" style={{ animationDelay: '0.8s' }}>
                   <div className="bg-white/20 dark:bg-black/20 backdrop-blur-2xl border border-white/30 dark:border-white/10 rounded-[32px] p-6 sticky top-32 shadow-lg">
                       <h3 className="font-syne text-xl font-bold text-white mb-4">Why Kiko?</h3>
                       <div className="space-y-6">
                           <div className="flex gap-4">
                               <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/10"><Zap className="w-5 h-5" /></div>
                               <div><h4 className="text-sm font-bold text-white">Gemini 3 Powered</h4><p className="text-xs text-white/80 leading-relaxed mt-1">Utilizing Google's latest multimodal models.</p></div>
                           </div>
                           <div className="flex gap-4">
                               <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/10"><Wand2 className="w-5 h-5" /></div>
                               <div><h4 className="text-sm font-bold text-white">Magic Edit</h4><p className="text-xs text-white/80 leading-relaxed mt-1">Use natural language to add, remove, or modify elements.</p></div>
                           </div>
                       </div>
                   </div>
              </div>
            </div>
          )}

          {mode === 'single' && (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <div className="rounded-[32px] overflow-hidden bg-white/30 dark:bg-black/30 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-2xl">
                  <div className="px-6 py-4 flex items-center justify-between border-b border-white/20">
                    <div className="flex items-center gap-3">
                        <button onClick={requestDiscard} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" /></button>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Image Editor</h2>
                    </div>
                    <div className="flex items-center gap-2 relative" ref={menuRef}>
                        <button onClick={() => setShowMenu(!showMenu)} className={`p-2 rounded-full transition-all ${showMenu ? 'bg-white/20' : 'hover:bg-white/10'}`}><MoreHorizontal className="w-5 h-5 text-gray-800 dark:text-white" /></button>
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white/80 dark:bg-black/80 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 overflow-hidden z-[60] animate-fade-in origin-top-right">
                                <div className="p-1">
                                    <button onClick={() => replaceInputRef.current?.click()} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/20 flex items-center gap-2 text-sm text-gray-800 dark:text-white font-medium"><RefreshCcw className="w-4 h-4" /> Replace Image</button>
                                    <button onClick={handleDownloadCurrent} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/20 flex items-center gap-2 text-sm text-gray-800 dark:text-white font-medium"><Download className="w-4 h-4" /> Download Original</button>
                                    <div className="h-px bg-white/20 my-1" />
                                    <button onClick={requestDiscard} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-red-500/10 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium"><Trash2 className="w-4 h-4" /> Discard Project</button>
                                </div>
                            </div>
                        )}
                        <input type="file" ref={replaceInputRef} className="hidden" accept="image/*" onChange={handleReplaceImage} />
                    </div>
                  </div>
                  <div className="relative w-full bg-white/10 dark:bg-black/10 min-h-[300px] flex items-center justify-center">
                    {isProcessing && !processedResult && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-md">
                            <div className="flex flex-col items-center">
                                <span className="loading loading-spinner loading-lg text-blue-600 dark:text-white mb-3"></span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{statusMessage}</span>
                                <div className="w-48 h-1 bg-white/30 rounded-full mt-4 overflow-hidden"><div className="h-full bg-blue-600 dark:bg-white transition-all duration-300" style={{ width: `${progress}%` }} /></div>
                                <button onClick={handleCancelSingle} className="mt-4 text-xs text-red-500 hover:text-red-600 font-bold uppercase tracking-wide">Cancel</button>
                            </div>
                        </div>
                    )}
                    <div className="w-full relative">
                          {processedResult ? (
                              <ComparisonView beforeImage={processedResult.original} afterImages={processedResult.enhanced} beforeDims={processedResult.originalDims} afterDims={processedResult.enhancedDims} processingTime={processedResult.processingTime} onDiscard={handleDiscard} onApply={handleApply} />
                          ) : (
                              <div className="w-full flex justify-center py-4"><img src={activeImage || ''} alt="Original" className="w-full h-auto max-h-[70vh] object-contain" /></div>
                          )}
                    </div>
                  </div>
                  <div className="bg-white/20 dark:bg-black/20 p-4 border-t border-white/20 backdrop-blur-sm">
                    <EnhancementControls config={config} onChange={setConfig} onProcess={handleProcessSingle} isProcessing={isProcessing} canUndo={historyIndex > 0 && !processedResult} canRedo={historyIndex < history.length - 1 && !processedResult} onUndo={handleUndo} onRedo={handleRedo} />
                  </div>
              </div>
            </div>
          )}

          {mode === 'batch' && (
            <div className="max-w-5xl mx-auto animate-fade-in">
              <div className="rounded-[32px] overflow-hidden bg-white/30 dark:bg-black/30 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-2xl">
                  <div className="px-6 py-4 flex items-center justify-between border-b border-white/20">
                     <div className="flex items-center gap-3">
                        <button onClick={requestDiscard} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" /></button>
                        <div><h2 className="text-lg font-bold text-gray-900 dark:text-white">Batch Studio</h2><p className="text-xs text-gray-600 dark:text-gray-300">Processing {batchQueue.length} images</p></div>
                     </div>
                     {isProcessing && <button onClick={handleCancelBatch} className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 bg-red-500/10 rounded-full">STOP BATCH</button>}
                  </div>
                  <div className="relative w-full bg-white/10 dark:bg-black/10 h-[500px] overflow-hidden">
                       <BatchQueue items={batchQueue} onRemove={handleRemoveBatchItem} onClear={handleClearBatch} isProcessing={isProcessing} onHome={handleReset} onAddMore={handleAddMoreToBatch} />
                  </div>
                  <div className="bg-white/20 dark:bg-black/20 p-4 border-t border-white/20 backdrop-blur-sm">
                      <EnhancementControls config={config} onChange={setConfig} onProcess={handleProcessBatch} isProcessing={isProcessing} canUndo={false} canRedo={false} onUndo={() => {}} onRedo={() => {}} />
                  </div>
              </div>
            </div>
          )}
          
          {showDiscardDialog && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in">
                  <div className="bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-white/40 dark:border-white/10 p-6 rounded-3xl shadow-2xl max-w-sm w-full mx-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Discard Project?</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to discard your current work?</p>
                      <div className="flex gap-3">
                          <button onClick={() => setShowDiscardDialog(false)} className="flex-1 py-2 rounded-xl bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 text-gray-800 dark:text-white font-medium transition-colors">Keep Editing</button>
                          <button onClick={confirmDiscardProject} className="flex-1 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 font-medium transition-colors">Discard</button>
                      </div>
                  </div>
              </div>
          )}

          {showSettings && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in">
                <div className="bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-white/40 dark:border-white/10 p-6 rounded-3xl shadow-2xl max-w-md w-full mx-4 relative">
                   <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
                   <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg"><Key className="w-6 h-6" /></div>
                      <div><h3 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h3><p className="text-xs text-gray-500 dark:text-gray-400">Account & Preferences</p></div>
                   </div>
                   <div className="mb-6">
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2 block">API Key</label>
                      <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key" className="w-full bg-white/50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                   </div>
                   <div className="flex gap-3">
                       <button onClick={handleSignOut} className="flex-1 py-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center justify-center gap-2"><LogOut className="w-4 h-4" /> Sign Out</button>
                       <button onClick={handleSaveApiKey} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg">Save Changes</button>
                   </div>
                </div>
             </div>
          )}

          {error && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-red-500 text-white rounded-full shadow-lg flex items-center gap-3 animate-slide-up font-medium">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
              <button onClick={() => setError(null)}><X className="w-4 h-4 text-white/80 hover:text-white" /></button>
            </div>
          )}

        </main>
        
        {mode === 'landing' && <Footer />}
      </div>
    </div>
  );
};

const App: React.FC = () => (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
);

export default App;