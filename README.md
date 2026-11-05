# Datelle — web

Next.js 16 · React 19 · Tailwind v4 · TypeScript. A1 Home sahifasi Figma `240:247` dan 1:1 (1440 frame).

```bash
npm install
cp .env.example .env.local   # DATABASE_URL va boshqalar
npm run db:migrate && npm run db:seed
npm run dev     # http://localhost:3000
```

Backend (Postgres, API, auth): **[BACKEND.md](./BACKEND.md)**

- `src/app/globals.css` — tokenlar (Figma Colors · Light / Light · App) va type scale (`t-*` utility)
- `src/config/brand.ts` — brend nomi (bir joyda)
- `src/components/ui` — Button, Icon, Logo, DateTile, VendorCard, Eyebrow
- `src/components/home` — 11 ta section
- `src/data/home.ts` — mock data (keyin API bilan almashtiriladi)
