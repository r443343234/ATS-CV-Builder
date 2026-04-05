import React from 'react';
import { ResumeData } from '../types';
import { translations } from '../constants';
import { Mail, Phone, MapPin, Linkedin, Globe } from 'lucide-react';

interface ResumePreviewProps {
  data: ResumeData;
  language: 'en' | 'ar';
}

// Safe hex colors to avoid oklch errors in html2canvas
const COLORS = {
  text: '#1a1a1a', // Darker for better contrast
  textMuted: '#4a4a4a', // Slightly darker muted text
  primary: '#0052cc', // Professional blue (Enhancv style)
  border: '#e1e1e1',
  heading: '#1a1a1a',
};

export const ResumePreview: React.FC<ResumePreviewProps> = React.memo(({ data, language }) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  const SectionHeader = ({ title }: { title: string }) => (
    <div style={{ 
      marginTop: '1.5rem',
      marginBottom: '0.75rem',
      borderBottom: `1px solid ${COLORS.border}`,
      paddingBottom: '0.2rem',
      textAlign: isRtl ? 'right' : 'left'
    }}>
      <h2 
        style={{ 
          color: COLORS.primary, 
          fontSize: '13pt',
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          margin: 0
        }}
      >
        {title.replace(/\.$/, '')}
      </h2>
    </div>
  );

  const Header = () => (
    <header style={{ 
      marginBottom: '2rem',
      textAlign: isRtl ? 'right' : 'left',
      paddingBottom: '0'
    }}>
      <h1 style={{ 
        fontSize: '28pt', 
        fontWeight: '800', 
        color: COLORS.heading, 
        lineHeight: '1.1', 
        marginBottom: '0.4rem',
        letterSpacing: '-0.01em'
      }}>
        {(data.personalInfo.fullName || 'Your Name').replace(/\.$/, '')}
      </h1>
      <div style={{ 
        color: COLORS.textMuted, 
        fontWeight: '600', 
        fontSize: '14pt', 
        marginBottom: '1rem',
        textTransform: 'uppercase',
        letterSpacing: '0.02em'
      }}>
        {data.personalInfo.jobTitle.replace(/\.$/, '')}
      </div>
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'flex-start',
        columnGap: '1.2rem',
        rowGap: '0.4rem',
        fontSize: '9.5pt', 
        color: COLORS.text,
        fontWeight: '500'
      }}>
        {data.personalInfo.phone && <div>{data.personalInfo.phone}</div>}
        {data.personalInfo.email && <div>{data.personalInfo.email}</div>}
        {data.personalInfo.location && <div>{data.personalInfo.location}</div>}
        {data.personalInfo.linkedin && <div>{data.personalInfo.linkedin.trim()}</div>}
        {data.personalInfo.website && <div>{data.personalInfo.website.trim()}</div>}
      </div>
    </header>
  );

  const Content = () => (
    <>
      {/* Summary */}
      {data.summary && (
        <section style={{ marginBottom: '2rem' }}>
          <SectionHeader title="SUMMARY" />
          <p style={{ fontSize: '11pt', color: COLORS.text, lineHeight: '1.6' }}>
            {data.summary}
          </p>
        </section>
      )}

      {/* Experience */}
      {data.experience?.length > 0 && (
        <section style={{ marginBottom: '1.5rem' }}>
          <SectionHeader title={t.experience} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {data.experience.map((exp, index) => (
              <div key={index}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.1rem' }}>
                  <h3 style={{ fontWeight: '800', fontSize: '11pt', color: COLORS.heading, margin: 0 }}>
                    {exp.position.replace(/\.$/, '')}
                  </h3>
                  <div style={{ fontSize: '9pt', fontWeight: '700', color: COLORS.textMuted }}>
                    <time style={{ textTransform: 'uppercase' }}>
                      {exp.startDate} — {exp.endDate}
                    </time>
                  </div>
                </div>
                <div style={{ color: COLORS.primary, fontWeight: '700', fontSize: '10.5pt', marginBottom: '0.4rem' }}>
                  {exp.company.replace(/\.$/, '')}
                </div>
                <ul style={{ 
                  listStyleType: 'disc', 
                  paddingInlineStart: '1.1rem',
                  paddingInlineEnd: '0',
                  fontSize: '10pt', 
                  color: COLORS.text,
                  lineHeight: '1.4',
                  margin: 0
                }}>
                  {exp.description.split('\n').filter(line => line.trim()).map((line, i) => (
                    <li key={i} style={{ marginBottom: '0.2rem' }}>
                      {line.replace(/^[•\-\*]\s*/, '')}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {data.education?.length > 0 && (
        <section style={{ marginBottom: '1.5rem' }}>
          <SectionHeader title={t.education} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.education.map((edu, index) => (
              <div key={index}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.1rem' }}>
                  <h3 style={{ fontWeight: '800', fontSize: '11pt', color: COLORS.heading, margin: 0 }}>
                    {edu.degree.replace(/\.$/, '')}
                  </h3>
                  <div style={{ fontSize: '9pt', fontWeight: '700', color: COLORS.textMuted }}>
                    <time style={{ textTransform: 'uppercase' }}>{edu.graduationDate}</time>
                  </div>
                </div>
                <div style={{ color: COLORS.primary, fontWeight: '700', fontSize: '10.5pt' }}>
                  {edu.school.replace(/\.$/, '')}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {data.skills?.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <SectionHeader title={t.skills} />
          <p style={{ 
            fontSize: '11pt', 
            color: COLORS.text,
            fontWeight: '600',
            lineHeight: '1.6'
          }}>
            {data.skills.join(', ')}
          </p>
        </section>
      )}

      {/* Custom Sections */}
      {data.customSections && data.customSections.length > 0 && (
        <>
          {data.customSections.map((item, index) => (
            <section key={index} style={{ marginBottom: '1.5rem' }}>
              <SectionHeader title={item.title} />
              <p style={{ fontSize: '10.5pt', color: COLORS.text, lineHeight: '1.6' }}>
                {item.content}
              </p>
            </section>
          ))}
        </>
      )}
    </>
  );

  return (
    <article 
      id="resume-preview" 
      onContextMenu={(e) => e.preventDefault()}
      style={{
        backgroundColor: '#ffffff',
        padding: '2.5cm',
        minHeight: '297mm',
        width: '100%',
        maxWidth: '210mm',
        margin: '0 auto',
        color: COLORS.text,
        fontFamily: 'Inter, system-ui, sans-serif',
        lineHeight: '1.5',
        textAlign: isRtl ? 'right' : 'left',
        fontVariantNumeric: 'tabular-nums',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        msUserSelect: 'none',
        MozUserSelect: 'none'
      }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <Header />
      <Content />
    </article>
  );
});
