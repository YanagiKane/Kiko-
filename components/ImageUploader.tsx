import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelect: (base64: string, initialPrompt?: string) => void;
  onBatchSelect: (files: File[]) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, onBatchSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList | File[]) => {
    const validFiles = Array.from(newFiles).filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    if (validFiles.length === 1) {
      // Single Image -> Go straight to editor
      const file = validFiles[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onImageSelect(e.target.result as string, '');
        }
      };
      reader.readAsDataURL(file);
    } else {
      // Multiple Images -> Auto-enter Batch Mode
      onBatchSelect(validFiles);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full max-w-[480px] mx-auto">
      <div 
        className={`relative group cursor-pointer bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-[32px] shadow-2xl transition-all duration-300 h-64 flex flex-col items-center justify-center text-center border-2 border-dashed
        ${isDragging ? 'border-apple-blue bg-blue-50/50 dark:bg-blue-900/10 scale-[1.02]' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:bg-white dark:hover:bg-[#1C1C1E]'}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-20 h-20 rounded-3xl bg-gray-50 dark:bg-white/5 shadow-inner flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 ease-out">
            <div className="relative">
                <ImageIcon className="w-10 h-10 text-apple-blue" />
                <div className="absolute -bottom-2 -right-2 bg-apple-shark dark:bg-white text-white dark:text-black rounded-full p-1.5 shadow-lg">
                    <Upload className="w-3 h-3" />
                </div>
            </div>
        </div>
        
        <div className="space-y-2 px-8">
            <h3 className="text-lg font-bold text-apple-shark dark:text-white">Upload Photos</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                Drag & drop single or multiple files<br/>
                <span className="text-xs opacity-70">Supports JPG, PNG, WEBP</span>
            </p>
        </div>

        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
};

export default ImageUploader;