import React from 'react';
import { Bot, User } from 'lucide-react';

interface AIChatBubbleProps {
  role: 'user' | 'model';
  text: string;
}

export function AIChatBubble({ role, text }: AIChatBubbleProps) {
  const isAI = role === 'model';

  // Basic markdown-lite rendering
  const renderText = (content: string) => {
    // Split by newlines
    return content.split('\n').map((line, i) => {
      // Bold rendering
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedLine = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      // List rendering
      if (line.trim().startsWith('- ')) {
        return (
          <div key={i} className="flex gap-2 my-1 ml-2">
            <span className="text-gray-400 mt-1">•</span>
            <span>{renderedLine.slice(1) /* remove the dash */}</span>
          </div>
        );
      }
      
      if (line.trim().startsWith('* ')) {
        return (
          <div key={i} className="flex gap-2 my-1 ml-2">
            <span className="text-gray-400 mt-1">•</span>
            <span>{renderedLine.slice(1) /* remove the star */}</span>
          </div>
        );
      }

      return (
        <p key={i} className="mb-2 last:mb-0">
          {renderedLine}
        </p>
      );
    });
  };

  return (
    <div className={`flex w-full ${isAI ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`flex max-w-[80%] ${isAI ? 'flex-row' : 'flex-row-reverse'} items-end gap-2`}>
        <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isAI ? 'bg-indigo-100 text-indigo-600' : 'bg-teal-100 text-teal-600'}`}>
          {isAI ? <Bot size={16} /> : <User size={16} />}
        </div>
        <div 
          className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
            isAI 
              ? 'bg-white border border-gray-100 text-gray-800 rounded-bl-none' 
              : 'bg-teal-600 text-white rounded-br-none'
          }`}
        >
          {renderText(text)}
        </div>
      </div>
    </div>
  );
}
