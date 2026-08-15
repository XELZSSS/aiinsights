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

AI 模型数据看板，聚合模型排名、评测、价格、发布动态

</div>

---

## ✨ 功能特性

| 特性 | 说明 |
|------|------|
| 🏆 **模型排名与详情** | 多维度模型排名、智能指数、速度、价格、提供商分析 |
| 📢 **模型发布动态** | 最新模型发布、开源模型下载统计 |
| 📰 **新闻聚合** | 多来源 AI 资讯，按主题分类浏览 |
| 📈 **市场预测** | Polymarket AI 市场预测数据 |
| 🔍 **模型对比** | 雷达图与多指标对比分析 |

---

## 📑 目录

- [🚀 快速开始](#-快速开始)
- [💻 常用命令](#-常用命令)
- [📦 部署](#-部署)

---

## 🚀 快速开始

```bash
npm install
npm run dev
```

访问：`http://localhost:3000`

---

## 💻 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（Vite + Workers，端口 3000） |
| `npm run build` | Vite 生产构建 |
| `npm run deploy` | 构建并部署到 Cloudflare Workers |
| `npm run preview` | Vite 生产构建 + 静态预览服务器 |
| `npm run type-check` | TypeScript 类型检查 |
| `npm run lint` | oxlint 代码检查 |
| `npm run format` | Prettier 代码格式化 |

---

## 📦 部署

项目部署在 Cloudflare Workers 上，前端静态资源和 API 由同一个 Worker 提供。

1. Fork 本仓库
2. 在 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **KV** 创建一个命名空间，复制 ID
3. 将 KV 命名空间 ID 填入仓库中 `wrangler.jsonc` 的 `id` 字段并提交
4. 在 **Workers & Pages** → **Create application** → **Import a repository**，选择 Fork 的仓库，点击 **Save and Deploy**
5. 后续推送到仓库会自动触发构建和部署
