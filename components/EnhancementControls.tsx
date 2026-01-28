import React, { useState, useEffect, useRef } from 'react';
import { EnhancementConfig, EnhancementType, AspectRatio } from '../types';
import { 
  Wand2, History, Palette, Maximize, UserX, 
  Undo, Redo, ImageMinus, Type, Copyright, 
  Sparkles, Zap, Star, Layers, Cloud, CheckSquare, Edit3,
  ImagePlus, X, Upload, Monitor, Smartphone, Instagram, Youtube, Layout, Settings, Hash, SlidersHorizontal, Activity,
  Copy, Trash2, Camera, Aperture, Film, Template
} from 'lucide-react';
import { ASPECT_RATIOS, ENHANCEMENT_PROMPTS } from '../constants';
import { getDailyUsage } from '../services/geminiService';

interface Props {
  config: EnhancementConfig;
  onChange: (config: EnhancementConfig) => void;
  onProcess: () => void;
  isProcessing: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const EnhancementControls: React.FC<Props> = ({ 
  config, 
  onChange, 
  onProcess, 
  isProcessing,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}) => {
  
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [showNegative, setShowNegative] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [multiSelect, setMultiSelect] = useState(false);
  const [dailyUsage, setDailyUsage] = useState(0);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDailyUsage(getDailyUsage());
    const handleUpdate = () => setDailyUsage(getDailyUsage());
    window.addEventListener('geminiUsageUpdated', handleUpdate);
    return () => window.removeEventListener('geminiUsageUpdated', handleUpdate);
  }, []);

  useEffect(() => {
    if (config.types.includes(EnhancementType.EDIT)) {
        setActiveTab('custom');
    }
  }, [config.types]);

  const setType = (type: EnhancementType) => {
    if (multiSelect) {
       const currentTypes = config.types;
       if (currentTypes.includes(EnhancementType.EDIT)) {
           onChange({ ...config, types: [type] });
           return;
       }
       if (currentTypes.includes(type)) {
           if (currentTypes.length > 1) {
               onChange({ ...config, types: currentTypes.filter(t => t !== type) });
           }
       } else {
           onChange({ ...config, types: [...currentTypes, type] });
       }
    } else {
       onChange({ ...config, types: [type] });
    }
  };

  const handleTabChange = (tab: 'presets' | 'custom') => {
      setActiveTab(tab);
      if (tab === 'custom') {
          onChange({ ...config, types: [EnhancementType.EDIT] });
      } else {
          onChange({ ...config, types: [EnhancementType.GENERAL] });
      }
  };

  const applyTemplate = (lookType: EnhancementType) => {
      const templatePrompt = ENHANCEMENT_PROMPTS[lookType];
      if (templatePrompt) {
          onChange({ ...config, customPrompt: templatePrompt });
      }
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onChange({ ...config, referenceImage: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearReference = () => {
    onChange({ ...config, referenceImage: undefined });
    if (referenceInputRef.current) referenceInputRef.current.value = '';
  };

  const copyPrompt = () => {
    if (config.customPrompt) {
        navigator.clipboard.writeText(config.customPrompt);
    }
  };

  const clearPrompt = () => {
    onChange({ ...config, customPrompt: '' });
  };

  const getLabelForType = (type: EnhancementType) => {
      switch(type) {
          case EnhancementType.GENERAL: return 'Enhance';
          case EnhancementType.RESTORE: return 'Restoration';
          case EnhancementType.UPSCALE: return 'Upscale';
          case EnhancementType.COLORIZE: return 'Colorize';
          case EnhancementType.REMOVE_BACKGROUND: return 'BG Removal';
          case EnhancementType.REMOVE_SUBJECT: return 'Remove Object';
          case EnhancementType.REMOVE_TEXT: return 'Remove Text';
          case EnhancementType.REMOVE_WATERMARK: return 'Remove Logo';
          case EnhancementType.CREATIVE: return 'Style Transfer';
          case EnhancementType.EDIT: return 'Magic Edit';
          case EnhancementType.LOOK_BW: return 'B&W Moody';
          case EnhancementType.LOOK_DARK: return 'Dark Modern';
          case EnhancementType.LOOK_REALISM: return 'Cinematic';
          default: return 'Effect';
      }
  };
  
  const getButtonLabel = () => {
      if (activeTab === 'custom') return 'GENERATE';
      if (config.types.length > 1) return `APPLY ${config.types.length} EFFECTS`;
      return `APPLY ${getLabelForType(config.types[0]).toUpperCase()}`;
  };

  const getRatioIcon = (ratio: AspectRatio) => {
      switch(ratio) {
          case AspectRatio.SQUARE: return <Instagram className="w-3 h-3" />;
          case AspectRatio.TALL: return <Smartphone className="w-3 h-3" />;
          case AspectRatio.WIDE: return <Youtube className="w-3 h-3" />;
          case AspectRatio.PORTRAIT: return <Layout className="w-3 h-3" />;
          case AspectRatio.LANDSCAPE: return <Monitor className="w-3 h-3" />;
          case AspectRatio.CUSTOM: return <Settings className="w-3 h-3" />;
          default: return <Layout className="w-3 h-3" />;
      }
  };

  const presetRatios = ASPECT_RATIOS.filter(r => r.value !== AspectRatio.CUSTOM);
  const isCustomRatio = config.aspectRatio === AspectRatio.CUSTOM;

  const dailyLimit = config.model.includes('pro') ? 50 : 1500;
  const usagePercentage = Math.min(100, (dailyUsage / dailyLimit) * 100);

  return (
    <div className="flex flex-col gap-4">
      
      {/* Header with Undo/Redo & Tabs */}
      <div className="flex items-center justify-between">
          
          {/* Tab Switcher */}
          <div className="flex bg-black/10 dark:bg-black/40 p-1 rounded-xl border border-black/5 dark:border-white/5">
              <button 
                onClick={() => handleTabChange('presets')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'presets' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
              >
                Presets
              </button>
              <button 
                onClick={() => handleTabChange('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'custom' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
              >
                Magic Edit
              </button>
          </div>

          {/* Global Undo/Redo Controls */}
          <div className="flex items-center gap-1 bg-black/10 dark:bg-black/40 rounded-lg p-1 border border-black/5 dark:border-white/5">
             <button 
                onClick={onUndo} 
                disabled={!canUndo} 
                className="p-1.5 hover:bg-white/20 rounded-md disabled:opacity-30 transition-all text-gray-700 dark:text-white"
                title="Undo"
             >
                <Undo className="w-4 h-4" />
             </button>
             <div className="w-px h-3 bg-gray-400 dark:bg-white/20" />
             <button 
                onClick={onRedo} 
                disabled={!canRedo} 
                className="p-1.5 hover:bg-white/20 rounded-md disabled:opacity-30 transition-all text-gray-700 dark:text-white"
                title="Redo"
             >
                <Redo className="w-4 h-4" />
             </button>
          </div>
      </div>

      <div className="mt-2 min-h-[140px]">
        {/* PRESETS TAB */}
        {activeTab === 'presets' && (
             <div className="animate-fade-in relative">
                <div className="flex justify-end mb-2">
                    <button 
                        onClick={() => setMultiSelect(!multiSelect)}
                        className={`text-[10px] font-bold flex items-center gap-1.5 px-2 py-1 rounded-full transition-all ${multiSelect ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <CheckSquare className="w-3 h-3" />
                        {multiSelect ? 'Multi-Select On' : 'Multi-Select Off'}
                    </button>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                     <PresetButton label="Enhance" active={config.types.includes(EnhancementType.GENERAL)} onClick={() => setType(EnhancementType.GENERAL)} icon={<Wand2 className="w-5 h-5" />} />
                     <PresetButton label="Upscale" active={config.types.includes(EnhancementType.UPSCALE)} onClick={() => setType(EnhancementType.UPSCALE)} icon={<Maximize className="w-5 h-5" />} />
                     <PresetButton label="Restore" active={config.types.includes(EnhancementType.RESTORE)} onClick={() => setType(EnhancementType.RESTORE)} icon={<History className="w-5 h-5" />} />
                     <PresetButton label="Colorize" active={config.types.includes(EnhancementType.COLORIZE)} onClick={() => setType(EnhancementType.COLORIZE)} icon={<Palette className="w-5 h-5" />} />
                </div>
                
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 pl-1">Removals & Style</h3>
                <div className="grid grid-cols-4 gap-2">
                     <PresetButton label="No BG" active={config.types.includes(EnhancementType.REMOVE_BACKGROUND)} onClick={() => setType(EnhancementType.REMOVE_BACKGROUND)} icon={<UserX className="w-5 h-5" />} />
                     <PresetButton label="No Object" active={config.types.includes(EnhancementType.REMOVE_SUBJECT)} onClick={() => setType(EnhancementType.REMOVE_SUBJECT)} icon={<ImageMinus className="w-5 h-5" />} />
                     <PresetButton label="No Text" active={config.types.includes(EnhancementType.REMOVE_TEXT)} onClick={() => setType(EnhancementType.REMOVE_TEXT)} icon={<Type className="w-5 h-5" />} />
                     <PresetButton label="No Logo" active={config.types.includes(EnhancementType.REMOVE_WATERMARK)} onClick={() => setType(EnhancementType.REMOVE_WATERMARK)} icon={<Copyright className="w-5 h-5" />} />
                </div>
             </div>
        )}

        {/* CUSTOM PROMPT TAB */}
        {activeTab === 'custom' && (
            <div className="animate-fade-in space-y-4">
                <div className="bg-white/10 dark:bg-black/20 rounded-2xl p-4 border border-white/20 dark:border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Edit3 className="w-3.5 h-3.5" />
                            Instructions
                        </label>
                        <div className="flex items-center gap-1">
                             <button onClick={copyPrompt} className="p-1.5 hover:bg-white/10 rounded-md text-gray-500 hover:text-blue-500 transition-colors" title="Copy Prompt"><Copy className="w-3.5 h-3.5" /></button>
                             <button onClick={clearPrompt} className="p-1.5 hover:bg-white/10 rounded-md text-gray-500 hover:text-red-500 transition-colors" title="Clear Prompt"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>

                    <textarea 
                        className="w-full bg-white/50 dark:bg-black/40 border border-gray-200 dark:border-white/10 focus:border-blue-500 focus:ring-0 rounded-xl text-sm p-3 min-h-[80px] resize-none text-gray-900 dark:text-white placeholder-gray-500 font-medium"
                        placeholder={config.referenceImage ? "Describe how to use the reference..." : "Describe what to do (e.g. 'Turn the red car blue', 'Add a hat')..."}
                        value={config.customPrompt || ''}
                        onChange={(e) => onChange({ ...config, customPrompt: e.target.value })}
                    />
                    
                    <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-white/10 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                             <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Negative Prompt</span>
                             <button 
                                onClick={() => setShowNegative(!showNegative)}
                                className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${showNegative ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                             >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${showNegative ? 'translate-x-4' : 'translate-x-0'}`} />
                             </button>
                        </div>
                        
                        {showNegative && (
                            <textarea 
                                className="w-full bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 focus:border-red-500/50 focus:ring-0 rounded-xl text-sm p-3 min-h-[60px] resize-none animate-slide-down text-gray-900 dark:text-white placeholder-red-400/50 font-medium"
                                placeholder="Specific elements to avoid..."
                                value={config.negativePrompt || ''}
                                onChange={(e) => onChange({ ...config, negativePrompt: e.target.value })}
                            />
                        )}
                    </div>
                </div>

                {/* Prompting Templates Section */}
                <div>
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Prompting Templates</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button 
                            onClick={() => applyTemplate(EnhancementType.LOOK_BW)} 
                            className="bg-white/20 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-lg p-2 flex flex-col items-center gap-1 hover:bg-white/30 dark:hover:bg-white/10 transition-colors"
                        >
                            <Film className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                            <span className="text-[9px] font-bold text-gray-600 dark:text-gray-300">B&W Moody</span>
                        </button>
                        <button 
                            onClick={() => applyTemplate(EnhancementType.LOOK_DARK)} 
                            className="bg-white/20 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-lg p-2 flex flex-col items-center gap-1 hover:bg-white/30 dark:hover:bg-white/10 transition-colors"
                        >
                            <Aperture className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                            <span className="text-[9px] font-bold text-gray-600 dark:text-gray-300">Dark Modern</span>
                        </button>
                        <button 
                            onClick={() => applyTemplate(EnhancementType.LOOK_REALISM)} 
                            className="bg-white/20 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-lg p-2 flex flex-col items-center gap-1 hover:bg-white/30 dark:hover:bg-white/10 transition-colors"
                        >
                            <Camera className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                            <span className="text-[9px] font-bold text-gray-600 dark:text-gray-300">Cinematic</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white/10 dark:bg-black/20 rounded-xl border border-dashed border-gray-300 dark:border-white/10 p-3">
                   <div className="flex justify-between items-center mb-2">
                       <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                           <ImagePlus className="w-3.5 h-3.5" />
                           Reference (Optional)
                       </label>
                       {config.referenceImage && (
                          <button onClick={clearReference} className="text-[10px] text-red-500 font-bold flex items-center gap-1"><X className="w-3 h-3" /> Remove</button>
                       )}
                   </div>
                   
                   {!config.referenceImage ? (
                       <button onClick={() => referenceInputRef.current?.click()} className="w-full h-16 bg-white/20 dark:bg-white/5 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-500 dark:text-gray-400 hover:bg-white/30 hover:text-blue-600 transition-all">
                          <Upload className="w-4 h-4" />
                          <span className="text-[10px] font-medium">Click to upload reference</span>
                       </button>
                   ) : (
                       <div className="relative h-20 w-full bg-black/20 rounded-lg overflow-hidden flex items-center justify-center group">
                          <img src={config.referenceImage} alt="Reference" className="h-full object-contain" />
                          <button onClick={() => referenceInputRef.current?.click()} className="absolute bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">Change</button>
                       </div>
                   )}
                   <input type="file" ref={referenceInputRef} className="hidden" accept="image/*" onChange={handleReferenceUpload} />
                </div>

                <div className="bg-white/10 dark:bg-black/20 rounded-xl p-4 border border-gray-200 dark:border-white/5">
                   <div className="flex justify-between items-center mb-4">
                       <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">Variations</label>
                       <span className="text-[10px] font-bold text-blue-600 bg-white px-2 py-1 rounded-md border border-gray-200">{config.imageCount} / 5</span>
                   </div>
                   
                   <div className="relative h-10 flex items-center select-none">
                       <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-600 transition-all duration-300 ease-out" style={{ width: `${(config.imageCount - 1) * 25}%` }} />
                       </div>
                       <div className="absolute left-0 right-0 flex justify-between px-0.5">
                           {[1, 2, 3, 4, 5].map((num) => (
                              <button
                                key={num}
                                onClick={() => onChange({ ...config, imageCount: num })}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 border-2 ${config.imageCount >= num ? 'bg-blue-600 text-white border-blue-600 scale-110 shadow-sm' : 'bg-white dark:bg-[#1C1C1E] text-gray-400 border-gray-200 dark:border-white/10'}`}
                              >
                                  {num}
                              </button>
                           ))}
                       </div>
                   </div>
                </div>
            </div>
        )}

        {/* Aspect Ratio Selector */}
        <div className="pt-2">
           <div className="flex items-center justify-between mb-2 pl-1 pr-1">
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Output Aspect Ratio</label>
                <button 
                    onClick={() => onChange({ ...config, aspectRatio: isCustomRatio ? AspectRatio.AUTO : AspectRatio.CUSTOM })}
                    className={`text-[9px] font-bold px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${isCustomRatio ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'}`}
                >
                    <SlidersHorizontal className="w-3 h-3" /> Custom Size
                </button>
           </div>
           
           <div className={`grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2 transition-opacity duration-300 ${isCustomRatio ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
               {presetRatios.map((ratio) => (
                   <button
                       key={ratio.value}
                       onClick={() => onChange({ ...config, aspectRatio: ratio.value })}
                       className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all ${config.aspectRatio === ratio.value && !isCustomRatio ? 'bg-blue-600 text-white border-transparent shadow-sm scale-[1.02]' : 'bg-white/40 dark:bg-white/5 border-transparent text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-white/10'}`}
                   >
                       <div className="mb-1 opacity-70">{getRatioIcon(ratio.value)}</div>
                       <span className="text-[10px] font-bold leading-tight">{ratio.label}</span>
                   </button>
               ))}
           </div>

           {isCustomRatio && (
               <div className="grid grid-cols-2 gap-3 animate-slide-down mt-3 bg-white/20 dark:bg-white/5 p-3 rounded-xl border border-dashed border-gray-300 dark:border-white/10">
                   <div className="relative">
                       <input type="number" placeholder="Width" value={config.customWidth || ''} onChange={(e) => onChange({ ...config, customWidth: parseInt(e.target.value) || undefined })} className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-2 pl-3 pr-8 text-sm font-medium focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white" />
                       <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">PX</span>
                   </div>
                   <div className="relative">
                       <input type="number" placeholder="Height" value={config.customHeight || ''} onChange={(e) => onChange({ ...config, customHeight: parseInt(e.target.value) || undefined })} className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-2 pl-3 pr-8 text-sm font-medium focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white" />
                       <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">PX</span>
                   </div>
               </div>
           )}
        </div>
      </div>

      <div className="pt-2">
         <button 
            onClick={onProcess}
            disabled={isProcessing || (activeTab === 'custom' && !config.customPrompt)}
            className="w-full py-4 bg-white text-blue-600 hover:bg-gray-50 active:scale-[0.98] rounded-2xl font-black text-sm transition-all shadow-xl disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2.5 relative overflow-hidden tracking-wide border border-blue-100 dark:border-transparent"
         >
            {isProcessing ? (
                <>
                  <span className="loading loading-spinner loading-xs bg-blue-600"></span>
                  <span>PROCESSING...</span>
                </>
            ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{getButtonLabel()}</span>
                </>
            )}
         </button>
         
         <div className="mt-3 px-1">
            <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider"><Activity className="w-3 h-3" /> Free Tier Usage</div>
                <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400"><span className={usagePercentage > 90 ? "text-red-500" : ""}>{dailyUsage}</span> / {dailyLimit}</div>
            </div>
            <div className="h-1.5 w-full bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden flex">
                <div className={`h-full transition-all duration-500 ease-out ${usagePercentage > 90 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${usagePercentage}%` }} />
            </div>
         </div>
      </div>

      <div className="flex flex-col">
         <div className="flex justify-center mt-2">
             <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-[10px] uppercase font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 transition-colors">
                 {showAdvanced ? 'Hide Model Options' : 'Show AI Model Options'}
             </button>
         </div>
         <div className={`grid transition-all duration-300 ease-in-out overflow-hidden ${showAdvanced ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
             <div className="min-h-0 pt-2 border-t border-gray-200 dark:border-white/5">
                 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 block text-center">Active AI Model</label>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                     <ModelButton label="Gemini Flash" sub="Fastest" icon={<Zap className="w-3.5 h-3.5" />} active={config.model === 'gemini-2.5-flash-image'} onClick={() => onChange({ ...config, model: 'gemini-2.5-flash-image' })} />
                     <ModelButton label="Gemini Pro" sub="Best Quality" icon={<Star className="w-3.5 h-3.5" />} active={config.model === 'gemini-3-pro-image-preview'} onClick={() => onChange({ ...config, model: 'gemini-3-pro-image-preview' })} />
                     <ModelButton label="Fal.ai" sub="Upscaler" icon={<Layers className="w-3.5 h-3.5" />} active={config.model === 'fal-ai/drct-super-resolution'} onClick={() => onChange({ ...config, model: 'fal-ai/drct-super-resolution' })} />
                     <ModelButton label="Cloudinary" sub="Utility" icon={<Cloud className="w-3.5 h-3.5" />} active={config.model === 'cloudinary-ai'} onClick={() => onChange({ ...config, model: 'cloudinary-ai' })} />
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};

const PresetButton = ({ label, active, onClick, icon }: { label: string, active: boolean, onClick: () => void, icon: React.ReactNode }) => (
    <button 
       onClick={onClick}
       className={`flex flex-col items-center justify-center gap-2 transition-all duration-200 p-2 rounded-xl border
       ${active ? 'bg-white text-blue-600 border-transparent shadow-lg transform scale-[1.02]' : 'bg-white/40 dark:bg-white/5 border-transparent text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-white/10 hover:text-blue-600 dark:hover:text-white'}`}
    >
       <div className={`${active ? 'scale-110' : 'opacity-80'}`}>{icon}</div>
       <span className="text-[10px] font-bold leading-none text-center">{label}</span>
    </button>
);

const ModelButton = ({ label, sub, active, onClick, icon }: { label: string, sub: string, active: boolean, onClick: () => void, icon: React.ReactNode }) => (
    <button 
       onClick={onClick}
       className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all duration-200
       ${active ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-300' : 'bg-white/40 dark:bg-white/5 border-transparent text-gray-500 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-white/10'}`}
    >
       <div className="flex items-center gap-1.5 mb-0.5">
         {icon}
         <span className={`text-[11px] font-bold leading-none ${active ? 'text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>{label}</span>
       </div>
       <span className={`text-[9px] font-medium leading-none ${active ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500'}`}>{sub}</span>
    </button>
);

export default EnhancementControls;