import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coffee, X, Heart, Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { Language } from '../constants';

interface BuyMeCoffeeProps {
  language: Language;
}

export const BuyMeCoffee: React.FC<BuyMeCoffeeProps> = ({ language }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isRtl = language === 'ar';

  // Contact Email
  const EMAIL = "atsaicvbuild@gmail.com";

  const content = {
    ar: {
      title: 'ادعمنا بقهوة ☕',
      description: 'إذا كان لديك أي استفسار أو ترغب في دعمنا، يمكنك مراسلتنا عبر البريد الإلكتروني.',
      emailLabel: 'البريد الإلكتروني:',
      copy: 'نسخ الإيميل',
      copied: 'تم النسخ!',
      responseTime: 'سنرد عليك خلال أقل من ساعة',
      thanks: 'شكراً لتواصلك معنا!',
    },
    en: {
      title: 'Buy us a coffee ☕',
      description: 'If you have any questions or wish to support us, you can reach out via email.',
      emailLabel: 'Email Address:',
      copy: 'Copy Email',
      copied: 'Copied!',
      responseTime: 'We will respond in less than an hour',
      thanks: 'Thanks for reaching out!',
    }
  };

  const t = content[language];

  const handleCopy = () => {
    navigator.clipboard.writeText(EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end print:hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 mb-4 w-80 flex flex-col items-center text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
            
            <button 
              onClick={() => setIsOpen(false)}
              className={cn(
                "absolute top-4 p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600",
                isRtl ? "left-4" : "right-4"
              )}
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 text-indigo-600 rotate-3">
              <Coffee size={32} />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">{t.title}</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              {t.description}
            </p>

            <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                {t.emailLabel}
              </span>
              <div className="font-mono text-xs font-bold text-slate-700 mb-3 select-all bg-white p-2 rounded-lg border border-slate-100 break-all">
                {EMAIL}
              </div>
              <button
                onClick={handleCopy}
                className={cn(
                  "w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all",
                  copied 
                    ? "bg-emerald-500 text-white" 
                    : "bg-indigo-900 text-white hover:bg-indigo-800"
                )}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? t.copied : t.copy}
              </button>
            </div>

            <div className="flex flex-col items-center gap-1">
              <p className="text-[11px] font-bold text-indigo-600 font-arabic">
                {t.responseTime}
              </p>
              <div className="flex items-center gap-2 text-slate-400">
                <Heart size={12} fill="currentColor" className="text-red-400" />
                <p className="text-[10px] font-medium italic">
                  {t.thanks}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-300 group",
          isOpen ? "bg-slate-200 text-slate-600" : "bg-amber-600 text-white"
        )}
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <div className="relative">
            <Coffee size={24} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          </div>
        )}
      </motion.button>
    </div>
  );
};
