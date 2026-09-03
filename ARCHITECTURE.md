# Architecture Decisions

**Prioritized**: Core CRUD, rich-text editing, and file upload.  
**Tradeoffs**: Mock auth (seeded users) instead of real login; no real-time collaboration to save time.  
**Storage**: SQLite (zero-config, file-based) – easy to reset and demo.  
**Editor**: TipTap for stability and built-in formatting (bold, italic, headings, lists).  
**Deployment**: Render for backend (with persistent disk) + Vercel for frontend.
