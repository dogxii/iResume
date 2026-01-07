# 部署指南

本文档介绍如何将 React Resume Builder 部署到各种平台。

## 📋 目录

- [构建项目](#构建项目)
- [部署到 Vercel](#部署到-vercel)
- [部署到 Netlify](#部署到-netlify)
- [部署到 GitHub Pages](#部署到-github-pages)
- [部署到 Cloudflare Pages](#部署到-cloudflare-pages)
- [自定义服务器部署](#自定义服务器部署)

## 🔨 构建项目

在部署之前，确保项目可以正常构建：

```bash
# 安装依赖
npm install

# 运行代码检查
npm run lint

# 构建生产版本
npm run build
```

构建成功后，会在 `dist` 目录生成静态文件。

## 🚀 部署到 Vercel

Vercel 是最简单的部署方式，完美支持 Vite 项目。

### 方法 1: 通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel

# 部署到生产环境
vercel --prod
```

### 方法 2: 通过 Vercel 网站

1. 访问 [vercel.com](https://vercel.com)
2. 点击 "New Project"
3. 导入你的 GitHub 仓库
4. Vercel 会自动检测 Vite 配置
5. 点击 "Deploy"

### 配置文件（可选）

创建 `vercel.json`：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

## 🎯 部署到 Netlify

### 方法 1: 通过 Netlify CLI

```bash
# 安装 Netlify CLI
npm install -g netlify-cli

# 登录
netlify login

# 部署
netlify deploy

# 部署到生产环境
netlify deploy --prod
```

### 方法 2: 通过 Netlify 网站

1. 访问 [netlify.com](https://www.netlify.com)
2. 点击 "Add new site" > "Import an existing project"
3. 连接你的 Git 仓库
4. 配置构建设置：
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. 点击 "Deploy site"

### 配置文件（可选）

创建 `netlify.toml`：

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 📄 部署到 GitHub Pages

### 方法 1: 使用 GitHub Actions

1. 创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

2. 在 GitHub 仓库设置中：
   - 进入 Settings > Pages
   - Source 选择 "GitHub Actions"

3. 推送代码到 `main` 分支，自动触发部署

### 方法 2: 使用 gh-pages

```bash
# 安装 gh-pages
npm install -D gh-pages

# 在 package.json 中添加脚本
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}

# 部署
npm run deploy
```

**注意**: 如果你的项目不在根路径，需要修改 `vite.config.ts`：

```typescript
export default defineConfig({
  base: '/your-repo-name/',
  // ...其他配置
})
```

## ☁️ 部署到 Cloudflare Pages

### 方法 1: 通过 Wrangler CLI

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录
wrangler login

# 创建项目
wrangler pages project create react-resume-builder

# 部署
npm run build
wrangler pages deploy dist
```

### 方法 2: 通过 Cloudflare Dashboard

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 "Workers & Pages"
3. 点击 "Create application" > "Pages" > "Connect to Git"
4. 选择你的仓库
5. 配置构建设置：
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. 点击 "Save and Deploy"

## 🖥️ 自定义服务器部署

### 使用 Nginx

1. 构建项目：
```bash
npm run build
```

2. 将 `dist` 目录上传到服务器（例如 `/var/www/resume`）

3. 配置 Nginx (`/etc/nginx/sites-available/resume`):

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/resume;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 启用 gzip 压缩
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1000;

    # 缓存静态资源
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

4. 启用站点并重启 Nginx：
```bash
sudo ln -s /etc/nginx/sites-available/resume /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 使用 Docker

1. 创建 `Dockerfile`：

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 生产阶段
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. 创建 `nginx.conf`：

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/css application/javascript application/json;
}
```

3. 构建和运行：

```bash
# 构建镜像
docker build -t react-resume-builder .

# 运行容器
docker run -d -p 8080:80 react-resume-builder
```

4. 使用 Docker Compose (`docker-compose.yml`):

```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

```bash
docker-compose up -d
```

## ⚙️ 环境变量

如果需要配置环境变量（例如 API 端点），可以：

1. 创建 `.env.example`：
```
VITE_APP_TITLE=Resume Builder
VITE_API_URL=https://api.example.com
```

2. 在代码中使用：
```typescript
const title = import.meta.env.VITE_APP_TITLE
```

3. 在部署平台中设置相应的环境变量

## 🔒 HTTPS 配置

### 使用 Let's Encrypt (推荐)

```bash
# 安装 certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 📊 性能优化

部署后的优化建议：

1. **启用 CDN**
   - 使用 Cloudflare 或其他 CDN 服务
   - 加速全球访问

2. **压缩静态资源**
   - Gzip / Brotli 压缩
   - 已在上述 Nginx 配置中包含

3. **缓存策略**
   - HTML: 无缓存或短缓存
   - JS/CSS: 长期缓存（带 hash）
   - 图片/字体: 长期缓存

4. **监控和分析**
   - 使用 Google Analytics
   - 配置 Sentry 错误追踪

## 🧪 验证部署

部署后检查清单：

- [ ] 网站可以正常访问
- [ ] 所有静态资源加载正常（无 404）
- [ ] 编辑功能正常工作
- [ ] LocalStorage 保存/读取正常
- [ ] 打印/导出 PDF 功能正常
- [ ] 响应式布局在移动端正常
- [ ] HTTPS 配置正确（如适用）
- [ ] SEO meta 标签正确

## 📝 常见问题

### Q: 部署后出现 404 错误？

A: 确保服务器配置了 SPA 路由回退（所有路由指向 index.html）。

### Q: 静态资源加载失败？

A: 检查 `vite.config.ts` 中的 `base` 配置是否正确。

### Q: 如何配置自定义域名？

A: 在部署平台的设置中添加自定义域名，并在 DNS 提供商处添加 CNAME 记录。

## 🔗 相关资源

- [Vite 部署文档](https://vitejs.dev/guide/static-deploy.html)
- [Vercel 文档](https://vercel.com/docs)
- [Netlify 文档](https://docs.netlify.com/)
- [GitHub Pages 文档](https://docs.github.com/en/pages)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)

---

如有部署问题，欢迎提交 [Issue](../../issues)！
