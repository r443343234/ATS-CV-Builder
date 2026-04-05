import React from 'react';
import { Lightbulb, CheckCircle2, AlertCircle, Target, FileText, Layout } from 'lucide-react';
import { motion } from 'motion/react';

import { cn } from '../lib/utils';
import { Language } from '../constants';

interface ATSTipsProps {
  tips?: any[];
  language?: Language;
  t: any;
}

export const ATSTips: React.FC<ATSTipsProps> = ({ tips: dynamicTips, language = 'en', t }) => {
  const defaultTips = [
    {
      icon: <Target className="text-indigo-600" size={20} />,
      title: language === 'ar' ? "تحسين الكلمات المفتاحية" : "Keyword Optimization",
      description: t.tipKeywords
    },
    {
      icon: <Layout className="text-indigo-600" size={20} />,
      title: language === 'ar' ? "عناوين قياسية" : "Standard Headings",
      description: t.tipHeadings
    },
    {
      icon: <FileText className="text-indigo-600" size={20} />,
      title: language === 'ar' ? "تنسيق بسيط" : "Simple Formatting",
      description: t.tipNoTables
    },
    {
      icon: <CheckCircle2 className="text-indigo-600" size={20} />,
      title: language === 'ar' ? "النقاط (Bullet Points)" : "Bullet Points",
      description: t.tipBulletPoints
    },
    {
      icon: <AlertCircle className="text-indigo-600" size={20} />,
      title: language === 'ar' ? "لا صور أو رسوم بيانية" : "No Images or Charts",
      description: t.tipNoImages
    },
    {
      icon: <Lightbulb className="text-indigo-600" size={20} />,
      title: language === 'ar' ? "قياس النتائج بالأرقام" : "Quantifying Results",
      description: t.tipQuantify
    },
    {
      icon: <FileText className="text-indigo-600" size={20} />,
      title: language === 'ar' ? "تجنب الاختصارات" : "Avoid Jargon",
      description: t.tipJargon
    },
    {
      icon: <Target className="text-indigo-600" size={20} />,
      title: language === 'ar' ? "تخصيص السيرة الذاتية" : "Tailor Every Application",
      description: t.tipTailor
    },
    {
      icon: <CheckCircle2 className="text-indigo-600" size={20} />,
      title: language === 'ar' ? "استخدم أفعال الحركة" : "Use Action Verbs",
      description: t.tipActionVerbs
    },
    {
      icon: <FileText className="text-indigo-600" size={20} />,
      title: language === 'ar' ? "تجنب الضمائر الشخصية" : "Avoid Personal Pronouns",
      description: t.tipNoPronouns
    },
    {
      icon: <Target className="text-indigo-600" size={20} />,
      title: language === 'ar' ? "رابط لينكد إن" : "LinkedIn Profile",
      description: t.tipLinkedIn
    }
  ];

  const tips = [
    ...(dynamicTips || []).map(t => ({
      icon: <Lightbulb className="text-indigo-600" size={20} />,
      title: language === 'ar' ? 'نصيحة ذكية' : 'Smart Tip',
      description: language === 'ar' ? t.content_ar : t.content_en
    })),
    ...defaultTips
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tips.map((tip, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                {tip.icon}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">{tip.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{tip.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
        <AlertCircle className="text-amber-600 shrink-0" size={20} />
        <p className={cn("text-xs text-amber-800 leading-relaxed", language === 'ar' ? "font-arabic" : "")}>
          <strong>{language === 'ar' ? 'نصيحة احترافية:' : 'Pro Tip:'}</strong> {t.faqPdfAnswer}
        </p>
      </div>
    </div>
  );
};
