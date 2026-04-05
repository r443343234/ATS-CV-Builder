import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Search, Loader2, CheckCircle2, AlertCircle, Sparkles, ChevronDown, ChevronRight, X } from 'lucide-react';
import { ResumeData } from '../types';
import { translations } from '../constants';
import Markdown from 'react-markdown';

interface JobDescriptionMatcherProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  language: 'en' | 'ar';
}

export const JobDescriptionMatcher: React.FC<JobDescriptionMatcherProps> = ({ data, onChange, language }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = translations[language];

  const calculateMatch = () => {
    if (!data.jobDescription) return;
    
    const jd = data.jobDescription.toLowerCase();
    const resumeText = JSON.stringify(data).toLowerCase();
    
    // Simple keyword matching for initial score
    const commonKeywords = ['experience', 'skills', 'education', 'management', 'leadership', 'technical', 'project', 'team', 'development', 'analysis'];
    let matches = 0;
    commonKeywords.forEach(kw => {
      if (jd.includes(kw) && resumeText.includes(kw)) matches++;
    });
    
    const score = Math.min(Math.round((matches / commonKeywords.length) * 100), 100);
    setMatchScore(score);
  };

  useEffect(() => {
    calculateMatch();
  }, [data.jobDescription]);

  const getAiSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Check if we need to open the key selection dialog
      if (typeof window !== 'undefined' && window.aistudio && !(await window.aistudio.hasSelectedApiKey()) && !process.env.GEMINI_API_KEY) {
        await window.aistudio.openSelectKey();
        setIsLoading(false);
        return; // Stop here, let user select key and click again
      }

      const apiKey = process.env.GEMINI_API_KEY || (window as any).process?.env?.API_KEY || (process.env as any).API_KEY;
      if (!apiKey) {
        throw new Error(language === 'ar' ? "يرجى إعداد مفتاح API في الإعدادات أو اختيار مفتاح من النافذة التي ظهرت." : "Please set an API key in settings or select a key from the dialog.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the following resume against the job description. Provide 3-5 specific, actionable suggestions to improve the resume match for this specific role. Focus on keywords, missing skills, and experience framing.
        
        Resume: ${JSON.stringify({ personalInfo: data.personalInfo, experience: data.experience, skills: data.skills })}
        Job Description: ${data.jobDescription}
        
        Respond in English only. Use Markdown for formatting.`,
      });
      setAiSuggestions(response.text?.trim() || "");
    } catch (err: any) {
      console.error('AI Match suggestions failed:', err);
      let msg = err?.message || "AI request failed";
      if (msg.includes("API key not valid") || msg.includes("not found")) {
        msg = language === 'ar' ? "مفتاح API غير صالح أو غير موجود. يرجى التأكد من الإعدادات." : "Invalid or missing API key. Please check the settings menu.";
      } else if (msg.includes("Quota exceeded")) {
        msg = language === 'ar' ? "تم تجاوز حد الاستخدام المجاني." : "API Quota exceeded.";
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return { label: t.matchExcellent, desc: t.matchExcellentDesc };
    if (score >= 50) return { label: t.matchGood, desc: t.matchGoodDesc };
    if (score >= 30) return { label: t.matchFair, desc: t.matchFairDesc };
    return { label: t.matchPoor, desc: t.matchPoorDesc };
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8 print:hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Target size={24} />
          </div>
          <div className="text-left rtl:text-right">
            <h3 className="text-xl font-bold text-slate-900">{t.jobMatcher}</h3>
            <p className="text-sm text-slate-500">{t.jobMatcherDesc}</p>
          </div>
        </div>
        <div className="p-2 text-slate-400">
          {isOpen ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0 border-t border-slate-100">
              <div className="mt-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    {t.jobMatcher}
                  </label>
                  <textarea
                    value={data.jobDescription || ''}
                    onChange={(e) => onChange({ ...data, jobDescription: e.target.value })}
                    placeholder={t.jobMatcherDesc}
                    className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm resize-none"
                  />
                </div>

                {data.jobDescription && matchScore !== null && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-2xl border ${getScoreColor(matchScore)}`}>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-bold uppercase tracking-wider">{t.matchScore}</span>
                        <span className="text-3xl font-black">{matchScore}%</span>
                      </div>
                      <div className="w-full bg-white/50 rounded-full h-3 mb-4 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${matchScore}%` }}
                          className={`h-full rounded-full ${matchScore >= 80 ? 'bg-emerald-500' : matchScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        />
                      </div>
                      <h4 className="font-bold mb-1">{getScoreLabel(matchScore).label}</h4>
                      <p className="text-xs opacity-80">{getScoreLabel(matchScore).desc}</p>
                    </div>

                    <div className="flex flex-col justify-center space-y-4">
                      <button
                        onClick={getAiSuggestions}
                        disabled={isLoading}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                        {t.getAiSuggestions}
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-center gap-3">
                    <div className="p-1.5 bg-red-100 rounded-lg">
                      <AlertCircle size={14} />
                    </div>
                    <p className="flex-1 font-medium">{error}</p>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {aiSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-indigo-600 text-white rounded-xl">
                        <Sparkles size={20} />
                      </div>
                      <h4 className="font-bold text-indigo-900">{t.aiSuggestionsTitle}</h4>
                    </div>
                    <div className="prose prose-indigo prose-sm max-w-none prose-p:leading-relaxed prose-li:my-1">
                      <Markdown>{aiSuggestions}</Markdown>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
