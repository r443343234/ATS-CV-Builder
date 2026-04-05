import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, FileText, MessageSquare, Target, Wand2, Loader2, ChevronDown, ChevronRight, Copy, Check, X, BrainCircuit } from 'lucide-react';
import { ResumeData } from '../types';
import { translations } from '../constants';
import Markdown from 'react-markdown';
import { InterviewCoach } from './InterviewCoach';

interface AIToolboxProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  language: 'en' | 'ar';
}

export const AIToolbox: React.FC<AIToolboxProps> = ({ data, onChange, language }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showCoach, setShowCoach] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = translations[language];

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const runTool = async (tool: string, prompt: string) => {
    setIsLoading(true);
    setActiveTool(tool);
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
        contents: prompt,
      });
      const result = response.text?.trim() || "";
      
      if (tool === 'cover') onChange({ ...data, aiCoverLetter: result });
      if (tool === 'interview') onChange({ ...data, aiInterviewQuestions: result });
      if (tool === 'gap') onChange({ ...data, aiSkillGap: result });
      if (tool === 'summary') onChange({ ...data, summary: result });
      
    } catch (err: any) {
      console.error(`AI ${tool} failed:`, err);
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

  const generateCoverLetter = () => {
    setActiveTool('cover');
    const prompt = `Write a professional and personalized cover letter based on the following resume and job description. The letter should be persuasive and focus on strengths aligned with the job.
    
    Resume: ${JSON.stringify({ personalInfo: data.personalInfo, experience: data.experience, skills: data.skills })}
    Job Description: ${data.jobDescription}
    
    Respond in English only. Use Markdown for formatting.`;
    runTool('cover', prompt);
  };

  const predictQuestions = () => {
    setActiveTool('interview');
    const prompt = `Based on the following job description and resume, predict 5-7 likely interview questions the candidate will be asked. For each question, provide a brief tip on how to answer it effectively.
    
    Resume: ${JSON.stringify({ personalInfo: data.personalInfo, experience: data.experience, skills: data.skills })}
    Job Description: ${data.jobDescription}
    
    Respond in English only. Use Markdown for formatting.`;
    runTool('interview', prompt);
  };

  const analyzeSkillGap = () => {
    setActiveTool('gap');
    const prompt = `Analyze the gap between the candidate's skills and the requirements in the job description. Identify missing key skills and provide suggestions on how to address these gaps.
    
    Candidate Skills: ${data.skills.join(', ')}
    Job Description: ${data.jobDescription}
    
    Respond in English only. Use Markdown for formatting.`;
    runTool('gap', prompt);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8 print:hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Sparkles size={24} />
          </div>
          <div className="text-left rtl:text-right">
            <h3 className="text-xl font-bold text-slate-900">{t.aiToolbox}</h3>
            <p className="text-sm text-slate-500">{t.aiToolboxDesc}</p>
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
              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-center gap-3">
                  <div className="p-1.5 bg-red-100 rounded-lg">
                    <Sparkles size={14} />
                  </div>
                  <p className="flex-1 font-medium">{error}</p>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {/* Cover Letter */}
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{t.coverLetterTitle}</h4>
                      <p className="text-xs text-slate-500">{t.coverLetterDesc}</p>
                    </div>
                  </div>
                  <button 
                    onClick={generateCoverLetter}
                    disabled={isLoading || !data.jobDescription}
                    className="w-full py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:border-indigo-200 transition-all disabled:opacity-50"
                  >
                    {isLoading && activeTool === 'cover' ? <Loader2 className="animate-spin mx-auto" size={16} /> : t.generateCoverLetter}
                  </button>
                  {data.aiCoverLetter && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-slate-100 relative group">
                      <div className="prose prose-slate prose-xs max-w-none max-h-40 overflow-y-auto custom-scrollbar">
                        <Markdown>{data.aiCoverLetter}</Markdown>
                      </div>
                      <button 
                        onClick={() => handleCopy(data.aiCoverLetter!, 'cover')}
                        className="absolute top-2 right-2 p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copiedField === 'cover' ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Interview Questions */}
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-emerald-600">
                      <Target size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{t.interviewQuestionsTitle}</h4>
                      <p className="text-xs text-slate-500">{t.interviewQuestionsDesc}</p>
                    </div>
                  </div>
                  <button 
                    onClick={predictQuestions}
                    disabled={isLoading || !data.jobDescription}
                    className="w-full py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:border-emerald-200 transition-all disabled:opacity-50"
                  >
                    {isLoading && activeTool === 'interview' ? <Loader2 className="animate-spin mx-auto" size={16} /> : t.generateInterviewQuestions}
                  </button>
                  {data.aiInterviewQuestions && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-slate-100 relative group">
                      <div className="prose prose-slate prose-xs max-w-none max-h-40 overflow-y-auto custom-scrollbar">
                        <Markdown>{data.aiInterviewQuestions}</Markdown>
                      </div>
                      <button 
                        onClick={() => handleCopy(data.aiInterviewQuestions!, 'interview')}
                        className="absolute top-2 right-2 p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copiedField === 'interview' ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Skill Gap */}
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-red-600">
                      <BrainCircuit size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{t.skillGapTitle}</h4>
                      <p className="text-xs text-slate-500">{t.skillGapDesc}</p>
                    </div>
                  </div>
                  <button 
                    onClick={analyzeSkillGap}
                    disabled={isLoading || !data.jobDescription}
                    className="w-full py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-red-50 hover:border-red-200 transition-all disabled:opacity-50"
                  >
                    {isLoading && activeTool === 'gap' ? <Loader2 className="animate-spin mx-auto" size={16} /> : t.analyzeSkillGap}
                  </button>
                  {data.aiSkillGap && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-slate-100 relative group">
                      <div className="prose prose-slate prose-xs max-w-none max-h-40 overflow-y-auto custom-scrollbar">
                        <Markdown>{data.aiSkillGap}</Markdown>
                      </div>
                      <button 
                        onClick={() => handleCopy(data.aiSkillGap!, 'gap')}
                        className="absolute top-2 right-2 p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copiedField === 'gap' ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Interview Coach */}
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{t.interviewCoach}</h4>
                      <p className="text-xs text-slate-500">{t.interviewCoachDesc}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowCoach(true)}
                    disabled={!data.jobDescription}
                    className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm"
                  >
                    {t.startInterview}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCoach && (
          <InterviewCoach 
            data={data} 
            language={language} 
            onClose={() => setShowCoach(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
