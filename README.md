<div align="center">

# AIInsights

<p>
  <a href="./README_CN.md"><img src="https://img.shields.io/badge/阅读-中文-1677ff?style=for-the-badge" alt="中文" /></a>
  <a href="./README.md"><img src="https://img.shields.io/badge/Read-English-111827?style=for-the-badge" alt="English" /></a>
</p>

<p>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React" /></a>
  <a href="https://vite.dev"><img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://workers.cloudflare.com"><img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Workers" /></a>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT" />
</p>

AI model data dashboard, aggregating model rankings, benchmarks, pricing, and release tracking

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🏆 **Model Rankings & Details** | Multi-dimensional model rankings, intelligence index, speed, pricing, provider analysis |
| 📢 **Model Release Tracking** | Latest model releases, open source download statistics |
| 📰 **News Aggregation** | AI news from multiple sources, categorized by topic |
| 📈 **Market Predictions** | AI market predictions from Polymarket |
| 🔍 **Model Comparison** | Radar chart and metric comparison for selected models |

---

## 📑 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [💻 Commands](#-commands)
- [📦 Deployment](#-deployment)

---

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

---

## 💻 Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Vite + Workers, port 3000) |
| `npm run build` | Vite production build |
| `npm run deploy` | Build and deploy to Cloudflare Workers |
| `npm run preview` | Vite production build + static preview server |
| `npm run type-check` | TypeScript type check |
| `npm run lint` | oxlint code check |
| `npm run format` | Prettier code formatting |

---

## 📦 Deployment

Deployed on Cloudflare Workers — both static assets and API are served by a single Worker.

1. Fork this repository
2. In [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **KV**, create a namespace and copy the ID
3. Fill the KV namespace ID into the `id` field in `wrangler.jsonc` and commit
4. In **Workers & Pages** → **Create application** → **Import a repository**, select your forked repo and click **Save and Deploy**
5. Push to the repository will automatically trigger build and deployment
