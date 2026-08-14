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

  console.log("Seed complete:");
  console.log(`  Career tracks: ${CAREER_TRACKS.length}`);
  console.log(`  Employers: ${employers.length}`);
  console.log(`  Universities: 2 (King Saud University, Prince Sultan University)`);
  console.log(`  Offerings: 9`);
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
