# AI Career Assistant — Frontend

React + TypeScript + Vite + Tailwind CSS frontend for the AI Career Assistant Platform API (`server/`).

## Setup

```bash
npm install
cp .env.example .env.local   # set VITE_API_BASE_URL if the API isn't on localhost:5000
npm run dev
```

The dev server runs at `http://localhost:5173` and expects the backend API at the URL in `VITE_API_BASE_URL` (default `http://localhost:5000/api/v1`).

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) and build for production
- `npm run preview` — preview the production build locally
- `npm run lint` — run oxlint

## Structure

- `src/pages/` — one component per route
- `src/components/` — `ui/` (generic building blocks) plus feature folders (`resume/`, `analysis/`, `jobMatch/`, `interview/`, `layout/`)
- `src/services/` — the only layer allowed to call the API; one file per backend resource, built on `src/lib/apiClient.ts`
- `src/types/api.ts` — request/response types mirroring the backend contract in `server/src/routes` and `server/src/controllers`
- `src/context/AuthContext.tsx` + `src/hooks/useAuth.ts` — auth session state (JWT in `localStorage`)
