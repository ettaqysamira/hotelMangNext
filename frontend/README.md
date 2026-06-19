This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Quick Setup

After cloning the repo, use this checklist:

1. Install MySQL and make sure it is running locally.
2. In `backend`, create `.env` from `.env.example` and keep `DATABASE_URL` pointing to your MySQL instance.
3. Install dependencies in both apps:

```bash
cd backend && npm install
cd ../frontend && npm install
```

4. Sync the database from `backend`:

```bash
npm run prisma:push
```

5. Start the backend and frontend in two terminals:

```bash
cd backend && npm start
cd frontend && npm run dev
```

6. Open the app at `http://localhost:3000`.

Optional:
- If you want seeded sample data, run the backend seed script after the database is ready.
- If you want the AI/chatbot features, set `HUGGING_FACE_API_KEY` in `backend/.env`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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
