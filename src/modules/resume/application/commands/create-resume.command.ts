export type CreateInformationCommand = {
  label: string;
  value: string;
};

export type CreateSkillCommand = {
  label: string;
  value: string;
};

export type CreateEducationCommand = {
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string | null;
};

export type CreateProjectCommand = {
  title: string;
  subTitle: string;
  details: string;
  technologies: string;
  position: string;
  responsibilities: string;
  domain: string;
  demo: string;
};

export type CreateWorkExperienceCommand = {
  company: string;
  position: string;
  description: string;
  startDate: string;
  endDate: string | null;
};

export type CreateCertificationCommand = {
  name: string;
  issuer: string;
  date: string;
};

export type CreateLanguageCommand = {
  name: string;
  description: string;
};

export type CreateResumeCommand = {
  title: string;
  subTitle: string;
  overview: string;
  avatar: string | null;
  information: CreateInformationCommand[];
  educations: CreateEducationCommand[];
  workExperiences: CreateWorkExperienceCommand[];
  projects: CreateProjectCommand[];
  skills: CreateSkillCommand[];
  certifications: CreateCertificationCommand[];
  languages: CreateLanguageCommand[];
};
