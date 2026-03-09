export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface Profile {
  user_id: number;
  cv_filename: string | null;
  cv_path: string | null;
  cv_text: string | null;
  additional_info: string | null;
  updated_at: string;
}

export interface PlatformCredential {
  id: number;
  user_id: number;
  platform: string;
  encrypted_email: string;
  encrypted_pass: string;
  iv: string;
  auth_tag: string;
  created_at: string;
}

export interface JobPreferences {
  id: number;
  user_id: number;
  job_titles: string;
  locations: string;
  salary_min: number | null;
  salary_max: number | null;
  experience: string | null;
  industries: string;
  updated_at: string;
}

export interface Application {
  id: number;
  user_id: number;
  job_title: string;
  company: string | null;
  job_url: string | null;
  job_description: string | null;
  generated_cover: string | null;
  generated_answers: string | null;
  status: 'generated' | 'applied' | 'rejected' | 'interview';
  applied_at: string | null;
  created_at: string;
}

export interface JwtPayload {
  userId: number;
  username: string;
}

export interface GenerateRequest {
  jobDescription: string;
  jobTitle?: string;
  company?: string;
  jobUrl?: string;
  generateType: 'cover_letter' | 'screening_answers' | 'both';
  screeningQuestions?: string[];
}
