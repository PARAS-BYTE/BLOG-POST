# UTSANOVA Blog Management System (v1.0)

> A simple, responsive, and modern full-stack Blog Management System featuring a public reader portal, an admin management dashboard, secure authentication, and an AI blog drafting assistant powered by Groq.

Developed for **UTSANOVA TECHNOLOGIES PVT. LTD.**  
Website: [www.about.utsanova.com](https://about.utsanova.com) | Email: [hr@utsanova.com](mailto:hr@utsanova.com)

---

## 🌟 Overview & Architecture

The UTSANOVA Blog Management System provides an end-to-end publishing workflow:
1. **Public Blog Portal**: Readers can discover, search, filter by tags, and read published articles with a clean, classic light editorial design.
2. **Admin Portal**: Authorized administrators can view analytics, write blogs, edit, delete, and toggle draft/published status.
3. **AI Blog Drafting Assistant (Groq LLM)**: Administrators can input a topic or summary to automatically generate a complete draft (Title, Body, Tags, and Conclusion) to review and tweak before saving.
4. **Authentication & Security**: Protected admin routes, stateless JSON Web Tokens (JWT), and passwords salted and hashed with bcrypt.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, React Router v7, Tailwind CSS v4, Lucide Icons, Axios |
| **Backend** | Node.js, Express 5, Mongoose 9, Groq SDK |
| **Database** | MongoDB (Local / Atlas) |
| **Authentication**| JSON Web Tokens (JWT) + Bcrypt.js |
| **AI LLM** | Groq Cloud API (`openai/gpt-oss-20b`) |

---

## ✨ Features

### 1. Public Blog Portal
- **Browse Published Articles**: Displays cover image, title, date, excerpt, tags, and reading time.
- **Search & Tag Filtering**: Real-time search across titles, content keywords, and tags. Clicking tags instantly filters matching articles.
- **Blog Detail View**: Full article presentation with a high-resolution cover image banner, dedicated **Conclusion & Takeaways** box, and clickable discovery tags.
- **Corporate Branding**: Matches official UTSANOVA brand design with the signature navy gradient hero, pill action buttons, and clean editorial typography.

### 2. Admin Management Dashboard
- **Analytics Overview**: Real-time counter cards for **Total Articles**, **Published Articles**, and **Draft Articles**.
- **Cover Image Management**: Add or edit custom image URLs with live in-modal preview and table thumbnails.
- **Tabbed Filtering**: View All, Published, or Draft posts with a single click.
- **Quick Status Toggle**: Switch between `Published` and `Draft` directly from the table.
- **Full CRUD Management**: Create, edit, preview, and delete articles with safety confirmation modals.

### 3. AI Blog Generation Assistant
- **Topic-to-Draft Workflow**: Enter any topic or outline (e.g. *"Microservices in Node.js"*).
- **Auto Dummy Image Inclusion**: AI drafts include a curated, high-resolution tech dummy image URL automatically that users can keep or replace.
- **Non-Destructive Generation**: The AI generates Title, Content, Image URL, Tags, and Conclusion directly into the form fields. The user can review, edit, or adjust anything before clicking Save/Publish.
- Powered by **Groq's high-speed inference**.

---

## 📁 Project Directory Structure

```text
Blog_System/
├── backend/
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT route protection middleware
│   ├── models/
│   │   ├── Admin.js              # Admin schema with bcrypt password hashing
│   │   └── Blog.js               # Blog schema (title, content, tags, conclusion, status)
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth (login, register)
│   │   └── blogRoutes.js         # /api/blogs (CRUD, search, /ai-generate)
│   ├── .env                      # Environment configuration
│   ├── package.json
│   ├── seed.js                   # Pre-populates default admin & 10 sample blogs
│   └── server.js                 # Express entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Footer.jsx        # Company footer with branding & links
│   │   │   ├── Navbar.jsx        # Navigation bar with responsive links & auth state
│   │   │   └── ProtectedRoute.jsx# Client-side admin route protection
│   │   ├── pages/
│   │   │   ├── AdminDashboard.jsx# Admin dashboard, stats, CRUD, & AI assistant
│   │   │   ├── AdminLogin.jsx    # Secure admin sign-in with quick test helper
│   │   │   ├── AdminRegister.jsx # Admin account creation
│   │   │   ├── BlogDetail.jsx    # Full article reading page
│   │   │   └── Home.jsx          # Public blog feed with search & tag filters
│   │   ├── services/
│   │   │   └── api.js            # Axios client with JWT request interceptor
│   │   ├── App.jsx               # Routes setup & layout shell
│   │   ├── index.css             # Tailwind v4 configuration & base styles
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/utsanova_blog
JWT_SECRET=your_super_secret_jwt_key
GROQ_API_KEY=your_groq_api_key_here
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+ or v20+)
- **MongoDB** running locally on port `27017` or a MongoDB Atlas URI

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# (Optional) Seed default admin and 10 sample articles
node seed.js

# Start backend server
npm run dev
# Backend runs at http://localhost:5000
```

### 3. Frontend Setup
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
# Frontend runs at http://localhost:5173
```

---

## 🔑 Default Administrator Credentials

If you ran `node seed.js`, you can log in immediately with:

- **Email**: `admin@utsanova.com`
- **Password**: `AdminSecurePassword123`

*(Alternatively, use the "Auto-fill" button on the `/admin/login` page or register a new admin at `/admin/register`.)*

---

## 📡 API Endpoints Reference

### Public Routes
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/blogs` | Get published blogs (supports `?search=` and `?tag=`) |
| `GET` | `/api/blogs/:id` | Get details of a single blog by ID |

### Authentication Routes
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate admin & receive JWT |
| `POST` | `/api/auth/register` | Register new administrator |

### Protected Admin Routes (`Bearer <JWT>`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/blogs/admin/all` | Fetch all blogs (both Drafts and Published) |
| `POST` | `/api/blogs` | Create a new blog post |
| `PUT` | `/api/blogs/:id` | Update an existing blog post |
| `DELETE`| `/api/blogs/:id` | Delete a blog post |
| `POST` | `/api/blogs/ai-generate` | Generate blog draft using Groq LLM |

---

## 📄 License
UTSANOVA TECHNOLOGIES PVT. LTD. © 2026. All rights reserved.
