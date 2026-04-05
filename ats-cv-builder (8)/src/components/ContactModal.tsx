import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Mail, User, MessageSquare, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { translations, Language } from '../constants';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, language }) => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '', website: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const t = translations[language];
  const isRtl = language === 'ar';

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '', website: '' });
        setTimeout(() => {
          onClose();
          setStatus('idle');
        }, 2000);
      } else {
        console.error("Contact API Error:", result.error || result.message);
        setStatus('error');
      }
    } catch (error) {
      console.error("Submission Error:", error);
      setStatus('error');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                  <Mail size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t.contactTitle}</h3>
                  <p className="text-xs text-slate-500">{t.contactSub}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form 
              onSubmit={handleSubmit} 
              className="p-6 space-y-4"
            >
              {/* Honeypot field */}
              <div className="hidden" aria-hidden="true">
                <input 
                  type="text" 
                  name="website" 
                  tabIndex={-1} 
                  autoComplete="off" 
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
              {status === 'success' ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 flex flex-col items-center justify-center text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={40} />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900">{t.contactSuccess}</h4>
                  <p className="text-sm text-slate-500 font-medium">{t.contactSuccessSub}</p>
                </motion.div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <User size={14} /> {t.contactName}
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={cn("w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all", isRtl ? "text-right" : "text-left")}
                        dir={isRtl ? 'rtl' : 'ltr'}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <Mail size={14} /> {t.contactEmail}
                      </label>
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={cn("w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all", isRtl ? "text-right" : "text-left")}
                        dir={isRtl ? 'rtl' : 'ltr'}
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        {isRtl ? "سوف نستخدم هذا البريد للرد عليك." : "We will use this email to reply to you."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare size={14} /> {t.contactSubject}
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className={cn(
                          "w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none",
                          isRtl ? "text-right pr-3 pl-10" : "text-left pl-3 pr-10"
                        )}
                        dir={isRtl ? 'rtl' : 'ltr'}
                      >
                        <option value="" disabled>{t.contactSubject}</option>
                        {(t as any).contactSubjectOptions.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <div className={cn("absolute top-1/2 -translate-y-1/2 pointer-events-none text-slate-400", isRtl ? "left-3" : "right-3")}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <MessageSquare size={14} /> {t.contactMessage}
                      </label>
                      <span className={cn("text-[10px] font-bold", formData.message.length > 450 ? "text-red-500" : "text-slate-400")}>
                        {formData.message.length}/500
                      </span>
                    </div>
                    <textarea
                      required
                      rows={4}
                      maxLength={500}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className={cn("w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none", isRtl ? "text-right" : "text-left")}
                      dir={isRtl ? 'rtl' : 'ltr'}
                    />
                  </div>

                  {status === 'error' && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex flex-col gap-1 border border-red-100">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} /> 
                        <span className="font-bold">{t.contactError}</span>
                      </div>
                      <p className="opacity-70 text-[10px]">
                        {isRtl 
                          ? "تأكد من اتصالك بالإنترنت، أو حاول استخدام نص أبسط (بدون رموز خاصة)." 
                          : "Check your connection, or try using simpler text (no special symbols)."}
                      </p>
                    </div>
                  )}

                  <button
                    disabled={status === 'loading' || formData.message.length === 0}
                    type="submit"
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === 'loading' ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {t.contactSend}
                  </button>
                  <p className="text-[10px] text-center text-slate-400 mt-2">
                    {isRtl ? "سيتم الرد على استفسارك عبر البريد الإلكتروني." : "Your inquiry will be answered via email."}
                  </p>
                </>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
