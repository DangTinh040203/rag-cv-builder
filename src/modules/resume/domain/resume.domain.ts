export interface ResumeInformation {
  id: string;
  label: string;
  value: string;
  resumeId: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  major: string;
  startDate: Date;
  endDate: Date | null;
  resumeId: string;
}

export interface Skill {
  id: string;
  label: string;
  value: string;
  resumeId: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  description: string;
  startDate: Date;
  endDate: Date | null;
  resumeId: string;
}

export interface Project {
  id: string;
  title: string;
  subTitle: string;
  details: string;
  technologies: string;
  position: string;
  responsibilities: string;
  domain: string;
  demo?: string | null;
  resumeId: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: Date;
  resumeId: string;
}

export interface Language {
  id: string;
  name: string;
  description: string;
  resumeId: string;
}

export class Resume {
  id: string;
  userId: string;

  title: string;
  subTitle: string;
  overview: string;
  avatar: string | null;

  information: Array<ResumeInformation>;
  educations: Array<Education>;
  skills: Array<Skill>;
  workExperiences: Array<WorkExperience>;
  projects: Array<Project>;
  certifications: Array<Certification>;
  languages: Array<Language>;

  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Resume>) {
    Object.assign(this, partial);
  }

  get hasExperience(): boolean {
    return this.workExperiences && this.workExperiences.length > 0;
  }

  get totalProjects(): number {
    return this.projects ? this.projects.length : 0;
  }
}
