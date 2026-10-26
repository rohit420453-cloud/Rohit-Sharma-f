import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Printer, Share2, X } from 'lucide-react';
import { InvoiceRecord } from '../types/billing';
import { buildWhatsAppInvoiceMessage } from '../utils/storage';

interface ShareInvoiceModalProps {
  invoice: InvoiceRecord | null;
  currencySymbol: string;
  onClose: () => void;
  onPrintInvoice: () => void;
}

export const ShareInvoiceModal: React.FC<ShareInvoiceModalProps> = ({
  invoice,
  currencySymbol,
  onClose,
  onPrintInvoice,
}) => {
  const [phoneInput, setPhoneInput] = useState('');
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!invoice) return;
    setPhoneInput(invoice.customerPhone || '');
    setMessageText(buildWhatsAppInvoiceMessage(invoice, currencySymbol));
    setCopied(false);
  }, [invoice, currencySymbol]);

  useEffect(() => {
    if (!invoice) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [invoice, onClose]);

  if (!invoice) return null;

  const digitsOnly = phoneInput.replace(/\D/g, '');
  const formattedWhatsAppPhone =
    digitsOnly.length === 10
      ? `91${digitsOnly}`
      : digitsOnly.length > 10
      ? digitsOnly
      : '';

  const whatsappUrl = formattedWhatsAppPhone
    ? `https://wa.me/${formattedWhatsAppPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = messageText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${invoice.shopName} - Invoice ${invoice.billNumber}`,
          text: messageText,
        });
      } catch {
        // User cancelled share sheet
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-6 backdrop-blur-xs no-print"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-invoice-modal-title"
    >
      <div
        className="w-full max-w-xl rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
          <div className="flex items-center gap-2.5">
            <Share2 className="w-5 h-5 text-amber-700 dark:text-amber-500 shrink-0" />
            <h2 id="share-invoice-modal-title" className="text-base sm:text-lg font-bold">
              Share Invoice {invoice.billNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Share Modal"
            className="p-2 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          <div>
            <label
              htmlFor="share-whatsapp-phone"
              className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5"
            >
              Customer WhatsApp Number (optional — leave blank to pick contact in WhatsApp)
            </label>
            <input
              id="share-whatsapp-phone"
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              {formattedWhatsAppPhone
                ? `Will open WhatsApp chat for +${formattedWhatsAppPhone}. Delivery occurs once you press Send inside WhatsApp.`
                : 'No phone number entered — WhatsApp will let you choose any recipient.'}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="share-invoice-summary-text"
                className="text-xs font-semibold text-stone-600 dark:text-stone-400"
              >
                Invoice Summary Message (Editable)
              </label>
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Summary Copied' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              id="share-invoice-summary-text"
              rows={9}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-xs leading-relaxed text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors text-center"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span>Open in WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={() => {
                onClose();
                setTimeout(() => onPrintInvoice(), 100);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 font-semibold text-sm transition-colors"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Save as A4 PDF / Print</span>
            </button>
          </div>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-medium text-xs transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share via Device Share Sheet</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
