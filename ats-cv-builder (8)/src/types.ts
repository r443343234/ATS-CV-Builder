export interface ResumeData {
  personalInfo: {
    fullName: string;
    jobTitle: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website?: string;
  };
  summary: string;
  experience: {
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  education: {
    school: string;
    degree: string;
    graduationDate: string;
  }[];
  skills: string[];
  training?: {
    title: string;
    provider: string;
    date?: string;
  }[];
  certifications?: {
    title: string;
    provider: string;
    date?: string;
  }[];
  languages?: {
    language: string;
    level: string;
  }[];
  projects?: {
    name: string;
    description: string;
    link?: string;
  }[];
  awards?: {
    title: string;
    issuer: string;
    date?: string;
  }[];
  publications?: {
    title: string;
    publisher: string;
    date?: string;
  }[];
  volunteer?: {
    organization: string;
    role: string;
    date?: string;
    description?: string;
  }[];
  references?: {
    name: string;
    contact: string;
  }[];
  interests?: string[];
  courses?: {
    title: string;
    provider: string;
  }[];
  socialLinks?: {
    platform: string;
    url: string;
  }[];
  militaryService?: string;
  drivingLicense?: string;
  hobbies?: string[];
  customSections?: {
    title: string;
    content: string;
  }[];
  jobDescription?: string;
  aiCoverLetter?: string;
  aiInterviewQuestions?: string;
  aiSkillGap?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
