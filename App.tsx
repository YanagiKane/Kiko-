import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ImageUploader from './components/ImageUploader';
import EnhancementControls from './components/EnhancementControls';
import ComparisonView from './components/ComparisonView';
import MaskEditor from './components/MaskEditor';
import BatchQueue from './components/BatchQueue';
import SplitText from './components/SplitText';
import Documentation from './components/Documentation';
import { ThemeProvider } from './components/ThemeContext';
import { EnhancementConfig, EnhancementType, AspectRatio, ProcessedImage, BatchItem } from './types';
import { enhanceImage } from './services/geminiService';
import { enhanceWithFal } from './services/falService';
import { enhanceWithCloudinary } from './services/cloudinaryService';
import { AlertCircle, X, Home, Download, MoreHorizontal, ArrowLeft, Image as ImageIcon, Trash2, Wand2, Sparkles, Upload, Hash, Layout, Monitor, Instagram, Smartphone, Youtube } from 'lucide-react';

const AppContent: React.FC = () => {
  const [mode, setMode] = useState<'landing' | 'single' | 'batch' | 'docs'>('landing');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [processedResult, setProcessedResult] = useState<ProcessedImage | null>(null);
  const cancelSingleRef = useRef(false);
  const [activeImageDims, setActiveImageDims] = useState<{w: number, h: number} | null>(null);
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const cancelBatchRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMaskingMode, setIsMaskingMode] = useState(false);

  // Landing Page State
  const [landingTab, setLandingTab] = useState<'enhance' | 'generate'>('enhance');
  const [genPrompt, setGenPrompt] = useState('');
  const [genReference, setGenReference] = useState<string | undefined>(undefined);
  const genRefInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState<EnhancementConfig>({
    types: [EnhancementType.GENERAL],
    aspectRatio: AspectRatio.AUTO,
    imageCount: 1,
    model: 'gemini-2.5-flash-image'
  });

  // Click outside to close menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavigate = (page: string) => {
      if (page === 'docs') {
          setMode('docs');
          window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (page === 'top' || page === 'overview') {
          if (mode === 'docs') setMode('landing');
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
    setActiveImageDims(null);
    setIsMaskingMode(false);

    if (initialPrompt && initialPrompt.trim().length > 0) {
        setConfig(prev => ({ ...prev, types: [EnhancementType.EDIT], customPrompt: initialPrompt }));
    } else {
        setConfig(prev => ({ ...prev, types: [EnhancementType.GENERAL], customPrompt: '' }));
    }
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
            ...config, // Keep aspect ratio and count from state
            types: [EnhancementType.GENERATION],
            model: 'gemini-2.5-flash-image', // Good default for generation
            customPrompt: genPrompt,
            referenceImage: genReference
        };

        const results = await enhanceImage('', genConfig, setStatusMessage);
        const endTime = Date.now();

        if (results && results.length > 0) {
             const primary = results[0];
             setHistory([primary]);
             setHistoryIndex(0);
             
             // If we generated multiple images, we use ProcessedResult to show them in ComparisonView (which supports picking)
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
                 setProcessedResult(null); // No before/after for pure gen initially if only 1
             }
             
             setMode('single');
             setIsMaskingMode(false);
             
             // Pre-configure editor for next steps
             setConfig(prev => ({ 
                 ...prev, 
                 types: [EnhancementType.VARIATION], // Set to variation as a logical next step
                 customPrompt: genPrompt,
                 model: 'gemini-2.5-flash-image',
                 imageCount: genConfig.imageCount
             }));
        }

    } catch (err: any) {
        console.error(err);
        setError(err.message || 'Generation failed.');
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

      // Calculate Dimensions of first result
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
      // Reset masking mode
      setIsMaskingMode(false);
    } catch (err: any) {
      if (!cancelSingleRef.current) {
        console.error(err);
        setError(err.message || 'Failed to process image. Please try again.');
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

        if (cancelBatchRef.current) {
           setBatchQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'pending' } : i));
           break;
        }

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

        if (cancelBatchRef.current) {
           setBatchQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'pending' } : i));
           break;
        }

        // For batch, we just take the first result
        const enhancedDims = await getDimensions(resultBase64List[0]);
        setBatchQueue(prev => prev.map(i => i.id === item.id ? { 
            ...i, 
            status: 'completed', 
            result: resultBase64List[0],
            enhancedDims: enhancedDims
        } : i));

      } catch (err: any) {
        if (cancelBatchRef.current) break;
        setBatchQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'failed', error: err.message || 'Error' } : i));
      }
    }
    setIsProcessing(false);
  };

  const handleCancelBatch = () => {
    cancelBatchRef.current = true;
    setIsProcessing(false);
    setBatchQueue(prev => prev.map(i => 
      i.status === 'processing' ? { ...i, status: 'pending' } : i
    ));
  };

  const handleRemoveBatchItem = (id: string) => {
    setBatchQueue(prev => prev.filter(i => i.id !== id));
  };

  const handleClearBatch = () => {
    setBatchQueue([]);
  };

  const handleApply = (selectedImage: string) => {
    if (processedResult) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(selectedImage);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setProcessedResult(null);
      setActiveImageDims(null);
      // Clear mask when applying new state
      setConfig(prev => ({ ...prev, maskImage: undefined }));
      setIsMaskingMode(false);
    }
  };

  const handleDiscard = () => setProcessedResult(null);

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setProcessedResult(null);
      setActiveImageDims(null);
      setConfig(prev => ({ ...prev, maskImage: undefined }));
      setIsMaskingMode(false);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setProcessedResult(null);
      setActiveImageDims(null);
      setConfig(prev => ({ ...prev, maskImage: undefined }));
      setIsMaskingMode(false);
    }
  };

  const handleReset = () => {
    setHistory([]);
    setHistoryIndex(-1);
    setProcessedResult(null);
    setBatchQueue([]);
    setMode('landing');
    setError(null);
    setActiveImageDims(null);
    setGenPrompt('');
    setGenReference(undefined);
    setIsMaskingMode(false);
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
      link.download = `lynx-original-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowMenu(false);
  };

  const handleMaskChange = (mask: string | undefined) => {
      setConfig(prev => ({ ...prev, maskImage: mask }));
  };

  const activeImage = historyIndex >= 0 ? history[historyIndex] : null;
  const isMagicEdit = config.types.includes(EnhancementType.EDIT);

  // Helper for ratio icons in generator
  const getRatioIcon = (ratio: AspectRatio) => {
      switch(ratio) {
          case AspectRatio.SQUARE: return <Instagram className="w-3.5 h-3.5" />;
          case AspectRatio.TALL: return <Smartphone className="w-3.5 h-3.5" />;
          case AspectRatio.WIDE: return <Youtube className="w-3.5 h-3.5" />;
          case AspectRatio.PORTRAIT: return <Layout className="w-3.5 h-3.5" />;
          case AspectRatio.LANDSCAPE: return <Monitor className="w-3.5 h-3.5" />;
          default: return <Layout className="w-3.5 h-3.5" />;
      }
  };

  return (
    <div className="min-h-screen relative font-sans transition-colors duration-300">
      
      {/* Grid Background */}
      <div className="fixed inset-0 z-0">
         <div className="absolute inset-0 bg-white dark:bg-black bg-grid-pattern opacity-100" />
         <div className="pointer-events-none absolute inset-0 bg-white dark:bg-black bg-fade-radial" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <Header onNavigate={handleNavigate} />

        <main className="flex-grow pt-24 px-4 pb-12">
          
          {mode === 'docs' && (
             <Documentation />
          )}

          {mode === 'landing' && (
            // --- LANDING STATE ---
            <div className="flex flex-col justify-center items-center" id="top">
              <div className="max-w-4xl w-full text-center mt-12">
                
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-apple-shark dark:text-white mb-6 leading-tight">
                  <SplitText 
                    text="Refine reality." 
                    className="inline-block"
                    delay={40}
                  />
                  <br className="hidden md:inline" />
                  <SplitText 
                    text="Instantly." 
                    className="inline-block text-gray-400 dark:text-gray-600"
                    delay={40}
                  />
                </h1>
                
                <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto font-medium leading-relaxed animate-fade-in" style={{ animationDelay: '0.4s' }}>
                  Professional AI image enhancement and generation. Restore details, upscale quality, and reimagine your photos with LYNX.
                </p>

                {/* Processing Overlay for Generation */}
                {isProcessing && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-md">
                      <div className="flex flex-col items-center">
                          <span className="loading loading-spinner loading-lg text-apple-blue mb-4"></span>
                          <span className="text-lg font-bold text-apple-shark dark:text-white mb-2">{statusMessage}</span>
                          <div className="w-64 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-apple-blue transition-all duration-300" style={{ width: `${progress}%` }} />
                          </div>
                      </div>
                  </div>
                )}
                
                {/* Main Action Card */}
                <div className="w-full max-w-[500px] mx-auto animate-fade-in relative" style={{ animationDelay: '0.6s' }}>
                  
                  {/* Mode Tabs */}
                  <div className="flex justify-center mb-6 bg-gray-200/50 dark:bg-white/5 p-1 rounded-2xl w-max mx-auto backdrop-blur-sm">
                      <button 
                        onClick={() => setLandingTab('enhance')}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${landingTab === 'enhance' ? 'bg-white dark:bg-white/10 text-apple-shark dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                      >
                         Enhance Image
                      </button>
                      <button 
                        onClick={() => setLandingTab('generate')}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${landingTab === 'generate' ? 'bg-white dark:bg-white/10 text-apple-shark dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                      >
                         Generate Image
                      </button>
                  </div>

                  {landingTab === 'enhance' ? (
                     <ImageUploader 
                        onImageSelect={handleImageSelect} 
                        onBatchSelect={handleBatchSelect} 
                     />
                  ) : (
                     // Generation UI
                     <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-[32px] shadow-2xl p-6 border border-white/20 dark:border-white/5">
                        <div className="mb-4">
                           <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                              <Sparkles className="w-3.5 h-3.5 text-apple-blue" />
                              Describe your imagination
                           </label>
                           <textarea 
                              className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-apple-shark dark:text-white focus:ring-2 focus:ring-apple-blue/20 focus:border-apple-blue outline-none resize-none min-h-[120px] text-base"
                              placeholder="A futuristic city with flying cars at sunset, cyberpunk style..."
                              value={genPrompt}
                              onChange={(e) => setGenPrompt(e.target.value)}
                           />
                        </div>

                        {/* Aspect Ratio Selector */}
                        <div className="mb-4">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Aspect Ratio</label>
                            <div className="grid grid-cols-5 gap-2">
                                {[AspectRatio.SQUARE, AspectRatio.PORTRAIT, AspectRatio.LANDSCAPE, AspectRatio.WIDE, AspectRatio.TALL].map((ratio) => (
                                    <button
                                        key={ratio}
                                        onClick={() => setConfig(prev => ({ ...prev, aspectRatio: ratio }))}
                                        className={`flex flex-col items-center justify-center py-2 rounded-xl border transition-all ${config.aspectRatio === ratio ? 'bg-apple-shark dark:bg-white text-white dark:text-black border-transparent shadow-sm' : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                                    >
                                        {getRatioIcon(ratio)}
                                        <span className="text-[9px] font-bold mt-1">{ratio}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Image Count Selector - IMPROVED UI */}
                        <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4 border border-gray-100 dark:border-white/5 mb-4">
                           <div className="flex justify-between items-center mb-4">
                               <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                   <Hash className="w-3.5 h-3.5" />
                                   Count
                               </label>
                               <span className="text-[10px] font-bold text-apple-shark dark:text-white bg-white dark:bg-white/10 px-2 py-1 rounded-md border border-gray-100 dark:border-white/5">
                                   {config.imageCount} / 5
                               </span>
                           </div>
                           
                           <div className="relative h-8 flex items-center select-none">
                               {/* Track */}
                               <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                   <div 
                                     className="h-full bg-apple-shark dark:bg-white transition-all duration-300 ease-out"
                                     style={{ width: `${(config.imageCount - 1) * 25}%` }}
                                   />
                               </div>
                               
                               {/* Steps */}
                               <div className="absolute left-0 right-0 flex justify-between px-0.5">
                                   {[1, 2, 3, 4, 5].map((num) => (
                                      <button
                                        key={num}
                                        onClick={() => setConfig(prev => ({ ...prev, imageCount: num }))}
                                        className={`
                                            w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 border-2
                                            ${config.imageCount >= num 
                                                ? 'bg-apple-shark dark:bg-white text-white dark:text-black border-apple-shark dark:border-white scale-110 shadow-sm' 
                                                : 'bg-white dark:bg-[#1C1C1E] text-gray-400 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/30'}
                                        `}
                                      >
                                          {num}
                                      </button>
                                   ))}
                               </div>
                           </div>
                        </div>

                        {/* Reference Upload */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reference (Optional)</label>
                                {genReference && (
                                    <button onClick={() => setGenReference(undefined)} className="text-[10px] text-red-500 hover:text-red-600 font-bold flex items-center gap-1">
                                        <X className="w-3 h-3" /> Remove
                                    </button>
                                )}
                            </div>
                            
                            {!genReference ? (
                                <button 
                                    onClick={() => genRefInputRef.current?.click()}
                                    className="w-full py-2.5 border border-dashed border-gray-300 dark:border-white/10 rounded-xl flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    <Upload className="w-4 h-4" />
                                    <span className="text-xs font-bold">Upload Reference Image</span>
                                </button>
                            ) : (
                                <div className="relative h-16 w-full bg-gray-100 dark:bg-black/30 rounded-xl overflow-hidden group">
                                    <img src={genReference} className="w-full h-full object-contain" alt="Reference" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={() => genRefInputRef.current?.click()} className="text-white text-[10px] font-bold bg-black/50 px-2 py-1 rounded-lg backdrop-blur-md">Change</button>
                                    </div>
                                </div>
                            )}
                            <input type="file" ref={genRefInputRef} className="hidden" accept="image/*" onChange={handleGenReferenceUpload} />
                        </div>

                        <button 
                            onClick={handleGenerateImage}
                            disabled={!genPrompt.trim()}
                            className="w-full py-4 bg-apple-shark dark:bg-white text-white dark:text-black rounded-2xl font-bold text-base shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Wand2 className="w-5 h-5" />
                            Generate Image
                        </button>
                     </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {mode === 'single' && (
            // --- SINGLE MODE WORKSPACE (GLASSY BLURRY CARD) ---
            <div className="max-w-2xl mx-auto animate-fade-in">
              <div className="rounded-[32px] overflow-hidden bg-white/70 dark:bg-[#1E1E1E]/60 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-2xl">
                  
                  {/* Card Header */}
                  <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200/50 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <button onClick={handleReset} className="p-2 hover:bg-gray-100/50 dark:hover:bg-white/10 rounded-full transition-colors">
                          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                        </button>
                        <h2 className="text-lg font-bold text-apple-shark dark:text-white">Image Editor</h2>
                    </div>
                    
                    <div className="flex items-center gap-2 relative" ref={menuRef}>
                        <button 
                            onClick={() => setShowMenu(!showMenu)} 
                            className={`p-2 rounded-full transition-all ${showMenu ? 'bg-gray-100 dark:bg-white/10' : 'hover:bg-gray-100/50 dark:hover:bg-white/10'}`}
                        >
                            <MoreHorizontal className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                        </button>
                        
                        {/* 3-Dot Dropdown Menu */}
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#252525] rounded-xl shadow-xl border border-gray-100 dark:border-white/10 overflow-hidden z-[60] animate-fade-in origin-top-right">
                                <div className="p-1">
                                    <button onClick={handleDownloadCurrent} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 font-medium">
                                        <Download className="w-4 h-4" />
                                        Download Original
                                    </button>
                                    <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />
                                    <button onClick={handleReset} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium">
                                        <Trash2 className="w-4 h-4" />
                                        Discard Project
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                  </div>

                  {/* Main Content Area */}
                  <div className="relative w-full bg-gray-50/30 dark:bg-black/20 min-h-[300px] flex items-center justify-center">
                    
                    {/* Processing State */}
                    {isProcessing && !processedResult && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-sm">
                            <div className="flex flex-col items-center">
                                {/* NEW LOADER */}
                                <span className="loading loading-spinner loading-lg text-apple-blue mb-3"></span>
                                
                                <span className="text-sm font-semibold text-apple-shark dark:text-white">{statusMessage}</span>
                                <div className="w-48 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-4 overflow-hidden">
                                    <div className="h-full bg-apple-blue transition-all duration-300" style={{ width: `${progress}%` }} />
                                </div>
                                <button onClick={handleCancelSingle} className="mt-4 text-xs text-red-500 hover:text-red-600 font-bold uppercase tracking-wide">Cancel</button>
                            </div>
                        </div>
                    )}

                    {/* Image Display */}
                    <div className="w-full relative">
                          {processedResult ? (
                              <ComparisonView 
                                  beforeImage={processedResult.original} 
                                  afterImages={processedResult.enhanced}
                                  beforeDims={processedResult.originalDims}
                                  afterDims={processedResult.enhancedDims}
                                  processingTime={processedResult.processingTime}
                                  onDiscard={handleDiscard}
                                  onApply={handleApply}
                              />
                          ) : (
                              <div className="w-full flex justify-center py-4">
                                  {/* Magic Edit Mode - MaskEditor with Toggle */}
                                  {isMagicEdit && activeImage ? (
                                      <MaskEditor 
                                          imageUrl={activeImage} 
                                          maskBase64={config.maskImage}
                                          onMaskChange={handleMaskChange}
                                          isActive={isMaskingMode}
                                          onToggle={() => setIsMaskingMode(!isMaskingMode)}
                                      />
                                  ) : (
                                      <img 
                                          src={activeImage || ''} 
                                          alt="Original" 
                                          className="w-full h-auto max-h-[70vh] object-contain"
                                      />
                                  )}
                              </div>
                          )}
                    </div>
                  </div>

                  {/* Bottom Toolbar */}
                  <div className="bg-white/50 dark:bg-[#1E1E1E]/50 p-4 border-t border-gray-200/50 dark:border-white/5 backdrop-blur-sm">
                    <EnhancementControls 
                          config={config} 
                          onChange={setConfig} 
                          onProcess={handleProcessSingle}
                          isProcessing={isProcessing}
                          canUndo={historyIndex > 0 && !processedResult}
                          canRedo={historyIndex < history.length - 1 && !processedResult}
                          onUndo={handleUndo}
                          onRedo={handleRedo}
                    />
                  </div>
              </div>
            </div>
          )}

          {mode === 'batch' && (
            // --- BATCH MODE WORKSPACE ---
            <div className="max-w-5xl mx-auto animate-fade-in">
              <div className="rounded-[32px] overflow-hidden bg-white/70 dark:bg-[#1E1E1E]/60 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-2xl">
                  
                  {/* Header */}
                  <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200/50 dark:border-white/5">
                     <div className="flex items-center gap-3">
                        <button onClick={handleReset} className="p-2 hover:bg-gray-100/50 dark:hover:bg-white/10 rounded-full transition-colors">
                          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                        </button>
                        <div>
                            <h2 className="text-lg font-bold text-apple-shark dark:text-white">Batch Studio</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Processing {batchQueue.length} images</p>
                        </div>
                     </div>
                     
                     {/* Batch specific actions could go here */}
                     {isProcessing && (
                         <button onClick={handleCancelBatch} className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 bg-red-50 dark:bg-red-900/10 rounded-full">
                            STOP BATCH
                         </button>
                     )}
                  </div>

                  {/* Batch Queue Content */}
                  <div className="relative w-full bg-gray-50/30 dark:bg-black/20 min-h-[400px] max-h-[60vh] overflow-hidden">
                       <BatchQueue 
                           items={batchQueue}
                           onRemove={handleRemoveBatchItem}
                           onClear={handleClearBatch}
                           isProcessing={isProcessing}
                           onHome={handleReset}
                           onAddMore={handleAddMoreToBatch}
                       />
                  </div>

                  {/* Shared Controls reused for Batch */}
                  <div className="bg-white/50 dark:bg-[#1E1E1E]/50 p-4 border-t border-gray-200/50 dark:border-white/5 backdrop-blur-sm">
                      <EnhancementControls 
                          config={config} 
                          onChange={setConfig} 
                          onProcess={handleProcessBatch}
                          isProcessing={isProcessing}
                          canUndo={false}
                          canRedo={false}
                          onUndo={() => {}}
                          onRedo={() => {}}
                      />
                  </div>
              </div>
            </div>
          )}

          {/* Error Toast */}
          {error && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-red-500 text-white rounded-full shadow-lg flex items-center gap-3 animate-slide-up font-medium">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error === 'MISSING_FAL_KEY' ? 'API Key Required' : error}</span>
              <button onClick={() => setError(null)}><X className="w-4 h-4 text-white/80 hover:text-white" /></button>
            </div>
          )}

        </main>
        
        {mode === 'landing' && <Footer />}
      </div>
    </div>
  );
};

// Wrap AppContent with ThemeProvider
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;