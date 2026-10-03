# UTSANOVA Blog Management & Scheduled Publishing Platform

> An enterprise-grade, responsive, full-stack Blog Management Platform featuring a public editorial reading portal, an administrative dashboard, rich Markdown rendering with GitHub Flavored Markdown (GFM), Groq AI drafting assistant, and an **Automated Serverless Scheduled Blog-Post Publishing System** built with **Vercel Cron** and **MongoDB Atomic Claim Protection**.

Developed for **UTSANOVA TECHNOLOGIES PVT. LTD.**  
Website: [www.about.utsanova.com](https://about.utsanova.com) | Email: [hr@utsanova.com](mailto:hr@utsanova.com)

---

## 📑 Table of Contents
- [Architecture & System Overview](#-architecture--system-overview)
- [Scheduled Publishing System Architecture](#-scheduled-publishing-system-architecture)
- [Why Vercel Cron Instead of `node-cron`?](#-why-vercel-cron-instead-of-node-cron)
- [Atomic Claim & Duplicate Publishing Protection](#-atomic-claim--duplicate-publishing-protection)
- [Timezone Handling & Accuracy](#-timezone-handling--accuracy)
- [Database Schema & Indexing](#-database-schema--indexing)
- [Complete API Documentation](#-complete-api-documentation)
  - [Scheduling & Cron APIs](#scheduling--cron-apis)
  - [Blog Management APIs](#blog-management-apis)
  - [Authentication APIs](#authentication-apis)
- [Frontend User Guide](#-frontend-user-guide)
- [Vercel Deployment Guide (Step-by-Step)](#-vercel-deployment-guide-step-by-step)
- [Docker Single-Container Deployment](#-docker-single-container-deployment)
- [Local Development Setup](#-local-development-setup)
- [Environment Variables Guide](#-environment-variables-guide)
- [Automated Testing Strategy & Test Suite](#-automated-testing-strategy--test-suite)
- [Troubleshooting & Gotchas](#-troubleshooting--gotchas)

---

## 🌟 Architecture & System Overview

The application unifies a **React + Vite** Single Page Application (SPA) frontend with a **Node.js / Express** backend, backed by **MongoDB Atlas** as the single source of truth.

```mermaid
graph TD
    subgraph ClientLayer [Client & Authoring Layer]
        Reader([Public Reader]) -->|View Articles / Search| Frontend[React 19 + Tailwind UI]
        Admin([Editorial Admin]) -->|Draft, Schedule, Publish| Frontend
    end

    subgraph APILayer [Express 5 API / Vercel Serverless]
        Frontend -->|REST Requests + JWT| ExpressServer[Express API Runner]
        ExpressServer --> AuthMW[JWT Auth Middleware]
        ExpressServer --> BlogRoutes[Blog & Schedule Routes]
        ExpressServer --> AIRoutes[Groq Cloud LLM Generator]
    end

    subgraph CronLayer [Vercel Cloud Scheduler]
        VercelCron[Vercel Cron Runner: Every Minute] -->|Bearer CRON_SECRET| CronEndpoint[/api/cron/publish-scheduled-posts]
        CronEndpoint --> CronMW[Cron Authorization Guard]
        CronMW --> SchedulerService[Scheduler Service: Atomic Claim Engine]
    end

    subgraph StorageLayer [Database Layer]
        BlogRoutes --> Atlas[(MongoDB Atlas Cloud Cluster)]
        SchedulerService -->|Atomic findOneAndUpdate| Atlas
    end
```

---

## ⏰ Scheduled Publishing System Architecture

The blog scheduling architecture guarantees that future posts are automatically published when their scheduled time arrives, with zero dependency on permanently running background daemon processes.

### Workflow Lifecycle:

```
[ User selects future date/time ]
             ↓
[ Frontend converts local time to UTC ISO 8601 ]
             ↓
[ POST /api/blogs/:id/schedule ]
             ↓
[ Validation: Must be in future (> now) ]
             ↓
[ MongoDB: status = "Scheduled", scheduledAt = UTC Date ]
             ↓
[ Automated Ticker / Vercel Cron fires automatically ]
             ↓
[ Atomic Claim: status transitions "Scheduled" → "Processing" ]
             ↓
[ Publishing Step: Set status = "Published", publishedAt = now ]
             ↓
[ Post immediately appears in public reader feed with ZERO human intervention ]
```

---

## 👑 Role-Based Access Control: SuperAdmin vs. Admin

The system enforces a strict two-tier authorization model:

| Capability | 👑 SuperAdmin | 🛡️ Regular Admin | Public Reader |
| :--- | :---: | :---: | :---: |
| **View Live Published Articles** | ✅ | ✅ | ✅ |
| **Create, Edit & Delete Blog Posts** | ✅ | ✅ | ❌ |
| **Schedule Future Blog Posts** | ✅ | ✅ | ❌ |
| **Cancel Scheduled Releases** | ✅ | ✅ | ❌ |
| **Use AI Blog Generator (Groq)** | ✅ | ✅ | ❌ |
| **Create New Administrator Accounts** | ✅ *(Exclusive)* | ❌ *(Forbidden)* | ❌ |
| **View & Delete Team Admin Accounts** | ✅ *(Exclusive)* | ❌ *(Forbidden)* | ❌ |

### Default Credentials (Seeded):
- **👑 SuperAdmin**:
  - **Email**: `superadmin@utsanova.com`
  - **Password**: `superadmin@1234`
  - *Has exclusive rights to manage the admin team via the "Manage Admins" dashboard modal.*
- **🛡️ Regular Admin**:
  - **Email**: `admin@utsanova.com`
  - **Password**: `admin@1234`
  - *Has full editorial rights to create, draft, schedule, and publish articles.*

---

## ⚡ Zero Human Intervention: Automated Publishing Workflow

Once a post is scheduled, **no human clicking or manual triggers are required**:

1. **In Vercel Production**: Vercel Cron automatically triggers `/api/cron/publish-scheduled-posts` every minute via cloud cron.
2. **In Local Development & Docker**: A lightweight internal ticker in `server.js` checks for due posts every 30 seconds.
3. The moment a post's `scheduledAt` timestamp is reached, the atomic engine claims the post and updates its status to **Published**.
4. The dashboard automatically detects and reflects newly published posts via periodic silent polling.


---

## 🚫 Why Vercel Cron Instead of `node-cron`?

A common pitfall in serverless hosting platforms like Vercel is using `node-cron` or `setInterval()`.

| Feature | `node-cron` (In-Memory) | Vercel Cron + Atomic MongoDB |
| :--- | :--- | :--- |
| **Serverless Compatibility** | ❌ **Fails completely**. Serverless lambdas freeze or terminate after fulfilling an HTTP request. In-memory timers pause and never fire. | ✅ **Native cloud execution**. Vercel triggers the HTTP endpoint reliably from the cloud. |
| **Multi-Instance / Cluster Safety** | ❌ If two instances run, both fire duplicate timers causing double publishing. | ✅ Protected by atomic database claim (`findOneAndUpdate`). |
| **Cold Starts & Restarts** | ❌ All scheduled memory state is lost on container restart. | ✅ MongoDB persists all state; zero data loss. |
| **Monitoring & Logs** | ❌ Opaque server memory logs. | ✅ Full execution summary with duration, claimed count, and audit trails. |

---

## 🛡️ Atomic Claim & Duplicate Publishing Protection

In serverless architectures, cron triggers can occasionally retry, or multiple serverless execution environments may overlap. If two executions process the same scheduled post simultaneously, a race condition could publish the article twice.

### The Solution: MongoDB Atomic State Claiming

We implement a three-state transition:

$$\text{Scheduled} \xrightarrow[\text{Atomic Claim}]{\text{Worker A}} \text{Processing} \xrightarrow[\text{Publish Success}]{\text{Worker A}} \text{Published}$$

1. **Atomic Claim Operation**:
   Instead of querying with `find()` and then updating, the scheduler uses `findOneAndUpdate`:
   ```javascript
   const post = await Blog.findOneAndUpdate(
       {
           $or: [
               { status: 'Scheduled', scheduledAt: { $lte: now } },
               { status: 'Processing', claimedAt: { $lte: lockThreshold } } // Stale recovery
           ]
       },
       {
           $set: {
               status: 'Processing',
               claimedAt: now
           }
       },
       { returnDocument: 'after' }
   );
   ```
2. **Exclusivity**: Only one worker can claim a post. Concurrent workers get `null` for that post and move to the next item or exit cleanly.
3. **Stuck Job Recovery (Deadlock Prevention)**: If a serverless function crashes mid-execution, any post remaining in `'Processing'` for longer than 5 minutes (`lockThreshold`) is automatically reclaimed and reprocessed on the next cron cycle.
4. **Fault Isolation**: If a post is missing required content or encounters an error, it transitions to `'Failed'` with the error recorded in `failureReason`. Other due posts in the queue continue processing unaffected.

---

## 🌐 Timezone Handling & Accuracy

To eliminate bugs caused by differing local timezones:

1. **Client Input**: The author picks their local date & time using standard HTML5 datetime picker.
2. **UTC Conversion on Frontend**: The frontend converts the local time selection to a UTC ISO 8601 string (`new Date(localValue).toISOString()`) before sending to the backend.
3. **Database Storage**: MongoDB stores all timestamps (`scheduledAt`, `publishedAt`, `createdAt`) as native UTC Date objects.
4. **Display**: The frontend renders dates back in the viewer's local timezone (e.g. `Oct 5, 2026, 6:30 PM (IST)`), along with timezone indicators.

---

## 🗄️ Database Schema & Indexing

The `Blog` model ([backend/models/Blog.js](backend/models/Blog.js)) is extended with scheduling fields and an index for scheduler queries:

```javascript
const blogSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    tags: { type: [String], default: [] },
    conclusion: { type: String, required: true },
    status: {
        type: String,
        enum: ['Draft', 'Scheduled', 'Processing', 'Published', 'Failed'],
        default: 'Draft'
    },
    scheduledAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    claimedAt: { type: Date, default: null },
    failureReason: { type: String, default: '' }
}, {
    timestamps: true
});

// High-performance compound index for the Vercel Cron query
blogSchema.index({ status: 1, scheduledAt: 1 });
```

### Why this index?
The cron query targets:
```javascript
{ status: 'Scheduled', scheduledAt: { $lte: new Date() } }
```
The compound index `{ status: 1, scheduledAt: 1 }` allows MongoDB to execute this query in under **1 millisecond** without a collection scan.

---

## 📡 Complete API Documentation

### Scheduling & Cron APIs

#### 1. Schedule a Post
Schedule an existing Draft or update a Scheduled post with a future publishing timestamp.

- **URL**: `/api/blogs/:id/schedule` *(alias: `/api/posts/:id/schedule`)*
- **Method**: `POST`
- **Auth Required**: Yes (`Bearer <admin_jwt_token>`)
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "scheduledAt": "2026-10-05T18:30:00.000Z"
}
```
- **Validation**:
  - `scheduledAt` must be a valid date.
  - `scheduledAt` must be strictly in the future (`> new Date()`).
  - Cannot schedule an already published article.
- **Success Response (200 OK)**:
```json
{
  "_id": "6740b2a0c841320ef49a0001",
  "title": "Scaling Distributed Systems",
  "status": "Scheduled",
  "scheduledAt": "2026-10-05T18:30:00.000Z",
  "publishedAt": null,
  "failureReason": ""
}
```
- **Error Response (400 Bad Request)**:
```json
{
  "message": "Scheduled publishing time must be in the future."
}
```

---

#### 2. Cancel Scheduling
Revert a scheduled post back to Draft and clear its scheduled time.

- **URL**: `/api/blogs/:id/cancel-schedule` *(alias: `/api/posts/:id/cancel-schedule`)*
- **Method**: `POST`
- **Auth Required**: Yes (`Bearer <admin_jwt_token>`)
- **Success Response (200 OK)**:
```json
{
  "_id": "6740b2a0c841320ef49a0001",
  "title": "Scaling Distributed Systems",
  "status": "Draft",
  "scheduledAt": null,
  "failureReason": ""
}
```

---

#### 3. Cron Publishing Trigger (Vercel Cron Endpoint)
Processes all due scheduled posts, claims them atomically, and publishes them.

- **URL**: `/api/cron/publish-scheduled-posts`
- **Method**: `GET` (Vercel Cron standard) or `POST` (manual invocation)
- **Auth Required**: Yes. Authenticate via either:
  1. `Authorization: Bearer <CRON_SECRET>`
  2. Header `x-cron-secret: <CRON_SECRET>`
  3. Query parameter `?secret=<CRON_SECRET>`
  4. Valid Admin JWT token (for dashboard manual testing)
- **Query Parameters**:
  - `limit` *(optional, default: 50)*: Maximum posts to process per batch.
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "timestamp": "2026-10-03T10:30:00.000Z",
  "claimedCount": 2,
  "publishedCount": 2,
  "failedCount": 0,
  "durationMs": 182,
  "details": [
    {
      "id": "6740b2a0c841320ef49a0001",
      "title": "Scaling Distributed Systems",
      "status": "Published",
      "scheduledAt": "2026-10-03T10:29:00.000Z",
      "publishedAt": "2026-10-03T10:30:00.180Z"
    }
  ]
}
```

---

#### 4. Queue Status & Monitoring
Inspect the current state of the scheduling queue.

- **URL**: `/api/cron/queue-status`
- **Method**: `GET`
- **Auth Required**: Yes (`CRON_SECRET` or Admin JWT)
- **Success Response (200 OK)**:
```json
{
  "serverTimeUTC": "2026-10-03T10:30:00.000Z",
  "stats": {
    "totalScheduled": 5,
    "currentlyDue": 1,
    "processing": 0,
    "failed": 0,
    "published": 24
  },
  "nextDuePost": {
    "_id": "6740b2a0c841320ef49a0002",
    "title": "Next.js App Router Architecture",
    "scheduledAt": "2026-10-03T11:00:00.000Z",
    "status": "Scheduled"
  }
}
```

---

### Blog Management APIs

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/blogs` | Get published articles (with search, tag filters, pagination) | Public |
| `GET` | `/api/blogs/:id` | Get single article (public if Published; admin preview for Drafts/Scheduled) | Public / Optional Token |
| `GET` | `/api/blogs/admin/all` | Get all articles for admin (supports `?status=Scheduled&search=...`) | Admin JWT |
| `POST` | `/api/blogs` | Create new article (status: `Draft`, `Scheduled`, or `Published`) | Admin JWT |
| `PUT` | `/api/blogs/:id` | Update article content or schedule safely | Admin JWT |
| `DELETE`| `/api/blogs/:id` | Delete article permanently | Admin JWT |
| `POST` | `/api/blogs/ai-generate` | Generate complete article draft with Groq Cloud LLM | Admin JWT |

---

### Authentication & Administrator Management APIs

| Method | Endpoint | Description | Authorization | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Log in administrator (returns JWT & role) | Public | `{ "email": "...", "password": "..." }` |
| `POST` | `/api/auth/register` | Create a new administrator account | 👑 SuperAdmin Only | `{ "name": "...", "email": "...", "password": "...", "role": "admin" }` |
| `GET` | `/api/auth/admins` | List all active administrators | 👑 SuperAdmin Only | None |
| `DELETE` | `/api/auth/admins/:id` | Remove an admin account | 👑 SuperAdmin Only | None |
| `GET` | `/api/auth/me` | Fetch currently logged-in admin profile | Admin / SuperAdmin | None |

---

## 🖥️ Frontend User Guide

The administrative portal provides a streamlined, role-aware workflow for article lifecycle management and admin governance:

### 1. One-Click Login & Role Autofill
- Navigate to `/admin/login`.
- Click the **👑 Autofill SuperAdmin** button (`superadmin@utsanova.com` / `superadmin@1234`) or **🛡️ Autofill Admin** button (`admin@utsanova.com` / `admin@1234`).
- Log in to access the control panel.

### 2. 👑 SuperAdmin Team Management ("Manage Admins")
- When logged in as **SuperAdmin**, a purple **👑 Manage Admins** button appears in the top navigation bar.
- Clicking this opens the **Admin Governance Modal**:
  - **View Team**: See all registered administrators, their emails, roles, and creation dates.
  - **Create New Admin**: Fill in Name, Email, and Password to immediately provision an admin account.
  - **Revoke Admin**: Delete an administrator account with 1-click confirmation (SuperAdmins cannot delete themselves).
- Regular administrators cannot see this button and are blocked from admin-management API endpoints.

### 3. Scheduling a Post
1. Click **+ Create Article** or click the **Edit (pencil)** icon on any article.
2. Under **Publishing & Release Options**, select **Schedule Post**.
3. Use the date/time picker or click a quick preset:
   - **+1 Hour**
   - **Tomorrow 9:00 AM**
   - **Tomorrow 6:00 PM**
   - **+2 Days**
4. Review the timezone preview banner showing both your local time and stored UTC timestamp.
5. Click **Schedule Post**. The article will receive an indigo **Scheduled** badge.

### 4. Zero Human Intervention: Automated Publishing
- **No manual buttons or triggers needed!**
- The system runs an automated background runner:
  - In **Local Development / Docker**: The built-in 30-second background ticker automatically checks and publishes due posts.
  - In **Vercel Production**: Vercel Cron automatically calls `/api/cron/publish-scheduled-posts` every minute.
- A live **"Auto-Publisher Active"** green badge in the dashboard indicates the automated background engine is running.
- When the post's scheduled timestamp arrives, it changes to **Published** and appears in the public feed automatically.

### 5. Cancelling a Schedule or Publishing Immediately
- **Cancel Schedule**: Click **Cancel Schedule** on any scheduled table row to instantly revert the article back to **Draft**.
- **Publish Now**: Need an article live right away? Click **Publish Now** to bypass the scheduled timer and release immediately.

---

## 🚀 Vercel Deployment Guide (Step-by-Step)

Deploying the complete application (Frontend, Express Backend, and Vercel Cron) takes under 3 minutes:

### Step 1: Vercel Configuration (`vercel.json`)
The project uses the **Vercel Services** architecture with an Express backend service and Vite frontend service, alongside Vercel Cron:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "backend": {
      "root": "backend",
      "framework": "express",
      "entrypoint": "server.js"
    },
    "frontend": {
      "root": "frontend",
      "framework": "vite"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": { "service": "backend" }
    },
    {
      "source": "/(.*)",
      "destination": { "service": "frontend" }
    }
  ],
  "crons": [
    {
      "path": "/api/cron/publish-scheduled-posts",
      "schedule": "* * * * *"
    }
  ]
}
```

### Step 2: Push Your Code to GitHub
```bash
git add .
git commit -m "feat: implement vercel cron scheduled publishing"
git push origin main
```

### Step 3: Import Project into Vercel
1. Log in to [vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
2. Select your repository `BLOG-POST`.
3. Keep the default root directory `./`.

### Step 4: Add Environment Variables in Vercel
In the **Environment Variables** section of the deployment screen, add the following variables:

| Variable Name | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production environment flag |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster0...mongodb.net/utsanova_blog?retryWrites=true&w=majority` | MongoDB Atlas Connection String |
| `JWT_SECRET` | `your_super_strong_jwt_secret_key` | Secret key for JWT verification |
| `GROQ_API_KEY` | `gsk_your_groq_api_key` | Groq Cloud LLM API Key |
| `CRON_SECRET` | `utsanova_prod_cron_secret_778899` | **Critical**: Protects the cron endpoint. Vercel automatically passes this in `Authorization: Bearer <CRON_SECRET>` |

### Step 5: Deploy & Verify Cron
1. Click **Deploy**. Vercel will build both the frontend and backend.
2. Once deployed, open your Vercel project dashboard -> **Settings** -> **Cron Jobs**.
3. You will see `/api/cron/publish-scheduled-posts` listed with the schedule `* * * * *` (Every minute).
4. Vercel displays the invocation history, last execution time, and HTTP 200 response codes.

### Step 6: Testing in Production
1. Log into your deployed admin dashboard (`https://<your-project>.vercel.app/admin/login`).
2. Create an article and schedule it for **2 minutes** in the future.
3. Wait 2 minutes. When Vercel Cron fires on the next minute, the article status automatically changes to **Published** and appears on the homepage feed!

---

## 🐳 Docker Single-Container Deployment

Docker is maintained for platforms like Render, Railway, AWS ECS, or local container testing.

### Docker vs. Vercel Cron:
- **Docker Container**: Packages the Express server and Vite frontend into a single image.
- **Production Scheduler**: The scheduler runs via **Vercel Cron** invoking `/api/cron/publish-scheduled-posts`. No permanent background daemon or `node-cron` process is created inside the container.

To build and run the Docker container locally:
```bash
docker build -t utsanova-blog .
docker run -p 5000:5000 --env-file backend/.env utsanova-blog
```

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js v20+ or v24
- MongoDB Atlas cluster or local MongoDB instance

### 2. Clone & Install
```bash
git clone https://github.com/PARAS-BYTE/BLOG-POST.git
cd BLOG-POST

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 3. Configure Environment Variables
Copy [.env.example](backend/.env.example) to `backend/.env` and update the values:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/utsanova_blog?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key
GROQ_API_KEY=gsk_your_groq_api_key
CRON_SECRET=utsanova_cron_dev_secret_2026
```

### 4. Run Development Servers
```bash
# Terminal 1 (Backend API):
cd backend
npm run dev
# Running on http://localhost:5000

# Terminal 2 (Frontend UI):
cd frontend
npm run dev
# Running on http://localhost:5173
```

---

## 🔑 Environment Variables Guide

| Variable | Required | Where to Set | Purpose |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional (default 5000) | Backend `.env` | Local server port |
| `NODE_ENV` | Yes | Backend `.env`, Vercel | `development` / `production` / `test` |
| `MONGO_URI` | Yes | Backend `.env`, Vercel | MongoDB Atlas database URI |
| `JWT_SECRET` | Yes | Backend `.env`, Vercel | Used to sign & verify admin JWTs |
| `GROQ_API_KEY` | Optional | Backend `.env`, Vercel | Groq LLM API key for AI drafting |
| `CRON_SECRET` | Yes | Backend `.env`, Vercel | Authenticates Vercel Cron triggers |

---

## 🧪 Automated Testing Strategy & Test Suite

The project includes an automated test suite ([backend/test-scheduler.js](backend/test-scheduler.js)) that tests all 12 core requirements:

```bash
cd backend
npm test
```

### Test Suite Execution Output:
```text
======================================================
  Running Scheduled Blog-Post Publishing Test Suite   
======================================================

Connected to MongoDB for testing.

  [1/12] 1. Creating a draft... PASSED ✓
  [2/12] 2. Scheduling a post for future release... PASSED ✓
  [3/12] 3. Rejecting a past scheduled time... PASSED ✓
  [4/12] 4. Editing scheduled post preserves schedule metadata... PASSED ✓
  [5/12] 5. Cancelling a scheduled post returns to Draft... PASSED ✓
  [6/12] 6. Cron finding a due scheduled post (scheduledAt <= now)... PASSED ✓
  [7/12] 7. Publishing due post (status=Published, publishedAt set)... PASSED ✓
  [8/12] 8. Cron strictly ignores future scheduled posts... PASSED ✓
  [9/12] 9. Preventing duplicate publishing across concurrent workers... PASSED ✓
  [10/12] 10. Handling publishing failure isolation and error logging... PASSED ✓
  [11/12] 11. Handling multiple due posts cleanly in a batch... PASSED ✓
  [12/12] 12. Handling an empty queue returns clean summary... PASSED ✓

All 12 tests passed successfully! (12/12)
Test artifacts cleaned up from MongoDB.
```

### Manual Testing with cURL / Postman:
You can trigger the cron endpoint anytime in development without waiting for Vercel Cron:

```bash
# Using Bearer token
curl -X POST http://localhost:5000/api/cron/publish-scheduled-posts \
  -H "Authorization: Bearer utsanova_cron_dev_secret_2026"

# Using URL query parameter
curl -X GET "http://localhost:5000/api/cron/publish-scheduled-posts?secret=utsanova_cron_dev_secret_2026"
```

---

## 🔍 Troubleshooting & Gotchas

### 1. `querySrv ECONNREFUSED` on Windows
- **Cause**: Some Windows DNS resolvers fail to lookup MongoDB Atlas SRV records.
- **Solution**: Handled automatically in `server.js` and `test-scheduler.js` via Google DNS fallbacks (`8.8.8.8`).

### 2. Vercel Cron Returns 401 Unauthorized
- **Cause**: `CRON_SECRET` in Vercel environment variables does not match the incoming token.
- **Solution**: Ensure `CRON_SECRET` is defined in Vercel Project Settings -> Environment Variables.

### 3. Overlapping Invocations / Duplicate Publishing
- **Cause**: Cron executions overlap when multiple posts take time to process.
- **Solution**: Protected automatically by our MongoDB atomic claiming mechanism (`findOneAndUpdate` with `status: 'Processing'`).

---

## 📄 License & Credits
Developed by **UTSANOVA TECHNOLOGIES PVT. LTD.**  
© 2026 UTSANOVA TECHNOLOGIES PVT. LTD. All rights reserved.
