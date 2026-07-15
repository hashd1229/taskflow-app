# TaskFlow — Full‑Stack Project & Team Task Management Platform

A complete project and team task management platform with a modern Next.js frontend, a standalone Node.js/Express REST API backend, and a shared Supabase (PostgreSQL) database. Role‑based access control ensures that administrators, project managers, and team members each have the right permissions.

## Project Structure

```
taskflow/
├── frontend/                     # Next.js Frontend
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   │   └── [id]/
│   │   │   └── admin/
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/      
│   │   ├── reset-password/       
│   │   ├── layout.jsx
│   │   ├── page.jsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   ├── app-layout.jsx
│   │   └── theme-toggle.jsx     
│   ├── lib/
│   │   ├── supabase/
│   │   ├── auth-context.jsx
│   │   ├── types.js
│   │   └── utils.js
│   ├── hooks/
│   │   └── use-toast.js
│   ├── .env.example
│   └── package.json
│
├── backend/                      # Node.js/Express Backend
│   ├── src/
│   │   ├── config.js
│   │   ├── server.js
│   │   ├── lib/
│   │   │   └── supabase.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── error.js
│   │   └── routes/
│   │       ├── auth.js
│   │       ├── projects.js
│   │       ├── tasks.js
│   │       ├── dashboard.js
│   │       └── users.js
│   ├── .env.example
│   └── package.json
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├──  supabase
|    |__migrations
|          |--20260714_schema.sql                
├──  .gitignore  
|__   README.md                          
```

## What The App Does

### Frontend
- Dashboard for projects, tasks, and team activity
- Project pages with task boards and member management
- Authentication pages for login, signup, password reset, and account recovery
- Admin area for elevated user management

### Backend
- REST API for authentication, users, projects, tasks, dashboard stats, and comments
- Supabase JWT verification and role-aware authorization
- Shared database access for the same project data used by the frontend

### Core Features
- Secure email/password authentication
- Role-based access control for admins, project managers, and team members
- Project lifecycle management with status tracking
- Kanban task workflow with drag-and-drop status changes
- Team collaboration with members, comments, and activity history
- Responsive UI across desktop and mobile

## Tech Stack

### Frontend
- Next.js 13, React 18, JavaScript
- Tailwind CSS, shadcn/ui, Lucide icons
- Supabase client and auth context

### Backend
- Node.js 20+, Express 4
- Supabase PostgreSQL database
- Supabase Auth token verification
- Helmet, CORS, Morgan, nodemon

## Getting Started

### Prerequisites
- Node.js 20+
- npm
- A Supabase project

### Install Dependencies

```bash
cd frontend
npm install

cd ../backend
npm install
```

### Environment Variables

Frontend env:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Backend env:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
CLIENT_ORIGIN=http://localhost:3000
```

## Running Locally

### Frontend

```bash
cd frontend
npm run dev
```

### Backend

```bash
cd backend
npm start
```

The backend API runs on `http://localhost:3001` and exposes a health check at `GET /health`.

### Database Setup

The database schema is managed via Supabase migrations. The following tables are created:

- `profiles` — User profiles extending `auth.users`
- `projects` — Project entities
- `project_members` — Many-to-many join between projects and users
- `tasks` — Task entities with status, priority, and assignment
- `task_comments` — Comments on tasks
- `activity_log` — Audit trail of user actions

All tables have Row Level Security (RLS) enabled with role-based policies.

## Scripts

### Frontend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

### Backend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Express server with nodemon |
| `npm start` | Start the Express server |

## Roles

New users start as team members. To promote a user to admin, run this in the Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

| Role | Permissions |
|------|-------------|
| `admin` | Manage all users, roles, projects, and system access |
| `project_manager` | Create and manage projects, assign members, and create tasks |
| `team_member` | View assigned work, update task progress, and comment |

## API Overview

The frontend can use either the Supabase client directly or the Express API in `backend/`.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Get current user and profile |
| PUT | `/api/auth/me` | Update your profile |
| GET | `/api/auth/users` | List users (admin) |
| PUT | `/api/auth/users/:userId/role` | Update user role (admin) |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| GET | `/api/projects/:id` | Get a project with members and tasks |
| POST | `/api/projects` | Create a project |
| PUT | `/api/projects/:id` | Update a project |
| DELETE | `/api/projects/:id` | Delete a project |
| GET | `/api/projects/:id/members` | List project members |
| POST | `/api/projects/:id/members` | Add a member |
| PUT | `/api/projects/:id/members/:memberId` | Update a member role |
| DELETE | `/api/projects/:id/members/:memberId` | Remove a member |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/project/:projectId` | List tasks in a project |
| GET | `/api/tasks/:id` | Get a task |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/:id` | Update a task |
| PATCH | `/api/tasks/:id/status` | Update task status |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/tasks/:id/comments` | List task comments |
| POST | `/api/tasks/:id/comments` | Add a comment |
| DELETE | `/api/tasks/:id/comments/:commentId` | Delete a comment |

### Dashboard and Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get dashboard statistics |
| GET | `/api/dashboard/activity` | Get recent activity |
| GET | `/api/users` | List users and system stats |
| PUT | `/api/users/:userId/role` | Update user role |

## Database Schema

### Main Tables
- `profiles` - User profiles extending `auth.users`
- `projects` - Project records
- `project_members` - Project membership and roles
- `tasks` - Tasks with status, priority, and assignment
- `task_comments` - Comments on tasks
- `activity_log` - Audit trail of actions

## Request/Response Examples

### Register

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "fullName": "John Doe"
}
```

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Response:
```json
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "session": { "access_token": "eyJ...", "refresh_token": "..." },
  "profile": { "id": "uuid", "full_name": "John Doe", "role": "team_member" }
}
```

### Create Project

```bash
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Website Redesign",
  "description": "Complete overhaul of the company website",
  "status": "planning",
  "startDate": "2025-01-01",
  "dueDate": "2025-03-31"
}
```

### Create Task

```bash
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": "uuid",
  "title": "Design homepage mockup",
  "description": "Create 3 hero section variations",
  "status": "todo",
  "priority": "high",
  "assignedTo": "uuid",
  "dueDate": "2025-02-15"
}
```

### Update Task Status (Kanban)

```bash
PATCH /api/tasks/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress"
}
```

### Add Comment

```bash
POST /api/tasks/:id/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "This needs a review from the design team."
}
```

## Error Responses

All errors return a consistent format:

```json
{
  "error": "Description of what went wrong"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (missing/invalid fields) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient role/permissions) |
| 404 | Resource not found |
| 500 | Internal server error |

### Relationships

```
auth.users (1) ──→ (1) profiles
profiles (1) ──→ (N) projects (as owner)
profiles (1) ──→ (N) project_members
profiles (1) ──→ (N) tasks (as assignee)
profiles (1) ──→ (N) tasks (as creator)
profiles (1) ──→ (N) task_comments
projects (1) ──→ (N) project_members
projects (1) ──→ (N) tasks
projects (1) ──→ (N) activity_log
tasks (1) ──→ (N) task_comments
tasks (1) ──→ (N) activity_log
```

All tables use Row Level Security with role-based policies.

## CI/CD

The repository includes a GitHub Actions workflow in `.github/workflows/ci-cd.yml` that installs dependencies, runs linting, builds the frontend, and uploads artifacts on push and pull request.

Required secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`


