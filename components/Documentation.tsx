import React, { useState } from 'react';
import { FileCode, Download, CheckSquare, Square, Package, ArrowRight, FileText, Code } from 'lucide-react';
import JSZip from 'jszip';
import { PROJECT_FILES } from '../data/sourceCode';

const Documentation: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isZipping, setIsZipping] = useState(false);

  const toggleFile = (path: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFiles(newSelected);
  };

  const toggleAll = () => {
    if (selectedFiles.size === PROJECT_FILES.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(PROJECT_FILES.map(f => f.path)));
    }
  };

  const downloadFile = (file: typeof PROJECT_FILES[0]) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadZip = async (filesToZip = PROJECT_FILES) => {
    setIsZipping(true);
    try {
        const zip = new JSZip();
        
        // Filter files if we are downloading a selection, otherwise download all provided
        const targetFiles = filesToZip === PROJECT_FILES && selectedFiles.size > 0 
            ? PROJECT_FILES.filter(f => selectedFiles.has(f.path))
            : filesToZip;

        targetFiles.forEach(file => {
            zip.file(file.path, file.content);
        });

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = "lynx-source-code.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Failed to zip files", e);
    } finally {
        setIsZipping(false);
    }
  };

  const isAllSelected = selectedFiles.size === PROJECT_FILES.length;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-20">
      
      {/* Header Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-apple-shark dark:text-white mb-4 tracking-tight">
           Developer Resources
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
           Access the complete source code for LYNX. Download specific components or the entire project repository to explore how the AI enhancement pipeline works.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white/70 dark:bg-[#1E1E1E]/60 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-2xl rounded-[32px] overflow-hidden">
         
         {/* Toolbar */}
         <div className="px-6 py-5 border-b border-gray-200/50 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-4 w-full md:w-auto">
                 <button 
                    onClick={toggleAll}
                    className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-apple-blue transition-colors"
                 >
                    {isAllSelected ? <CheckSquare className="w-5 h-5 text-apple-blue" /> : <Square className="w-5 h-5" />}
                    {isAllSelected ? 'Deselect All' : 'Select All Files'}
                 </button>
                 <span className="text-xs text-gray-400 font-medium hidden md:inline">
                    {selectedFiles.size} of {PROJECT_FILES.length} selected
                 </span>
             </div>

             <div className="flex items-center gap-3 w-full md:w-auto">
                 {selectedFiles.size > 0 && (
                     <button 
                        onClick={() => downloadZip()}
                        className="flex-1 md:flex-none px-4 py-2 bg-apple-blue/10 text-apple-blue rounded-xl text-sm font-bold hover:bg-apple-blue/20 transition-colors flex items-center justify-center gap-2"
                     >
                        <Package className="w-4 h-4" />
                        Download Selected ({selectedFiles.size})
                     </button>
                 )}
                 <button 
                    onClick={() => downloadZip(PROJECT_FILES)}
                    disabled={isZipping}
                    className="flex-1 md:flex-none px-6 py-2 bg-apple-shark dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                 >
                    {isZipping ? <span className="loading loading-spinner loading-xs"></span> : <Download className="w-4 h-4" />}
                    Download Full Project
                 </button>
             </div>
         </div>

         {/* File List */}
         <div className="divide-y divide-gray-100 dark:divide-white/5">
             {PROJECT_FILES.map((file, idx) => {
                 const isSelected = selectedFiles.has(file.path);
                 const isTs = file.path.endsWith('.ts') || file.path.endsWith('.tsx');
                 const isJson = file.path.endsWith('.json');
                 const isHtml = file.path.endsWith('.html');
                 
                 return (
                     <div 
                        key={file.path} 
                        className={`group px-6 py-4 flex items-center justify-between transition-colors hover:bg-gray-50/80 dark:hover:bg-white/5 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                     >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <button onClick={() => toggleFile(file.path)} className="text-gray-400 hover:text-apple-blue transition-colors">
                                {isSelected ? <CheckSquare className="w-5 h-5 text-apple-blue" /> : <Square className="w-5 h-5" />}
                            </button>
                            
                            <div className={`p-2 rounded-lg ${isTs ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : isJson ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>
                                {isTs ? <Code className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                            </div>
                            
                            <div className="min-w-0">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{file.name}</h3>
                                <p className="text-xs text-gray-400 font-medium truncate">{file.path}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 font-mono hidden sm:inline">
                                {(file.content.length / 1024).toFixed(1)} KB
                            </span>
                            <button 
                                onClick={() => downloadFile(file)}
                                className="p-2 text-gray-400 hover:text-apple-shark dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Download File"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                     </div>
                 );
             })}
         </div>
      </div>
    </div>
  );
};

export default Documentation;