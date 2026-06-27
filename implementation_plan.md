# Phase 1 — Foundation Implementation Plan

## Structure
```
CivicSense/
├── package.json                  (npm workspaces root)
├── tsconfig.base.json            (shared TS config)
├── .env.example                  (env var template)
├── firebase.json                 (Firebase project config)
├── .firebaserc                   (Firebase project alias)
├── packages/
│   ├── shared/                   (shared types, design tokens, utils)
│   │   ├── src/types/            (all entity/enum TypeScript types)
│   │   ├── src/design-system/    (CSS tokens + base components)
│   │   └── package.json
│   ├── backend/                  (Node.js Express orchestrator + API gateway)
│   │   ├── src/
│   │   │   ├── middleware/       (auth, rbac, error handler)
│   │   │   ├── routes/           (citizen, authority, admin, internal)
│   │   │   ├── config/           (firebase admin SDK init)
│   │   │   └── server.ts
│   │   ├── scripts/seed/         (seed data scripts)
│   │   └── package.json
│   ├── citizen-app/              (React + TypeScript PWA)
│   │   └── package.json (Vite)
│   ├── authority-portal/         (React + TypeScript)
│   │   └── package.json (Vite)
│   └── admin-console/            (React + TypeScript)
│       └── package.json (Vite)
```
