import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { ResumeData } from '../types';
import { translations } from '../constants';

// Register Arabic font with reliable URLs
Font.register({
  family: 'Cairo',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/cairo/Cairo-Regular.ttf' },
    { src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/cairo/Cairo-Bold.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  pageAr: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  section: {
    marginBottom: 15,
  },
  header: {
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    color: '#0f172a',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  nameAr: {
    fontSize: 24,
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Cairo',
    fontWeight: 'bold',
  },
  jobTitle: {
    fontSize: 14,
    color: '#2563eb',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  jobTitleAr: {
    fontSize: 14,
    color: '#2563eb',
    marginBottom: 8,
    fontFamily: 'Cairo',
    fontWeight: 'bold',
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    fontSize: 9,
    color: '#64748b',
  },
  contactRowAr: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    fontSize: 9,
    color: '#64748b',
    fontFamily: 'Cairo',
  },
  sectionTitle: {
    fontSize: 12,
    color: '#2563eb',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 10,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 2,
  },
  sectionTitleAr: {
    fontSize: 12,
    color: '#2563eb',
    marginBottom: 8,
    marginTop: 10,
    fontFamily: 'Cairo',
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 2,
  },
  summary: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#1e293b',
  },
  summaryAr: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#1e293b',
    fontFamily: 'Cairo',
  },
  itemTitle: {
    fontSize: 11,
    color: '#0f172a',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  itemTitleAr: {
    fontSize: 11,
    color: '#0f172a',
    marginBottom: 2,
    fontFamily: 'Cairo',
    fontWeight: 'bold',
  },
  itemSubtitle: {
    fontSize: 10,
    color: '#2563eb',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  itemSubtitleAr: {
    fontSize: 10,
    color: '#2563eb',
    marginBottom: 2,
    fontFamily: 'Cairo',
    fontWeight: 'bold',
  },
  itemDate: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 4,
  },
  bulletPoint: {
    fontSize: 10,
    color: '#1e293b',
    lineHeight: 1.4,
    marginBottom: 2,
    paddingLeft: 10,
  },
  bulletPointAr: {
    fontSize: 10,
    color: '#1e293b',
    lineHeight: 1.4,
    marginBottom: 2,
    paddingRight: 10,
    fontFamily: 'Cairo',
  },
  skills: {
    fontSize: 10,
    color: '#1e293b',
    lineHeight: 1.5,
  },
  skillsAr: {
    fontSize: 10,
    color: '#1e293b',
    lineHeight: 1.5,
    fontFamily: 'Cairo',
  },
});

interface ResumePDFProps {
  data: ResumeData;
  language: 'en' | 'ar';
}

export const ResumePDFDocument: React.FC<ResumePDFProps> = ({ data, language }) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  if (!data) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>No Data Available</Text>
        </Page>
      </Document>
    );
  }

  const Header = () => (
    <View style={styles.header}>
      <Text style={isRtl ? styles.nameAr : styles.name}>{data.personalInfo?.fullName || 'Your Name'}</Text>
      <Text style={isRtl ? styles.jobTitleAr : styles.jobTitle}>{data.personalInfo?.jobTitle || ''}</Text>
      <View style={isRtl ? styles.contactRowAr : styles.contactRow}>
        {data.personalInfo?.phone && <Text>{data.personalInfo.phone}</Text>}
        {data.personalInfo?.email && <Text>{data.personalInfo.email}</Text>}
        {data.personalInfo?.location && <Text>{data.personalInfo.location}</Text>}
        {data.personalInfo?.linkedin && <Text>{data.personalInfo.linkedin}</Text>}
        {data.personalInfo?.website && <Text>{data.personalInfo.website}</Text>}
      </View>
    </View>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={isRtl ? styles.sectionTitleAr : styles.sectionTitle}>
      {title}
    </Text>
  );

  const MainContent = () => (
    <>
      {/* Summary */}
      {data.summary && (
        <View style={styles.section}>
          <SectionHeader title={t.summary} />
          <Text style={isRtl ? styles.summaryAr : styles.summary}>{data.summary}</Text>
        </View>
      )}

      {/* Experience */}
      {data.experience && data.experience.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={t.experience} />
          {data.experience.map((exp, index) => (
            <View key={index} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={isRtl ? styles.itemTitleAr : styles.itemTitle}>{exp.position || ''}</Text>
                <Text style={styles.itemDate}>{`${exp.startDate || ''} — ${exp.endDate || ''}`}</Text>
              </View>
              <Text style={isRtl ? styles.itemSubtitleAr : styles.itemSubtitle}>{exp.company || ''}</Text>
              {(exp.description || '').split('\n').filter(line => line.trim()).map((line, i) => (
                <Text key={i} style={isRtl ? styles.bulletPointAr : styles.bulletPoint}>
                  {isRtl ? `${line.replace(/^[•\-\*]\s*/, '')} •` : `• ${line.replace(/^[•\-\*]\s*/, '')}`}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={t.education} />
          {data.education.map((edu, index) => (
            <View key={index} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={isRtl ? styles.itemTitleAr : styles.itemTitle}>{edu.degree || ''}</Text>
                <Text style={styles.itemDate}>{edu.graduationDate || ''}</Text>
              </View>
              <Text style={isRtl ? styles.itemSubtitleAr : styles.itemSubtitle}>{edu.school || ''}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Custom Sections */}
      {data.customSections && data.customSections.length > 0 && (
        <>
          {data.customSections.map((item, index) => (
            <View key={index} style={styles.section}>
              <SectionHeader title={item.title || ''} />
              <Text style={isRtl ? styles.summaryAr : styles.summary}>{item.content || ''}</Text>
            </View>
          ))}
        </>
      )}
    </>
  );

  return (
    <Document>
      <Page size="A4" style={isRtl ? styles.pageAr : styles.page}>
        <Header />
        <MainContent />
        {data.skills?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title={t.skills} />
            <Text style={isRtl ? styles.skillsAr : styles.skills}>{data.skills.join(', ')}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};
