# Labracadabra

**Your Lab Wishes, Granted.**

Labracadabra helps students discover campus equipment, turn project ideas into resource plans, and request time across departments. Faculty coordinate access through an approval queue and FairShare proposals. Lab administrators manage downtime and review demand and utilization.

## Run the local demo

Install Node.js 20.9 or newer and run these commands from the repository root.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Development mode starts with 15 catalog entries across four departments when both Supabase variables are empty. Select a persona in the demo header. The local demo has shared records and a role switcher for demonstrations. Use it on a trusted local machine.

Demo writes persist in the ignored `.labracadabra-demo/workspace.json` file. To start a fresh demonstration, stop the current server and point the next run at a new file.

```powershell
$env:LABRACADABRA_DEMO_FILE = Join-Path $env:TEMP "labracadabra-$([guid]::NewGuid()).json"
npm run dev
```

### Walkthrough

1. **Discover.** Use Alex Rivera. Search for “Raspberry Pi” to see kits in Electrical Engineering and Mechatronics. Open a kit and inspect its specifications, access rules, next slots, and compatible alternatives.
2. **Plan.** On the dashboard, select **Autonomous delivery robot** and click **Build resource plan**. Open a recommendation and view actual booking options. Results are labeled **Catalog rules** when Gemini is unavailable.
3. **Book.** In **Project Workspace**, create a project with a deadline at least a week away, then open a Raspberry Pi and request an available slot. Start with no capability restrictions or select GPIO. See the confirmation in **My Bookings** and open its QR.
4. **Resolve a conflict.** Switch to **Dr. Nila Rao** in Computer Science and open **FairShare**. Two seeded requests share a GPU unit and time. Inspect the point breakdown and the compatible GPU in Mechatronics.
5. **Review and hand off.** In **Faculty Approval**, approve the higher-ranked request. On the remaining request, choose the Computer Vision Workstation at the original time, provide a note, and suggest the alternative. Switch to **Maya Shah**, open **My Bookings → History**, and follow the faculty suggestion to request the alternative. Switch to **Dr. Sam Patel** in Mechatronics to review the new request.
6. **Measure.** Switch to **Jamie Chen** and open **Resource Analytics**. Select **Next 7 days** to see the new confirmations in utilization and pending-review figures. Select **Last 30 days** for historical activity and the demand baseline.
7. **Record a visit.** Beginning 15 minutes before a confirmed session, a student can show the booking QR to authorized staff. Staff open **Lab check-in**, scan the QR or paste the token, then record check-in and check-out. The dashboard exposes the workflow through demo personas.

## Institutional setup

1. Create an isolated Supabase development project. Apply `supabase/migrations/001_campus.sql` and `supabase/migrations/002_workspace.sql` in order using your migration workflow or SQL Editor. The migration enables `btree_gist` for reservation interval exclusion. [Supabase migration guide](https://supabase.com/docs/guides/deployment/database-migrations)
2. Use `supabase/seed.sql` for sample inventory in a development database. For institutional inventory, create departments, laboratories, equipment and physical units from campus records.
3. Provision users through Supabase Auth. Create one `public.profiles` row per user with the Auth user ID, name, email, department, and one of `student`, `faculty`, `lab_admin`, or `super_admin`. Set roles and department scope using an authorized database admin. Team members can be added using their profile IDs. Training records are provisioned in `training_certifications`.
4. Copy `.env.example` to `.env.local`. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the same project. Continue with the email/password sign-in at `/login`. The server exchanges the password and refreshes sessions using Supabase Auth. [Supabase Auth endpoint reference](https://supabase.com/docs/reference/self-hosting-auth)
5. Optionally set `GEMINI_API_KEY` and an available `GEMINI_MODEL`. Copilot sends the supplied project text to Gemini for capability extraction or request summarization. Structured output is schema-validated and catalog matches are assembled locally. [Gemini structured output guide](https://ai.google.dev/gemini-api/docs/structured-output)

### Architecture

| Location | Responsibility |
| --- | --- |
| `src/app`, `src/components` | App Router views, responsive navigation, and role-scoped workflows |
| `src/app/api/campus` | Same-origin session, project, booking, approval, notification, lab administration, and QR requests |
| `src/app/api/copilot` | Authorized structured Gemini requests and deterministic fallbacks |
| `src/lib/campus` | Typed data contracts, slot validation, FairShare, discovery, analytics, and storage adapters |
| `supabase/migrations` | Normalized tables, RLS, restricted RPCs and database constraints |

Browser requests use HttpOnly same-site cookies. The Supabase database derives roles from the authenticated user's profile. RLS is enabled on the tables, direct access by anonymous and authenticated REST roles is revoked, and authenticated clients can call the scoped snapshot and mutation RPCs. The application uses the campus publishable key. Partial configuration or missing Supabase settings in a production build leaves the workspace unavailable.

Dates display in campus time (Asia/Kolkata). Booking timestamps are stored as UTC instants and compared as half-open intervals. Booking form drafts stay local. Open resources confirm in one transaction. Faculty-required requests begin pending and move to confirmed in a transaction that also records the approval. The same operation validates eligibility and checks the unit again. Confirmed sessions appear completed when their end time passes. A student can cancel a future eligible request. A waitlisted request can be retried when capacity becomes available. A faculty proposal invites the student to submit a new request for that unit and time.

### FairShare

| Factor | Points |
| --- | --- |
| Deadline | Up to 50 points, increasing linearly as the deadline approaches within 14 days |
| Waiting | Up to 30 points, increasing over the first seven days |
| Prior use | Up to 20 points, decreasing to zero at 12 recent hours on the requested equipment |

Ties use the earlier submission time and then the immutable request ID. The search considers 30-minute increments across 15 candidate dates, starting up to three days before the requested slot. Candidates must preserve the requested duration, pass eligibility, stay within lab opening hours and the project deadline, and avoid maintenance and confirmed reservations. For a multi-resource project, each booking must cover a relevant project capability. A substitute retains all capabilities the original resource covers for that project. FairShare ranks candidates by minutes away from the requested time, with cost penalties for switching equipment and faculty review. Higher-priority requests choose first from the available candidates. To reserve a proposed slot, the student submits a booking and obtains approval where required. PostgreSQL serializes writes on the unit and enforces non-overlap independently with a GiST constraint.

### Deployment checklist

- Use the Next.js framework preset and a supported Node runtime. Set the Supabase variables and optional Gemini variables in the appropriate Vercel environment. Use independent databases and credentials for preview and production. [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- Apply migrations, provision a student, scoped faculty and admin, and verify project creation, session renewal, approval, cancellation, and role isolation over HTTPS.
- Use the campus publishable key only. Keep Gemini credentials server-side. Confirm that application logs and test fixtures contain no institutional credentials or pass tokens.
- Verify the maintenance guard, physical unit overlap constraint, and role-restricted QR check-in on the target infrastructure. Test the fallback with the Gemini key unset.
- The local Copilot quota allows ten model calls per user per minute per process. Set a project-level Gemini quota or a shared request limiter before handling substantial multi-instance traffic.
- Verify targeted backups, authorized profile provisioning, and operational monitoring before the first institutional rollout.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Run the smoke test against a fresh local demo. It creates test projects and bookings, tests two simultaneous competing approvals, and verifies administrator-visible records.

```bash
node tests/smoke.mjs http://localhost:3000
```

The Chromium test uses a temporary browser profile and a loopback DevTools port. After the smoke test, start Chromium with `--headless=new --remote-debugging-port=9229 --user-data-dir=<temporary-profile>`, then run `node --experimental-websocket tests/browser.mjs http://localhost:3000 http://127.0.0.1:9229`. An optional third argument is a directory for desktop and mobile screenshots.

The database test applies the actual migrations and seed to a temporary PostgreSQL WASM database using test-only Auth fixtures. Install PGlite 0.5.17 into a temporary directory, then pass that directory to the test.

```bash
npm install --prefix <temporary-directory> --no-audit --no-fund @electric-sql/pglite@0.5.17
node tests/postgres.mjs <temporary-directory>
```

See [implementation status](IMPLEMENTATION_STATUS.md) for verified behavior and outstanding institutional checks.
