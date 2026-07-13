# AI Key Scanner

An internal security utility that scans public GitHub repositories using the GitHub Code Search API to detect exposed AI provider API keys (OpenAI, Anthropic, Gemini, and other generic AI credentials) in public codebases.

## Features
- **Exposed API Key Scanning**: Scans for patterns corresponding to OpenAI, Anthropic, and Gemini credentials.
- **Raw Key Copying**: Safely captures and lets you copy the raw exposed API keys.
- **Bookmarks (Favorites)**: Star specific findings to save them locally for quick access.
- **Token Persistence**: Choose to save your GitHub Classic Token locally in your browser's `localStorage` or persist it on the server database so that colleagues accessing this instance don't have to enter their own.
- **Clean Responsive Flat Theme**: A clean light-gray flat dashboard design styled in Poppins and solid violet accents.

## Getting Started

### 1. Installation & Setup
Create your local environment file:
```bash
cp .env.example .env.local
```
*(Make sure to set `SESSION_SECRET` in `.env.local` to a secure string in production)*

Install dependencies and start the local development server:
```bash
npm install
npm run dev
```

### 2. Sign In
Navigate to `http://localhost:3000`. You will be redirected to the sign-in page:
- **Email**: `admin@gmail.com`
- **Password**: `password`

### 3. Running Scans
- Input a GitHub Personal Access Token (Classic) with public read access (required by the GitHub Code Search API).
- **Save to Server**: You can optionally save the token to the server's SQLite database settings. When saved, the token is encrypted/cached on the server, allowing anyone accessing this instance to run scans without entering their own credentials.
- Click **Start Scan** to start a scan in the background.

## Architecture Notes
- **Database**: Scan history, findings, and server configurations are stored locally in a SQLite database file at `data/scans.db`.
- **Background Execution**: Background scans run asynchronously using the Node.js runtime process lifecycle. (For production deployment, use a persistent process runner or container like Docker to ensure background tasks complete successfully).
