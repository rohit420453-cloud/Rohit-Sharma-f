import React, { useEffect, useState } from 'react';
import { Check, Copy, FileText, X } from 'lucide-react';
import { AI_EXTRACTION_PROMPT } from '../utils/billingLogic';

interface AiPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiPromptModal: React.FC<AiPromptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_EXTRACTION_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 3500);
    } catch {
      // Fallback copy via textarea for older Android webviews
      const textArea = document.createElement('textarea');
      textArea.value = AI_EXTRACTION_PROMPT;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-6 backdrop-blur-xs no-print"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-prompt-modal-title"
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-amber-700 dark:text-amber-500 shrink-0" />
            <h2 id="ai-prompt-modal-title" className="text-base sm:text-lg font-bold tracking-tight">
              Bulk Image to Add — AI Extraction Prompt
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI Prompt Popup"
            className="p-2 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          <div className="p-3.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-stone-800 dark:text-stone-200 space-y-1.5">
            <p className="font-semibold text-amber-900 dark:text-amber-300">
              How to convert a handwritten furniture bill photo into bulk items:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm text-stone-700 dark:text-stone-300">
              <li>Click <strong>Copy Prompt</strong> below to copy the extraction instructions.</li>
              <li>Open your preferred AI app (ChatGPT, Gemini, or Claude), attach your handwritten bill photo, and paste this prompt.</li>
              <li>Copy the extracted lines (e.g. <code className="font-mono bg-white/80 dark:bg-stone-900 px-1.5 py-0.5 rounded">Rack, 6, 200</code>) and paste them into the <strong>Bulk Add Products</strong> box on the bill page.</li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Furniture Bill Image Extraction Prompt
            </span>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                copied
                  ? 'bg-emerald-700 text-white'
                  : 'bg-amber-700 hover:bg-amber-800 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Prompt copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Prompt</span>
                </>
              )}
            </button>
          </div>

          {copied && (
            <div
              role="status"
              aria-live="polite"
              className="px-3.5 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>Prompt copied to clipboard! Paste it along with your bill photo in your AI tool.</span>
            </div>
          )}

          <pre className="p-4 rounded-lg bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words text-stone-800 dark:text-stone-200 select-all">
            {AI_EXTRACTION_PROMPT}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
