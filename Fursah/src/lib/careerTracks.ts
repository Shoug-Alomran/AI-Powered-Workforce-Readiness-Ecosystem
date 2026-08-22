// Career taxonomy used by the AI engine to power roadmaps, readiness scoring,
// and adaptive learning recommendations. In production this would be learned
// from the ITU AI-RE style Knowledge Base (employer feedback + job postings);
// here it is a seeded, explainable reference table so the prototype is fully
// functional without external data.

export type CareerTrack = {
  id: string;
  label: string;
  technicalSkills: { name: string; weight: 1 | 2 | 3 }[];
  softSkills: { name: string; weight: 1 | 2 | 3 }[];
  certifications: string[];
  recommendedExperienceMonths: number;
};

export const CAREER_TRACKS: CareerTrack[] = [
  {
    id: "software-engineer",
    label: "Software Engineer",
    technicalSkills: [
      { name: "JavaScript", weight: 3 },
      { name: "TypeScript", weight: 2 },
      { name: "React", weight: 3 },
      { name: "Node.js", weight: 2 },
      { name: "SQL", weight: 2 },
      { name: "Git", weight: 2 },
      { name: "System Design", weight: 1 },
    ],
    softSkills: [
      { name: "Problem Solving", weight: 3 },
      { name: "Communication", weight: 2 },
      { name: "Teamwork", weight: 2 },
    ],
    certifications: ["AWS Certified Cloud Practitioner", "Meta Front-End Developer"],
    recommendedExperienceMonths: 6,
  },
  {
    id: "data-scientist",
    label: "Data Scientist",
    technicalSkills: [
      { name: "Python", weight: 3 },
      { name: "SQL", weight: 3 },
      { name: "Machine Learning", weight: 3 },
      { name: "Statistics", weight: 2 },
      { name: "Data Visualization", weight: 2 },
      { name: "Pandas", weight: 2 },
    ],
    softSkills: [
      { name: "Problem Solving", weight: 3 },
      { name: "Communication", weight: 2 },
      { name: "Critical Thinking", weight: 2 },
    ],
    certifications: ["Google Data Analytics", "AWS Certified Machine Learning"],
    recommendedExperienceMonths: 6,
  },
  {
    id: "cybersecurity-specialist",
    label: "Cybersecurity Specialist",
    technicalSkills: [
      { name: "Network Security", weight: 3 },
      { name: "Linux", weight: 2 },
      { name: "Python", weight: 1 },
      { name: "Threat Analysis", weight: 3 },
      { name: "Cloud Security", weight: 2 },
    ],
    softSkills: [
      { name: "Critical Thinking", weight: 3 },
      { name: "Attention to Detail", weight: 3 },
      { name: "Communication", weight: 1 },
    ],
    certifications: ["ISC2 CC", "CompTIA Security+", "Cisco CCNA"],
    recommendedExperienceMonths: 6,
  },
  {
    id: "financial-analyst",
    label: "Financial Analyst",
    technicalSkills: [
      { name: "Excel", weight: 3 },
      { name: "Financial Modeling", weight: 3 },
      { name: "SQL", weight: 1 },
      { name: "Data Visualization", weight: 2 },
      { name: "Accounting", weight: 2 },
    ],
    softSkills: [
      { name: "Critical Thinking", weight: 3 },
      { name: "Communication", weight: 2 },
      { name: "Attention to Detail", weight: 2 },
    ],
    certifications: ["PMI Project Management", "CFA Level I"],
    recommendedExperienceMonths: 6,
  },
  {
    id: "ux-designer",
    label: "UX Designer",
    technicalSkills: [
      { name: "Figma", weight: 3 },
      { name: "User Research", weight: 3 },
      { name: "Wireframing", weight: 2 },
      { name: "Prototyping", weight: 2 },
      { name: "HTML/CSS", weight: 1 },
    ],
    softSkills: [
      { name: "Communication", weight: 3 },
      { name: "Empathy", weight: 3 },
      { name: "Teamwork", weight: 2 },
    ],
    certifications: ["Google UX Design"],
    recommendedExperienceMonths: 4,
  },

  // --- Computing & Information Technology ---------------------------------
  {
    id: "cloud-engineer",
    label: "Cloud Engineer",
    technicalSkills: [
      { name: "AWS", weight: 3 },
      { name: "Linux", weight: 2 },
      { name: "Infrastructure as Code", weight: 3 },
      { name: "Networking", weight: 2 },
      { name: "Containers", weight: 2 },
    ],
    softSkills: [
      { name: "Problem Solving", weight: 3 },
      { name: "Communication", weight: 2 },
      { name: "Teamwork", weight: 2 },
    ],
    certifications: ["AWS Certified Solutions Architect", "Microsoft Azure Fundamentals"],
    recommendedExperienceMonths: 8,
  },
  {
    id: "devops-engineer",
    label: "DevOps Engineer",
    technicalSkills: [
      { name: "CI/CD", weight: 3 },
      { name: "Containers", weight: 3 },
      { name: "Linux", weight: 2 },
      { name: "Infrastructure as Code", weight: 2 },
      { name: "Monitoring", weight: 2 },
    ],
    softSkills: [
      { name: "Problem Solving", weight: 3 },
      { name: "Collaboration", weight: 2 },
      { name: "Attention to Detail", weight: 2 },
    ],
    certifications: ["Certified Kubernetes Administrator", "AWS Certified DevOps Engineer"],
    recommendedExperienceMonths: 10,
  },
  {
    id: "ai-engineer",
    label: "Artificial Intelligence Engineer",
    technicalSkills: [
      { name: "Python", weight: 3 },
      { name: "Machine Learning", weight: 3 },
      { name: "Deep Learning", weight: 3 },
      { name: "Model Deployment", weight: 2 },
      { name: "SQL", weight: 1 },
    ],
    softSkills: [
      { name: "Critical Thinking", weight: 3 },
      { name: "Problem Solving", weight: 3 },
      { name: "Communication", weight: 2 },
    ],
    certifications: ["TensorFlow Developer Certificate", "AWS Certified Machine Learning"],
    recommendedExperienceMonths: 9,
  },
  {
    id: "data-engineer",
    label: "Data Engineer",
    technicalSkills: [
      { name: "SQL", weight: 3 },
      { name: "Python", weight: 3 },
      { name: "ETL Pipelines", weight: 3 },
      { name: "Data Warehousing", weight: 2 },
      { name: "Apache Spark", weight: 2 },
    ],
    softSkills: [
      { name: "Problem Solving", weight: 3 },
      { name: "Attention to Detail", weight: 3 },
      { name: "Teamwork", weight: 2 },
    ],
    certifications: ["Google Professional Data Engineer", "Databricks Data Engineer Associate"],
    recommendedExperienceMonths: 8,
  },
  {
    id: "data-analyst",
    label: "Data Analyst",
    technicalSkills: [
      { name: "SQL", weight: 3 },
      { name: "Excel", weight: 3 },
      { name: "Data Visualization", weight: 3 },
      { name: "Python", weight: 2 },
      { name: "Statistics", weight: 2 },
    ],
    softSkills: [
      { name: "Critical Thinking", weight: 3 },
      { name: "Communication", weight: 3 },
      { name: "Attention to Detail", weight: 2 },
    ],
    certifications: ["Google Data Analytics", "Microsoft Power BI Data Analyst"],
    recommendedExperienceMonths: 4,
  },
  {
    id: "network-administrator",
    label: "Network Administrator",
    technicalSkills: [
      { name: "Networking", weight: 3 },
      { name: "Network Security", weight: 3 },
      { name: "Linux", weight: 2 },
      { name: "Troubleshooting", weight: 3 },
    ],
    softSkills: [
      { name: "Attention to Detail", weight: 3 },
      { name: "Communication", weight: 2 },
      { name: "Problem Solving", weight: 3 },
    ],
    certifications: ["Cisco CCNA", "CompTIA Network+"],
    recommendedExperienceMonths: 6,
  },
  {
    id: "mobile-developer",
    label: "Mobile Application Developer",
    technicalSkills: [
      { name: "Swift", weight: 2 },
      { name: "Kotlin", weight: 2 },
      { name: "React Native", weight: 3 },
      { name: "REST APIs", weight: 2 },
      { name: "Git", weight: 2 },
    ],
    softSkills: [
      { name: "Problem Solving", weight: 3 },
      { name: "Teamwork", weight: 2 },
      { name: "Empathy", weight: 2 },
    ],
    certifications: ["Meta Android Developer", "Google Associate Android Developer"],
    recommendedExperienceMonths: 6,
  },
  {
    id: "qa-engineer",
    label: "Software Quality Assurance Engineer",
    technicalSkills: [
      { name: "Test Automation", weight: 3 },
      { name: "Manual Testing", weight: 2 },
      { name: "Git", weight: 2 },
      { name: "CI/CD", weight: 2 },
      { name: "SQL", weight: 1 },
    ],
    softSkills: [
      { name: "Attention to Detail", weight: 3 },
      { name: "Communication", weight: 2 },
      { name: "Critical Thinking", weight: 2 },
    ],
    certifications: ["ISTQB Certified Tester"],
    recommendedExperienceMonths: 5,
  },
  {
    id: "it-support-specialist",
    label: "Information Technology Support Specialist",
    technicalSkills: [
      { name: "Troubleshooting", weight: 3 },
      { name: "Operating Systems", weight: 2 },
      { name: "Networking", weight: 2 },
      { name: "Hardware Support", weight: 2 },
    ],
    softSkills: [
      { name: "Communication", weight: 3 },
      { name: "Empathy", weight: 2 },
      { name: "Problem Solving", weight: 3 },
    ],
    certifications: ["CompTIA A+", "Google IT Support"],
    recommendedExperienceMonths: 3,
  },

  // --- Business & Finance --------------------------------------------------
  {
    id: "accountant",
    label: "Accountant",
    technicalSkills: [
      { name: "Accounting", weight: 3 },
      { name: "Excel", weight: 3 },
      { name: "Financial Reporting", weight: 3 },
      { name: "Taxation", weight: 2 },
    ],
    softSkills: [
      { name: "Attention to Detail", weight: 3 },
      { name: "Integrity", weight: 3 },
      { name: "Communication", weight: 2 },
    ],
    certifications: ["SOCPA Fellowship", "ACCA Applied Knowledge"],
    recommendedExperienceMonths: 6,
  },
  {
    id: "business-analyst",
    label: "Business Analyst",
    technicalSkills: [
      { name: "Requirements Analysis", weight: 3 },
      { name: "Process Mapping", weight: 3 },
      { name: "SQL", weight: 2 },
      { name: "Data Visualization", weight: 2 },
      { name: "Excel", weight: 2 },
    ],
    softSkills: [
      { name: "Communication", weight: 3 },
      { name: "Critical Thinking", weight: 3 },
      { name: "Stakeholder Management", weight: 2 },
    ],
    certifications: ["IIBA ECBA", "PMI Professional in Business Analysis"],
    recommendedExperienceMonths: 6,
  },
  {
    id: "marketing-specialist",
    label: "Digital Marketing Specialist",
    technicalSkills: [
      { name: "SEO", weight: 3 },
      { name: "Content Strategy", weight: 3 },
      { name: "Social Media Analytics", weight: 2 },
      { name: "Data Visualization", weight: 1 },
    ],
    softSkills: [
      { name: "Creativity", weight: 3 },
      { name: "Communication", weight: 3 },
      { name: "Adaptability", weight: 2 },
    ],
    certifications: ["Google Digital Marketing & E-commerce", "Meta Social Media Marketing"],
    recommendedExperienceMonths: 4,
  },
  {
    id: "hr-specialist",
    label: "Human Resources Specialist",
    technicalSkills: [
      { name: "Talent Acquisition", weight: 3 },
      { name: "HR Information Systems", weight: 2 },
      { name: "Labour Law", weight: 2 },
      { name: "Excel", weight: 2 },
    ],
    softSkills: [
      { name: "Empathy", weight: 3 },
      { name: "Communication", weight: 3 },
      { name: "Integrity", weight: 3 },
    ],
    certifications: ["SHRM Certified Professional", "CIPD Level 3"],
    recommendedExperienceMonths: 6,
  },
  {
    id: "supply-chain-analyst",
    label: "Supply Chain Analyst",
    technicalSkills: [
      { name: "Inventory Management", weight: 3 },
      { name: "Excel", weight: 3 },
      { name: "Logistics Planning", weight: 2 },
      { name: "SQL", weight: 1 },
    ],
    softSkills: [
      { name: "Problem Solving", weight: 3 },
      { name: "Attention to Detail", weight: 2 },
      { name: "Communication", weight: 2 },
    ],
    certifications: ["APICS CPIM", "CSCP Supply Chain Professional"],
    recommendedExperienceMonths: 6,
  },
  {
    id: "project-manager",
    label: "Project Manager",
    technicalSkills: [
      { name: "Project Planning", weight: 3 },
      { name: "Risk Management", weight: 3 },
      { name: "Agile Methodologies", weight: 2 },
      { name: "Budgeting", weight: 2 },
    ],
    softSkills: [
      { name: "Leadership", weight: 3 },
      { name: "Communication", weight: 3 },
      { name: "Stakeholder Management", weight: 3 },
    ],
    certifications: ["PMI Project Management", "PRINCE2 Foundation", "Certified ScrumMaster"],
    recommendedExperienceMonths: 12,
  },
  {
    id: "investment-analyst",
    label: "Investment Banking Analyst",
    technicalSkills: [
      { name: "Financial Modeling", weight: 3 },
      { name: "Valuation", weight: 3 },
      { name: "Excel", weight: 3 },
      { name: "Accounting", weight: 2 },
    ],
    softSkills: [
      { name: "Attention to Detail", weight: 3 },
      { name: "Resilience", weight: 3 },
      { name: "Communication", weight: 2 },
    ],
    certifications: ["CFA Level I", "Financial Modeling & Valuation Analyst"],
    recommendedExperienceMonths: 8,
  },

  // --- Design & Creative ---------------------------------------------------
  {
    id: "graphic-designer",
    label: "Graphic Designer",
    technicalSkills: [
      { name: "Adobe Illustrator", weight: 3 },
      { name: "Adobe Photoshop", weight: 3 },
      { name: "Typography", weight: 2 },
      { name: "Brand Identity", weight: 2 },
    ],
    softSkills: [
      { name: "Creativity", weight: 3 },
      { name: "Communication", weight: 2 },
      { name: "Time Management", weight: 2 },
    ],
    certifications: ["Adobe Certified Professional"],
    recommendedExperienceMonths: 4,
  },
  {
    id: "product-designer",
    label: "Product Designer",
    technicalSkills: [
      { name: "Figma", weight: 3 },
      { name: "Design Systems", weight: 3 },
      { name: "User Research", weight: 2 },
      { name: "Prototyping", weight: 3 },
    ],
    softSkills: [
      { name: "Empathy", weight: 3 },
      { name: "Communication", weight: 3 },
      { name: "Collaboration", weight: 2 },
    ],
    certifications: ["Google UX Design", "Nielsen Norman UX Certification"],
    recommendedExperienceMonths: 8,
  },
  {
    id: "content-creator",
    label: "Digital Content Creator",
    technicalSkills: [
      { name: "Video Editing", weight: 3 },
      { name: "Content Strategy", weight: 3 },
      { name: "Copywriting", weight: 2 },
      { name: "Social Media Analytics", weight: 2 },
    ],
    softSkills: [
      { name: "Creativity", weight: 3 },
      { name: "Communication", weight: 3 },
      { name: "Adaptability", weight: 2 },
    ],
    certifications: ["Meta Social Media Marketing"],
    recommendedExperienceMonths: 3,
  },

  // --- Health & Life Sciences ---------------------------------------------
  {
    id: "registered-nurse",
    label: "Registered Nurse",
    technicalSkills: [
      { name: "Patient Care", weight: 3 },
      { name: "Clinical Assessment", weight: 3 },
      { name: "Medication Administration", weight: 3 },
      { name: "Electronic Health Records", weight: 2 },
    ],
    softSkills: [
      { name: "Empathy", weight: 3 },
      { name: "Communication", weight: 3 },
      { name: "Resilience", weight: 3 },
    ],
    certifications: ["Basic Life Support", "Saudi Nursing Licence (SCFHS)"],
    recommendedExperienceMonths: 12,
  },
  {
    id: "pharmacist",
    label: "Pharmacist",
    technicalSkills: [
      { name: "Pharmacology", weight: 3 },
      { name: "Dispensing Practice", weight: 3 },
      { name: "Patient Counselling", weight: 2 },
      { name: "Electronic Health Records", weight: 1 },
    ],
    softSkills: [
      { name: "Attention to Detail", weight: 3 },
      { name: "Communication", weight: 3 },
      { name: "Integrity", weight: 3 },
    ],
    certifications: ["SCFHS Pharmacist Registration"],
    recommendedExperienceMonths: 12,
  },
  {
    id: "public-health-analyst",
    label: "Public Health Analyst",
    technicalSkills: [
      { name: "Epidemiology", weight: 3 },
      { name: "Statistics", weight: 3 },
      { name: "Data Visualization", weight: 2 },
      { name: "Survey Design", weight: 2 },
    ],
    softSkills: [
      { name: "Critical Thinking", weight: 3 },
      { name: "Communication", weight: 3 },
      { name: "Collaboration", weight: 2 },
    ],
    certifications: ["Certified in Public Health"],
    recommendedExperienceMonths: 6,
  },
  {
    id: "biomedical-scientist",
    label: "Biomedical Laboratory Scientist",
    technicalSkills: [
      { name: "Laboratory Techniques", weight: 3 },
      { name: "Sample Analysis", weight: 3 },
      { name: "Quality Control", weight: 2 },
      { name: "Statistics", weight: 1 },
    ],
    softSkills: [
      { name: "Attention to Detail", weight: 3 },
      { name: "Integrity", weight: 3 },
      { name: "Teamwork", weight: 2 },
    ],
    certifications: ["SCFHS Laboratory Specialist Registration"],
    recommendedExperienceMonths: 10,
  },
  {
    id: "health-informatics-specialist",
    label: "Health Informatics Specialist",
    technicalSkills: [
      { name: "Electronic Health Records", weight: 3 },
      { name: "SQL", weight: 2 },
      { name: "Data Visualization", weight: 2 },
      { name: "Healthcare Standards", weight: 2 },
    ],
    softSkills: [
      { name: "Communication", weight: 3 },
      { name: "Critical Thinking", weight: 2 },
      { name: "Attention to Detail", weight: 2 },
    ],
    certifications: ["Certified Associate in Healthcare Information"],
    recommendedExperienceMonths: 8,
  },

  // --- Engineering ---------------------------------------------------------
  {
    id: "mechanical-engineer",
    label: "Mechanical Engineer",
    technicalSkills: [
      { name: "CAD", weight: 3 },
      { name: "Thermodynamics", weight: 2 },
      { name: "Finite Element Analysis", weight: 2 },
      { name: "Manufacturing Processes", weight: 2 },
    ],
    softSkills: [
      { name: "Problem Solving", weight: 3 },
      { name: "Teamwork", weight: 2 },
      { name: "Attention to Detail", weight: 2 },
    ],
    certifications: ["Saudi Council of Engineers Registration", "SolidWorks Associate"],
    recommendedExperienceMonths: 10,
  },
  {
    id: "electrical-engineer",
    label: "Electrical Engineer",
    technicalSkills: [
      { name: "Circuit Design", weight: 3 },
      { name: "Power Systems", weight: 3 },
      { name: "CAD", weight: 2 },
      { name: "Control Systems", weight: 2 },
    ],
    softSkills: [
      { name: "Problem Solving", weight: 3 },
      { name: "Attention to Detail", weight: 3 },
      { name: "Communication", weight: 2 },
    ],
    certifications: ["Saudi Council of Engineers Registration"],
    recommendedExperienceMonths: 10,
  },
  {
    id: "civil-engineer",
    label: "Civil Engineer",
    technicalSkills: [
      { name: "Structural Analysis", weight: 3 },
      { name: "AutoCAD", weight: 3 },
      { name: "Site Supervision", weight: 2 },
      { name: "Project Planning", weight: 2 },
    ],
    softSkills: [
      { name: "Leadership", weight: 2 },
      { name: "Problem Solving", weight: 3 },
      { name: "Communication", weight: 2 },
    ],
    certifications: ["Saudi Council of Engineers Registration", "LEED Green Associate"],
    recommendedExperienceMonths: 12,
  },
  {
    id: "industrial-engineer",
    label: "Industrial Engineer",
    technicalSkills: [
      { name: "Process Optimisation", weight: 3 },
      { name: "Lean Six Sigma", weight: 3 },
      { name: "Statistics", weight: 2 },
      { name: "Excel", weight: 2 },
    ],
    softSkills: [
      { name: "Critical Thinking", weight: 3 },
      { name: "Communication", weight: 2 },
      { name: "Teamwork", weight: 2 },
    ],
    certifications: ["Lean Six Sigma Green Belt"],
    recommendedExperienceMonths: 8,
  },
  {
    id: "chemical-engineer",
    label: "Chemical Engineer",
    technicalSkills: [
      { name: "Process Design", weight: 3 },
      { name: "Thermodynamics", weight: 2 },
      { name: "Process Safety", weight: 3 },
      { name: "Quality Control", weight: 2 },
    ],
    softSkills: [
      { name: "Attention to Detail", weight: 3 },
      { name: "Problem Solving", weight: 3 },
      { name: "Teamwork", weight: 2 },
    ],
    certifications: ["Saudi Council of Engineers Registration", "NEBOSH Process Safety"],
    recommendedExperienceMonths: 10,
  },

  // --- Law & Public Policy -------------------------------------------------
  {
    id: "legal-counsel",
    label: "Corporate Legal Counsel",
    technicalSkills: [
      { name: "Contract Drafting", weight: 3 },
      { name: "Legal Research", weight: 3 },
      { name: "Corporate Law", weight: 3 },
      { name: "Negotiation", weight: 2 },
    ],
    softSkills: [
      { name: "Integrity", weight: 3 },
      { name: "Communication", weight: 3 },
      { name: "Critical Thinking", weight: 3 },
    ],
    certifications: ["Saudi Bar Association Licence"],
    recommendedExperienceMonths: 12,
  },
  {
    id: "policy-analyst",
    label: "Public Policy Analyst",
    technicalSkills: [
      { name: "Policy Research", weight: 3 },
      { name: "Statistics", weight: 2 },
      { name: "Report Writing", weight: 3 },
      { name: "Data Visualization", weight: 2 },
    ],
    softSkills: [
      { name: "Critical Thinking", weight: 3 },
      { name: "Communication", weight: 3 },
      { name: "Collaboration", weight: 2 },
    ],
    certifications: ["Public Policy Analysis Professional Certificate"],
    recommendedExperienceMonths: 8,
  },
  {
    id: "compliance-officer",
    label: "Compliance Officer",
    technicalSkills: [
      { name: "Regulatory Frameworks", weight: 3 },
      { name: "Risk Management", weight: 3 },
      { name: "Auditing", weight: 2 },
      { name: "Report Writing", weight: 2 },
    ],
    softSkills: [
      { name: "Integrity", weight: 3 },
      { name: "Attention to Detail", weight: 3 },
      { name: "Communication", weight: 2 },
    ],
    certifications: ["Certified Compliance & Ethics Professional", "ACAMS Anti-Money Laundering"],
    recommendedExperienceMonths: 10,
  },

  // --- Education -----------------------------------------------------------
  {
    id: "school-teacher",
    label: "Secondary School Teacher",
    technicalSkills: [
      { name: "Lesson Planning", weight: 3 },
      { name: "Classroom Management", weight: 3 },
      { name: "Student Assessment", weight: 3 },
      { name: "Educational Technology", weight: 2 },
    ],
    softSkills: [
      { name: "Communication", weight: 3 },
      { name: "Empathy", weight: 3 },
      { name: "Patience", weight: 3 },
    ],
    certifications: ["Teaching Licence (Education & Training Evaluation Commission)"],
    recommendedExperienceMonths: 6,
  },
  {
    id: "curriculum-specialist",
    label: "Curriculum Specialist",
    technicalSkills: [
      { name: "Curriculum Design", weight: 3 },
      { name: "Learning Outcomes Mapping", weight: 3 },
      { name: "Student Assessment", weight: 2 },
      { name: "Educational Technology", weight: 2 },
    ],
    softSkills: [
      { name: "Critical Thinking", weight: 3 },
      { name: "Collaboration", weight: 3 },
      { name: "Communication", weight: 2 },
    ],
    certifications: ["Instructional Design Professional Certificate"],
    recommendedExperienceMonths: 10,
  },
  {
    id: "academic-advisor",
    label: "Academic Advisor",
    technicalSkills: [
      { name: "Student Counselling", weight: 3 },
      { name: "Degree Planning", weight: 3 },
      { name: "Student Information Systems", weight: 2 },
    ],
    softSkills: [
      { name: "Empathy", weight: 3 },
      { name: "Communication", weight: 3 },
      { name: "Active Listening", weight: 3 },
    ],
    certifications: ["NACADA Academic Advising Certificate"],
    recommendedExperienceMonths: 6,
  },

  // --- Tourism & Hospitality ----------------------------------------------
  {
    id: "hotel-operations-manager", label: "Hotel Operations Manager",
    technicalSkills: [{ name: "Hotel Operations", weight: 3 }, { name: "Revenue Management", weight: 2 }, { name: "Guest Services", weight: 3 }],
    softSkills: [{ name: "Leadership", weight: 3 }, { name: "Communication", weight: 3 }, { name: "Problem Solving", weight: 2 }],
    certifications: ["Hospitality Management Certificate"], recommendedExperienceMonths: 12,
  },
  {
    id: "tourism-development-specialist", label: "Tourism Development Specialist",
    technicalSkills: [{ name: "Destination Planning", weight: 3 }, { name: "Tourism Research", weight: 3 }, { name: "Project Management", weight: 2 }],
    softSkills: [{ name: "Communication", weight: 3 }, { name: "Critical Thinking", weight: 2 }, { name: "Collaboration", weight: 2 }],
    certifications: ["Sustainable Tourism Certificate"], recommendedExperienceMonths: 8,
  },

  // --- Energy & Sustainability --------------------------------------------
  {
    id: "renewable-energy-specialist", label: "Renewable Energy Specialist",
    technicalSkills: [{ name: "Renewable Energy Systems", weight: 3 }, { name: "Energy Analysis", weight: 3 }, { name: "Solar Technology", weight: 2 }],
    softSkills: [{ name: "Problem Solving", weight: 3 }, { name: "Critical Thinking", weight: 3 }, { name: "Teamwork", weight: 2 }],
    certifications: ["Certified Energy Manager"], recommendedExperienceMonths: 8,
  },
  {
    id: "sustainability-analyst", label: "Sustainability Analyst",
    technicalSkills: [{ name: "ESG Reporting", weight: 3 }, { name: "Carbon Accounting", weight: 3 }, { name: "Data Analysis", weight: 2 }],
    softSkills: [{ name: "Critical Thinking", weight: 3 }, { name: "Communication", weight: 3 }, { name: "Attention to Detail", weight: 2 }],
    certifications: ["GRI Sustainability Reporting Certificate"], recommendedExperienceMonths: 6,
  },

  // --- Logistics & Transport ----------------------------------------------
  {
    id: "logistics-coordinator", label: "Logistics Coordinator",
    technicalSkills: [{ name: "Logistics Planning", weight: 3 }, { name: "Inventory Management", weight: 3 }, { name: "ERP Systems", weight: 2 }],
    softSkills: [{ name: "Organization", weight: 3 }, { name: "Communication", weight: 2 }, { name: "Problem Solving", weight: 3 }],
    certifications: ["Certified in Logistics, Transportation and Distribution"], recommendedExperienceMonths: 5,
  },
  {
    id: "aviation-operations-specialist", label: "Aviation Operations Specialist",
    technicalSkills: [{ name: "Airport Operations", weight: 3 }, { name: "Aviation Safety", weight: 3 }, { name: "Operations Planning", weight: 2 }],
    softSkills: [{ name: "Attention to Detail", weight: 3 }, { name: "Communication", weight: 3 }, { name: "Decision Making", weight: 2 }],
    certifications: ["IATA Airport Operations Certificate"], recommendedExperienceMonths: 6,
  },

  // --- Media & Communications ---------------------------------------------
  {
    id: "public-relations-specialist", label: "Public Relations Specialist",
    technicalSkills: [{ name: "Media Relations", weight: 3 }, { name: "Campaign Planning", weight: 3 }, { name: "Content Strategy", weight: 2 }],
    softSkills: [{ name: "Communication", weight: 3 }, { name: "Creativity", weight: 2 }, { name: "Relationship Building", weight: 3 }],
    certifications: ["Professional Public Relations Certificate"], recommendedExperienceMonths: 5,
  },
  {
    id: "digital-journalist", label: "Digital Journalist",
    technicalSkills: [{ name: "Digital Journalism", weight: 3 }, { name: "Media Production", weight: 2 }, { name: "Content Verification", weight: 3 }],
    softSkills: [{ name: "Communication", weight: 3 }, { name: "Critical Thinking", weight: 3 }, { name: "Integrity", weight: 3 }],
    certifications: ["Digital Journalism Certificate"], recommendedExperienceMonths: 4,
  },

  // --- Agriculture & Food --------------------------------------------------
  {
    id: "agricultural-engineer", label: "Agricultural Engineer",
    technicalSkills: [{ name: "Agricultural Systems", weight: 3 }, { name: "Irrigation Design", weight: 3 }, { name: "Precision Agriculture", weight: 2 }],
    softSkills: [{ name: "Problem Solving", weight: 3 }, { name: "Teamwork", weight: 2 }, { name: "Critical Thinking", weight: 2 }],
    certifications: ["Saudi Council of Engineers Registration"], recommendedExperienceMonths: 8,
  },
  {
    id: "food-quality-specialist", label: "Food Quality Control Specialist",
    technicalSkills: [{ name: "Food Safety", weight: 3 }, { name: "Quality Control", weight: 3 }, { name: "Laboratory Testing", weight: 2 }],
    softSkills: [{ name: "Attention to Detail", weight: 3 }, { name: "Integrity", weight: 3 }, { name: "Communication", weight: 2 }],
    certifications: ["HACCP Food Safety Certificate"], recommendedExperienceMonths: 5,
  },

  // --- Science & Research --------------------------------------------------
  {
    id: "research-scientist", label: "Research Scientist",
    technicalSkills: [{ name: "Research Methods", weight: 3 }, { name: "Statistical Analysis", weight: 3 }, { name: "Scientific Writing", weight: 3 }],
    softSkills: [{ name: "Critical Thinking", weight: 3 }, { name: "Attention to Detail", weight: 3 }, { name: "Collaboration", weight: 2 }],
    certifications: ["Good Clinical Practice Certificate"], recommendedExperienceMonths: 12,
  },
  {
    id: "environmental-scientist", label: "Environmental Scientist",
    technicalSkills: [{ name: "Environmental Assessment", weight: 3 }, { name: "GIS", weight: 2 }, { name: "Environmental Monitoring", weight: 3 }],
    softSkills: [{ name: "Critical Thinking", weight: 3 }, { name: "Communication", weight: 2 }, { name: "Problem Solving", weight: 2 }],
    certifications: ["Environmental Management Certificate"], recommendedExperienceMonths: 8,
  },

  // --- Construction & Real Estate -----------------------------------------
  {
    id: "quantity-surveyor", label: "Quantity Surveyor",
    technicalSkills: [{ name: "Cost Estimation", weight: 3 }, { name: "Contract Management", weight: 3 }, { name: "Construction Measurement", weight: 3 }],
    softSkills: [{ name: "Attention to Detail", weight: 3 }, { name: "Negotiation", weight: 2 }, { name: "Communication", weight: 2 }],
    certifications: ["RICS Quantity Surveying Certificate"], recommendedExperienceMonths: 8,
  },
  {
    id: "real-estate-analyst", label: "Real Estate Analyst",
    technicalSkills: [{ name: "Real Estate Valuation", weight: 3 }, { name: "Financial Modeling", weight: 3 }, { name: "Market Research", weight: 2 }],
    softSkills: [{ name: "Critical Thinking", weight: 3 }, { name: "Communication", weight: 2 }, { name: "Attention to Detail", weight: 2 }],
    certifications: ["Real Estate Valuation Certificate"], recommendedExperienceMonths: 6,
  },

  // --- Sports & Entertainment ---------------------------------------------
  {
    id: "sports-management-specialist", label: "Sports Management Specialist",
    technicalSkills: [{ name: "Sports Operations", weight: 3 }, { name: "Event Management", weight: 3 }, { name: "Sponsorship Management", weight: 2 }],
    softSkills: [{ name: "Leadership", weight: 3 }, { name: "Communication", weight: 3 }, { name: "Teamwork", weight: 2 }],
    certifications: ["Sports Management Certificate"], recommendedExperienceMonths: 6,
  },
  {
    id: "game-producer", label: "Game Producer",
    technicalSkills: [{ name: "Game Production", weight: 3 }, { name: "Agile Project Management", weight: 3 }, { name: "Quality Assurance", weight: 2 }],
    softSkills: [{ name: "Leadership", weight: 3 }, { name: "Creativity", weight: 3 }, { name: "Communication", weight: 2 }],
    certifications: ["Certified ScrumMaster"], recommendedExperienceMonths: 8,
  },
];

/** Static fallback lookup, used only before the DB taxonomy is seeded. */
export function getCareerTrack(id: string): CareerTrack {
  return (
    CAREER_TRACKS.find((c) => c.id === id) ?? CAREER_TRACKS[0]
  );
}

export function allSkillNames(): { name: string; category: "technical" | "soft" }[] {
  const map = new Map<string, "technical" | "soft">();
  for (const track of CAREER_TRACKS) {
    for (const s of track.technicalSkills) map.set(s.name, "technical");
    for (const s of track.softSkills) map.set(s.name, "soft");
  }
  return Array.from(map.entries()).map(([name, category]) => ({ name, category }));
}

export function allCertificationNames(): string[] {
  const set = new Set<string>();
  for (const track of CAREER_TRACKS) {
    for (const c of track.certifications) set.add(c);
  }
  return Array.from(set);
}

export function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `track-${Date.now()}`;
}

// Note: the DB-backed, admin-editable versions of this taxonomy
// (getAllCareerTracksAsync / getCareerTrackAsync) live in
// "@/lib/careerTracks.server", a separate, server-only module. Keeping
// this file free of any `@/lib/db` import (even a dynamic one) means it
// stays safe to import from client components like FirebaseAuthPanel.
