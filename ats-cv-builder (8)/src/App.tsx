/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, FileText, Layout, ChevronRight, Loader2, Languages, Maximize2, X, ShieldCheck, Info, Lightbulb, Settings, AlertTriangle, HelpCircle, ChevronDown, Mail, MessageSquare, Trash2, History, Zap } from 'lucide-react';
import { ResumeForm } from './components/ResumeForm';
import { ResumePreview } from './components/ResumePreview';
import { JobDescriptionMatcher } from './components/JobDescriptionMatcher';
import { AIToolbox } from './components/AIToolbox';
import { ResumePDFDocument } from './components/ResumePDF';
import { ATSTips } from './components/ATSTips';
import { AdminDashboard } from './components/AdminDashboard';
import { BuyMeCoffee } from './components/BuyMeCoffee';
import { ResumeData } from './types';
import { cn, toEnglishDigits, deepConvertDigits, encryptData, decryptData } from './lib/utils';
import { translations, Language } from './constants';

const INITIAL_DATA: ResumeData = {
  personalInfo: {
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
  },
  summary: '',
  experience: [
    { company: '', position: '', startDate: '', endDate: '', description: '' }
  ],
  education: [
    { school: '', degree: '', graduationDate: '' }
  ],
  skills: [],
};

export default function App() {
  const [data, setData] = useState<ResumeData>(INITIAL_DATA);
  const previewRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errors, setErrors] = useState<{ email?: boolean; phone?: boolean; address?: boolean; jobTitle?: boolean }>({});

  const [showTips, setShowTips] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));
  const [showFAQ, setShowFAQ] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [appSettings, setAppSettings] = useState<any>({ maintenance_mode: 'false' });
  const [dynamicFaqs, setDynamicFaqs] = useState<any[]>([]);
  const [dynamicTips, setDynamicTips] = useState<any[]>([]);
  const [dynamicTerms, setDynamicTerms] = useState<any[]>([]);
  const [downloadHistory, setDownloadHistory] = useState<any[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('resume_data_v2');
    if (savedData) {
      const decrypted = decryptData(savedData);
      if (decrypted) {
        // Clear any placeholder-like text the user might have entered as a test
        const cleanValue = (val: any): any => {
          if (typeof val === 'string') {
            // Remove "ي" followed by spaces, or just multiple "ي" or "ب"
            if (/^[ي\s]+$/.test(val) || /^[ب\s]+$/.test(val) || /^[يب\s]+$/.test(val)) return '';
            return val;
          }
          if (Array.isArray(val)) return val.map(cleanValue);
          if (val !== null && typeof val === 'object') {
            const cleaned: any = {};
            Object.keys(val).forEach(key => {
              cleaned[key] = cleanValue(val[key]);
            });
            return cleaned;
          }
          return val;
        };
        setData(cleanValue(decrypted));
      }
    } else {
      // Fallback to old unencrypted data if exists
      const oldData = localStorage.getItem('resume_data');
      if (oldData) {
        try {
          setData(JSON.parse(oldData));
        } catch (e) {}
      }
    }

    const savedHistory = localStorage.getItem('download_history');
    if (savedHistory) {
      try {
        setDownloadHistory(JSON.parse(savedHistory));
      } catch (e) {}
    }
  }, []);

  // Pre-warm font cache for better reliability during PDF generation
  useEffect(() => {
    const fonts = [
      'https://fonts.gstatic.com/s/cairo/v28/SLXGc1j9F3M2nSdcmZre.ttf',
      'https://fonts.gstatic.com/s/cairo/v28/SLXGc1j9F3M2nSdc6Zre.ttf'
    ];
    fonts.forEach(url => {
      fetch(url, { mode: 'no-cors' }).catch(() => {});
    });
  }, []);

  // Save data to localStorage on change with debounce
  useEffect(() => {
    if (data === INITIAL_DATA) return;

    const timeoutId = setTimeout(() => {
      const sanitizedData = deepConvertDigits(data);
      const encrypted = encryptData(sanitizedData);
      localStorage.setItem('resume_data_v2', encrypted);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [data]);

  useEffect(() => {
    localStorage.setItem('download_history', JSON.stringify(downloadHistory));
  }, [downloadHistory]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings/public');
        if (res.ok) {
          const data = await res.json();
          setAppSettings(data.settings);
          setDynamicFaqs(data.faqs);
          setDynamicTips(data.tips);
          setDynamicTerms(data.terms || []);
          
          // Apply colors to CSS variables
          if (data.settings.primary_color) document.documentElement.style.setProperty('--primary', data.settings.primary_color);
          if (data.settings.accent_color) document.documentElement.style.setProperty('--accent', data.settings.accent_color);
        }
      } catch (e) {}
    };
    fetchSettings();
  }, []);

  const trackEvent = async (eventType: 'cv_created' | 'pdf_download' | 'ai_optimized') => {
    try {
      await fetch('/api/events/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, session_id: sessionId })
      });
    } catch (e) {
      // Silently fail for tracking errors to avoid cluttering console
      // and because ad-blockers often block these requests
    }
  };

  // Track CV creation once when data starts being entered
  const hasTrackedCreation = useRef(false);
  useEffect(() => {
    if (!hasTrackedCreation.current && data.personalInfo.fullName.length > 3) {
      trackEvent('cv_created');
      hasTrackedCreation.current = true;
    }
  }, [data.personalInfo.fullName]);

  const validate = () => {
    const newErrors = {
      email: !data.personalInfo.email,
      phone: !data.personalInfo.phone,
      address: !data.personalInfo.location,
      jobTitle: !data.personalInfo.jobTitle,
    };
    setErrors(newErrors);
    return !newErrors.email && !newErrors.phone && !newErrors.address && !newErrors.jobTitle;
  };

  const [language, setLanguage] = useState<Language>('en');

  const handleDataChange = React.useCallback((newData: ResumeData) => {
    setData(newData);
    
    if (newData.personalInfo.email && errors.email) {
      setErrors(prev => ({ ...prev, email: false }));
    }
    if (newData.personalInfo.phone && errors.phone) {
      setErrors(prev => ({ ...prev, phone: false }));
    }
    if (newData.personalInfo.location && errors.address) {
      setErrors(prev => ({ ...prev, address: false }));
    }
    if (newData.personalInfo.jobTitle && errors.jobTitle) {
      setErrors(prev => ({ ...prev, jobTitle: false }));
    }
  }, [errors]);

  const t = translations[language];
  const isRtl = language === 'ar';

  const loadSampleData = () => {
    const sampleData: ResumeData = {
      personalInfo: {
        fullName: 'Ahmed Mohamed',
        jobTitle: 'Software Developer',
        email: 'ahmed.mohamed@example.com',
        phone: '+966 50 000 0000',
        location: 'Riyadh, Saudi Arabia',
        linkedin: 'linkedin.com/in/ahmedmohamed',
      },
      summary: 'Experienced Software Developer with a strong background in building real-time web applications. Specialized in Build and Node.js with a focus on web performance and user experience optimization.',
      experience: [
        {
          company: 'Advanced Tech Co.',
          position: 'Web Developer',
          startDate: '01/2020',
          endDate: 'Present',
          description: '• Led a team of 5 developers to build a comprehensive e-commerce platform.\n• Optimized website loading speed by 40%, resulting in increased sales.\n• Implemented security standards for user data protection.'
        }
      ],
      education: [
        {
          school: 'King Saud University',
          degree: 'B.Sc. in Computer Science',
          graduationDate: '2019',
        }
      ],
      skills: ['Build', 'TypeScript', 'Node.js', 'Tailwind CSS', 'SQL', 'Git'],
      training: [
        { title: 'Data Science Specialization', provider: 'Coursera' },
        { title: 'Python for Data Science Bootcamp', provider: 'Udemy' }
      ],
      certifications: [
        { title: 'Microsoft Certified: Azure Fundamentals', provider: 'Microsoft' },
        { title: 'AWS Certified Solutions Architect – Associate', provider: 'Amazon Web Services' }
      ]
    };
    setData(sampleData);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = () => {
    if (isExporting) return;
    
    const newErrors = {
      email: !data.personalInfo.email,
      phone: !data.personalInfo.phone,
      address: !data.personalInfo.location,
      jobTitle: !data.personalInfo.jobTitle,
    };
    setErrors(newErrors);
    
    const isValid = !newErrors.email && !newErrors.phone && !newErrors.address && !newErrors.jobTitle;
    
    if (!isValid) {
      const missingFields = [];
      if (newErrors.email) missingFields.push('Email');
      if (newErrors.phone) missingFields.push('Phone');
      if (newErrors.address) missingFields.push('Location');
      if (newErrors.jobTitle) missingFields.push('Job Title');
      
      alert('Please complete these fields first: ' + missingFields.join(', '));
      return;
    }

    // Add to history
    const sanitizedData = deepConvertDigits(data);
    const historyItem = {
      id: Date.now().toString(),
      data: JSON.parse(JSON.stringify(sanitizedData)),
      timestamp: new Date().toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US'),
      name: sanitizedData.personalInfo.fullName || (language === 'ar' ? 'سيرة ذاتية بدون اسم' : 'Untitled Resume')
    };
    setDownloadHistory(prev => [historyItem, ...prev].slice(0, 10));

    if (activeTab === 'edit' && window.innerWidth < 1024) {
      setActiveTab('preview');
    }

    setIsExporting(true);
    setTimeout(async () => {
      try {
        await trackEvent('pdf_download');
        window.print();
      } catch (e) {
        alert("Print failed. Try 'Direct Download'");
      } finally {
        setIsExporting(false);
      }
    }, 300);
  };

  const handleDownloadPDF = async () => {
    const newErrors = {
      email: !data.personalInfo.email,
      phone: !data.personalInfo.phone,
      address: !data.personalInfo.location,
      jobTitle: !data.personalInfo.jobTitle,
    };
    setErrors(newErrors);
    
    const isValid = !newErrors.email && !newErrors.phone && !newErrors.address && !newErrors.jobTitle;
    
    if (!isValid) {
      alert(t.validationError);
      return;
    }

    if (isExporting) return;
    setIsExporting(true);
    
    try {
      const sanitizedData = deepConvertDigits(data);
      // Add to history
      const historyItem = {
        id: Date.now().toString(),
        data: JSON.parse(JSON.stringify(sanitizedData)),
        timestamp: new Date().toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US'),
        name: sanitizedData.personalInfo.fullName || (language === 'ar' ? 'سيرة ذاتية بدون اسم' : 'Untitled Resume')
      };
      setDownloadHistory(prev => [historyItem, ...prev].slice(0, 10));

      await trackEvent('pdf_download');
      
      let pdfRenderer;
      try {
        pdfRenderer = await import('@react-pdf/renderer');
      } catch (importError) {
        console.error('Failed to load PDF renderer:', importError);
        throw new Error('Could not load PDF generator. Please check your internet connection.');
      }

      const { pdf } = pdfRenderer;
      
      if (!ResumePDFDocument) {
        throw new Error('ResumePDFDocument not found');
      }

      // @ts-ignore
      const blob = await pdf(<ResumePDFDocument data={sanitizedData} language="en" />).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.personalInfo.fullName || 'Resume'}_ATS.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('PDF Export failed:', error);
      const errorStr = error instanceof Error ? error.message : String(error);
      let errorMessage = errorStr || 'Unknown error';
      
      // Check if it's a fetch error (likely font loading failure)
      if (errorMessage.toLowerCase().includes('fetch')) {
        // Fallback to html2canvas + jspdf if fonts fail to load
        try {
          console.log('Attempting fallback PDF generation...');
          const html2canvas = (await import('html2canvas')).default;
          const { jsPDF } = await import('jspdf');
          
          const element = document.getElementById('resume-preview');
          if (!element) throw new Error('Preview element not found');
          
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            allowTaint: true,
          });
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height]
          });
          
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
          pdf.save(`${data.personalInfo.fullName || 'Resume'}_ATS.pdf`);
          return;
        } catch (fallbackError) {
          console.error('Fallback PDF generation failed:', fallbackError);
          errorMessage = language === 'ar' 
            ? 'خطأ في تحميل الخطوط. يرجى التأكد من استقرار الإنترنت والمحاولة مرة أخرى. إذا استمرت المشكلة، جرب استخدام متصفح آخر.' 
            : 'Error loading fonts. Please ensure a stable internet connection and try again. If the issue persists, try a different browser.';
        }
      }
      
      alert(`PDF Export failed: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (appSettings.maintenance_mode === 'true') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto text-white">
            <Settings className="animate-spin" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white font-arabic">الموقع تحت الصيانة</h1>
          <p className="text-slate-400 font-arabic">نحن نقوم ببعض التحديثات لتحسين تجربتكم. سنعود قريباً!</p>
          <div className="pt-8 opacity-20 cursor-default" onClick={(e) => e.detail === 5 && setShowAdmin(true)}>
            <Sparkles size={20} className="mx-auto text-white" />
          </div>
        </div>
        <AdminDashboard isOpen={showAdmin} onClose={() => setShowAdmin(false)} language={language} />
      </div>
    );
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const isApiKeyMissing = !process.env.GEMINI_API_KEY;

  return (
    <div className={cn("min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-300", isRtl ? "font-arabic" : "")} dir={isRtl ? "rtl" : "ltr"}>
      {isProduction && isApiKeyMissing && (
        <div className="bg-amber-500 text-white p-3 text-center text-sm font-bold flex items-center justify-center gap-2 sticky top-0 z-[100] shadow-md print:hidden">
          <Zap size={16} />
          {language === 'ar' 
            ? "تنبيه: مفتاح GEMINI_API_KEY مفقود. يرجى إضافته في إعدادات Netlify ليعمل الذكاء الاصطناعي." 
            : "Warning: GEMINI_API_KEY is missing. Please set it in your Netlify environment variables for AI features to work."}
        </div>
      )}
      {/* Buy Me a Coffee */}
      <BuyMeCoffee language={language} />

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between print:hidden">
        <div 
          className="flex items-center gap-2 cursor-default select-none"
        >
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Sparkles className="text-white" size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight">{t.appName}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-100 uppercase tracking-wider">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            Grammar & ATS Verified
          </div>

          <button
            onClick={() => setShowTips(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold border border-amber-100 uppercase tracking-wider hover:bg-amber-100 transition-all"
          >
            <Lightbulb size={12} className="text-amber-600" />
            ATS Pro Tips
          </button>

          <button
            onClick={() => setShowFAQ(true)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
            title={t.faq}
          >
            <HelpCircle size={20} />
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
            title={t.settings}
          >
            <Settings size={20} />
          </button>

          <button
            onClick={() => {
              const el = document.getElementById('download-history-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
            title={language === 'ar' ? 'سجل التحميلات' : 'Download History'}
          >
            <History size={20} />
          </button>

          <div className="hidden md:flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('edit')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'edit' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Layout size={16} /> {t.edit}
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'preview' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <FileText size={16} /> {t.preview}
            </button>
          </div>

          {/* AI Optimization Button Removed as per user request */}

          <div className="flex items-center gap-2">
            <button
              onClick={loadSampleData}
              className="lg:hidden p-2.5 hover:bg-indigo-50 rounded-xl transition-all text-indigo-600 border border-indigo-100"
              title={t.fillSampleData}
            >
              <Sparkles size={20} />
            </button>
            <button
              onClick={loadSampleData}
              className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-indigo-100"
            >
              <Sparkles size={16} />
              {t.fillSampleData}
            </button>
            <button
              disabled={isExporting}
              onClick={handleDownloadPDF}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-slate-200 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
              <span className="hidden sm:inline">{t.downloadPdf}</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Download History Section */}
        <div 
          id="download-history-section"
          className="mb-8 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm print:hidden"
        >
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <History size={16} />
              </div>
              <h3 className="font-bold text-sm text-slate-800">
                {language === 'ar' ? 'سجل السير الذاتية المحملة' : 'Download History'}
              </h3>
            </div>
            {downloadHistory.length > 0 && (
              <button 
                onClick={() => setDownloadHistory([])}
                className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-wider transition-colors"
              >
                {language === 'ar' ? 'مسح السجل' : 'Clear History'}
              </button>
            )}
          </div>
          
          {downloadHistory.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {downloadHistory.map((item) => (
                <motion.div
                  key={item.id}
                  layoutId={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-shrink-0 w-64 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer group relative"
                  onClick={() => {
                    // Clean data before restoring
                    const cleanValue = (val: any): any => {
                      if (typeof val === 'string' && /^ي\s+$/.test(val)) return '';
                      if (Array.isArray(val)) return val.map(cleanValue);
                      if (val !== null && typeof val === 'object') {
                        const cleaned: any = {};
                        Object.keys(val).forEach(key => {
                          cleaned[key] = cleanValue(val[key]);
                        });
                        return cleaned;
                      }
                      return val;
                    };
                    setData(cleanValue(item.data));
                    setActiveTab('preview');
                    // Scroll to preview on mobile
                    if (window.innerWidth < 1024) {
                      const el = document.getElementById('resume-preview-container');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-sm truncate max-w-[150px]">{item.name}</span>
                      <span className="text-[10px] text-slate-500">{item.timestamp}</span>
                    </div>
                    <div className="p-1.5 bg-white rounded-lg shadow-sm text-indigo-600">
                      <FileText size={12} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-center">
                    <button className="w-full py-2 px-4 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm">
                      {language === 'ar' ? 'عرض السيرة الذاتية' : 'View Resume'}
                    </button>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDownloadHistory(prev => prev.filter(h => h.id !== item.id));
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity border border-slate-100"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
              <p className="text-slate-400 text-sm">
                {language === 'ar' ? 'لا يوجد سجل حالياً. سيتم حفظ نسخة هنا تلقائياً عند تحميل أي سيرة ذاتية.' : 'No history yet. A copy will be saved here automatically when you download any resume.'}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column: Form (Visible on mobile if tab is 'edit') */}
          <div className={cn("lg:block print:hidden", activeTab === 'preview' && "hidden")}>
            <div className="mb-8">
              <JobDescriptionMatcher data={data} onChange={setData} language={language} />
              <AIToolbox data={data} onChange={setData} language={language} />
            </div>

            <div className="form-container-card p-8">
              <ResumeForm 
                data={data} 
                onChange={handleDataChange} 
                errors={errors}
                language={language}
              />
            </div>
          </div>

          {/* Right Column: Preview (Visible on mobile if tab is 'preview') */}
          <div id="resume-preview-container" className={cn("lg:block sticky top-28 h-fit print:!block", activeTab === 'edit' && "hidden")}>
              <div className="mb-8 flex items-center justify-between">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-bold mb-1 font-display tracking-tight">{t.livePreview}</h2>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-500 text-sm">{t.atsFormat}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-all text-slate-500"
                    title="Expand"
                  >
                    <Maximize2 size={20} />
                  </button>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t.autoSaving}
                  </div>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-200px)] rounded-2xl border border-slate-200 shadow-2xl bg-slate-800 p-4">
                <ResumePreview data={data} language="en" />
              </div>
            </div>
          </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-200 mt-12 mb-24 md:mb-12 flex flex-col items-center gap-8 print:hidden">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
          <div 
            className="flex items-center gap-2 opacity-50 cursor-default select-none"
            onClick={(e) => {
              if (e.detail === 5) setShowAdmin(true);
            }}
          >
            <Sparkles size={16} />
            <span className="text-sm font-medium">© {new Date().getFullYear()} {t.appName}</span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6">
            <button 
              onClick={() => setShowTerms(true)}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              {t.termsOfUse}
            </button>
            <button 
              onClick={() => setShowPrivacy(true)}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              {t.privacyPolicy}
            </button>
            <button 
              onClick={() => setShowFAQ(true)}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              {t.faq}
            </button>
            <a 
              href="mailto:atsaicvbuild@gmail.com"
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-2"
            >
              <Mail size={14} />
              {t.contactEmailLabel}
            </a>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 w-full text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-arabic">
            تم انشاء هذا الموقع من قبل شركة لوجيك
          </p>
        </div>
      </footer>

      {/* Mobile Tab Switcher */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-1 rounded-2xl shadow-2xl flex md:hidden z-50 print:hidden">
        <button
          onClick={() => setActiveTab('edit')}
          className={cn("px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all", activeTab === 'edit' ? "bg-indigo-600" : "opacity-60")}
        >
          <Layout size={16} /> {t.edit}
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={cn("px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all", activeTab === 'preview' ? "bg-indigo-600" : "opacity-60")}
        >
          <FileText size={16} /> {t.preview}
        </button>
      </div>

      {/* Optimization Modal Removed */}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-xl">
                    <Settings className="text-slate-600" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{t.settings}</h3>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">
                    {t.language}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setLanguage('en')}
                      className={cn(
                        "px-4 py-3 rounded-2xl font-bold text-sm transition-all border-2",
                        language === 'en' 
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" 
                          : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                      )}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setLanguage('ar')}
                      className={cn(
                        "px-4 py-3 rounded-2xl font-bold text-sm transition-all border-2 font-arabic",
                        language === 'ar' 
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" 
                          : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                      )}
                    >
                      العربية
                    </button>
                  </div>
                </div>

                {language === 'ar' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3"
                  >
                    <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                    <p className="text-xs text-amber-800 leading-relaxed font-arabic">
                      {t.languageWarning}
                    </p>
                  </motion.div>
                )}
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[11px] hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  {t.done}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8" dir={isRtl ? "rtl" : "ltr"}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFullscreen(false)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-5xl h-full rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <h3 className="font-bold text-lg">{t.livePreview}</h3>
                <div className="flex items-center gap-2">
                  <button
                    disabled={isExporting}
                    onClick={handleDownloadPDF}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isExporting ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
                    {t.downloadPdf}
                  </button>
                  <button
                    onClick={() => setIsFullscreen(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-slate-100">
                <div className="mx-auto shadow-2xl rounded-sm">
                  <ResumePreview data={data} language="en" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ATS Tips Modal */}
      <AnimatePresence>
        {showTips && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTips(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-50 rounded-3xl shadow-2xl overflow-hidden border border-white"
            >
              <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-xl">
                    <Lightbulb className="text-amber-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">ATS Optimization Guide</h3>
                    <p className="text-sm text-slate-500">Master the Applicant Tracking System</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTips(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <ATSTips tips={dynamicTips} language={language} t={t} />
              </div>
              
              <div className="p-6 bg-white border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setShowTips(false)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Got it, thanks!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* FAQ Modal */}
      <AnimatePresence>
        {showFAQ && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFAQ(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                    <HelpCircle size={20} className="text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{t.faqTitle}</h3>
                </div>
                <button 
                  onClick={() => setShowFAQ(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                {[
                  ...dynamicFaqs.map(f => ({
                    q: language === 'ar' ? f.question_ar : f.question_en,
                    a: language === 'ar' ? f.answer_ar : f.answer_en
                  })),
                  { q: t.faqLangTitle, a: t.faqLangAnswer },
                  { q: t.faqPdfTitle, a: t.faqPdfAnswer },
                  { q: t.faqFreeTitle, a: t.faqFreeAnswer },
                  { q: t.faqImagesTitle, a: t.faqImagesAnswer },
                  { q: t.faqLengthTitle, a: t.faqLengthAnswer },
                  { q: t.faqSecurityTitle, a: t.faqSecurityAnswer },
                  { q: t.faqAccountTitle, a: t.faqAccountAnswer },
                  { q: t.faqMobileTitle, a: t.faqMobileAnswer },
                  { q: t.faqSupportTitle, a: t.faqSupportAnswer },
                  { q: t.faqMultipleTitle, a: t.faqMultipleAnswer },
                  { q: t.faqColorsTitle, a: t.faqColorsAnswer },
                  { q: t.faqFontsTitle, a: t.faqFontsAnswer },
                  { q: t.faqGapsTitle, a: t.faqGapsAnswer },
                  { q: t.faqUploadTitle, a: t.faqUploadAnswer },
                  { q: t.faqPrintTitle, a: t.faqPrintAnswer },
                  { q: t.faqUpdateTitle, a: t.faqUpdateAnswer },
                  { q: t.faqSectionsTitle, a: t.faqSectionsAnswer },
                  { q: t.faqSkillsTitle, a: t.faqSkillsAnswer },
                  { q: t.faqBrowserTitle, a: t.faqBrowserAnswer },
                  { q: t.faqAnyJobTitle, a: t.faqAnyJobAnswer },
                  { q: t.faqFreshGradTitle, a: t.faqFreshGradAnswer },
                  { q: t.faqPhotoTitle, a: t.faqPhotoAnswer },
                  { q: t.faqCvResumeTitle, a: t.faqCvResumeAnswer },
                  { q: t.faqReferencesTitle, a: t.faqReferencesAnswer },
                  { q: t.faqTemplateTitle, a: t.faqTemplateAnswer },
                  { q: t.faqCertsTitle, a: t.faqCertsAnswer },
                  { q: t.faqAddressTitle, a: t.faqAddressAnswer },
                  { q: t.faqTechSkillsTitle, a: t.faqTechSkillsAnswer },
                  { q: t.faqSoftSkillsTitle, a: t.faqSoftSkillsAnswer },
                  { q: t.faqAcademicTitle, a: t.faqAcademicAnswer },
                  { q: t.faqFreelanceTitle, a: t.faqFreelanceAnswer }
                ].map((item, i) => (
                  <div key={i} className="border border-slate-100 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                      className="w-full p-5 flex items-center justify-between bg-white hover:bg-slate-50 transition-all text-left"
                      dir={isRtl ? 'rtl' : 'ltr'}
                    >
                      <span className={cn("font-bold text-slate-800", isRtl ? "font-arabic" : "")}>
                        {item.q}
                      </span>
                      <ChevronDown 
                        size={18} 
                        className={cn("text-slate-400 transition-transform", activeFaq === i ? "rotate-180" : "")} 
                      />
                    </button>
                    <AnimatePresence>
                      {activeFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className={cn("p-5 pt-0 text-sm text-slate-600 leading-relaxed", isRtl ? "font-arabic text-right" : "text-left")}>
                            {item.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
                <button
                  onClick={() => setShowFAQ(false)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[11px] hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  {t.done}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Terms of Use Modal */}
      <AnimatePresence>
        {showTerms && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTerms(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                    <ShieldCheck size={20} className="text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{t.termsTitle}</h3>
                </div>
                <button 
                  onClick={() => setShowTerms(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className={cn("p-8 space-y-6 max-h-[60vh] overflow-y-auto", isRtl ? "text-right" : "text-left")}>
                <p className="text-slate-600 leading-relaxed font-bold">{t.termsAcceptance}</p>
                
                <div className="space-y-4">
                  {/* Dynamic Terms from DB */}
                  {dynamicTerms.map((term, idx) => (
                    <div key={`dynamic-${idx}`} className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                      <h4 className="font-bold text-indigo-900 mb-2">
                        {language === 'ar' ? `${idx + 1}` : `Term ${idx + 1}`}
                      </h4>
                      <p className="text-sm text-indigo-800 leading-relaxed">
                        {language === 'ar' ? term.content_ar : term.content_en}
                      </p>
                    </div>
                  ))}

                  {[
                    { title: t.termsAcceptanceTitle, desc: t.termsAcceptanceDesc },
                    { title: t.termsEligibilityTitle, desc: t.termsEligibilityDesc },
                    { title: t.termsLicenseTitle, desc: t.termsLicenseDesc },
                    { title: t.termsProhibitedTitle, desc: t.termsProhibitedDesc },
                    { title: t.termsContentTitle, desc: t.termsContentDesc },
                    { title: t.termsStorageTitle, desc: t.termsStorageDesc },
                    { title: t.termsPrivacyTitle, desc: t.termsPrivacyDesc },
                    { title: t.termsAtsTitle, desc: t.termsAtsDesc },
                    { title: t.termsAvailabilityTitle, desc: t.termsAvailabilityDesc },
                    { title: t.termsIpTitle, desc: t.termsIpDesc },
                    { title: t.termsThirdPartyTitle, desc: t.termsThirdPartyDesc },
                    { title: t.termsNoGuaranteeTitle, desc: t.termsNoGuaranteeDesc },
                    { title: t.termsLiabilityTitle, desc: t.termsLiabilityDesc },
                    { title: t.termsIndemnityTitle, desc: t.termsIndemnityDesc },
                    { title: t.termsModificationsTitle, desc: t.termsModificationsDesc },
                    { title: t.termsContactTitle, desc: t.termsContactDesc },
                    { title: t.termsConductTitle, desc: t.termsConductDesc },
                    { title: t.termsTerminationTitle, desc: t.termsTerminationDesc },
                    { title: t.termsCookiesTitle, desc: t.termsCookiesDesc },
                    { title: t.termsUpdatesTitle, desc: t.termsUpdatesDesc },
                    { title: t.termsNoWarrantyTitle, desc: t.termsNoWarrantyDesc },
                    { title: t.termsDataAccuracyTitle, desc: t.termsDataAccuracyDesc },
                    { title: t.termsSupportTitle, desc: t.termsSupportDesc },
                  ].map((section, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <h4 className="font-bold text-slate-900 mb-2">{section.title}</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">{section.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
                <button
                  onClick={() => setShowTerms(false)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[11px] hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  {t.done}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AdminDashboard isOpen={showAdmin} onClose={() => setShowAdmin(false)} language={language} />

      <AnimatePresence>
        {showPrivacy && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrivacy(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                    <ShieldCheck size={20} className="text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{t.privacyTitle}</h3>
                </div>
                <button 
                  onClick={() => setShowPrivacy(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <p className="text-sm text-emerald-900 leading-relaxed">
                      {t.privacyIntro}
                    </p>
                  </div>

                  {[
                    { title: t.privacyDataCollectionTitle, desc: t.privacyDataCollectionDesc },
                    { title: t.privacyCookiesTitle, desc: t.privacyCookiesDesc },
                    { title: t.privacySecurityTitle, desc: t.privacySecurityDesc },
                    { title: t.privacyUpdatesTitle, desc: t.privacyUpdatesDesc },
                    { title: t.privacyContactTitle, desc: t.privacyContactDesc },
                    { title: t.privacyOwnershipTitle, desc: t.privacyOwnershipDesc },
                    { title: t.privacyNoSharingTitle, desc: t.privacyNoSharingDesc },
                    { title: t.privacyLocalStorageTitle, desc: t.privacyLocalStorageDesc },
                    { title: t.privacyEncryptionTitle, desc: t.privacyEncryptionDesc },
                    { title: t.privacyAnalyticsTitle, desc: t.privacyAnalyticsDesc },
                    { title: t.privacyNoTrackingTitle, desc: t.privacyNoTrackingDesc },
                    { title: t.privacyRightToDeleteTitle, desc: t.privacyRightToDeleteDesc },
                    { title: t.privacyExternalLinksTitle, desc: t.privacyExternalLinksDesc },
                    { title: t.privacyNoServerStorageTitle, desc: t.privacyNoServerStorageDesc },
                  ].map((section, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <h4 className="font-bold text-slate-900 mb-2">{section.title}</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">{section.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
                <button
                  onClick={() => setShowPrivacy(false)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[11px] hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  {t.done}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
