# YouTube RAG Q&A

Ask questions about any YouTube video and get answers grounded in its transcript, with timestamps pointing to where each fact was said.

> 🚧 Work in progress. Features and setup instructions are added as the project is built.

## Tech stack

- **Framework:** Next.js (App Router), React
- **Styling:** Tailwind CSS
- **Auth:** NextAuth.js (Google sign-in)
- **Database:** MongoDB (chat history)
- **Vector database:** Pinecone (transcript embeddings)
- **AI:** Google Gemini (embeddings and answers)

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

Open http://localhost:3000.
