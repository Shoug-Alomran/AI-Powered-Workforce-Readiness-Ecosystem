/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { CAREER_TRACKS, allSkillNames, allCertificationNames } from "../src/lib/careerTracks";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding Fursa demo data...");

  // --- Wipe existing data (dev convenience) ---
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
      data: { userId: user.id, company: e.company, industry: e.industry },
    });
    employers.push(employer);
  }

  const universityUser = await prisma.user.create({
    data: { role: "UNIVERSITY", name: "Dr. Amal Al-Saud", email: "workforce@ksu.edu.sa" },
  });
  await prisma.university.create({
    data: { userId: universityUser.id, institution: "King Saud University", region: "Riyadh" },
  });

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
  const sara = await prisma.student.findFirstOrThrow({ where: { user: { email: "sara.aldosari@example.com" } } });
  const abdullah = await prisma.student.findFirstOrThrow({ where: { user: { email: "abdullah.alghamdi@example.com" } } });
  const lina = await prisma.student.findFirstOrThrow({ where: { user: { email: "lina.alzahrani@example.com" } } });
  const reem = await prisma.student.findFirstOrThrow({ where: { user: { email: "reem.alanazi@example.com" } } });

  await prisma.application.create({
    data: { studentId: sara.id, jobId: seJob.id, status: "hired", matchScore: 88 },
  });
  await prisma.application.create({
    data: { studentId: abdullah.id, jobId: seJob.id, status: "shortlisted", matchScore: 61 },
  });
  await prisma.application.create({
    data: { studentId: lina.id, jobId: dsJob.id, status: "hired", matchScore: 91 },
  });
  await prisma.application.create({
    data: { studentId: reem.id, jobId: csJob.id, status: "hired", matchScore: 85 },
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

  console.log("Seed complete:");
  console.log(`  Career tracks: ${CAREER_TRACKS.length}`);
  console.log(`  Employers: ${employers.length}`);
  console.log(`  Students: ${studentSeeds.length}`);
  console.log(`  Jobs: 4`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
