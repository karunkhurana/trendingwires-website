# TrendingWires Website

Full-stack website for the TrendingWires YouTube channel.

**Stack:** Next.js 14 (App Router) · Tailwind CSS · AWS Amplify Hosting · AWS Lambda · DynamoDB · API Gateway · CDK

---

## Project Structure

```
trendingwires/
├── app/                  # Next.js App Router
│   ├── layout.tsx        # Root layout + SEO metadata
│   ├── page.tsx          # Home page
│   ├── sitemap.ts        # Auto-generated sitemap.xml
│   ├── robots.ts         # robots.txt
│   └── api/
│       ├── videos/       # Next.js API route (proxies DynamoDB)
│       └── subscribe/    # Email subscribe API route
├── components/
│   └── sections/         # Hero, Navbar, VideoGrid, Footer, etc.
├── lib/
│   ├── dynamodb.ts       # DynamoDB client
│   ├── seo.ts            # All SEO metadata + JSON-LD
│   ├── utils.ts          # Helpers
│   └── mockData.ts       # Local dev fallback videos
├── lambda/
│   ├── videos/           # Standalone Lambda for API Gateway
│   └── subscribe/        # Standalone Lambda for API Gateway
├── infra/                # AWS CDK stack
│   ├── lib/trendingwires-stack.ts
│   └── bin/app.ts
├── public/               # Static assets
├── amplify.yml           # Amplify build config
└── .env.example          # Environment variables template
```

---

## Local Development

```bash
cd trendingwires
npm install
cp .env.example .env.local
# Fill in AWS credentials in .env.local
npm run dev
# → http://localhost:3000
```

Videos fall back to mock data if DynamoDB is empty or credentials are missing.

---

## AWS Deployment

### Step 1 — Deploy CDK infrastructure

```bash
cd infra
npm install
npx cdk bootstrap   # first time only
npx cdk deploy
```

This creates:
- **DynamoDB** `tw-videos` table (with GSI for category filtering)
- **DynamoDB** `tw-subscribers` table
- **Lambda** `tw-videos-api` + `tw-subscribe-api`
- **API Gateway** with `/videos` and `/subscribe` endpoints
- **Amplify** app (connected to your repo)

Note the outputs: `ApiUrl` and `AmplifyAppId`.

### Step 2 — Connect Amplify to GitHub

1. Go to AWS Amplify Console → your app
2. Connect to GitHub repo, select branch `main`
3. Set environment variables from `.env.example`
4. Set `NEXT_PUBLIC_API_URL` to the `ApiUrl` from CDK output
5. Save and deploy

### Step 3 — Add custom domain

In Amplify Console → Domain Management → Add `trendingwires.com`

---

## SEO Features

- `<title>` + `<meta description>` on every page
- Open Graph + Twitter Card tags
- JSON-LD structured data (WebSite, Organization, VideoObject)
- `sitemap.xml` auto-generated at `/sitemap.xml`
- `robots.txt` at `/robots.txt`
- Canonical URLs
- Schema.org `VideoObject` on each video card
- `<meta name="geo.region">` for regional relevance
- PWA manifest for mobile installability

---

## Adding Videos to DynamoDB

```bash
aws dynamodb put-item \
  --table-name tw-videos \
  --item '{
    "id":          {"S": "YOUTUBE_VIDEO_ID"},
    "title":       {"S": "Video Title"},
    "description": {"S": "Short description"},
    "thumbnail":   {"S": "https://img.youtube.com/vi/VIDEO_ID/hqdefault.jpg"},
    "publishedAt": {"S": "2026-07-22T10:00:00.000Z"},
    "category":    {"S": "ai-tech"},
    "platform":    {"S": "youtube"},
    "viewCount":   {"N": "50000"},
    "duration":    {"S": "0:58"}
  }'
```

Categories: `ai-tech` · `business` · `world` · `science` · `social` · `innovation`

---

## Social Links

| Platform   | URL |
|------------|-----|
| YouTube    | https://www.youtube.com/@trendingwires |
| Instagram  | https://instagram.com/trending_wires |
| X/Twitter  | https://x.com/trending_wires |
| LinkedIn   | https://linkedin.com/company/trendingwires |
| Facebook   | https://facebook.com/trendingwires |
| Website    | https://trendingwires.com |
| Email      | contact@trendingwires.com |
