import React, { useRef, useEffect, useState } from 'react';
import { Eraser, Brush, Trash2, XCircle, CheckCircle2 } from 'lucide-react';

interface MaskEditorProps {
  imageUrl: string;
  maskBase64?: string; // Existing mask if any
  onMaskChange: (maskBase64: string | undefined) => void;
  isActive: boolean;
  onToggle: () => void;
}

const MaskEditor: React.FC<MaskEditorProps> = ({ imageUrl, maskBase64, onMaskChange, isActive, onToggle }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Initialize Canvas Size matching the rendered image
  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
       setImageLoaded(true);
       if (maskCanvasRef.current) {
          // Set internal resolution to match natural image size for high quality
          maskCanvasRef.current.width = img.naturalWidth;
          maskCanvasRef.current.height = img.naturalHeight;
          
          // If a mask already exists (e.g. from history), draw it
          if (maskBase64) {
             const maskImg = new Image();
             maskImg.src = maskBase64;
             maskImg.onload = () => {
                const ctx = maskCanvasRef.current?.getContext('2d');
                ctx?.drawImage(maskImg, 0, 0);
             };
          }
       }
    };
  }, [imageUrl]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!maskCanvasRef.current || !containerRef.current) return { x: 0, y: 0 };
    
    // The container is the boundary of the displayed image
    const rect = containerRef.current.getBoundingClientRect();
    
    // Scale factor = Internal Resolution / Displayed Size
    const scaleX = maskCanvasRef.current.width / rect.width;
    const scaleY = maskCanvasRef.current.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isActive) return;
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    if (!isActive) return;
    setIsDrawing(false);
    if (maskCanvasRef.current) {
        const maskData = maskCanvasRef.current.toDataURL('image/png');
        onMaskChange(maskData);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isActive || (!isDrawing && e.type !== 'mousedown' && e.type !== 'touchstart')) return;
    if (!maskCanvasRef.current) return;

    // Prevent scrolling on touch
    if (e.type === 'touchmove') {
       // e.preventDefault(); // Sometimes needed, but React handles passive events differently
    }

    const ctx = maskCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize; // This needs to be scaled relative to image size effectively
    
    // Calculate effective brush size relative to image scale
    // If image is 4000px wide, a 30px brush is tiny. We need to scale brush based on ratio.
    const rect = containerRef.current?.getBoundingClientRect();
    const scale = rect ? maskCanvasRef.current.width / rect.width : 1;
    ctx.lineWidth = brushSize * scale;

    ctx.strokeStyle = 'rgba(255, 255, 255, 1)'; // Solid white for the mask
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    
    if (!isDrawing) {
       ctx.beginPath();
       ctx.moveTo(x, y);
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Draw a circle at the tip to make lines round and smooth
    ctx.beginPath();
    ctx.arc(x, y, (brushSize * scale) / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearMask = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (maskCanvasRef.current) {
        const ctx = maskCanvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
        onMaskChange(undefined);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
        
        {/* Toggle Bar */}
        <div className="mb-4 flex items-center gap-4 bg-white/50 dark:bg-black/50 backdrop-blur-md p-1.5 rounded-full border border-gray-200 dark:border-white/10 shadow-sm z-10">
            <button 
                onClick={onToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${isActive ? 'bg-apple-blue text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10'}`}
            >
                {isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Brush className="w-3.5 h-3.5" />}
                {isActive ? 'Done Masking' : 'Paint Mask'}
            </button>

            {isActive && (
                <>
                    <div className="w-px h-4 bg-gray-300 dark:bg-white/20" />
                    <div className="flex items-center gap-2 px-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Size</span>
                        <input 
                            type="range" 
                            min="10" 
                            max="100" 
                            value={brushSize} 
                            onChange={(e) => setBrushSize(parseInt(e.target.value))}
                            className="w-20 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-apple-blue"
                        />
                    </div>
                    <div className="w-px h-4 bg-gray-300 dark:bg-white/20" />
                    <button 
                        onClick={clearMask} 
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-full transition-colors"
                        title="Clear Mask"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </>
            )}
        </div>

        {/* Image Container */}
        <div ref={containerRef} className="relative inline-block max-w-full group">
            <img 
                src={imageUrl} 
                className="max-w-full h-auto object-contain block max-h-[65vh]" 
                alt="Canvas"
                style={{ pointerEvents: 'none', userSelect: 'none' }} 
            />
            
            <canvas 
                ref={maskCanvasRef}
                className={`absolute inset-0 w-full h-full touch-none ${isActive ? 'cursor-crosshair opacity-60' : 'pointer-events-none opacity-40'}`}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{ mixBlendMode: 'normal' }} // Mask is white overlay
            />
            
            {/* Hover overlay hint when inactive */}
            {!isActive && imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-xs font-bold">
                        Click "Paint Mask" to select specific areas
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default MaskEditor;