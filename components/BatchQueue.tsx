import React, { useRef } from 'react';
import { BatchItem } from '../types';
import { Loader2, AlertTriangle, Download, Trash2, Plus, Check } from 'lucide-react';

interface Props {
  items: BatchItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
  isProcessing: boolean;
  onHome: () => void;
  onAddMore: (files: File[]) => void;
}

const BatchQueue: React.FC<Props> = ({ items, onRemove, onClear, isProcessing, onHome, onAddMore }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
         <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Queue ({items.length})</h2>
         <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-apple-blue font-medium text-xs flex items-center gap-1.5 transition-colors">
               <Plus className="w-3.5 h-3.5" /> Add
            </button>
            <button onClick={onClear} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-red-400 hover:text-red-500 font-medium text-xs transition-colors">
               Clear All
            </button>
         </div>
         <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={(e) => e.target.files && onAddMore(Array.from(e.target.files))} />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
         {items.length === 0 ? (
             <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                 <p className="text-sm">No images in queue</p>
             </div>
         ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map(item => (
                <div key={item.id} className="relative group bg-gray-50 dark:bg-black/40 rounded-2xl overflow-hidden aspect-square border border-gray-100 dark:border-white/5 hover:border-apple-blue/50 transition-all shadow-sm">
                    {/* Image */}
                    <div className="w-full h-full flex items-center justify-center p-2">
                        <img src={item.result || item.preview} className="w-full h-full object-contain rounded-lg" alt="" />
                    </div>
                    
                    {/* Status Overlay */}
                    <div className="absolute inset-0 p-3 flex flex-col justify-between pointer-events-none">
                        <div className="self-end">
                            {item.status === 'completed' && <div className="bg-green-500 rounded-full p-1 shadow-sm animate-fade-in"><Check className="w-3 h-3 text-white" /></div>}
                            {item.status === 'processing' && (
                                <span className="loading loading-spinner loading-sm text-white drop-shadow-md"></span>
                            )}
                            {item.status === 'failed' && <AlertTriangle className="w-5 h-5 text-red-500 drop-shadow-md" />}
                        </div>
                        
                        {/* Actions Slide Up */}
                        <div className="bg-white/95 dark:bg-[#1D1D1F]/95 backdrop-blur-md p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 flex justify-between items-center gap-2 pointer-events-auto shadow-lg">
                            <span className="text-[10px] truncate text-gray-600 dark:text-gray-300 max-w-[60px] font-medium">{item.file.name}</span>
                            {item.status === 'completed' ? (
                                <a href={item.result} download={`enhanced-${item.file.name}`} className="p-1.5 bg-gray-100 dark:bg-white/10 rounded-lg text-apple-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Download className="w-3.5 h-3.5" /></a>
                            ) : (
                                <button onClick={() => onRemove(item.id)} className="p-1.5 bg-gray-100 dark:bg-white/10 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                        </div>
                    </div>
                </div>
                ))}
                
                {/* Add Button Tile */}
                <button 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-apple-blue hover:border-apple-blue/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                >
                <Plus className="w-6 h-6" />
                <span className="text-xs font-bold uppercase tracking-wide">Add</span>
                </button>
            </div>
         )}
      </div>
    </div>
  );
};

export default BatchQueue;