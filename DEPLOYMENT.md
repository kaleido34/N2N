# 🚀 Noise2Nectar Deployment Guide

This guide covers multiple deployment options for your **noise2nectar** application, which consists of:
- Next.js frontend/API (main app)
- Python Flask backend (AI processing server)
- PostgreSQL database

## 📋 Prerequisites

Before deploying, ensure you have:
- [ ] GitHub repository with your code
- [ ] API keys for: Google AI, YouTube API, Pinecone (if used)
- [ ] Database connection strings
- [ ] Environment variables ready

## 🌟 Option 1: Vercel + Railway (Recommended)

### Step 1: Deploy Database
1. Sign up at [Railway.app](https://railway.app)
2. Create new project → Add PostgreSQL
3. Copy the `DATABASE_URL` and `DIRECT_URL` from Railway dashboard

### Step 2: Deploy Python Backend
1. In Railway, create another service
2. Connect your GitHub repo
3. Set root directory to `/python-servers`
4. Add environment variables:
   ```
   FLASK_ENV=production
   PORT=5000
   ```
5. Railway will auto-deploy your Flask server

### Step 3: Deploy Next.js Frontend
1. Go to [Vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Framework preset: **Next.js**
4. Add environment variables:
   ```
   DATABASE_URL=your_railway_postgresql_url
   DIRECT_URL=your_railway_postgresql_direct_url  
   JWT_SECRET=your_random_secret_key_32_chars
   GEMINI_API_KEY=your_google_ai_api_key
   YOUTUBE_APIKEY=your_youtube_api_key
   PYTHON_SERVER_URL=your_railway_python_server_url
   ```
5. Deploy!

### Step 4: Run Database Migrations
```bash
# In your local terminal
npx prisma migrate deploy
npx prisma generate
```

## 🐳 Option 2: Docker Deployment

### Docker Compose Setup
Create `docker-compose.yml` in your root directory:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: noise2nectar
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: noise2nectar
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  python-backend:
    build: ./python-servers
    ports:
      - "5000:5000"
    depends_on:
      - postgres
    environment:
      - FLASK_ENV=production

  nextjs-app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - python-backend
    environment:
      - DATABASE_URL=postgresql://noise2nectar:your_password@postgres:5432/noise2nectar
      - JWT_SECRET=your_jwt_secret
      - GEMINI_API_KEY=your_api_key
      - YOUTUBE_APIKEY=your_youtube_key
      - PYTHON_SERVER_URL=http://python-backend:5000

volumes:
  postgres_data:
```

### Deploy with Docker
```bash
docker-compose up -d
```

## ☁️ Option 3: Cloud Providers

### AWS (ECS + RDS)
1. Create RDS PostgreSQL instance
2. Build Docker images and push to ECR
3. Create ECS services for both apps
4. Configure load balancer

### Google Cloud (Cloud Run)
1. Create Cloud SQL PostgreSQL instance
2. Build and push images to Google Container Registry
3. Deploy to Cloud Run
4. Configure custom domain

### DigitalOcean App Platform
1. Create managed PostgreSQL database
2. Create app from GitHub
3. Configure components for Next.js and Python
4. Set environment variables

## 🔧 Environment Variables Reference

### Next.js App (.env.local)
```bash
DATABASE_URL="postgresql://username:password@host:port/database"
DIRECT_URL="postgresql://username:password@host:port/database"
JWT_SECRET="your-32-character-secret-key"
GEMINI_API_KEY="your-google-ai-api-key"
YOUTUBE_APIKEY="your-youtube-api-key"
PYTHON_SERVER_URL="https://your-python-server.railway.app"
```

### Python Server (.env)
```bash
FLASK_ENV=production
PORT=5000
OPENAI_API_KEY="your-openai-key" # if using OpenAI
PINECONE_API_KEY="your-pinecone-key" # if using Pinecone
```

## 🚨 Important Notes

1. **Database Migrations**: Run `npx prisma migrate deploy` after database setup
2. **CORS**: Update Python server CORS settings for production URLs
3. **API Keys**: Never commit API keys to GitHub - use environment variables
4. **File Uploads**: Configure file storage (AWS S3, Cloudinary, etc.)
5. **Python Dependencies**: Some ML libraries need system dependencies

## 🔍 Troubleshooting

### Common Issues:
- **Build fails**: Check Python dependencies and system requirements
- **Database connection**: Verify DATABASE_URL format and network access
- **API timeouts**: Increase serverless function timeout limits
- **CORS errors**: Configure proper origins in Flask server

### Testing Deployment:
1. Test API endpoints: `/api/health`
2. Test database connection
3. Test Python server communication
4. Test file upload functionality

## 📞 Need Help?

If you run into issues:
1. Check application logs in your deployment platform
2. Test API endpoints individually
3. Verify all environment variables are set
4. Check database connectivity

Would you like me to help you with any specific deployment option? 