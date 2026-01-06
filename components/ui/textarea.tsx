import React, { useState, DragEvent, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  onFileContent?: (content: string, filename: string) => void;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, onFileContent, ...props }, ref) => {
    const [isDragOver, setIsDragOver] = useState(false);

  // Only attach drag handlers if onFileContent is provided
  const dragHandlers = onFileContent ? {
    onDragOver: (e: DragEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      setIsDragOver(true);
    },
    onDragLeave: (e: DragEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      setIsDragOver(false);
    },
    onDrop: (e: DragEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const textFiles = files.filter(file => 
        file.type.startsWith('text/') || 
        file.name.match(/\.(js|ts|jsx|tsx|py|html|css|json|md|txt|sql|sh|bash)$/i)
      );

      if (textFiles.length > 0) {
        const file = textFiles[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (content && onFileContent) {
            onFileContent(content, file.name);
          }
        };
        
        reader.readAsText(file);
      }
    }
  } : {};

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-white/90 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <textarea
          ref={ref}
          className={cn(
            'w-full px-4 py-3 rounded-lg',
            'bg-white/10 border border-white/20',
            'text-white placeholder-white/40',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'resize-none',
            'font-mono text-sm',
            error && 'border-red-500/50 focus:ring-red-500/50',
            isDragOver && 'border-blue-400 bg-blue-500/10 ring-2 ring-blue-500/50',
            className
          )}
          {...dragHandlers}
          {...props}
        />
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20 rounded-lg pointer-events-none">
            <div className="text-blue-300 text-sm font-medium">
              📁 Drop your code file here
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';