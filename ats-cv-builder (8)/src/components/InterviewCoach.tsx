import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Loader2, User, Bot, RefreshCw, Languages, Sparkles } from 'lucide-react';
import { ResumeData, ChatMessage } from '../types';
import { translations } from '../constants';
import Markdown from 'react-markdown';

interface InterviewCoachProps {
  data: ResumeData;
  language: 'en' | 'ar';
  onClose: () => void;
}

export const InterviewCoach: React.FC<InterviewCoachProps> = ({ data, language, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translatedMessages, setTranslatedMessages] = useState<Record<number, string>>({});
  const [translatingIndex, setTranslatingIndex] = useState<number | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<any>(null);
  const t = translations[language];

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const startInterview = async () => {
    setIsLoading(true);
    setIsReady(true);
    setError(null);
    try {
      // Check if we need to open the key selection dialog
      if (typeof window !== 'undefined' && window.aistudio && !(await window.aistudio.hasSelectedApiKey()) && !process.env.GEMINI_API_KEY) {
        await window.aistudio.openSelectKey();
        setIsLoading(false);
        setIsReady(false);
        return; // Stop here, let user select key and click again
      }

      const apiKey = process.env.GEMINI_API_KEY || (window as any).process?.env?.API_KEY || (process.env as any).API_KEY;
      if (!apiKey) {
        throw new Error(language === 'ar' ? "يرجى إعداد مفتاح API في الإعدادات أو اختيار مفتاح من النافذة التي ظهرت." : "Please set an API key in settings or select a key from the dialog.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `You are a Senior Executive Recruiter and AI Interview Coach. Your goal is to provide a high-stakes, realistic mock interview experience.
          
          Guidelines:
          1. Analyze the candidate's resume and target job description carefully.
          2. Ask ONE challenging, relevant interview question at a time.
          3. After the candidate answers, provide brief, constructive feedback (strengths and areas for improvement) using the STAR method (Situation, Task, Action, Result).
          4. Then, ask the next logical question.
          5. Keep the tone professional, encouraging, but rigorous.
          6. If the candidate asks for advice, provide it briefly and then return to the interview.
          
          Candidate Profile:
          - Name: ${data.personalInfo.fullName}
          - Target Role: ${data.personalInfo.jobTitle}
          - Target Job Description: ${data.jobDescription || "General Professional Role"}
          - Experience: ${JSON.stringify(data.experience)}
          - Skills: ${data.skills.join(', ')}
          
          Respond in English only.`,
        }
      });
      chatSessionRef.current = chat;
      
      const result = await chat.sendMessage({ message: "Start the interview by introducing yourself briefly and asking the first question based on my profile and the job description." });
      setMessages([{ role: 'model', text: result.text || "" }]);
    } catch (err: any) {
      console.error('Failed to start interview:', err);
      let msg = err?.message || "Failed to start interview session";
      if (msg.includes("API key not valid") || msg.includes("not found")) {
        msg = language === 'ar' ? "مفتاح API غير صالح أو غير موجود. يرجى التأكد من الإعدادات." : "Invalid or missing API key. Please check the settings menu.";
      } else if (msg.includes("Quota exceeded")) {
        msg = language === 'ar' ? "تم تجاوز حد الاستخدام." : "Quota exceeded.";
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const translateMessage = async (text: string, index: number) => {
    if (translatedMessages[index]) return;
    setTranslatingIndex(index);
    try {
      const apiKey = process.env.GEMINI_API_KEY || (window as any).process?.env?.API_KEY || (process.env as any).API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following interview coaching text to Arabic. Keep the professional tone and preserve any technical terms in English if they are commonly used.
        
        Message: ${text}`,
      });
      const translated = response.text?.trim() || "";
      setTranslatedMessages(prev => ({ ...prev, [index]: translated }));
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setTranslatingIndex(null);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);
    setError(null);

    try {
      if (!chatSessionRef.current) throw new Error("Chat session not initialized");
      const result = await chatSessionRef.current.sendMessage({ message: userMessage });
      setMessages(prev => [...prev, { role: 'model', text: result.text || "" }]);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      let msg = err?.message || "Failed to get response from AI";
      if (msg.includes("API key not valid") || msg.includes("not found")) {
        msg = language === 'ar' ? "مفتاح API غير صالح أو غير موجود." : "Invalid or missing API key.";
      } else if (msg.includes("Quota exceeded")) {
        msg = language === 'ar' ? "تم تجاوز حد الاستخدام." : "Quota exceeded.";
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div className="bg-white w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{t.interviewCoach}</h3>
              <p className="text-xs text-slate-500">{t.interviewCoachDesc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-1.5"
            >
              <X size={14} />
              {t.endInterview}
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div 
          ref={chatRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
        >
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-center gap-3 mb-4">
              <div className="p-1.5 bg-red-100 rounded-lg">
                <X size={14} />
              </div>
              <p className="flex-1 font-medium">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                <X size={14} />
              </button>
            </div>
          )}

          {isReady ? (
            <>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-100 text-slate-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                      <div className="prose prose-sm prose-slate max-w-none">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                      {msg.role === 'model' && (
                        <div className="mt-3 pt-3 border-t border-slate-200/50">
                          {translatedMessages[idx] ? (
                            <div className="space-y-2">
                              <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                                <Languages size={10} />
                                {t.translatedText}
                              </div>
                              <div className="text-slate-700 font-arabic leading-relaxed">
                                {translatedMessages[idx]}
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => translateMessage(msg.text, idx)}
                              disabled={translatingIndex !== null}
                              className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-wider disabled:opacity-50"
                            >
                              {translatingIndex === idx ? (
                                <>
                                  <Loader2 size={10} className="animate-spin" />
                                  {t.translating}
                                </>
                              ) : (
                                <>
                                  <Languages size={10} />
                                  {t.translateToArabic}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Bot size={16} />
                    </div>
                    <div className="p-4 bg-slate-100 rounded-2xl rounded-tl-none flex items-center gap-2">
                      <Loader2 className="animate-spin text-indigo-600" size={16} />
                      <span className="text-xs text-slate-500">{t.loadingCoach}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="p-6 bg-indigo-50 rounded-full text-indigo-600">
                <Bot size={64} />
              </div>
              <div className="max-w-sm">
                <h4 className="text-xl font-bold text-slate-900 mb-2">{t.interviewCoach}</h4>
                <p className="text-slate-500 text-sm mb-6">{t.coachGreeting}</p>
                
                <div className="bg-indigo-50/50 p-4 rounded-2xl mb-6 text-left border border-indigo-100">
                  <h5 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Sparkles size={12} />
                    {t.starMethod}
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {t.starMethodDesc}
                  </p>
                </div>

                <button
                  onClick={startInterview}
                  disabled={isLoading}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 mx-auto"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                  {t.startInterview}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        {isReady && (
          <div className="p-6 border-t border-slate-100 bg-slate-50">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t.typeAnswer}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
