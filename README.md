# Computerized-student-ID-card-processing-system
A modern web-based platform that enables educational institutions to efficiently create, manage, and verify student ID cards. Built with TypeScript, Supabase, and Tailwind CSS, this system automates student data processing, ID-card generation, and secure record storage, eliminating manual workflows and reducing administrative errors.

To purchase the full write-up (BSc) for this project, check out the link: https://selar.com/m5964i426c

### ✅ Key Features
- Student onboarding & profile management
- Automated ID-card generation with photos, institutional branding & unique identifiers
- Supabase-backed SQL database for secure, scalable data storage
- Search, filter & reporting tools for fast record retrieval
- Fully responsive UI powered by Tailwind CSS

### 🧰 Tech Stack
- Frontend: TypeScript, Tailwind CSS
- Backend & Database: Supabase (PostgreSQL)
- Platform: Web application

### 🎯 Intended Users
Schools, colleges, training centers, and other educational institutions require a reliable digital system for ID card processing and centralized student records management.

### 🚀 Why This System?
- Faster and error-free ID issuance
- Secure, cloud-based record management
- Improved institutional organization & accountability
- Accessible anywhere, no desktop installation required

# 🛠 Installation & Setup Guide

### ✅ 1. Prerequisites
Make sure you have installed:

- **Node.js** (v18+ recommended)  
  https://nodejs.org/

- **Git**  
  https://git-scm.com/

- A **Supabase account**  
  https://supabase.com/

---

### ✅ 2. Clone the Repository
git clone https://github.com/your-username/student-id-card-system.git
cd student-id-card-system


### ✅ 3. Install Dependencies
npm install

### ✅ 4. Configure Supabase
Create a new project at https://app.supabase.com/
Retrieve:
- Project URL
- Public anon key
### Create database tables for student records (example: students)
Enable:
- Supabase Auth (optional admin login)
- Supabase Storage for student photos

### ✅ 5. Create Environment Variables
Create a .env file in the project root:
- VITE_SUPABASE_URL=your-supabase-url
- VITE_SUPABASE_ANON_KEY=your-supabase-anon-key (or .env.local if using Next.js)

### ✅ 6. Start Development Server
npm run dev
### Then open in browser:
http://localhost:3000

### ✅ 7. Build for Production
npm run build

### Deploy using Vercel, Netlify, Render, or static hosting.

### 📊 Usage
- Admin logs into the dashboard
- Register or import student information
- Upload student photo
- Generate ID-card preview
- Print, export, or store ID digitally
- Search, update, or manage student records anytime
