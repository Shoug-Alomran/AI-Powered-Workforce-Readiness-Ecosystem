/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { CAREER_TRACKS, allSkillNames, allCertificationNames } from "../src/lib/careerTracks";
import { computeJobMatch } from "../src/lib/ai";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding Fursah demo data...");

  // --- Wipe existing data (dev convenience) ---
  await prisma.supportTicket.deleteMany();
  await prisma.monitoringSnapshot.deleteMany();
  await prisma.dataRequest.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.governanceScenario.deleteMany();
  await prisma.appeal.deleteMany();
  await prisma.passportShare.deleteMany();
  await prisma.consentRecord.deleteMany();
  await prisma.roadmapItem.deleteMany();
  await prisma.curriculumAction.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.bookmarkedJob.deleteMany();
  await prisma.application.deleteMany();
  await prisma.jobSkill.deleteMany();
  await prisma.jobCertification.deleteMany();
  await prisma.job.deleteMany();
  await prisma.studentSkill.deleteMany();
  await prisma.studentCertification.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.project.deleteMany();
  await prisma.student.deleteMany();
  await prisma.employer.deleteMany();
  await prisma.university.deleteMany();
  await prisma.user.deleteMany();
  await prisma.careerTrackSkill.deleteMany();
  await prisma.careerTrackCertification.deleteMany();
  await prisma.careerTrack.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.certification.deleteMany();

  // --- Reference data: skills & certifications ---
  const skillRecords = new Map<string, string>();
  for (const s of allSkillNames()) {
    const rec = await prisma.skill.create({ data: { name: s.name, category: s.category } });
    skillRecords.set(s.name, rec.id);
  }
  const certRecords = new Map<string, string>();
  for (const name of allCertificationNames()) {
    const rec = await prisma.certification.create({ data: { name } });
    certRecords.set(name, rec.id);
  }

  // --- Career taxonomy (DB-backed; admin-editable from /admin/career-tracks) ---
  for (const track of CAREER_TRACKS) {
    await prisma.careerTrack.create({
      data: { id: track.id, label: track.label, recommendedExperienceMonths: track.recommendedExperienceMonths },
    });
    for (const s of [...track.technicalSkills.map((x) => ({ ...x, category: "technical" })), ...track.softSkills.map((x) => ({ ...x, category: "soft" }))]) {
      const skillId = skillRecords.get(s.name);
      if (skillId) {
        await prisma.careerTrackSkill.create({
          data: { careerTrackId: track.id, skillId, weight: s.weight, category: s.category },
        });
      }
    }
    for (const certName of track.certifications) {
      const certId = certRecords.get(certName);
      if (certId) {
        await prisma.careerTrackCertification.create({ data: { careerTrackId: track.id, certificationId: certId } });
      }
    }
  }

  // --- Admin (demo login only — production admin access should go through scripts/create-admin.ts + Firebase) ---
  await prisma.user.create({
    data: { role: "ADMIN", name: "Fursah Trust & Safety", email: "admin@fursah.demo" },
  });

  // --- Employers ---
  const employerSeeds = [
    { name: "Lama Al-Harbi", email: "hr@nexariya.sa", company: "Nexariya Technologies", industry: "Software" },
    { name: "Faisal Al-Otaibi", email: "talent@riyadhfintech.sa", company: "Riyadh FinTech Group", industry: "Finance" },
    { name: "Noura Al-Qahtani", email: "careers@sanadsecure.sa", company: "Sanad Secure", industry: "Cybersecurity" },
  ];
  const employers: any[] = [];
  for (const e of employerSeeds) {
    const user = await prisma.user.create({
      data: { role: "EMPLOYER", name: e.name, email: e.email },
    });
    const employer = await prisma.employer.create({
      data: { userId: user.id, company: e.company, industry: e.industry, verificationStatus: "APPROVED" },
    });
    employers.push(employer);
  }

  // An unverified employer, to demo the admin approval queue.
  const pendingEmployerUser = await prisma.user.create({
    data: { role: "EMPLOYER", name: "Yasmin Al-Harthi", email: "hiring@newventure.sa" },
  });
  await prisma.employer.create({
    data: { userId: pendingEmployerUser.id, company: "NewVenture Labs", industry: "Logistics" },
  });

  const universityUser = await prisma.user.create({
    data: { role: "UNIVERSITY", name: "Dr. Amal Al-Saud", email: "workforce@ksu.edu.sa" },
  });
  const ksu = await prisma.university.create({
    data: { userId: universityUser.id, institution: "King Saud University", region: "Riyadh" },
  });

  const psuUser = await prisma.user.create({
    data: { role: "UNIVERSITY", name: "Dr. Khalid Al-Fayez", email: "workforce@psu.edu.sa" },
  });
  const psu = await prisma.university.create({
    data: { userId: psuUser.id, institution: "Prince Sultan University", region: "Riyadh" },
  });

  // --- Offerings (courses & certifications published by universities) ---
  async function createOffering(
    universityId: string,
    title: string,
    type: "course" | "certification",
    description: string,
    skillNames: string[],
    certName?: string
  ) {
    const offering = await prisma.offering.create({
      data: {
        universityId,
        title,
        type,
        description,
        certificationId: certName ? certRecords.get(certName) : undefined,
      },
    });
    for (const name of skillNames) {
      const skillId = skillRecords.get(name);
      if (skillId) {
        await prisma.offeringSkill.create({ data: { offeringId: offering.id, skillId } });
      }
    }
    return offering;
  }

  await createOffering(
    ksu.id,
    "Full-Stack Web Development",
    "course",
    "Hands-on course covering modern front-end and back-end web development.",
    ["JavaScript", "React", "TypeScript", "Node.js"]
  );
  await createOffering(
    ksu.id,
    "AWS Cloud Practitioner Prep",
    "certification",
    "Exam-prep track for the AWS Certified Cloud Practitioner credential.",
    ["Git", "System Design"],
    "AWS Certified Cloud Practitioner"
  );
  await createOffering(
    ksu.id,
    "Applied Machine Learning",
    "course",
    "Introductory ML course with a focus on applied modeling and evaluation.",
    ["Python", "Machine Learning", "Statistics"]
  );
  await createOffering(
    ksu.id,
    "Financial Analysis & Modeling",
    "course",
    "Core financial modeling techniques used in corporate finance and investment analysis.",
    ["Excel", "Financial Modeling", "Accounting"]
  );

  await createOffering(
    psu.id,
    "Cybersecurity Fundamentals",
    "certification",
    "Foundational cybersecurity track aligned to the CompTIA Security+ exam objectives.",
    ["Network Security", "Linux", "Threat Analysis"],
    "CompTIA Security+"
  );
  await createOffering(
    psu.id,
    "Cloud Security Essentials",
    "certification",
    "Cloud-focused security course preparing students for the ISC2 CC credential.",
    ["Cloud Security", "Critical Thinking"],
    "ISC2 CC"
  );
  await createOffering(
    psu.id,
    "UX Design Foundations",
    "certification",
    "End-to-end UX design course covering research, wireframing, and prototyping.",
    ["Figma", "User Research", "Wireframing", "Prototyping"],
    "Google UX Design"
  );
  await createOffering(
    psu.id,
    "Data Analytics with Python",
    "certification",
    "Applied data analytics course aligned to the Google Data Analytics certificate.",
    ["Python", "SQL", "Data Visualization", "Pandas"],
    "Google Data Analytics"
  );
  await createOffering(
    psu.id,
    "Software Engineering Essentials",
    "course",
    "Intro to professional software engineering practices and collaborative development.",
    ["JavaScript", "Git", "Problem Solving"]
  );

  // Curriculum completion is screened by AI and then verified by a human administrator.
  for (const university of [ksu, psu]) {
    await prisma.curriculumAction.createMany({ data: [
      { universityId: university.id, title: "Cloud Systems Architecture Revision", skill: "Cloud Architecture", owner: "Alice Miller", status: "IN_PROGRESS", dueDate: new Date("2026-10-12") },
      { universityId: university.id, title: "Industry Internship Program: Fintech Hub", skill: "Industry Experience", owner: "Robert Black", status: "IN_PROGRESS", dueDate: new Date("2026-12-01") },
    ] });
  }

  // --- Jobs ---
  async function createJob(
    employerId: string,
    title: string,
    careerTrack: string,
    description: string,
    minExperience: number,
    skillWeights: { name: string; weight: number }[],
    certs: string[]
  ) {
    const job = await prisma.job.create({
      data: { employerId, title, careerTrack, description, minExperience },
    });
    for (const sw of skillWeights) {
      const skillId = skillRecords.get(sw.name);
      if (skillId) {
        await prisma.jobSkill.create({
          data: { jobId: job.id, skillId, weight: sw.weight },
        });
      }
    }
    for (const c of certs) {
      const certId = certRecords.get(c);
      if (certId) {
        await prisma.jobCertification.create({ data: { jobId: job.id, certificationId: certId } });
      }
    }
    return job;
  }

  const seJob = await createJob(
    employers[0].id,
    "Junior Software Engineer",
    "software-engineer",
    "Build and ship features across our web platform using React, Node.js, and TypeScript.",
    3,
    [
      { name: "JavaScript", weight: 3 },
      { name: "React", weight: 3 },
      { name: "TypeScript", weight: 2 },
      { name: "Git", weight: 1 },
    ],
    ["AWS Certified Cloud Practitioner"]
  );

  const dsJob = await createJob(
    employers[0].id,
    "Data Science Intern",
    "data-scientist",
    "Support the analytics team building ML models for demand forecasting.",
    2,
    [
      { name: "Python", weight: 3 },
      { name: "Machine Learning", weight: 3 },
      { name: "SQL", weight: 2 },
    ],
    []
  );

  await createJob(
    employers[1].id,
    "Financial Analyst",
    "financial-analyst",
    "Support budgeting, forecasting, and financial modeling for our portfolio companies.",
    4,
    [
      { name: "Financial Modeling", weight: 3 },
      { name: "Excel", weight: 3 },
      { name: "Data Visualization", weight: 1 },
    ],
    ["PMI Project Management"]
  );

  const csJob = await createJob(
    employers[2].id,
    "Cybersecurity Analyst",
    "cybersecurity-specialist",
    "Monitor and defend enterprise networks; support incident response and threat analysis.",
    3,
    [
      { name: "Network Security", weight: 3 },
      { name: "Threat Analysis", weight: 3 },
      { name: "Linux", weight: 2 },
    ],
    ["CompTIA Security+"]
  );

  // --- Students ---
  const studentSeeds: {
    name: string;
    email: string;
    targetCareer: string;
    university: string;
    degree: string;
    bio: string;
    skills: { name: string; level: number }[];
    certs: string[];
    experiences: { type: string; title: string; org: string; months: number }[];
    projects: { title: string; description: string }[];
  }[] = [
    {
      name: "Sara Al-Dosari",
      email: "sara.aldosari@example.com",
      targetCareer: "software-engineer",
      university: "King Saud University",
      degree: "B.Sc. Computer Science",
      bio: "Final-year CS student passionate about front-end engineering.",
      skills: [
        { name: "JavaScript", level: 4 },
        { name: "React", level: 4 },
        { name: "TypeScript", level: 2 },
        { name: "Git", level: 3 },
        { name: "Problem Solving", level: 4 },
        { name: "Communication", level: 3 },
      ],
      certs: ["Meta Front-End Developer"],
      experiences: [
        { type: "internship", title: "Front-End Intern", org: "STC Pay", months: 3 },
        { type: "hackathon", title: "Hackathon KSA 2025 - 2nd place", org: "AI for Good", months: 1 },
      ],
      projects: [
        { title: "Campus Events App", description: "React Native app for university events." },
        { title: "Portfolio Website", description: "Personal portfolio built with Next.js." },
      ],
    },
    {
      name: "Abdullah Al-Ghamdi",
      email: "abdullah.alghamdi@example.com",
      targetCareer: "software-engineer",
      university: "KFUPM",
      degree: "B.Sc. Software Engineering",
      bio: "Backend-leaning engineer, loves systems design.",
      skills: [
        { name: "JavaScript", level: 3 },
        { name: "Node.js", level: 4 },
        { name: "SQL", level: 4 },
        { name: "Git", level: 4 },
        { name: "System Design", level: 2 },
        { name: "Teamwork", level: 4 },
      ],
      certs: [],
      experiences: [{ type: "internship", title: "Backend Intern", org: "Jahez", months: 2 }],
      projects: [{ title: "Delivery Tracking API", description: "Node.js + Postgres microservice." }],
    },
    {
      name: "Lina Al-Zahrani",
      email: "lina.alzahrani@example.com",
      targetCareer: "data-scientist",
      university: "Princess Nourah University",
      degree: "B.Sc. Data Science",
      bio: "Aspiring data scientist focused on NLP.",
      skills: [
        { name: "Python", level: 5 },
        { name: "Machine Learning", level: 4 },
        { name: "SQL", level: 3 },
        { name: "Statistics", level: 4 },
        { name: "Pandas", level: 4 },
        { name: "Problem Solving", level: 4 },
      ],
      certs: ["Google Data Analytics"],
      experiences: [
        { type: "research", title: "NLP Research Assistant", org: "PNU AI Lab", months: 6 },
      ],
      projects: [
        { title: "Arabic Sentiment Classifier", description: "Fine-tuned transformer for Arabic tweets." },
        { title: "Demand Forecasting Model", description: "Time-series model for retail demand." },
      ],
    },
    {
      name: "Yousef Al-Shehri",
      email: "yousef.alshehri@example.com",
      targetCareer: "data-scientist",
      university: "King Abdulaziz University",
      degree: "B.Sc. Statistics",
      bio: "Early-stage learner exploring data science.",
      skills: [
        { name: "Python", level: 2 },
        { name: "SQL", level: 2 },
        { name: "Statistics", level: 3 },
      ],
      certs: [],
      experiences: [],
      projects: [{ title: "House Price Predictor", description: "Coursework regression project." }],
    },
    {
      name: "Reem Al-Anazi",
      email: "reem.alanazi@example.com",
      targetCareer: "cybersecurity-specialist",
      university: "Imam Abdulrahman Bin Faisal University",
      degree: "B.Sc. Cybersecurity",
      bio: "CTF competitor and network security enthusiast.",
      skills: [
        { name: "Network Security", level: 4 },
        { name: "Linux", level: 4 },
        { name: "Threat Analysis", level: 3 },
        { name: "Critical Thinking", level: 4 },
        { name: "Attention to Detail", level: 4 },
      ],
      certs: ["CompTIA Security+"],
      experiences: [
        { type: "competition", title: "National CTF Finalist", org: "SDAIA", months: 1 },
        { type: "internship", title: "SOC Intern", org: "Sanad Secure", months: 3 },
      ],
      projects: [{ title: "Home Lab IDS", description: "Built an intrusion detection lab with Snort." }],
    },
    {
      name: "Hana Al-Mutairi",
      email: "hana.almutairi@example.com",
      targetCareer: "financial-analyst",
      university: "King Saud University",
      degree: "B.Sc. Finance",
      bio: "Finance student interested in fintech and investment analysis.",
      skills: [
        { name: "Excel", level: 4 },
        { name: "Financial Modeling", level: 3 },
        { name: "Accounting", level: 3 },
        { name: "Critical Thinking", level: 3 },
      ],
      certs: [],
      experiences: [{ type: "internship", title: "Finance Intern", org: "Riyadh FinTech Group", months: 3 }],
      projects: [{ title: "Portfolio Risk Dashboard", description: "Excel + Power BI risk model." }],
    },
    {
      name: "Faris Al-Qahtani",
      email: "faris.alqahtani@example.com",
      targetCareer: "cybersecurity-specialist",
      university: "Prince Sultan University",
      degree: "B.Sc. Cybersecurity",
      bio: "PSU cybersecurity student registered in the Cybersecurity Fundamentals track.",
      skills: [
        { name: "Network Security", level: 3 },
        { name: "Linux", level: 3 },
        { name: "Threat Analysis", level: 2 },
        { name: "Critical Thinking", level: 3 },
        { name: "Attention to Detail", level: 3 },
      ],
      certs: ["CompTIA Security+"],
      experiences: [{ type: "internship", title: "IT Security Intern", org: "Sanad Secure", months: 2 }],
      projects: [{ title: "Campus Wi-Fi Security Audit", description: "Pen-tested the PSU guest network for a capstone project." }],
    },
    {
      name: "Khalid Al-Harbi",
      email: "khalid.alharbi@example.com",
      targetCareer: "cybersecurity-specialist",
      university: "King Saud University",
      degree: "B.Sc. Information Systems",
      bio: "Information systems student building practical skills in security operations and incident response.",
      skills: [
        { name: "Network Security", level: 3 },
        { name: "Linux", level: 2 },
        { name: "Threat Analysis", level: 2 },
        { name: "Critical Thinking", level: 3 },
        { name: "Attention to Detail", level: 3 },
      ],
      certs: [],
      experiences: [{ type: "project", title: "Security Operations Trainee", org: "KSU Cyber Lab", months: 2 }],
      projects: [{ title: "Phishing Detection Study", description: "Analyzed common phishing indicators and documented a response playbook." }],
    },
    {
      name: "Maha Al-Otaibi",
      email: "maha.alotaibi@example.com",
      targetCareer: "ux-designer",
      university: "Prince Sultan University",
      degree: "B.A. Digital Design",
      bio: "PSU design student completing the UX Design Foundations certification.",
      skills: [
        { name: "Figma", level: 4 },
        { name: "User Research", level: 3 },
        { name: "Wireframing", level: 4 },
        { name: "Prototyping", level: 3 },
        { name: "Empathy", level: 4 },
        { name: "Communication", level: 3 },
      ],
      certs: ["Google UX Design"],
      experiences: [{ type: "internship", title: "UX Design Intern", org: "Nexariya Technologies", months: 3 }],
      projects: [{ title: "Student Services App Redesign", description: "Usability study and redesign of the PSU student portal." }],
    },
    {
      name: "Omar Al-Rashid",
      email: "omar.alrashid@example.com",
      targetCareer: "software-engineer",
      university: "Prince Sultan University",
      degree: "B.Sc. Computer Engineering",
      bio: "PSU engineering student enrolled in Software Engineering Essentials.",
      skills: [
        { name: "JavaScript", level: 3 },
        { name: "Git", level: 3 },
        { name: "React", level: 2 },
        { name: "Problem Solving", level: 3 },
        { name: "Teamwork", level: 3 },
      ],
      certs: [],
      experiences: [],
      projects: [{ title: "Course Registration Bot", description: "Automation script to track PSU course seat availability." }],
    },
    {
      name: "Dana Al-Harbi",
      email: "dana.alharbi@example.com",
      targetCareer: "data-scientist",
      university: "Prince Sultan University",
      degree: "B.Sc. Data Science",
      bio: "PSU student pursuing the Data Analytics with Python certificate.",
      skills: [
        { name: "Python", level: 3 },
        { name: "SQL", level: 3 },
        { name: "Data Visualization", level: 3 },
        { name: "Pandas", level: 2 },
        { name: "Problem Solving", level: 3 },
      ],
      certs: ["Google Data Analytics"],
      experiences: [{ type: "research", title: "Data Analytics Trainee", org: "PSU Data Lab", months: 2 }],
      projects: [{ title: "Riyadh Traffic Trends Dashboard", description: "Power BI dashboard analyzing open city traffic data." }],
    },
  ];

  for (const s of studentSeeds) {
    const user = await prisma.user.create({ data: { role: "STUDENT", name: s.name, email: s.email } });
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        targetCareer: s.targetCareer,
        university: s.university,
        degree: s.degree,
        bio: s.bio,
      },
    });
    for (const sk of s.skills) {
      const skillId = skillRecords.get(sk.name);
      if (skillId) {
        await prisma.studentSkill.create({
          data: { studentId: student.id, skillId, level: sk.level },
        });
      }
    }
    for (const c of s.certs) {
      const certId = certRecords.get(c);
      if (certId) {
        await prisma.studentCertification.create({
          data: { studentId: student.id, certificationId: certId },
        });
      }
    }
    for (const e of s.experiences) {
      await prisma.experience.create({
        data: { studentId: student.id, type: e.type, title: e.title, org: e.org, months: e.months },
      });
    }
    for (const p of s.projects) {
      await prisma.project.create({
        data: { studentId: student.id, title: p.title, description: p.description },
      });
    }
  }

  // --- A couple of sample applications + feedback for the intelligence dashboard ---
  const studentInclude = {
    skills: { include: { skill: true } },
    certifications: { include: { certification: true } },
    experiences: true,
    projects: true,
  } as const;
  const jobInclude = {
    requiredSkills: { include: { skill: true } },
    requiredCerts: { include: { certification: true } },
  } as const;

  const sara = await prisma.student.findFirstOrThrow({ where: { user: { email: "sara.aldosari@example.com" } }, include: studentInclude });
  const abdullah = await prisma.student.findFirstOrThrow({ where: { user: { email: "abdullah.alghamdi@example.com" } }, include: studentInclude });
  const lina = await prisma.student.findFirstOrThrow({ where: { user: { email: "lina.alzahrani@example.com" } }, include: studentInclude });
  const reem = await prisma.student.findFirstOrThrow({ where: { user: { email: "reem.alanazi@example.com" } }, include: studentInclude });
  const faris = await prisma.student.findFirstOrThrow({ where: { user: { email: "faris.alqahtani@example.com" } }, include: studentInclude });
  const khalid = await prisma.student.findFirstOrThrow({ where: { user: { email: "khalid.alharbi@example.com" } }, include: studentInclude });
  const dana = await prisma.student.findFirstOrThrow({ where: { user: { email: "dana.alharbi@example.com" } }, include: studentInclude });

  const seJobFull = await prisma.job.findUniqueOrThrow({ where: { id: seJob.id }, include: jobInclude });
  const dsJobFull = await prisma.job.findUniqueOrThrow({ where: { id: dsJob.id }, include: jobInclude });
  const csJobFull = await prisma.job.findUniqueOrThrow({ where: { id: csJob.id }, include: jobInclude });

  await prisma.application.create({
    data: { studentId: sara.id, jobId: seJob.id, status: "hired", matchScore: computeJobMatch(sara, seJobFull).score },
  });
  await prisma.application.create({
    data: { studentId: abdullah.id, jobId: seJob.id, status: "shortlisted", matchScore: computeJobMatch(abdullah, seJobFull).score },
  });
  await prisma.application.create({
    data: { studentId: lina.id, jobId: dsJob.id, status: "hired", matchScore: computeJobMatch(lina, dsJobFull).score },
  });
  await prisma.application.create({
    data: { studentId: reem.id, jobId: csJob.id, status: "hired", matchScore: computeJobMatch(reem, csJobFull).score },
  });
  await prisma.application.create({
    data: { studentId: faris.id, jobId: csJob.id, status: "shortlisted", matchScore: computeJobMatch(faris, csJobFull).score },
  });
  await prisma.application.create({
    data: { studentId: khalid.id, jobId: csJob.id, status: "applied", matchScore: computeJobMatch(khalid, csJobFull).score },
  });
  await prisma.application.create({
    data: { studentId: dana.id, jobId: dsJob.id, status: "shortlisted", matchScore: computeJobMatch(dana, dsJobFull).score },
  });

  await prisma.feedback.create({
    data: {
      jobId: seJob.id,
      studentId: sara.id,
      technical: 5,
      communication: 4,
      teamwork: 5,
      problemSolving: 4,
      adaptability: 5,
      overall: 5,
      notes: "Ramped up quickly, strong React fundamentals.",
    },
  });
  await prisma.feedback.create({
    data: {
      jobId: dsJob.id,
      studentId: lina.id,
      technical: 5,
      communication: 4,
      teamwork: 4,
      problemSolving: 5,
      adaptability: 4,
      overall: 5,
      notes: "Excellent modeling skills, minimal onboarding needed.",
    },
  });
  await prisma.feedback.create({
    data: {
      jobId: csJob.id,
      studentId: reem.id,
      technical: 4,
      communication: 3,
      teamwork: 4,
      problemSolving: 4,
      adaptability: 4,
      overall: 4,
      notes: "Solid technical foundation from the SOC internship.",
    },
  });

  // =====================================================================
  // DEMO ENRICHMENT
  // =====================================================================
  // Everything below deepens the EXISTING demo accounts so each intelligence
  // feature has something real to compute over. It is deliberately coherent
  // rather than random: each account demonstrates one intended scenario.
  //
  // This is clearly synthetic prototype data. It is not, and must not be
  // presented as, real Saudi labour-market statistics.
  // =====================================================================

  console.log("Enriching existing demo accounts...");

  const studentByEmail = async (email: string) =>
    prisma.student.findFirstOrThrow({ where: { user: { email } } });

  const omar = await studentByEmail("omar.alrashid@example.com");
  const maha = await studentByEmail("maha.alotaibi@example.com");
  const hana = await studentByEmail("hana.almutairi@example.com");
  const yousef = await studentByEmail("yousef.alshehri@example.com");

  async function setSkill(studentId: string, name: string, level: number) {
    const skillId = skillRecords.get(name);
    if (!skillId) return;
    await prisma.studentSkill.upsert({
      where: { studentId_skillId: { studentId, skillId } },
      update: { level },
      create: { studentId, skillId, level },
    });
  }

  async function setCertification(
    studentId: string,
    name: string,
    verificationStatus: "APPROVED" | "PENDING" | "REJECTED",
    reviewNote?: string,
  ) {
    const certificationId = certRecords.get(name);
    if (!certificationId) return;
    const reviewed = verificationStatus !== "PENDING";
    await prisma.studentCertification.upsert({
      where: { studentId_certificationId: { studentId, certificationId } },
      update: {
        verificationStatus,
        reviewNote: reviewNote ?? null,
        reviewedAt: reviewed ? new Date("2026-07-02") : null,
        reviewedBy: reviewed ? "admin@fursah.demo" : null,
      },
      create: {
        studentId,
        certificationId,
        verificationStatus,
        reviewNote: reviewNote ?? null,
        reviewedAt: reviewed ? new Date("2026-07-02") : null,
        reviewedBy: reviewed ? "admin@fursah.demo" : null,
      },
    });
  }

  // ---------------------------------------------------------------------
  // 1. Human verification of certifications.
  //
  // Seeded certifications previously defaulted to PENDING, which meant no
  // student had a single human-verified credential and the certification
  // component of every readiness score was zero. Most are approved here;
  // two are deliberately left pending so the admin review queue and the
  // "submitted but not yet verified" messaging both have real data.
  // ---------------------------------------------------------------------

  await setCertification(sara.id, "Meta Front-End Developer", "APPROVED", "Certificate verified against issuer record.");
  await setCertification(lina.id, "Google Data Analytics", "APPROVED", "Certificate verified against issuer record.");
  await setCertification(reem.id, "CompTIA Security+", "APPROVED", "Certificate verified against issuer record.");
  await setCertification(faris.id, "CompTIA Security+", "APPROVED", "Certificate verified against issuer record.");
  await setCertification(maha.id, "Google UX Design", "APPROVED", "Certificate verified against issuer record.");
  // Left awaiting human review on purpose.
  await setCertification(dana.id, "Google Data Analytics", "PENDING");

  // Sara additionally holds the certification the Junior Software Engineer
  // role asks for, which is what makes her a genuinely strong candidate.
  await setCertification(sara.id, "AWS Certified Cloud Practitioner", "APPROVED", "Certificate verified against issuer record.");
  await setCertification(abdullah.id, "AWS Certified Cloud Practitioner", "APPROVED", "Certificate verified against issuer record.");

  // ---------------------------------------------------------------------
  // 2. Sara Al-Dosari - the strong, career-ready profile.
  // ---------------------------------------------------------------------

  for (const [name, level] of [["TypeScript", 4], ["Node.js", 3], ["SQL", 3], ["System Design", 3], ["Communication", 4]] as const) {
    await setSkill(sara.id, name, level);
  }
  await prisma.project.create({
    data: {
      studentId: sara.id,
      title: "Fursah Design System",
      description: "Reusable component library adopted by two university project teams.",
      verificationStatus: "APPROVED",
      reviewNote: "Repository and contribution history inspected.",
      reviewedAt: new Date("2026-07-05"),
      reviewedBy: "admin@fursah.demo",
    },
  });
  await prisma.experience.updateMany({
    where: { studentId: sara.id },
    data: { verificationStatus: "APPROVED", reviewNote: "Employer reference confirmed.", reviewedAt: new Date("2026-07-05"), reviewedBy: "admin@fursah.demo" },
  });

  // ---------------------------------------------------------------------
  // 3. Abdullah Al-Ghamdi - developing profile with actionable gaps.
  // ---------------------------------------------------------------------

  for (const [name, level] of [["TypeScript", 1], ["Node.js", 1], ["SQL", 2]] as const) {
    await setSkill(abdullah.id, name, level);
  }

  // ---------------------------------------------------------------------
  // 4. Omar Al-Rashid - declared target vs demonstrated behaviour.
  //
  // Omar's declared target career stays "software-engineer". His evidence and
  // behaviour have moved toward cybersecurity, across several INDEPENDENT
  // signals, which is what the career-direction detector requires before it
  // will suggest an alternative. It only ever suggests; targetCareer is never
  // changed by the system.
  // ---------------------------------------------------------------------

  for (const [name, level] of [
    ["Network Security", 4],
    ["Threat Analysis", 4],
    ["Linux", 4],
    ["Cloud Security", 3],
    ["Python", 3],
    ["Critical Thinking", 4],
    ["Attention to Detail", 4],
  ] as const) {
    await setSkill(omar.id, name, level);
  }
  await setCertification(omar.id, "CompTIA Security+", "APPROVED", "Certificate verified against issuer record.");
  await prisma.experience.create({
    data: {
      studentId: omar.id,
      type: "internship",
      title: "Security Operations Centre Intern",
      org: "Sanad Secure",
      months: 5,
      verificationStatus: "APPROVED",
      reviewNote: "Internship letter verified with the employer.",
      reviewedAt: new Date("2026-07-06"),
      reviewedBy: "admin@fursah.demo",
    },
  });
  await prisma.project.create({
    data: {
      studentId: omar.id,
      title: "Home SOC Lab",
      description: "Self-built detection lab running log collection and alerting rules.",
      verificationStatus: "APPROVED",
      reviewNote: "Project write-up and configuration inspected.",
      reviewedAt: new Date("2026-07-06"),
      reviewedBy: "admin@fursah.demo",
    },
  });
  await prisma.favoriteCareerTrack.create({
    data: { studentId: omar.id, careerTrackId: "cybersecurity-specialist" },
  });
  await prisma.favoriteCompany.create({
    data: { studentId: omar.id, employerId: employers[2].id },
  });

  // ---------------------------------------------------------------------
  // 4b. Cohort placement.
  //
  // Cohort analytics are suppressed below MIN_COHORT (5) students so an
  // aggregate cannot re-identify anyone. The demo students were spread over
  // six institutions, leaving both REGISTERED universities under the floor and
  // every university page stuck on the suppression notice. Concentrating them
  // on the two institutions that actually have accounts exercises the real
  // view; one student is left elsewhere so the suppressed path still exists.
  // ---------------------------------------------------------------------

  const ksuCohort = ["sara.aldosari@example.com", "abdullah.alghamdi@example.com", "lina.alzahrani@example.com", "yousef.alshehri@example.com", "hana.almutairi@example.com"];
  const psuCohort = ["reem.alanazi@example.com", "faris.alqahtani@example.com", "maha.alotaibi@example.com", "omar.alrashid@example.com", "dana.alharbi@example.com"];

  await prisma.student.updateMany({ where: { user: { email: { in: ksuCohort } } }, data: { university: "King Saud University" } });
  await prisma.student.updateMany({ where: { user: { email: { in: psuCohort } } }, data: { university: "Prince Sultan University" } });

  // ---------------------------------------------------------------------
  // 4c. Transferable-skill uplift.
  //
  // Students with verified internships and completed portfolio work also
  // evidence the transferable skills employers screen graduate intakes on.
  // Soft skills are only 15% of readiness, so this does not inflate anyone's
  // technical standing; it does give the graduate-programme role below a real
  // pool to draw from.
  // ---------------------------------------------------------------------

  for (const student of [sara, lina, reem, maha, hana]) {
    await setSkill(student.id, "Problem Solving", 4);
    await setSkill(student.id, "Communication", 4);
    await setSkill(student.id, "Teamwork", 4);
  }

  // ---------------------------------------------------------------------
  // 4d. Prince Sultan University extends its cloud coverage.
  //
  // This is the education-employment loop closing: the scarce skills on the
  // Cloud Security Engineer role below are exactly what this offering teaches.
  // Students have not completed it yet, so the role stays hard to fill while
  // the curriculum gap for THIS institution closes.
  // ---------------------------------------------------------------------

  await createOffering(
    psu.id,
    "Cloud Engineering Foundations",
    "course",
    "Container orchestration, infrastructure-as-code, and cloud platform fundamentals for final-year engineering students.",
    ["Containers", "Infrastructure as Code", "AWS", "Linux"],
  );

  // ---------------------------------------------------------------------
  // 5. Jobs: a healthy pipeline and a genuinely hard-to-fill role.
  // ---------------------------------------------------------------------

  // Broad, realistic entry-level role: several students clear it.
  const frontendJob = await createJob(
    employers[0].id,
    "Frontend Engineer (Graduate)",
    "software-engineer",
    "Join the platform team building accessible, well-tested React interfaces. Graduates welcome; we care about fundamentals and evidence of real work rather than years served.",
    0,
    [
      { name: "JavaScript", weight: 3 },
      { name: "React", weight: 3 },
      { name: "Git", weight: 2 },
      { name: "Communication", weight: 1 },
    ],
    [],
  );

  // Broad graduate intake screened on transferable skills rather than a
  // specific stack. This is the healthy pipeline: many students clear it.
  const gradJob = await createJob(
    employers[0].id,
    "Technology Graduate Programme",
    "software-engineer",
    "A twelve-month rotational graduate programme across engineering, data, and platform teams. We screen on transferable capability and evidence of real work; the specific stack is taught on the job.",
    0,
    [
      { name: "Problem Solving", weight: 3 },
      { name: "Communication", weight: 2 },
      { name: "Teamwork", weight: 2 },
    ],
    [],
  );

  // Deliberately hard to fill: several scarce skills, a certification almost
  // nobody holds, and a high experience floor. This is what drives the
  // "hiring difficulty" and "roles the pool cannot fill" signals.
  const cloudSecJob = await createJob(
    employers[2].id,
    "Cloud Security Engineer",
    "cybersecurity-specialist",
    "Own cloud security posture across our multi-account estate: infrastructure-as-code guardrails, container runtime security, and detection engineering.",
    24,
    [
      { name: "Cloud Security", weight: 3 },
      { name: "Containers", weight: 3 },
      { name: "Infrastructure as Code", weight: 3 },
      { name: "Network Security", weight: 2 },
      { name: "AWS", weight: 2 },
    ],
    ["ISC2 CC"],
  );

  // ---------------------------------------------------------------------
  // 6. Career interests: bookmarks, followed companies and tracks.
  // ---------------------------------------------------------------------

  await prisma.bookmarkedJob.createMany({
    data: [
      { studentId: omar.id, jobId: csJob.id },
      { studentId: omar.id, jobId: cloudSecJob.id },
      { studentId: abdullah.id, jobId: frontendJob.id },
      { studentId: abdullah.id, jobId: seJob.id },
      { studentId: dana.id, jobId: dsJob.id },
      { studentId: yousef.id, jobId: dsJob.id },
      { studentId: khalid.id, jobId: cloudSecJob.id },
      { studentId: maha.id, jobId: frontendJob.id },
    ],
  });

  await prisma.favoriteCompany.createMany({
    data: [
      { studentId: sara.id, employerId: employers[0].id },
      { studentId: abdullah.id, employerId: employers[0].id },
      { studentId: dana.id, employerId: employers[0].id },
      { studentId: reem.id, employerId: employers[2].id },
      { studentId: hana.id, employerId: employers[1].id },
    ],
  });

  await prisma.favoriteCareerTrack.createMany({
    data: [
      { studentId: sara.id, careerTrackId: "software-engineer" },
      { studentId: abdullah.id, careerTrackId: "software-engineer" },
      { studentId: dana.id, careerTrackId: "data-scientist" },
      { studentId: khalid.id, careerTrackId: "cybersecurity-specialist" },
      { studentId: maha.id, careerTrackId: "ux-designer" },
    ],
  });

  // ---------------------------------------------------------------------
  // 7. Applications against the new roles.
  // ---------------------------------------------------------------------

  const frontendJobFull = await prisma.job.findUniqueOrThrow({ where: { id: frontendJob.id }, include: jobInclude });
  const cloudSecJobFull = await prisma.job.findUniqueOrThrow({ where: { id: cloudSecJob.id }, include: jobInclude });

  const omarFull = await prisma.student.findUniqueOrThrow({ where: { id: omar.id }, include: studentInclude });
  const mahaFull = await prisma.student.findUniqueOrThrow({ where: { id: maha.id }, include: studentInclude });
  const abdullahFull = await prisma.student.findUniqueOrThrow({ where: { id: abdullah.id }, include: studentInclude });
  const khalidFull = await prisma.student.findUniqueOrThrow({ where: { id: khalid.id }, include: studentInclude });
  const hanaFull = await prisma.student.findUniqueOrThrow({ where: { id: hana.id }, include: studentInclude });
  const yousefFull = await prisma.student.findUniqueOrThrow({ where: { id: yousef.id }, include: studentInclude });
  const gradJobFull = await prisma.job.findUniqueOrThrow({ where: { id: gradJob.id }, include: jobInclude });

  await prisma.application.createMany({
    data: [
      { studentId: abdullah.id, jobId: frontendJob.id, status: "applied", matchScore: computeJobMatch(abdullahFull, frontendJobFull).score },
      { studentId: maha.id, jobId: frontendJob.id, status: "applied", matchScore: computeJobMatch(mahaFull, frontendJobFull).score },
      // Omar applying to a cybersecurity role while still targeting software
      // engineering is one of the direction signals.
      { studentId: omar.id, jobId: csJob.id, status: "applied", matchScore: computeJobMatch(omarFull, csJobFull).score },
      { studentId: khalid.id, jobId: cloudSecJob.id, status: "applied", matchScore: computeJobMatch(khalidFull, cloudSecJobFull).score },
      { studentId: maha.id, jobId: gradJob.id, status: "applied", matchScore: computeJobMatch(mahaFull, gradJobFull).score },
      { studentId: hana.id, jobId: gradJob.id, status: "shortlisted", matchScore: computeJobMatch(hanaFull, gradJobFull).score },
      { studentId: yousef.id, jobId: gradJob.id, status: "applied", matchScore: computeJobMatch(yousefFull, gradJobFull).score },
    ],
  });

  // ---------------------------------------------------------------------
  // 8. Roadmaps: completion, skips, and explicit dismissals.
  //
  // Omar's dismissals sit on his DECLARED track and his completions on the
  // track his evidence points at. A single unfinished item is never treated
  // as disinterest; the detector needs several independent signals.
  // ---------------------------------------------------------------------

  const now = new Date();

  await prisma.roadmapItem.createMany({
    data: [
      // Omar - declared direction, disengaging.
      { studentId: omar.id, title: "Complete a foundational course in TypeScript", category: "SKILL", careerTrackId: "software-engineer", status: "NOT_STARTED", source: "AI", expectedImpact: 8, recommendationReason: "TypeScript is evidenced at level 0/5 against the Software Engineer requirement.", recommendationScore: 60, generatedAt: now, dismissedAt: now },
      { studentId: omar.id, title: "Strengthen React with an advanced project", category: "SKILL", careerTrackId: "software-engineer", status: "NOT_STARTED", source: "AI", expectedImpact: 7, recommendationReason: "React is evidenced at level 2/5 against the Software Engineer requirement.", recommendationScore: 55, generatedAt: now, dismissedAt: now },
      { studentId: omar.id, title: "Earn the \"AWS Certified Cloud Practitioner\" certification", category: "CERTIFICATION", careerTrackId: "software-engineer", status: "SKIPPED", source: "AI", expectedImpact: 8, recommendationReason: "Recommended for Software Engineer and not yet human-verified.", recommendationScore: 55, generatedAt: now },
      // Omar - demonstrated direction, engaging.
      { studentId: omar.id, title: "Cybersecurity Fundamentals", category: "CERTIFICATION", careerTrackId: "cybersecurity-specialist", status: "COMPLETED", source: "AI", expectedImpact: 9, recommendationReason: "Prince Sultan University offering aligned to CompTIA Security+.", recommendationScore: 70, generatedAt: now },
      { studentId: omar.id, title: "Cloud Security Essentials", category: "CERTIFICATION", careerTrackId: "cybersecurity-specialist", status: "COMPLETED", source: "AI", expectedImpact: 9, recommendationReason: "Prince Sultan University offering covering Cloud Security.", recommendationScore: 68, generatedAt: now },

      // Abdullah - actively working a developing roadmap.
      { studentId: abdullah.id, title: "Complete a foundational course in TypeScript", category: "SKILL", careerTrackId: "software-engineer", status: "IN_PROGRESS", source: "AI", expectedImpact: 8, recommendationReason: "TypeScript is evidenced at level 1/5 against the Software Engineer requirement.", recommendationScore: 62, generatedAt: now },
      { studentId: abdullah.id, title: "Full-Stack Web Development", category: "COURSE", careerTrackId: "software-engineer", status: "IN_PROGRESS", source: "AI", expectedImpact: 10, recommendationReason: "King Saud University offering covering Node.js and TypeScript.", recommendationScore: 66, generatedAt: now },
      { studentId: abdullah.id, title: "Add 2 more project(s) to your portfolio", category: "PORTFOLIO", careerTrackId: "software-engineer", status: "NOT_STARTED", source: "AI", expectedImpact: 5, recommendationReason: "1 project documented of 3 used by the portfolio component.", recommendationScore: 35, generatedAt: now },
      { studentId: abdullah.id, title: "Strengthen SQL with an applied project", category: "SKILL", careerTrackId: "software-engineer", status: "COMPLETED", source: "AI", expectedImpact: 6, recommendationReason: "SQL was evidenced below the Software Engineer expected level.", recommendationScore: 48, generatedAt: now },

      // Sara - mostly complete.
      { studentId: sara.id, title: "Strengthen System Design with an advanced course", category: "SKILL", careerTrackId: "software-engineer", status: "COMPLETED", source: "AI", expectedImpact: 6, recommendationReason: "System Design was evidenced below the expected level for this track.", recommendationScore: 45, generatedAt: now },
      { studentId: sara.id, title: "Complete an internship or research role", category: "EXPERIENCE", careerTrackId: "software-engineer", status: "COMPLETED", source: "AI", expectedImpact: 10, recommendationReason: "Software Engineer recommends 6 months of experience.", recommendationScore: 50, generatedAt: now },

      // Dana - struggling, which produces an alternative route.
      { studentId: dana.id, title: "Applied Machine Learning", category: "COURSE", careerTrackId: "data-scientist", status: "STRUGGLING", source: "AI", expectedImpact: 9, recommendationReason: "King Saud University offering covering Machine Learning.", recommendationScore: 64, generatedAt: now, studentNote: "Finding the maths harder than expected." },
      { studentId: dana.id, title: "Strengthen Pandas with an applied project", category: "SKILL", careerTrackId: "data-scientist", status: "IN_PROGRESS", source: "AI", expectedImpact: 6, recommendationReason: "Pandas is evidenced at level 2/5 against the Data Scientist requirement.", recommendationScore: 46, generatedAt: now },
    ],
  });

  // ---------------------------------------------------------------------
  // 9. Employer feedback across checkpoints (the outcome loop).
  // ---------------------------------------------------------------------

  await prisma.feedback.createMany({
    data: [
      { jobId: seJob.id, studentId: sara.id, checkpointDays: 30, technical: 4, communication: 4, teamwork: 4, problemSolving: 4, adaptability: 4, overall: 4, notes: "Strong start; onboarding completed ahead of schedule." },
      { jobId: seJob.id, studentId: sara.id, checkpointDays: 180, technical: 5, communication: 5, teamwork: 5, problemSolving: 5, adaptability: 5, overall: 5, notes: "Now mentoring the next intake." },
      { jobId: dsJob.id, studentId: lina.id, checkpointDays: 30, technical: 4, communication: 3, teamwork: 4, problemSolving: 4, adaptability: 4, overall: 4, notes: "Model quality good; stakeholder communication still developing." },
      { jobId: csJob.id, studentId: reem.id, checkpointDays: 180, technical: 4, communication: 4, teamwork: 4, problemSolving: 4, adaptability: 4, overall: 4, notes: "Communication improved markedly since the 90-day review." },
    ],
  });

  // ---------------------------------------------------------------------
  // 10. Curriculum actions across the full workflow, including one that
  //     has been through human verification.
  // ---------------------------------------------------------------------

  await prisma.curriculumAction.createMany({
    data: [
      { universityId: ksu.id, title: "Introduce Cloud Security into the CS curriculum", skill: "Cloud Security · CS402", owner: "Dr. Amal Al-Saud", status: "PROPOSED", dueDate: new Date("2027-02-01"), outcomeNote: "Cloud Security appears in open employer roles but is not mapped to any King Saud University offering." },
      { universityId: ksu.id, title: "Container and IaC lab module", skill: "Containers · SWE310", owner: "Dr. Amal Al-Saud", status: "PLANNED", dueDate: new Date("2027-04-01"), outcomeNote: "Containers and Infrastructure as Code are requested by open roles with no current coverage." },
      { universityId: psu.id, title: "Expand the Cloud Security Essentials cohort", skill: "Cloud Security", owner: "Dr. Khalid Al-Fayez", status: "COMPLETED", dueDate: new Date("2026-06-01"), outcomeNote: "AI initial check passed and an administrator verified the evidence.\n\nSubmitted evidence:\nApproved syllabus revision, faculty board minutes of 12 May 2026, and the delivered assessment plan for the expanded cohort." },
      { universityId: psu.id, title: "Detection engineering capstone", skill: "Threat Analysis · SEC450", owner: "Dr. Khalid Al-Fayez", status: "AWAITING_HUMAN_REVIEW", dueDate: new Date("2026-11-01"), outcomeNote: "AI initial check passed: the submission contains sufficient detail and an implementation/evidence reference. Human verification is required.\n\nSubmitted evidence:\nCapstone brief delivered to the first cohort, with the assessment rubric and the industry mentor agreement attached." },
    ],
  });

  // ---------------------------------------------------------------------
  // 11. Governance, consent, and model-assurance demo records.
  // ---------------------------------------------------------------------

  const adminUser = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const saraUser = await prisma.user.findFirstOrThrow({ where: { email: "sara.aldosari@example.com" } });
  const omarUser = await prisma.user.findFirstOrThrow({ where: { email: "omar.alrashid@example.com" } });

  await prisma.consentRecord.createMany({
    data: [
      { studentId: sara.id, purpose: "EMPLOYER_MATCHING", granted: true },
      { studentId: sara.id, purpose: "UNIVERSITY_ANALYTICS", granted: true },
      { studentId: omar.id, purpose: "EMPLOYER_MATCHING", granted: true },
      { studentId: omar.id, purpose: "UNIVERSITY_ANALYTICS", granted: false },
      { studentId: dana.id, purpose: "EMPLOYER_MATCHING", granted: true },
    ],
  });

  await prisma.governanceScenario.createMany({
    data: [
      {
        title: "Auto-reject every candidate below a 70% match",
        scenarioType: "AUTOMATED_HIRING",
        description: "Proposal to close applications automatically when the computed match score falls below 70%.",
        riskLevel: "HIGH",
        detectedIssues: JSON.stringify([
          "Automated rejection without human review",
          "No appeal route offered to the candidate",
          "Match score is decision support, not a hiring decision",
        ]),
        proposedAction: "Blocked. Ranking may order a queue; a person must make and record every rejection.",
        humanDecision: "APPROVED",
        decisionNote: "Control upheld. Automated rejection remains disabled platform-wide.",
        createdBy: "admin@fursah.demo",
        reviewedAt: new Date("2026-07-10"),
      },
      {
        title: "Share cohort readiness with a partner employer",
        scenarioType: "DATA_SHARING",
        description: "Employer requested per-student readiness scores for one university cohort.",
        riskLevel: "MEDIUM",
        detectedIssues: JSON.stringify([
          "Request targets individual-level records",
          "Aggregate reporting already satisfies the stated purpose",
        ]),
        proposedAction: "Provide suppressed aggregates only; individual records stay in the student's own account.",
        humanDecision: "PENDING",
        createdBy: "admin@fursah.demo",
      },
    ],
  });

  await prisma.monitoringSnapshot.createMany({
    data: [
      { modelVersion: "fursah-readiness-v2", sampleSize: 11, averageScore: 54.2, outcomeRate: 0.36, scoreDrift: 0, outcomeDrift: 0, status: "INSUFFICIENT_DATA", notes: "Below the 20-outcome floor: reported for inspection only, and must not justify a model or policy change.", createdAt: new Date("2026-07-01") },
      { modelVersion: "fursah-readiness-v2", sampleSize: 14, averageScore: 56.8, outcomeRate: 0.39, scoreDrift: 2.6, outcomeDrift: 0.03, status: "INSUFFICIENT_DATA", notes: "Sample still below the reporting floor.", createdAt: new Date("2026-08-01") },
    ],
  });

  await prisma.appeal.create({
    data: {
      studentId: dana.id,
      subjectType: "READINESS",
      reason: "My Google Data Analytics certificate is still showing as pending, so my readiness score does not reflect it.",
      status: "OPEN",
    },
  });

  await prisma.dataRequest.create({
    data: {
      studentId: omar.id,
      type: "ACCESS",
      details: "Requesting a copy of the interest signals used to suggest a different career direction.",
      status: "OPEN",
    },
  });

  await prisma.notification.createMany({
    data: [
      { userId: omarUser.id, type: "CAREER_DIRECTION", title: "A different career direction may fit your recent activity", body: "Your evidence and activity align more closely with Cybersecurity Specialist than your current target. Fursah has not changed your target career." },
      { userId: saraUser.id, type: "FEEDBACK", title: "New employer feedback received", body: "Nexariya Technologies submitted your 180-day checkpoint review." },
    ],
  });

  await prisma.auditEvent.createMany({
    data: [
      { actorUserId: adminUser.id, action: "CERTIFICATION_APPROVED", entityType: "StudentCertification", entityId: sara.id, modelVersion: "fursah-readiness-v2", explanation: "Certificate verified against the issuer record by a human reviewer." },
      { actorUserId: adminUser.id, action: "EVIDENCE_REVIEWED", entityType: "EvidenceDocument", entityId: omar.id, explanation: "Internship letter verified with the employer. AI extraction was advisory only." },
      { actorUserId: omarUser.id, action: "ROADMAP_DISMISSED", entityType: "ROADMAP_ITEM", entityId: omar.id, explanation: "Student dismissed a Software Engineer recommendation." },
      { actorUserId: adminUser.id, action: "GOVERNANCE_DECISION", entityType: "GovernanceScenario", entityId: "automated-hiring", modelVersion: "employer-intelligence-v2", explanation: "Automated rejection blocked; human decision required for every outcome." },
    ],
  });

  const counts = {
    careerTracks: await prisma.careerTrack.count(),
    users: await prisma.user.count(),
    students: await prisma.student.count(),
    employers: await prisma.employer.count(),
    universities: await prisma.university.count(),
    skills: await prisma.skill.count(),
    certifications: await prisma.certification.count(),
    offerings: await prisma.offering.count(),
    jobs: await prisma.job.count(),
    applications: await prisma.application.count(),
    bookmarks: await prisma.bookmarkedJob.count(),
    favoriteCompanies: await prisma.favoriteCompany.count(),
    favoriteCareerTracks: await prisma.favoriteCareerTrack.count(),
    roadmapItems: await prisma.roadmapItem.count(),
    studentCertifications: await prisma.studentCertification.count(),
    verifiedCertifications: await prisma.studentCertification.count({ where: { verificationStatus: "APPROVED" } }),
    experiences: await prisma.experience.count(),
    projects: await prisma.project.count(),
    feedback: await prisma.feedback.count(),
    curriculumActions: await prisma.curriculumAction.count(),
    governanceScenarios: await prisma.governanceScenario.count(),
    monitoringSnapshots: await prisma.monitoringSnapshot.count(),
    auditEvents: await prisma.auditEvent.count(),
    consentRecords: await prisma.consentRecord.count(),
    notifications: await prisma.notification.count(),
    appeals: await prisma.appeal.count(),
    dataRequests: await prisma.dataRequest.count(),
  };

  console.log("Seed complete:");
  for (const [key, value] of Object.entries(counts)) {
    console.log(`  ${key}: ${value}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
