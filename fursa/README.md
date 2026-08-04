# Fursa prototype

A functional local prototype of the AI-Powered Workforce Readiness Ecosystem. It includes student career-readiness scoring, adaptive next actions, a skills passport, explainable opportunity matching, employer job creation/candidate ranking, and a dedicated university account with aggregate workforce and curriculum-alignment intelligence.

## Getting Started

Install, seed, and run locally:

```bash
npm install
npx prisma generate
npx tsx prisma/seed.ts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), choose **Explore the prototype**, then select a seeded student or employer profile.

## Database direction

The local demo currently uses the bundled SQLite database so it works offline with no credentials. Firebase/Firestore is the intended hosted database. Data access is kept on the server and isolated in `src/lib`/server actions so the persistence layer can be migrated when Firebase project credentials and collections are defined.

## Firebase account setup

The project includes Firebase Authentication, Firestore user profiles, secure Admin SDK session cookies, and owner-only Firestore rules. Copy `.env.example` to `.env.local`, add the public web configuration, then add `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` from a Firebase service-account JSON. Enable Email/Password authentication and create a Firestore database in the Firebase console. Deploy the included rules with `firebase deploy --only firestore` after signing in with the Firebase CLI.

Certificate claims require a JPG, PNG, or WebP evidence image (maximum 5 MB). Evidence is stored privately in Firebase Storage, starts as `PENDING`, and affects readiness/matching only after an `ADMIN` approves it. After configuring the Admin SDK, set `ADMIN_NAME`, `ADMIN_EMAIL`, and a strong `ADMIN_PASSWORD` in `.env.local`, then run `npm run create-admin`. Deploy both rulesets with `firebase deploy --only firestore,storage`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
