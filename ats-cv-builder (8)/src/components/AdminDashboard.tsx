import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Shield, BarChart3, Settings, AlertCircle, 
  Trash2, CheckCircle2, ChevronRight, Loader2, Save, Plus,
  Layout, HelpCircle, Lightbulb, Power, Eye, EyeOff,
  TrendingUp, Download, FileText, History, RefreshCw, RotateCcw,
  MessageSquare, ShieldCheck, Lock
} from 'lucide-react';
import { cn, toEnglishDigits } from '../lib/utils';
import { Language } from '../constants';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

type Tab = 'stats' | 'content' | 'settings' | 'logs' | 'messages';

export function AdminDashboard({ isOpen, onClose, language }: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [stats, setStats] = useState<any>(null);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [tips, setTips] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [logs, setLogs] = useState<{ errorLogs: any[] }>({ errorLogs: [] });
  const [messages, setMessages] = useState<any[]>([]);
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(() => {
    const saved = localStorage.getItem('admin_failed_attempts');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    const saved = localStorage.getItem('admin_lockout_until');
    return saved ? parseInt(saved, 10) : null;
  });

  useEffect(() => {
    localStorage.setItem('admin_failed_attempts', failedAttempts.toString());
  }, [failedAttempts]);

  useEffect(() => {
    if (lockoutUntil) {
      localStorage.setItem('admin_lockout_until', lockoutUntil.toString());
    } else {
      localStorage.removeItem('admin_lockout_until');
    }
  }, [lockoutUntil]);

  // Session timeout logic
  useEffect(() => {
    if (isAuthenticated) {
      const timeout = setTimeout(() => {
        setIsAuthenticated(false);
        setSecret('');
        setError('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى');
      }, 15 * 60 * 1000); // 15 minutes
      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, activeTab]);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [faqForm, setFaqForm] = useState({
    question_en: '',
    answer_en: '',
    question_ar: '',
    answer_ar: '',
    order_index: 0
  });

  const [editingTip, setEditingTip] = useState<any>(null);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [tipForm, setTipForm] = useState({
    content_en: '',
    content_ar: '',
    type: 'general'
  });

  const isRtl = language === 'ar';

  const fetchWithAuth = async (url: string, options: any = {}) => {
    const cleanSecret = toEnglishDigits(secret).trim();
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'x-admin-secret': cleanSecret,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check lockout
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      setError(`محاولات كثيرة خاطئة. يرجى الانتظار ${minutes}:${seconds < 10 ? '0' : ''}${seconds} دقائق`);
      return;
    }

    setIsLoading(true);
    setError(null);
    const secretToSubmit = toEnglishDigits(secret).trim();
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secretToSubmit })
      });
      if (res.ok) {
        setIsAuthenticated(true);
        setFailedAttempts(0);
        setLockoutUntil(null);
        loadTabData('stats');
      } else {
        const data = await res.json();
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        
        if (newFailedAttempts >= 5) {
          const lockoutTime = Date.now() + 5 * 60 * 1000; // 5 minutes lockout
          setLockoutUntil(lockoutTime);
          setError('تم قفل الدخول لمدة 5 دقائق بسبب محاولات خاطئة متكررة');
        } else {
          let errorMsg = data.error === 'Invalid secret' ? 'كلمة السر غير صحيحة' : 'فشل تسجيل الدخول';
          if (data.hint) {
            errorMsg += ` (تلميح: يبدأ بـ ${data.hint.start} وينتهي بـ ${data.hint.end})`;
          }
          setError(`${errorMsg} (المحاولات المتبقية: ${5 - newFailedAttempts})`);
        }
      }
    } catch (err) {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTabData = async (tab: Tab) => {
    setIsLoading(true);
    try {
      if (tab === 'stats') setStats(await fetchWithAuth('/api/admin/stats'));
      if (tab === 'content') {
        setFaqs(await fetchWithAuth('/api/admin/faqs'));
        setTips(await fetchWithAuth('/api/admin/tips'));
      }
      if (tab === 'settings') setSettings(await fetchWithAuth('/api/admin/settings'));
      if (tab === 'logs') setLogs(await fetchWithAuth('/api/admin/logs'));
      if (tab === 'messages') setMessages(await fetchWithAuth('/api/admin/messages'));
    } catch (err) {
      setError('فشل تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadTabData(activeTab);
  }, [activeTab, isAuthenticated]);

  const updateSetting = async (newSettings: any) => {
    try {
      await fetchWithAuth('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ settings: newSettings })
      });
      setSettings({ ...settings, ...newSettings });
    } catch (err) {
      alert('فشل تحديث الإعدادات');
    }
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await fetchWithAuth('/api/admin/faqs', {
        method: 'POST',
        body: JSON.stringify({ ...faqForm, id: editingFaq?.id })
      });
      setIsFaqModalOpen(false);
      setEditingFaq(null);
      setFaqForm({ question_en: '', answer_en: '', question_ar: '', answer_ar: '', order_index: 0 });
      loadTabData('content');
    } catch (err) {
      alert('فشل حفظ السؤال');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFaq = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    setIsLoading(true);
    try {
      await fetchWithAuth(`/api/admin/faqs/${id}`, { method: 'DELETE' });
      loadTabData('content');
    } catch (err) {
      alert('فشل حذف السؤال');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await fetchWithAuth('/api/admin/tips', {
        method: 'POST',
        body: JSON.stringify({ ...tipForm, id: editingTip?.id })
      });
      setIsTipModalOpen(false);
      setEditingTip(null);
      setTipForm({ content_en: '', content_ar: '', type: 'general' });
      loadTabData('content');
    } catch (err) {
      alert('فشل حفظ النصيحة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTip = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه النصيحة؟')) return;
    setIsLoading(true);
    try {
      await fetchWithAuth(`/api/admin/tips/${id}`, { method: 'DELETE' });
      loadTabData('content');
    } catch (err) {
      alert('فشل حذف النصيحة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
    setIsLoading(true);
    try {
      await fetchWithAuth(`/api/admin/messages/${id}`, { method: 'DELETE' });
      loadTabData('messages');
    } catch (err) {
      alert('فشل حذف الرسالة');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-6xl h-[90vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-arabic">لوحة التحكم السرية</h2>
                <p className="text-xs text-slate-400 font-arabic">إدارة النظام والإحصائيات</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <button 
                  onClick={() => loadTabData(activeTab)}
                  disabled={isLoading}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-900 flex items-center gap-2"
                  title="تحديث البيانات"
                >
                  <RefreshCw size={20} className={cn(isLoading && "animate-spin")} />
                  <span className="text-xs font-bold font-arabic hidden md:block">تحديث</span>
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
              <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
                <div className="text-center space-y-2 mb-8">
                  <div className="w-16 h-16 rounded-3xl bg-white shadow-xl flex items-center justify-center mx-auto text-slate-900 mb-4">
                    <Shield size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 font-arabic">تسجيل الدخول</h3>
                  <p className="text-slate-500 font-arabic">أدخل كلمة السر للمتابعة</p>
                </div>
                
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      placeholder="كلمة السر..."
                      className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all text-center font-mono"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors",
                        isRtl ? "left-2" : "right-2"
                      )}
                    >
                      {showSecret ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {error && <p className="text-red-500 text-sm text-center font-arabic">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ChevronRight size={20} />}
                  <span className="font-arabic">دخول النظام</span>
                </button>

                <div className="pt-8 flex items-center justify-center gap-2 text-emerald-600 opacity-60">
                  <ShieldCheck size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest font-sans">Secure Admin Connection</span>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar */}
              <div className="w-64 border-r border-slate-100 bg-slate-50/50 p-4 space-y-2 hidden md:block">
                {[
                  { id: 'stats', icon: BarChart3, label: 'الإحصائيات' },
                  { id: 'content', icon: Layout, label: 'المحتوى' },
                  { id: 'messages', icon: MessageSquare, label: 'الرسائل' },
                  { id: 'settings', icon: Settings, label: 'الإعدادات' },
                  { id: 'logs', icon: History, label: 'السجلات' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={cn(
                      "w-full p-4 rounded-2xl flex items-center gap-3 transition-all font-arabic text-sm",
                      activeTab === tab.id 
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                        : "text-slate-500 hover:bg-white hover:text-slate-900"
                    )}
                  >
                    <tab.icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-white">
                {/* Mobile Tab Switcher */}
                <div className="flex md:hidden overflow-x-auto gap-2 mb-6 pb-2 no-scrollbar">
                  {[
                    { id: 'stats', icon: BarChart3, label: 'الإحصائيات' },
                    { id: 'content', icon: Layout, label: 'المحتوى' },
                    { id: 'messages', icon: MessageSquare, label: 'الرسائل' },
                    { id: 'settings', icon: Settings, label: 'الإعدادات' },
                    { id: 'logs', icon: History, label: 'السجلات' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as Tab)}
                      className={cn(
                        "flex-shrink-0 px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-arabic text-xs",
                        activeTab === tab.id 
                          ? "bg-slate-900 text-white shadow-md shadow-slate-200" 
                          : "bg-slate-50 text-slate-500"
                      )}
                    >
                      <tab.icon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {isLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-slate-400" size={32} />
                  </div>
                )}

                {!isLoading && activeTab === 'stats' && stats && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-slate-900 font-arabic">نظرة عامة على الإحصائيات</h4>
                      <button 
                        onClick={async () => {
                          if (confirm('هل أنت متأكد من تصفير جميع الإحصائيات؟ لا يمكن التراجع عن هذا الإجراء.')) {
                            await fetchWithAuth('/api/admin/stats/reset', { method: 'POST' });
                            loadTabData('stats');
                          }
                        }}
                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
                      >
                        <RotateCcw size={14} />
                        <span className="font-arabic">تصفير الإحصائيات</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <FileText size={24} />
                          </div>
                          <TrendingUp className="text-emerald-500" size={20} />
                        </div>
                        <h4 className="text-3xl font-bold text-slate-900">{stats.totals.cvs}</h4>
                        <p className="text-sm text-slate-500 font-arabic">سيرة ذاتية تم إنشاؤها</p>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                            <Download size={24} />
                          </div>
                          <TrendingUp className="text-emerald-500" size={20} />
                        </div>
                        <h4 className="text-3xl font-bold text-slate-900">{stats.totals.downloads}</h4>
                        <p className="text-sm text-slate-500 font-arabic">عملية تحميل PDF</p>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                            <MessageSquare size={24} />
                          </div>
                          <TrendingUp className="text-emerald-500" size={20} />
                        </div>
                        <h4 className="text-3xl font-bold text-slate-900">{stats.totals.messages}</h4>
                        <p className="text-sm text-slate-500 font-arabic">رسائل تواصل</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100">
                      <h4 className="text-lg font-bold text-slate-900 mb-6 font-arabic">النشاط اليومي (آخر 30 يوم)</h4>
                      <div className="h-64 flex items-end gap-2">
                        {/* Simple CSS bar chart */}
                        {stats.daily.slice(0, 15).reverse().map((day: any, i: number) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                            <div 
                              className="w-full bg-slate-900 rounded-t-lg transition-all group-hover:bg-emerald-500"
                              style={{ height: `${Math.min(day.count * 10, 100)}%` }}
                            />
                            <span className="text-[10px] text-slate-400 rotate-45 mt-2">{day.date.split('-').slice(1).join('/')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Events List */}
                    <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100">
                      <h4 className="text-lg font-bold text-slate-900 mb-6 font-arabic">آخر العمليات المنجزة</h4>
                      <div className="space-y-3">
                        {stats.recent?.length === 0 ? (
                          <p className="text-center py-8 text-slate-400 font-arabic">لا توجد عمليات مسجلة بعد</p>
                        ) : (
                          stats.recent?.map((event: any) => (
                            <div key={event.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center",
                                  event.event_type === 'cv_created' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                                )}>
                                  {event.event_type === 'cv_created' ? <FileText size={16} /> : <Download size={16} />}
                                </div>
                                <span className="text-sm font-bold text-slate-700 font-arabic">
                                  {event.event_type === 'cv_created' ? 'إنشاء سيرة ذاتية' : 'تحميل ملف PDF'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(event.created_at).toLocaleString('ar-SA')}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!isLoading && activeTab === 'settings' && (
                  <div className="max-w-2xl space-y-8">
                    <div className="space-y-6">
                      <h4 className="text-lg font-bold text-slate-900 font-arabic">التحكم في الميزات</h4>
                      
                      <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center",
                            settings.maintenance_mode === 'true' ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600"
                          )}>
                            <Power size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 font-arabic">وضع الصيانة</p>
                            <p className="text-xs text-slate-500 font-arabic">إغلاق الموقع بالكامل للصيانة</p>
                          </div>
                        </div>
                        <button
                          onClick={() => updateSetting({ maintenance_mode: settings.maintenance_mode === 'true' ? 'false' : 'true' })}
                          className={cn(
                            "w-14 h-8 rounded-full transition-all relative",
                            settings.maintenance_mode === 'true' ? "bg-red-500" : "bg-slate-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-6 h-6 bg-white rounded-full transition-all",
                            settings.maintenance_mode === 'true' ? "right-1" : "right-7"
                          )} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-lg font-bold text-slate-900 font-arabic">تخصيص القوالب</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-arabic">اللون الأساسي</label>
                          <div className="flex gap-2">
                            <input 
                              type="color" 
                              value={settings.primary_color} 
                              onChange={(e) => updateSetting({ primary_color: e.target.value })}
                              className="w-12 h-12 rounded-xl cursor-pointer"
                            />
                            <input 
                              type="text" 
                              value={settings.primary_color} 
                              onChange={(e) => updateSetting({ primary_color: e.target.value })}
                              className="flex-1 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-arabic">لون التمييز</label>
                          <div className="flex gap-2">
                            <input 
                              type="color" 
                              value={settings.accent_color} 
                              onChange={(e) => updateSetting({ accent_color: e.target.value })}
                              className="w-12 h-12 rounded-xl cursor-pointer"
                            />
                            <input 
                              type="text" 
                              value={settings.accent_color} 
                              onChange={(e) => updateSetting({ accent_color: e.target.value })}
                              className="flex-1 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 pt-8 border-t border-slate-100">
                      <h4 className="text-lg font-bold text-slate-900 font-arabic">إعدادات الأمان المتقدمة</h4>
                      <div className="p-6 bg-slate-900 text-white rounded-[2rem] space-y-4">
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="text-emerald-400" size={24} />
                          <h5 className="font-bold font-arabic">حماية النظام</h5>
                        </div>
                        <p className="text-sm text-slate-300 font-arabic leading-relaxed">
                          كلمة السر الحالية مخزنة بشكل آمن في إعدادات البيئة (Environment Variables). 
                          لتغيير كلمة السر، يرجى تحديث المتغير <code className="bg-slate-800 px-2 py-1 rounded text-emerald-400">ADMIN_SECRET</code> في إعدادات AI Studio.
                        </p>
                        <div className="grid grid-cols-1 gap-4 pt-2">
                          <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                            <p className="text-[10px] text-slate-400 uppercase font-arabic mb-1">حالة الجلسة</p>
                            <p className="text-sm font-bold text-emerald-400 font-arabic">نشطة (تشفير AES-256)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isLoading && activeTab === 'logs' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-slate-900 font-arabic">سجلات النظام</h4>
                      <button 
                        onClick={async () => {
                          if (confirm('هل أنت متأكد من مسح جميع السجلات؟')) {
                            await fetchWithAuth('/api/admin/logs/clear', { method: 'POST' });
                            setLogs({ errorLogs: [] });
                          }
                        }}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        <span className="font-arabic">مسح جميع السجلات</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                      {/* Error Logs */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-900 mb-2">
                          <AlertCircle size={18} className="text-red-500" />
                          <h5 className="font-bold font-arabic">سجلات الأخطاء</h5>
                        </div>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
                          {logs.errorLogs?.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 font-arabic bg-slate-50 rounded-2xl border border-dashed border-slate-200">لا توجد أخطاء مسجلة</div>
                          ) : logs.errorLogs?.map((log) => (
                            <div key={log.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg truncate max-w-[200px]">{log.message}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{new Date(log.created_at).toLocaleString('ar-SA')}</span>
                              </div>
                              {log.context && (
                                <pre className="text-[9px] bg-slate-900 text-slate-400 p-2 rounded-lg overflow-x-auto">
                                  {log.context}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isLoading && activeTab === 'messages' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-lg font-bold text-slate-900 font-arabic">رسائل التواصل والأسئلة</h4>
                      <span className="text-xs font-bold text-slate-400 font-arabic">{messages.length} رسالة</span>
                    </div>
                    
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-arabic">لا توجد رسائل حالياً</div>
                      ) : messages.map((msg) => (
                        <div key={msg.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 relative group">
                          <button 
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="absolute top-4 left-4 p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                          
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <h5 className="font-bold text-slate-900">{msg.name}</h5>
                              <p className="text-xs text-slate-500 font-mono">{msg.email}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">
                                {new Date(msg.created_at).toLocaleString('ar-SA')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-arabic">الموضوع: {msg.subject}</p>
                            <div className="p-4 bg-white rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed">
                              {msg.message}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isLoading && activeTab === 'content' && (
                  <div className="space-y-12">
                    <section className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-slate-900 font-arabic">الأسئلة الشائعة (FAQ)</h4>
                        <button 
                          onClick={() => {
                            setEditingFaq(null);
                            setFaqForm({ question_en: '', answer_en: '', question_ar: '', answer_ar: '', order_index: faqs.length });
                            setIsFaqModalOpen(true);
                          }}
                          className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 px-4"
                        >
                          <Plus size={20} />
                          <span className="font-arabic text-sm">إضافة سؤال</span>
                        </button>
                      </div>
                      <div className="space-y-3">
                        {faqs.map((faq) => (
                          <div key={faq.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              <HelpCircle size={18} className="text-slate-400" />
                              <div>
                                <span className="text-sm font-bold text-slate-700 block">{faq.question_ar}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{faq.question_en}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  setEditingFaq(faq);
                                  setFaqForm({
                                    question_en: faq.question_en,
                                    answer_en: faq.answer_en,
                                    question_ar: faq.question_ar,
                                    answer_ar: faq.answer_ar,
                                    order_index: faq.order_index
                                  });
                                  setIsFaqModalOpen(true);
                                }}
                                className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-600"
                              >
                                <Settings size={16} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleDeleteFaq(faq.id)}
                                className="p-2 hover:bg-white rounded-lg transition-all text-red-400 hover:text-red-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-slate-900 font-arabic">نصائح ATS</h4>
                        <button 
                          onClick={() => {
                            setEditingTip(null);
                            setTipForm({ content_en: '', content_ar: '', type: 'general' });
                            setIsTipModalOpen(true);
                          }}
                          className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 px-4"
                        >
                          <Plus size={20} />
                          <span className="font-arabic text-sm">إضافة نصيحة</span>
                        </button>
                      </div>
                      <div className="space-y-3">
                        {tips.map((tip) => (
                          <div key={tip.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              <Lightbulb size={18} className="text-slate-400" />
                              <div>
                                <span className="text-sm text-slate-600 block">{tip.content_ar}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{tip.content_en}</span>
                                <span className="text-[10px] bg-slate-200 px-1 rounded text-slate-500">{tip.type}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  setEditingTip(tip);
                                  setTipForm({
                                    content_en: tip.content_en,
                                    content_ar: tip.content_ar,
                                    type: tip.type
                                  });
                                  setIsTipModalOpen(true);
                                }}
                                className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-600"
                              >
                                <Settings size={16} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleDeleteTip(tip.id)}
                                className="p-2 hover:bg-white rounded-lg transition-all text-red-400 hover:text-red-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* FAQ Modal */}
                    <AnimatePresence>
                      {isFaqModalOpen && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFaqModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                          />
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl p-8 overflow-hidden"
                          >
                            <h3 className="text-xl font-bold text-slate-900 mb-6 font-arabic">
                              {editingFaq ? 'تعديل سؤال' : 'إضافة سؤال جديد'}
                            </h3>
                            <form onSubmit={handleSaveFaq} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-400 font-arabic">السؤال (بالعربي)</label>
                                  <input 
                                    required
                                    value={faqForm.question_ar}
                                    onChange={e => setFaqForm({...faqForm, question_ar: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-400 font-arabic">Question (English)</label>
                                  <input 
                                    required
                                    value={faqForm.question_en}
                                    onChange={e => setFaqForm({...faqForm, question_en: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 font-arabic">الإجابة (بالعربي)</label>
                                <textarea 
                                  required
                                  rows={3}
                                  value={faqForm.answer_ar}
                                  onChange={e => setFaqForm({...faqForm, answer_ar: e.target.value})}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 font-arabic">Answer (English)</label>
                                <textarea 
                                  required
                                  rows={3}
                                  value={faqForm.answer_en}
                                  onChange={e => setFaqForm({...faqForm, answer_en: e.target.value})}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 font-arabic">الترتيب (Order Index)</label>
                                <input 
                                  type="number"
                                  value={faqForm.order_index}
                                  onChange={e => setFaqForm({...faqForm, order_index: parseInt(e.target.value) || 0})}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                />
                              </div>
                              <div className="flex items-center justify-between pt-4">
                                <button 
                                  type="button"
                                  onClick={() => setIsFaqModalOpen(false)}
                                  className="px-6 py-3 text-slate-400 hover:text-slate-600 font-arabic font-bold"
                                >
                                  إلغاء
                                </button>
                                <button 
                                  type="submit"
                                  disabled={isLoading}
                                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                                >
                                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                  <span className="font-arabic">حفظ السؤال</span>
                                </button>
                              </div>
                            </form>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>

                    {/* Tip Modal */}                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
