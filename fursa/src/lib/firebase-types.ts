export type FirebaseRole = "STUDENT" | "EMPLOYER" | "UNIVERSITY" | "ADMIN";

export type FirebaseUserProfile = {
  uid: string;
  name: string;
  email: string;
  role: FirebaseRole;
  createdAt: string;
  updatedAt: string;
  targetCareer?: string;
  university?: string;
  degree?: string;
  company?: string;
  industry?: string;
  institution?: string;
  region?: string;
};
