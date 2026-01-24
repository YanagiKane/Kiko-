import React, { useState, useEffect, useRef } from 'react';
import { EnhancementConfig, EnhancementType, AspectRatio } from '../types';
import { 
  Wand2, History, Palette, Maximize, UserX, 
  Undo, Redo, ImageMinus, Type, Copyright, 
  Sparkles, Zap, Star, Layers, Cloud, CheckSquare, Edit3,
  ImagePlus, X, Upload, Monitor, Smartphone, Instagram, Youtube, Layout, Settings, Hash, SlidersHorizontal, Activity
} from 'lucide-react';
import { ASPECT_RATIOS } from '../constants';
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
    // Initial fetch
    setDailyUsage(getDailyUsage());
    
    // Listen for updates from service
    const handleUpdate = () => setDailyUsage(getDailyUsage());
    window.addEventListener('geminiUsageUpdated', handleUpdate);
    
    return () => window.removeEventListener('geminiUsageUpdated', handleUpdate);
  }, []);

  // Sync tab with config type
  useEffect(() => {
    if (config.types.includes(EnhancementType.EDIT)) {
        setActiveTab('custom');
    } else {
        setActiveTab('presets');
    }
  }, [config.types]);

  const setType = (type: EnhancementType) => {
    if (multiSelect) {
       const currentTypes = config.types;
       // If currently using Magic Edit (Custom Tab), clear it and start fresh with presets
       if (currentTypes.includes(EnhancementType.EDIT)) {
           onChange({ ...config, types: [type] });
           return;
       }

       if (currentTypes.includes(type)) {
           // Allow deselection if more than one is selected
           if (currentTypes.length > 1) {
               onChange({ ...config, types: currentTypes.filter(t => t !== type) });
           }
       } else {
           onChange({ ...config, types: [...currentTypes, type] });
       }
    } else {
       // Single Select Mode
       onChange({ ...config, types: [type] });
    }
  };

  const handleTabChange = (tab: 'presets' | 'custom') => {
      setActiveTab(tab);
      if (tab === 'custom') {
          onChange({ ...config, types: [EnhancementType.EDIT] });
      } else {
          // Default back to General if switching to presets without a selection
          // If we have previous preset selections (not EDIT), keep them, otherwise reset
          if (config.types.includes(EnhancementType.EDIT)) {
             onChange({ ...config, types: [EnhancementType.GENERAL] });
          }
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

  // Filter out CUSTOM from the main grid list to keep the UI clean
  const presetRatios = ASPECT_RATIOS.filter(r => r.value !== AspectRatio.CUSTOM);
  const isCustomRatio = config.aspectRatio === AspectRatio.CUSTOM;

  // Usage Stats Logic
  const dailyLimit = config.model.includes('pro') ? 50 : 1500;
  const projectedCost = config.imageCount || 1;
  const remaining = Math.max(0, dailyLimit - dailyUsage);
  const usagePercentage = Math.min(100, (dailyUsage / dailyLimit) * 100);
  const projectedPercentage = Math.min(100, ((dailyUsage + projectedCost) / dailyLimit) * 100);

  return (
    <div className="flex flex-col gap-4">
      
      {/* Header with Undo/Redo & Tabs */}
      <div className="flex items-center justify-between">
          
          {/* Tab Switcher */}
          <div className="flex bg-gray-100 dark:bg-black/40 p-1 rounded-xl">
              <button 
                onClick={() => handleTabChange('presets')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'presets' ? 'bg-white dark:bg-white/10 text-apple-shark dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Presets
              </button>
              <button 
                onClick={() => handleTabChange('custom')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'custom' ? 'bg-white dark:bg-white/10 text-apple-shark dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Magic Edit
              </button>
          </div>

          {/* Undo/Redo Controls */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-black/40 rounded-lg p-1">
             <button 
                onClick={onUndo} 
                disabled={!canUndo} 
                className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-md disabled:opacity-30 transition-all shadow-sm disabled:shadow-none"
                title="Undo"
             >
                <Undo className="w-4 h-4 text-apple-shark dark:text-white" />
             </button>
             <div className="w-px h-3 bg-gray-300 dark:bg-white/10" />
             <button 
                onClick={onRedo} 
                disabled={!canRedo} 
                className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-md disabled:opacity-30 transition-all shadow-sm disabled:shadow-none"
                title="Redo"
             >
                <Redo className="w-4 h-4 text-apple-shark dark:text-white" />
             </button>
          </div>
      </div>

      <div className="mt-2 min-h-[140px]">
        {/* PRESETS TAB */}
        {activeTab === 'presets' && (
             <div className="animate-fade-in relative">
                
                {/* Multi Select Toggle */}
                <div className="flex justify-end mb-2">
                    <button 
                        onClick={() => setMultiSelect(!multiSelect)}
                        className={`text-[10px] font-semibold flex items-center gap-1.5 px-2 py-1 rounded-full transition-all ${multiSelect ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        <CheckSquare className="w-3 h-3" />
                        {multiSelect ? 'Multi-Select On' : 'Multi-Select Off'}
                    </button>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                     {/* Essentials */}
                     <PresetButton 
                        label="Enhance" 
                        active={config.types.includes(EnhancementType.GENERAL)} 
                        onClick={() => setType(EnhancementType.GENERAL)} 
                        icon={<Wand2 className="w-5 h-5" />} 
                     />
                     <PresetButton 
                        label="Upscale" 
                        active={config.types.includes(EnhancementType.UPSCALE)} 
                        onClick={() => setType(EnhancementType.UPSCALE)} 
                        icon={<Maximize className="w-5 h-5" />} 
                     />
                     <PresetButton 
                        label="Restore" 
                        active={config.types.includes(EnhancementType.RESTORE)} 
                        onClick={() => setType(EnhancementType.RESTORE)} 
                        icon={<History className="w-5 h-5" />} 
                     />
                     <PresetButton 
                        label="Colorize" 
                        active={config.types.includes(EnhancementType.COLORIZE)} 
                        onClick={() => setType(EnhancementType.COLORIZE)} 
                        icon={<Palette className="w-5 h-5" />} 
                     />
                </div>
                
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1">Removals & Style</h3>
                <div className="grid grid-cols-4 gap-2">
                     <PresetButton 
                        label="No BG" 
                        active={config.types.includes(EnhancementType.REMOVE_BACKGROUND)} 
                        onClick={() => setType(EnhancementType.REMOVE_BACKGROUND)} 
                        icon={<UserX className="w-5 h-5" />} 
                     />
                     <PresetButton 
                        label="No Object" 
                        active={config.types.includes(EnhancementType.REMOVE_SUBJECT)} 
                        onClick={() => setType(EnhancementType.REMOVE_SUBJECT)} 
                        icon={<ImageMinus className="w-5 h-5" />} 
                     />
                     <PresetButton 
                        label="No Text" 
                        active={config.types.includes(EnhancementType.REMOVE_TEXT)} 
                        onClick={() => setType(EnhancementType.REMOVE_TEXT)} 
                        icon={<Type className="w-5 h-5" />} 
                     />
                     <PresetButton 
                        label="No Logo" 
                        active={config.types.includes(EnhancementType.REMOVE_WATERMARK)} 
                        onClick={() => setType(EnhancementType.REMOVE_WATERMARK)} 
                        icon={<Copyright className="w-5 h-5" />} 
                     />
                </div>
             </div>
        )}

        {/* CUSTOM PROMPT TAB */}
        {activeTab === 'custom' && (
            <div className="animate-fade-in space-y-4">
                
                {/* Prompt Input - MOVED TO TOP */}
                <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Edit3 className="w-3.5 h-3.5" />
                            Instructions
                        </label>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-apple-blue bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                            <Sparkles className="w-3 h-3" />
                            <span>AI Optimized</span>
                        </div>
                    </div>
                    <textarea 
                        className="w-full bg-white dark:bg-black/40 border border-gray-100 dark:border-white/5 focus:border-apple-blue focus:ring-0 rounded-xl text-sm p-3 min-h-[80px] resize-none text-apple-shark dark:text-white placeholder-gray-400 font-medium"
                        placeholder={config.referenceImage 
                            ? "Describe how to use the reference image (e.g. 'Use the car in the reference image to replace the car in the original', 'Transfer the texture from the reference')..." 
                            : "Describe what to do (e.g. 'Turn the red car blue', 'Add a hat')..."}
                        value={config.customPrompt || ''}
                        onChange={(e) => onChange({ ...config, customPrompt: e.target.value })}
                    />
                    
                    {/* Toggle Switch for Negative Prompt */}
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                             <div className="flex flex-col">
                                <span className="text-xs font-semibold text-gray-500">Negative Prompt</span>
                                <span className="text-[10px] text-gray-400">Leave empty for auto-generation</span>
                             </div>
                             <button 
                                onClick={() => setShowNegative(!showNegative)}
                                className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${showNegative ? 'bg-apple-shark dark:bg-white' : 'bg-gray-200 dark:bg-white/10'}`}
                             >
                                <div className={`w-4 h-4 rounded-full bg-white dark:bg-black shadow-sm transition-transform duration-300 ${showNegative ? 'translate-x-4' : 'translate-x-0'}`} />
                             </button>
                        </div>
                        
                        {showNegative && (
                            <textarea 
                                className="w-full bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 focus:border-red-300 focus:ring-0 rounded-xl text-sm p-3 min-h-[60px] resize-none animate-slide-down text-apple-shark dark:text-white placeholder-red-300 font-medium"
                                placeholder="Specific elements to avoid..."
                                value={config.negativePrompt || ''}
                                onChange={(e) => onChange({ ...config, negativePrompt: e.target.value })}
                            />
                        )}
                    </div>
                </div>

                {/* Reference Image Uploader Section - MOVED TO BELOW INSTRUCTIONS */}
                <div className="bg-white dark:bg-black/20 rounded-xl border border-dashed border-gray-200 dark:border-white/10 p-3">
                   <div className="flex justify-between items-center mb-2">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                           <ImagePlus className="w-3.5 h-3.5" />
                           Reference Image (Optional)
                       </label>
                       {config.referenceImage && (
                          <button onClick={clearReference} className="text-[10px] text-red-500 hover:text-red-600 font-bold flex items-center gap-1">
                             <X className="w-3 h-3" /> Remove
                          </button>
                       )}
                   </div>
                   
                   {!config.referenceImage ? (
                       <button 
                         onClick={() => referenceInputRef.current?.click()}
                         className="w-full h-16 bg-gray-50 dark:bg-white/5 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-apple-shark dark:hover:text-white transition-all"
                       >
                          <Upload className="w-4 h-4" />
                          <span className="text-[10px] font-medium">Click to upload reference</span>
                       </button>
                   ) : (
                       <div className="relative h-20 w-full bg-gray-50 dark:bg-white/5 rounded-lg overflow-hidden flex items-center justify-center group">
                          <img src={config.referenceImage} alt="Reference" className="h-full object-contain" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={() => referenceInputRef.current?.click()} className="text-white text-[10px] font-bold bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm">
                                Change
                              </button>
                          </div>
                       </div>
                   )}
                   <input type="file" ref={referenceInputRef} className="hidden" accept="image/*" onChange={handleReferenceUpload} />
                </div>

                {/* Image Count Slider (Magic Edit Only) - NEW IMPROVED UI */}
                <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                   <div className="flex justify-between items-center mb-4">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                           <Hash className="w-3.5 h-3.5" />
                           Variations
                       </label>
                       <span className="text-[10px] font-bold text-apple-shark dark:text-white bg-white dark:bg-white/10 px-2 py-1 rounded-md border border-gray-100 dark:border-white/5">
                           {config.imageCount} / 5
                       </span>
                   </div>
                   
                   <div className="relative h-10 flex items-center select-none">
                       {/* Track */}
                       <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
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
                                onClick={() => onChange({ ...config, imageCount: num })}
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
                   <p className="text-[9px] text-gray-400 mt-2 text-center">
                       {config.imageCount > 2 ? "Note: Higher counts utilize more of your request quota." : "Generate multiple versions to choose the best one."}
                   </p>
                </div>
            </div>
        )}

        {/* Aspect Ratio Selector */}
        <div className="pt-2">
           <div className="flex items-center justify-between mb-2 pl-1 pr-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Output Aspect Ratio
                </label>
                
                {/* Custom Toggle Button separated from grid */}
                <button 
                    onClick={() => onChange({ 
                        ...config, 
                        aspectRatio: isCustomRatio ? AspectRatio.AUTO : AspectRatio.CUSTOM 
                    })}
                    className={`text-[9px] font-bold px-2 py-1 rounded-md transition-colors flex items-center gap-1
                        ${isCustomRatio 
                           ? 'bg-apple-shark text-white dark:bg-white dark:text-black' 
                           : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20'
                        }`}
                >
                    <SlidersHorizontal className="w-3 h-3" />
                    Custom Size
                </button>
           </div>
           
           {/* Grid for Preset Ratios - disabled look if custom is active */}
           <div className={`grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2 transition-opacity duration-300 ${isCustomRatio ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
               {presetRatios.map((ratio) => (
                   <button
                       key={ratio.value}
                       onClick={() => onChange({ ...config, aspectRatio: ratio.value })}
                       className={`
                          flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all
                          ${config.aspectRatio === ratio.value && !isCustomRatio
                            ? 'bg-apple-shark dark:bg-white text-white dark:text-black border-transparent shadow-sm scale-[1.02]' 
                            : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10'}
                       `}
                   >
                       <div className="mb-1 opacity-70">
                           {getRatioIcon(ratio.value)}
                       </div>
                       <span className="text-[10px] font-bold leading-tight">{ratio.label}</span>
                       {ratio.description && (
                           <span className="text-[8px] opacity-60 leading-tight mt-0.5 hidden sm:block">{ratio.description.split(' ')[0]}</span>
                       )}
                   </button>
               ))}
           </div>

           {/* Custom Ratio Inputs (Width/Height) */}
           {isCustomRatio && (
               <div className="grid grid-cols-2 gap-3 animate-slide-down mt-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                   <div className="relative">
                       <input 
                           type="number" 
                           placeholder="Width"
                           value={config.customWidth || ''}
                           onChange={(e) => onChange({ ...config, customWidth: parseInt(e.target.value) || undefined })}
                           className="w-full bg-white dark:bg-black/20 border border-gray-100 dark:border-white/10 rounded-lg py-2 pl-3 pr-8 text-sm font-medium focus:ring-1 focus:ring-apple-blue"
                       />
                       <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">PX</span>
                   </div>
                   <div className="relative">
                       <input 
                           type="number" 
                           placeholder="Height"
                           value={config.customHeight || ''}
                           onChange={(e) => onChange({ ...config, customHeight: parseInt(e.target.value) || undefined })}
                           className="w-full bg-white dark:bg-black/20 border border-gray-100 dark:border-white/10 rounded-lg py-2 pl-3 pr-8 text-sm font-medium focus:ring-1 focus:ring-apple-blue"
                       />
                       <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">PX</span>
                   </div>
                   <div className="col-span-2 text-center">
                        <span className="text-[10px] text-gray-400">Custom dimensions enabled. Presets are disabled.</span>
                   </div>
               </div>
           )}
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-2">
         <button 
            onClick={onProcess}
            disabled={isProcessing || (activeTab === 'custom' && !config.customPrompt)}
            className="w-full py-4 bg-apple-shark dark:bg-white hover:bg-black dark:hover:bg-gray-200 active:scale-[0.98] text-white dark:text-black rounded-2xl font-bold text-sm transition-all shadow-lg shadow-black/5 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2.5 relative overflow-hidden"
         >
            {isProcessing ? (
                <>
                  <span className="loading loading-spinner loading-xs bg-white dark:bg-black"></span>
                  <span>PROCESSING...</span>
                </>
            ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{getButtonLabel()}</span>
                </>
            )}
         </button>
         
         {/* Daily Usage Indicator */}
         <div className="mt-3 px-1">
            <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <Activity className="w-3 h-3" />
                    <span>Free Tier Usage</span>
                </div>
                <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    <span className={usagePercentage > 90 ? "text-red-500" : "text-apple-shark dark:text-white"}>{dailyUsage}</span> 
                    <span className="text-gray-300 dark:text-gray-600 mx-1">/</span> 
                    {dailyLimit}
                </div>
            </div>
            
            <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden flex">
                <div 
                    className={`h-full transition-all duration-500 ease-out ${usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 75 ? 'bg-orange-400' : 'bg-apple-blue'}`}
                    style={{ width: `${usagePercentage}%` }}
                />
                {/* Projected Usage (Ghost Bar) */}
                <div 
                    className="h-full bg-apple-blue/30 dark:bg-white/20 transition-all duration-500 ease-out relative"
                    style={{ width: `${Math.min(100 - usagePercentage, (projectedCost / dailyLimit) * 100)}%` }}
                >
                   {/* Striped pattern overlay for projected */}
                   <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }} />
                </div>
            </div>
            
            {projectedCost > 1 && (
                <div className="text-right mt-1">
                    <span className="text-[9px] font-semibold text-apple-blue">+ {projectedCost} requests for this run</span>
                </div>
            )}
         </div>
      </div>

      {/* Advanced Settings Toggle & Slide-in Container */}
      <div className="flex flex-col">
         <div className="flex justify-center mt-2">
             <button 
                onClick={() => setShowAdvanced(!showAdvanced)} 
                className="text-[10px] uppercase font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 transition-colors"
             >
                 {showAdvanced ? 'Hide Model Options' : 'Show AI Model Options'}
             </button>
         </div>

         <div className={`grid transition-all duration-300 ease-in-out overflow-hidden ${showAdvanced ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
             <div className="min-h-0 pt-2 border-t border-gray-100 dark:border-white/5">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 block text-center">Active AI Model</label>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                     <ModelButton 
                        label="Gemini Flash" 
                        sub="Fastest"
                        icon={<Zap className="w-3.5 h-3.5" />}
                        active={config.model === 'gemini-2.5-flash-image'} 
                        onClick={() => onChange({ ...config, model: 'gemini-2.5-flash-image' })} 
                     />
                     <ModelButton 
                        label="Gemini Pro" 
                        sub="Best Quality"
                        icon={<Star className="w-3.5 h-3.5" />}
                        active={config.model === 'gemini-3-pro-image-preview'} 
                        onClick={() => onChange({ ...config, model: 'gemini-3-pro-image-preview' })} 
                     />
                     <ModelButton 
                        label="Fal.ai" 
                        sub="Upscaler"
                        icon={<Layers className="w-3.5 h-3.5" />}
                        active={config.model === 'fal-ai/drct-super-resolution'} 
                        onClick={() => onChange({ ...config, model: 'fal-ai/drct-super-resolution' })} 
                     />
                     <ModelButton 
                        label="Cloudinary" 
                        sub="Utility"
                        icon={<Cloud className="w-3.5 h-3.5" />}
                        active={config.model === 'cloudinary-ai'} 
                        onClick={() => onChange({ ...config, model: 'cloudinary-ai' })} 
                     />
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
       ${active ? 'bg-apple-shark dark:bg-white text-white dark:text-black border-transparent shadow-md transform scale-[1.02]' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-500 hover:border-gray-300 dark:hover:border-white/20 hover:text-apple-shark dark:hover:text-white'}`}
    >
       <div className={`${active ? 'scale-110' : 'opacity-80'}`}>
         {icon}
       </div>
       <span className="text-[10px] font-bold leading-none text-center">{label}</span>
    </button>
);

const ModelButton = ({ label, sub, active, onClick, icon }: { label: string, sub: string, active: boolean, onClick: () => void, icon: React.ReactNode }) => (
    <button 
       onClick={onClick}
       className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all duration-200
       ${active ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-apple-blue' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10'}`}
    >
       <div className="flex items-center gap-1.5 mb-0.5">
         {icon}
         <span className={`text-[11px] font-bold leading-none ${active ? 'text-apple-blue' : 'text-gray-600 dark:text-gray-300'}`}>{label}</span>
       </div>
       <span className={`text-[9px] font-medium leading-none ${active ? 'text-blue-400' : 'text-gray-400'}`}>{sub}</span>
    </button>
);

export default EnhancementControls;