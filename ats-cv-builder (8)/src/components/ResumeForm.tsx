import React, { useState } from 'react';
import { ResumeData } from '../types';
import { motion } from 'motion/react';
import { Plus, Trash2, User, Briefcase, GraduationCap, Code, Mail, Phone, MapPin, Linkedin, Globe, AlignLeft, Target, Award, BookOpen, Layout, Lightbulb, Wand2, Loader2 } from 'lucide-react';
import { translations } from '../constants';
import { cn } from '../lib/utils';
import { GoogleGenAI } from '@google/genai';

interface ResumeFormProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  errors: { email?: boolean; phone?: boolean; address?: boolean; jobTitle?: boolean };
  language: 'en' | 'ar';
}

export const ResumeForm: React.FC<ResumeFormProps> = React.memo(({ data, onChange, errors, language }) => {
  const t = translations[language];
  const isRtl = language === 'ar';
  const [optimizingField, setOptimizingField] = useState<string | null>(null);

  const optimizeText = async (field: string, currentText: string, context: string, index?: number) => {
    if (!currentText.trim()) return;
    setOptimizingField(index !== undefined ? `${field}-${index}` : field);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Rewrite the following text to be more professional, powerful, and focused on quantifiable results and achievements.
            Context: ${context}
            Text to optimize: ${currentText}
            Respond in English only, without any intro, just give me the optimized text directly.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const optimized = response.text?.trim() || currentText;
      
      if (field === 'summary') {
        onChange({ ...data, summary: optimized });
      } else if (field === 'experience' && index !== undefined) {
        const newExp = [...data.experience];
        newExp[index] = { ...newExp[index], description: optimized };
        onChange({ ...data, experience: newExp });
      }
    } catch (err) {
      console.error('Optimization failed:', err);
    } finally {
      setOptimizingField(null);
    }
  };

  const updatePersonalInfo = (field: keyof ResumeData['personalInfo'], value: string) => {
    onChange({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value }
    });
  };

  const addExperience = () => {
    onChange({
      ...data,
      experience: [...data.experience, { company: '', position: '', startDate: '', endDate: '', description: '' }]
    });
  };

  const updateExperience = (index: number, field: keyof ResumeData['experience'][0], value: string) => {
    const newExp = [...data.experience];
    newExp[index] = { ...newExp[index], [field]: value };
    onChange({ ...data, experience: newExp });
  };

  const removeExperience = (index: number) => {
    onChange({ ...data, experience: data.experience.filter((_, i) => i !== index) });
  };

  const addEducation = () => {
    onChange({
      ...data,
      education: [...data.education, { school: '', degree: '', graduationDate: '' }]
    });
  };

  const updateEducation = (index: number, field: keyof ResumeData['education'][0], value: string) => {
    const newEdu = [...data.education];
    newEdu[index] = { ...newEdu[index], [field]: value };
    onChange({ ...data, education: newEdu });
  };

  const removeEducation = (index: number) => {
    onChange({ ...data, education: data.education.filter((_, i) => i !== index) });
  };

  const addTraining = () => {
    onChange({
      ...data,
      training: [...(data.training || []), { title: '', provider: '' }]
    });
  };

  const updateTraining = (index: number, field: 'title' | 'provider', value: string) => {
    const newTraining = [...(data.training || [])];
    newTraining[index] = { ...newTraining[index], [field]: value };
    onChange({ ...data, training: newTraining });
  };

  const removeTraining = (index: number) => {
    onChange({ ...data, training: (data.training || []).filter((_, i) => i !== index) });
  };

  const addCertification = () => {
    onChange({
      ...data,
      certifications: [...(data.certifications || []), { title: '', provider: '' }]
    });
  };

  const updateCertification = (index: number, field: 'title' | 'provider', value: string) => {
    const newCerts = [...(data.certifications || [])];
    newCerts[index] = { ...newCerts[index], [field]: value };
    onChange({ ...data, certifications: newCerts });
  };

  const removeCertification = (index: number) => {
    onChange({ ...data, certifications: (data.certifications || []).filter((_, i) => i !== index) });
  };

  return (
    <div className={cn("space-y-12 pb-20", isRtl ? "text-right" : "text-left")} dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black font-display tracking-tight text-slate-900">
            {language === 'ar' ? 'محرر السيرة الذاتية' : 'Resume Editor'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {language === 'ar' ? 'أدخل بياناتك وسيتم تحديث المعاينة فوراً' : 'Enter your details and the preview will update instantly'}
          </p>
        </div>
      </div>

      {/* ATS Tip Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-4"
      >
        <div className="p-2 bg-white rounded-xl shadow-sm">
          <Target className="text-indigo-600" size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-indigo-900">{t.atsOptimizationTip}</h4>
          <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
            {t.tipBanner}
          </p>
        </div>
      </motion.div>

      {/* Personal Info */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="dashboard-card overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4 text-slate-900">
            <div className="w-12 h-12 bg-white shadow-sm rounded-2xl flex items-center justify-center border border-slate-100">
              <User size={24} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black font-display tracking-tight">{t.personalInfo}</h2>
              <p className="text-sm text-slate-500">{t.basicContactInfo}</p>
            </div>
          </div>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              icon={<User size={16}/>} 
              label={t.fullName} 
              value={data.personalInfo.fullName} 
              onChange={(v) => updatePersonalInfo('fullName', v)} 
              placeholder={t.fullNamePlaceholder} 
              isRtl={isRtl} 
            />
          <Input 
            icon={<Briefcase size={16}/>}
            label={t.jobTitle} 
            value={data.personalInfo.jobTitle} 
            onChange={(v) => updatePersonalInfo('jobTitle', v)} 
            placeholder={t.jobTitlePlaceholder} 
            error={errors.jobTitle ? t.requiredField : undefined}
            isRtl={isRtl}
          />
          <Input 
            icon={<Mail size={16}/>}
            label={t.email} 
            value={data.personalInfo.email} 
            onChange={(v) => updatePersonalInfo('email', v)} 
            placeholder={t.emailPlaceholder} 
            error={errors.email ? t.requiredField : undefined}
            isRtl={isRtl}
          />
          <Input 
            icon={<Phone size={16}/>}
            label={t.phone} 
            value={data.personalInfo.phone} 
            onChange={(v) => updatePersonalInfo('phone', v)} 
            placeholder={t.phonePlaceholder} 
            error={errors.phone ? t.requiredField : undefined}
            isRtl={isRtl}
          />
          <Input 
            icon={<MapPin size={16}/>}
            label={t.location} 
            value={data.personalInfo.location} 
            onChange={(v) => updatePersonalInfo('location', v)} 
            placeholder={t.locationPlaceholder} 
            error={errors.address ? t.requiredField : undefined}
            isRtl={isRtl}
          />
          <Input icon={<Linkedin size={16}/>} label={t.linkedin} value={data.personalInfo.linkedin} onChange={(v) => updatePersonalInfo('linkedin', v)} placeholder={t.linkedinPlaceholder} isRtl={isRtl} />
        </div>
      </motion.section>

      {/* Summary */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="dashboard-card overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4 text-slate-900">
            <div className="w-12 h-12 bg-white shadow-sm rounded-2xl flex items-center justify-center border border-slate-100">
              <AlignLeft size={24} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black font-display tracking-tight">{t.summary}</h2>
              <p className="text-sm text-slate-500">{t.careerOverview}</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="mb-6 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-3">
            <Lightbulb className="text-indigo-600 shrink-0" size={18} />
            <p className="text-xs text-indigo-800 leading-relaxed">
              {t.tipSummary}
            </p>
          </div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{t.summary}</label>
            <button 
              onClick={() => optimizeText('summary', data.summary, `Professional Summary for a ${data.personalInfo.jobTitle}`)}
              disabled={optimizingField === 'summary' || !data.summary}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-100 transition-all disabled:opacity-50"
            >
              {optimizingField === 'summary' ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
              {language === 'ar' ? 'تحسين بالذكاء الاصطناعي' : 'AI Optimize'}
            </button>
          </div>
          <textarea
            className={cn(
              "w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all min-h-[180px] font-medium text-slate-700 placeholder:text-slate-300 leading-relaxed shadow-inner",
              isRtl ? "font-arabic" : ""
            )}
            value={data.summary}
            onChange={(e) => onChange({ ...data, summary: e.target.value })}
            placeholder={t.summaryPlaceholder}
          />
        </div>
      </motion.section>

      {/* Experience */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="dashboard-card overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-slate-900">
            <div className="w-12 h-12 bg-white shadow-sm rounded-2xl flex items-center justify-center border border-slate-100">
              <Briefcase size={24} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black font-display tracking-tight">{t.experience}</h2>
              <p className="text-sm text-slate-500">{t.historyAchievements}</p>
            </div>
          </div>
          <button onClick={addExperience} className="group flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <Plus size={18} className="group-hover:rotate-90 transition-transform" /> {t.addExperience}
          </button>
        </div>
        <div className="p-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-3">
              <Lightbulb className="text-indigo-600 shrink-0" size={18} />
              <p className="text-xs text-indigo-800 leading-relaxed">
                {t.tipExperience}
              </p>
            </div>
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-start gap-3">
              <Award className="text-emerald-600 shrink-0" size={18} />
              <p className="text-xs text-emerald-800 leading-relaxed">
                {t.tipQuantify}
              </p>
            </div>
          </div>
          {(data.experience || []).map((exp, index) => (
            <div key={index} className="p-8 bg-white rounded-3xl relative border border-slate-200 group transition-all hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-50/50">
              <button 
                onClick={() => removeExperience(index)}
                className="absolute -top-4 -right-4 w-10 h-10 bg-white text-red-500 rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:scale-110 active:scale-95"
              >
                <Trash2 size={18} />
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Input label={t.company} value={exp.company} onChange={(v) => updateExperience(index, 'company', v)} isRtl={isRtl} />
                <Input label={t.position} value={exp.position} onChange={(v) => updateExperience(index, 'position', v)} isRtl={isRtl} />
                <Input label={t.startDate} value={exp.startDate} onChange={(v) => updateExperience(index, 'startDate', v)} placeholder={t.datePlaceholder} isRtl={isRtl} />
                <Input label={t.endDate} value={exp.endDate} onChange={(v) => updateExperience(index, 'endDate', v)} placeholder={t.datePlaceholder} isRtl={isRtl} />
              </div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{t.description}</label>
                <button 
                  onClick={() => optimizeText('experience', exp.description, `${exp.position} at ${exp.company}`, index)}
                  disabled={optimizingField === `experience-${index}` || !exp.description}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-100 transition-all disabled:opacity-50"
                >
                  {optimizingField === `experience-${index}` ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  {language === 'ar' ? 'تحسين بالذكاء الاصطناعي' : 'AI Optimize'}
                </button>
              </div>
              <div className="relative">
                <textarea
                  className={cn(
                    "w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all min-h-[140px] font-medium text-slate-700 placeholder:text-slate-300 leading-relaxed shadow-inner",
                    isRtl ? "font-arabic" : ""
                  )}
                  value={exp.description}
                  onChange={(e) => updateExperience(index, 'description', e.target.value)}
                  placeholder={t.expPlaceholder}
                />
                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-2.5 py-1 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-lg shadow-sm pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.quantifyNumbers}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Education */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="dashboard-card overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-slate-900">
            <div className="w-12 h-12 bg-white shadow-sm rounded-2xl flex items-center justify-center border border-slate-100">
              <GraduationCap size={24} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black font-display tracking-tight">{t.education}</h2>
              <p className="text-sm text-slate-500">{t.academicQualifications}</p>
            </div>
          </div>
          <button onClick={addEducation} className="group flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <Plus size={18} className="group-hover:rotate-90 transition-transform" /> {t.addEducation}
          </button>
        </div>
        <div className="p-8 space-y-10">
          {(data.education || []).map((edu, index) => (
            <div key={index} className="p-8 bg-white rounded-3xl relative border border-slate-200 group transition-all hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-50/50">
              <button 
                onClick={() => removeEducation(index)}
                className="absolute -top-4 -right-4 w-10 h-10 bg-white text-red-500 rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:scale-110 active:scale-95"
              >
                <Trash2 size={18} />
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label={t.school} value={edu.school} onChange={(v) => updateEducation(index, 'school', v)} isRtl={isRtl} />
                <Input label={t.degree} value={edu.degree} onChange={(v) => updateEducation(index, 'degree', v)} isRtl={isRtl} />
                <Input label={t.gradDate} value={edu.graduationDate} onChange={(v) => updateEducation(index, 'graduationDate', v)} isRtl={isRtl} />
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Skills */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="dashboard-card overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4 text-slate-900">
            <div className="w-12 h-12 bg-white shadow-sm rounded-2xl flex items-center justify-center border border-slate-100">
              <Code size={24} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black font-display tracking-tight">{t.skills}</h2>
              <p className="text-sm text-slate-500">{t.techSoftSkills}</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="mb-6 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-3">
            <Lightbulb className="text-indigo-600 shrink-0" size={18} />
            <p className="text-xs text-indigo-800 leading-relaxed">
              {t.tipSkills}
            </p>
          </div>
          <Input
            icon={<Code size={16}/>}
            label={t.skillsPlaceholder}
            value={(data.skills || []).join(', ')}
            onChange={(v) => onChange({ ...data, skills: v.split(',').map(s => s.trim()).filter(s => s) })}
            placeholder={t.skillsPlaceholder}
            isRtl={isRtl}
          />
        </div>
      </motion.section>

      {/* Training */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="dashboard-card overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-slate-900">
            <div className="w-12 h-12 bg-white shadow-sm rounded-2xl flex items-center justify-center border border-slate-100">
              <BookOpen size={24} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black font-display tracking-tight">{t.training}</h2>
              <p className="text-sm text-slate-500">{t.trainingWorkshops}</p>
            </div>
          </div>
          <button onClick={addTraining} className="group flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <Plus size={18} className="group-hover:rotate-90 transition-transform" /> {t.addTraining}
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-3">
            <Lightbulb className="text-indigo-600 shrink-0" size={18} />
            <p className="text-xs text-indigo-800 leading-relaxed">
              {t.tipTraining}
            </p>
          </div>
          {(data.training || []).map((item, index) => (
            <div key={index} className="flex gap-4 items-end group">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label={t.courseTitle} value={item.title} onChange={(v) => updateTraining(index, 'title', v)} isRtl={isRtl} />
                <Input label={t.provider} value={item.provider} onChange={(v) => updateTraining(index, 'provider', v)} isRtl={isRtl} />
              </div>
              <button 
                onClick={() => removeTraining(index)}
                className="mb-2 w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Certifications */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="dashboard-card overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-slate-900">
            <div className="w-12 h-12 bg-white shadow-sm rounded-2xl flex items-center justify-center border border-slate-100">
              <Award size={24} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black font-display tracking-tight">{t.certifications}</h2>
              <p className="text-sm text-slate-500">{t.profAccreditedCerts}</p>
            </div>
          </div>
          <button onClick={addCertification} className="group flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <Plus size={18} className="group-hover:rotate-90 transition-transform" /> {t.addCertification}
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-3">
            <Lightbulb className="text-indigo-600 shrink-0" size={18} />
            <p className="text-xs text-indigo-800 leading-relaxed">
              {t.tipCert}
            </p>
          </div>
          {(data.certifications || []).map((item, index) => (
            <div key={index} className="flex gap-4 items-end group">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label={t.certTitle} value={item.title} onChange={(v) => updateCertification(index, 'title', v)} isRtl={isRtl} />
                <Input label={t.issuingOrg} value={item.provider} onChange={(v) => updateCertification(index, 'provider', v)} isRtl={isRtl} />
              </div>
              <button 
                onClick={() => removeCertification(index)}
                className="mb-2 w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
});

const Input = ({ label, value, onChange, placeholder, error, icon, isRtl }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string, error?: string, icon?: React.ReactNode, isRtl?: boolean }) => {
  return (
    <div className={cn("flex flex-col gap-2.5", isRtl ? "text-right" : "text-left")} dir={isRtl ? "rtl" : "ltr"}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{label}</label>
      <div className="relative group">
        {icon && (
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors",
            isRtl ? "right-4" : "left-4"
          )}>
            {icon}
          </div>
        )}
        <input
          type="text"
          className={cn(
            "w-full py-4 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium text-slate-700 placeholder:text-slate-300 shadow-inner",
            icon ? (isRtl ? "pr-11 pl-5" : "pl-11 pr-5") : "px-5",
            error ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-300'
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      {error && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider px-1">{error}</span>}
    </div>
  );
};
