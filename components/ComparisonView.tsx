import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeftRight, ZoomIn, ZoomOut, Check, Trash2, Move, Download, Clock } from 'lucide-react';

interface Props {
  beforeImage: string;
  afterImages: string[]; // Changed to array
  beforeDims?: { w: number, h: number };
  afterDims?: { w: number, h: number };
  processingTime?: number;
  onDiscard: () => void;
  onApply: (selectedImage: string) => void;
}

const ComparisonView: React.FC<Props> = ({ beforeImage, afterImages, beforeDims, afterDims, processingTime, onDiscard, onApply }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [isZoomMode, setIsZoomMode] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeAfterImage = afterImages[selectedIndex] || afterImages[0];

  const handleSliderMouseDown = () => !isZoomMode && setIsResizing(true);
  const handleSliderTouchStart = () => !isZoomMode && setIsResizing(true);
  
  const stopInteractions = useCallback(() => {
    setIsResizing(false);
    setIsPanning(false);
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;

    if (isResizing && !isZoomMode) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      setSliderPosition((x / rect.width) * 100);
      return;
    }

    if (isPanning && isZoomMode) {
      setPan(prev => ({
        x: prev.x + (clientX - startPan.x),
        y: prev.y + (clientY - startPan.y)
      }));
      setStartPan({ x: clientX, y: clientY });
    }
  }, [isResizing, isPanning, isZoomMode, startPan]);

  const handleMouseMove = useCallback((e: MouseEvent) => handleMove(e.clientX, e.clientY), [handleMove]);
  const handleTouchMove = useCallback((e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY), [handleMove]);

  useEffect(() => {
    window.addEventListener('mouseup', stopInteractions);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchend', stopInteractions);
    window.addEventListener('touchmove', handleTouchMove);
    return () => {
      window.removeEventListener('mouseup', stopInteractions);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchend', stopInteractions);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [stopInteractions, handleMouseMove, handleTouchMove]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setScale(prev => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) setPan({ x: 0, y: 0 });
      return newScale;
  });

  const handlePanStart = (clientX: number, clientY: number) => {
    if (isZoomMode) {
      setIsPanning(true);
      setStartPan({ x: clientX, y: clientY });
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = activeAfterImage;
    link.download = `kiko-enhanced-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full relative group select-none flex flex-col items-center">
      
      <div className="relative w-full flex justify-center">
        {/* Top Controls Overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-3 shadow-sm text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button onClick={() => setIsZoomMode(!isZoomMode)} className={`p-1.5 rounded-full transition-colors ${isZoomMode ? 'bg-white/20' : 'hover:bg-white/10'}`}>
                {isZoomMode ? <Move className="w-3.5 h-3.5" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
            </button>
            <div className="w-px h-3 bg-white/20" />
            <button onClick={handleZoomOut} disabled={scale <= 1} className="p-1.5 hover:bg-white/10 rounded-full disabled:opacity-50"><ZoomOut className="w-3.5 h-3.5" /></button>
            <button onClick={handleZoomIn} disabled={scale >= 4} className="p-1.5 hover:bg-white/10 rounded-full disabled:opacity-50"><ZoomIn className="w-3.5 h-3.5" /></button>
        </div>

        {/* Main Container */}
        <div 
            ref={containerRef}
            className={`relative max-w-full overflow-hidden ${isZoomMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-col-resize'}`}
            onMouseDown={(e) => isZoomMode ? handlePanStart(e.clientX, e.clientY) : handleSliderMouseDown()}
            onTouchStart={(e) => isZoomMode ? handlePanStart(e.touches[0].clientX, e.touches[0].clientY) : handleSliderTouchStart()}
            style={{ display: 'inline-block' }} 
        >
            {/* Driver Image - Determines Height/Width naturally */}
            <img 
                src={beforeImage} 
                className="block max-w-full h-auto opacity-0 pointer-events-none select-none max-h-[60vh]"
                style={{ visibility: 'hidden' }}
                alt=""
            />

            {/* Rendered Images Container */}
            <div className="absolute inset-0 w-full h-full">
                <img 
                    src={activeAfterImage} 
                    alt="After" 
                    className="absolute inset-0 w-full h-full object-contain object-center select-none"
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
                    draggable={false}
                />
                
                <img 
                    src={beforeImage} 
                    alt="Before" 
                    className="absolute inset-0 w-full h-full object-contain object-center select-none"
                    style={{ 
                        clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`
                    }}
                    draggable={false}
                />
            </div>
            
            {/* Pixel Dimensions Overlay - Compact & Flexible */}
            <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity max-w-[40%]">
                {beforeDims && (
                    <div className="bg-black/60 backdrop-blur-md text-white/90 text-[9px] sm:text-[10px] leading-tight font-medium px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full shadow-lg border border-white/10 whitespace-nowrap truncate">
                    <span className="hidden sm:inline">Original: </span>{beforeDims.w}×{beforeDims.h}
                    </div>
                )}
            </div>
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity max-w-[40%] text-right flex flex-col items-end gap-1">
                {afterDims && (
                    <div className="bg-blue-600/90 backdrop-blur-md text-white text-[9px] sm:text-[10px] leading-tight font-medium px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full shadow-lg border border-white/10 whitespace-nowrap truncate inline-block">
                    <span className="hidden sm:inline">Enhanced: </span>{afterDims.w}×{afterDims.h}
                    </div>
                )}
            </div>

            {/* Slider Line */}
            {!isZoomMode && (
                <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-[0_0_10px_rgba(0,0,0,0.5)] z-30 cursor-col-resize backdrop-blur-sm"
                style={{ left: `${sliderPosition}%` }}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border border-black/10">
                        <ArrowLeftRight className="w-4 h-4 text-black" />
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Thumbnails if Multiple Images */}
      {afterImages.length > 1 && (
         <div className="mt-4 flex gap-2 overflow-x-auto max-w-full px-4 pb-2">
            {afterImages.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${selectedIndex === idx ? 'border-blue-600 ring-2 ring-blue-600/30' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                    <img src={img} className="w-full h-full object-cover" alt={`Variant ${idx+1}`} />
                    <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1 rounded-tl-md">{idx + 1}</span>
                </button>
            ))}
         </div>
      )}

      {/* Bottom Actions Overlay */}
      <div className="mt-6 flex flex-col items-center gap-2">
         <div className="flex items-center gap-3 w-max">
            <button onClick={onDiscard} className="px-4 py-2 rounded-full bg-white text-red-500 text-sm font-medium shadow-lg hover:bg-red-50 transition-colors flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5" /> Discard
            </button>
            <button onClick={handleDownload} className="px-4 py-2 rounded-full bg-white text-gray-800 text-sm font-medium shadow-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button onClick={() => onApply(activeAfterImage)} className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Check className="w-3.5 h-3.5" /> Done
            </button>
         </div>
         
         {/* Unobtrusive Processing Timer */}
         {processingTime && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium opacity-80 mt-1">
                <Clock className="w-3 h-3" />
                <span>Generated in {(processingTime / 1000).toFixed(1)}s</span>
            </div>
         )}
      </div>
    </div>
  );
};

export default ComparisonView;
