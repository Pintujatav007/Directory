# DevDirectory

DevDirectory is a developer community platform with a warm white and brown visual system, inspired by the supplied screenshot. The project source and configuration files are kept together in this folder.

## Project guide

See [docs/DevDirectory-Project-Guide-Updated.pdf](docs/DevDirectory-Project-Guide-Updated.pdf) for the product flow, architecture diagram, and interface previews.

## Stack and files

- React, TypeScript, Vite, React Router, Zod, and Lucide icons.
- Supabase Auth, Postgres, RLS, and private Storage for shared user data.
- `App.tsx`, `Features.tsx`, `Workspace.tsx`, `data.ts`, `search.ts`, `types.ts`, and the CSS files contain the frontend.
- `database-schema.sql` creates application tables, RLS policies, the private resumes bucket, the per-user AI request limit, and the private workspace tables. Run the full script in the Supabase SQL editor after schema changes.
- `developer-assistant-function.ts` is the Supabase Edge Function source; `supabase-config.toml` enables JWT verification. `deploy-ai-function.ps1` stages these flat files temporarily and deploys the function with the Supabase CLI.
- Without Supabase, local demo mode stores job posts, profiles, repositories, connection requests, and workspace projects/tasks/goals in the current browser. Secure resume storage, live AI, and admin tools require a connected backend.

## Supabase setup

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`. These browser variables are public; never put a service-role key or OpenAI key in a `VITE_*` variable.
3. Run `database-schema.sql` in the Supabase SQL editor. It creates the profile-on-signup trigger, jobs, admin membership, rate limiting, and private resume policies.
4. Enable email/password authentication and add local/production URLs to Supabase Auth's URL configuration.
5. After that user has signed up and confirmed their email, promote the first administrator by replacing the email below in the Supabase SQL editor:

   ```sql
   insert into public.admin_users(user_id)
   select id from auth.users where email = 'admin@example.com'
   on conflict (user_id) do nothing;
   ```

6. Set the AI provider key as an Edge Function secret (never in frontend env):

   ```sh
   supabase secrets set OPENAI_API_KEY=your_key_here OPENAI_MODEL=gpt-4.1-mini --project-ref YOUR_PROJECT_REF
   ```

   From PowerShell, deploy the function from this flat project folder with `./deploy-ai-function.ps1 -ProjectRef YOUR_PROJECT_REF`. Sign in to the Supabase CLI first with `supabase login`. The script builds the expected Supabase folder layout in a temporary directory and removes it after deployment. The function requires an authenticated user, validates input size, limits each account to 12 requests per minute, and does not store chat conversations with the model provider.

## Local development

```sh
npm install
npm run dev
```

Useful commands:

- `npm run build` — TypeScript check and optimized production build.
- `npm test` — search and filtering unit tests.
- `npm run preview` — preview the production build.

## Features

- **Interview MCQ practice:** 30 original job-prep questions across DSA, React, Java, JavaScript, HTML, and CSS. Answers show explanations, topic scores, and browser-saved personal bests.
- **Memory assistant:** ask the developer support agent, save project notes with tags, and find related notes from your local browser storage.
- **Posts & links:** draft social updates and save GitHub and LinkedIn profile links in the browser.
- **Workspace:** create, edit, and track projects, set project status, add and complete tasks, track DSA/learning/skill goals, log progress, and read activity updates. Demo data stays in this browser; connected mode uses private Supabase tables with per-user RLS. Apply `database-schema.sql` to enable the shared backend tables.
- **Developers:** public profile discovery and search; profile and project create/edit/delete; connection requests with pending/accepted/declined states.
- **GitHub:** load public profile details and recent non-fork repositories, select repositories, and add them to the portfolio. Public GitHub API limits apply.
- **Resume:** upload or replace a PDF up to 8 MB. The private Storage bucket is scoped to the owner; downloads use short-lived signed URLs. Resumes never appear on public profile pages.
- **Jobs:** search open jobs, post a job, remove your own post, and send a connection request to the poster.
- **AI agent:** in demo mode, responds with local troubleshooting guidance. Generated AI answers require a signed-in Supabase account, a deployed Edge Function, and a server-side OpenAI key.
- **Admin:** local demo accounts can moderate profiles and jobs saved in the current browser. In connected mode, only accounts listed in `admin_users` can inspect or remove shared profiles and job posts. Add administrator IDs only through trusted Supabase administration.

## Deploy

Build the frontend and deploy `dist/` to Vercel or another static host. Add the two `VITE_SUPABASE_*` values to the frontend build environment. Apply the SQL schema to the production Supabase project, set the Edge Function secrets, and deploy `developer-assistant`. Keep the Supabase service-role key out of the frontend. Review the policies and starter privacy/terms text before opening the service to real users.

## Known boundaries

The seeded developer cards and their stats are demo content. GitHub import uses public data only; OAuth access to private repositories is not included. The local demo helper gives rule-based guidance, not generated AI answers. The live AI agent answers from supplied chat context and cannot execute code or access a developer's repository. Local demo admin changes only affect data in the current browser. Live Supabase and OpenAI behavior needs project credentials and has not been exercised in this workspace.
