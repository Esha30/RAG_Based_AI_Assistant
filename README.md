# 🚀 RAG-Based AI Assistant

A premium, full-stack document intelligence assistant that leverages **Retrieval-Augmented Generation (RAG)** to ingest, process, analyze, and query your documents in real-time. Built with a modern **FastAPI** backend and a responsive **Next.js** frontend.

---

## ✨ Features

- 📂 **Multi-format Document Ingestion**: Upload PDF, DOCX, and TXT files. The backend automatically extracts text, chunks it, and creates vector embeddings.
- 🔍 **Advanced Vector Search**: Powered by **LangChain** and **ChromaDB** to index and retrieve relevant content with high semantic accuracy.
- 💬 **Real-time SSE Streaming**: Engage in conversational Q&A with your documents. Responses stream back character-by-character using **Server-Sent Events (SSE)**.
- 📄 **Resume Analyzer**: Upload a resume along with a job description to extract match percentages, identify missing skills/keywords, and receive tailored improvement recommendations.
- 📊 **Analytics Dashboard**: Monitor workspace metrics including total uploaded documents, total storage size, question/session counts, and document type distribution.
- 🔒 **Secure Authentication**: Complete signup and login flow with JWT-based session protection, state persistence, and route guards.

---

## 🛠️ Technology Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **RAG & Orchestration**: [LangChain](https://www.langchain.com/)
- **Vector DB**: [ChromaDB](https://www.trychroma.com/)
- **Database**: SQLite (SQLAlchemy ORM)
- **LLM Provider**: Gemini AI (with OpenAI fallback options)
- **Security**: JWT tokens, Bcrypt password hashing

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (App Router, React)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Vanilla CSS (Premium Theme, Glassmorphism, Dark mode ready)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## ⚙️ Configuration & Setup

### 1. Backend Setup

Navigate to the `backend` folder:
```bash
cd backend
```

Create a virtual environment and install dependencies:
```bash
python -m venv .venv
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file inside the `backend` folder:
```env
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_jwt_signing_secret_here
# Optional fallback
OPENAI_API_KEY=your_openai_api_key_here
```

Start the backend server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API documentation will be available at `http://localhost:8000/docs`.

---

### 2. Frontend Setup

Navigate to the `frontend` folder:
```bash
cd frontend
```

Install the dependencies:
```bash
npm install
```

Create a `.env.local` file inside the `frontend` folder:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend development server:
```bash
npm run dev
```
The web application will be accessible at `http://localhost:3000`.

---

## 📂 Project Structure

```
d:\RAG-Based AI Assistant\
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── auth/             # JWT Authentication logic
│   │   ├── database/         # SQLite config, models, schemas
│   │   ├── rag/              # ChromaDB client & LangChain RAG pipeline
│   │   ├── routers/          # API Route handlers (auth, chat, document, analytics)
│   │   └── main.py           # Application entry point
│   ├── requirements.txt      # Python package requirements
│   └── .env                  # Backend credentials (ignored)
├── frontend/                 # Next.js Application
│   ├── src/
│   │   ├── app/              # Next.js Pages & Layouts (Dashboard, Chat, Resume, Auth)
│   │   ├── components/       # UI Components (Sidebar, AuthGuard, charts)
│   │   └── lib/              # Client API wrapper, React Auth context
│   ├── package.json          # Node dependencies
│   └── .env.local            # Frontend config (ignored)
├── chroma_db/                # Local Vector DB storage (ignored)
├── uploads/                  # Temp storage for document parsing (ignored)
└── README.md                 # Project documentation
```

---

## 🔒 Security Notice

Please ensure that you **never** commit `.env` or `.env.local` files to public version control. They have been pre-configured in the root `.gitignore` to prevent leaks of API keys and database tokens.
