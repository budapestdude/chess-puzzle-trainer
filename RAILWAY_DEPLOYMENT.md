# Railway Deployment Guide for Chess Puzzle Trainer

## Prerequisites
- Railway account (sign up at https://railway.app)
- GitHub repository connected (already done: budapestdude/chess-puzzle-trainer)

## Deployment Steps

### Option 1: Deploy from GitHub (Recommended)

1. **Login to Railway**
   - Go to https://railway.app
   - Sign in with your GitHub account

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `budapestdude/chess-puzzle-trainer` repository
   - Railway will automatically detect the configuration

3. **Environment Variables**
   - Railway will automatically set the `PORT` variable
   - Add any additional environment variables if needed:
     - `NODE_ENV=production` (optional, for production mode)

4. **Deploy**
   - Railway will automatically deploy your app
   - Wait for the build to complete (usually 2-3 minutes)

### Option 2: Deploy via Railway CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   railway link
   ```
   - Select your existing project or create a new one

4. **Deploy**
   ```bash
   railway up
   ```

## Post-Deployment Setup

### 1. Get Your App URL
- After deployment, Railway will provide a URL like:
  - `https://your-app-name.railway.app`

### 2. Database Persistence
- The SQLite database (`chess_puzzle_trainer.db`) is included
- For production, consider:
  - Using Railway's PostgreSQL service
  - Setting up volume mounts for SQLite persistence

### 3. Custom Domain (Optional)
- Go to your Railway project settings
- Navigate to "Domains"
- Add your custom domain
- Update DNS records as instructed

## Features Deployed

Your deployed app includes:
- ✅ Express.js server
- ✅ SQLite database with 222,124 puzzles
- ✅ Progressive Web App (PWA) support
- ✅ Offline mode with service worker
- ✅ Mobile-responsive design
- ✅ Analytics dashboard
- ✅ Gamification system
- ✅ Learning mode with hints
- ✅ Social features
- ✅ AI-powered personalization

## Monitoring

### Health Check
- Railway automatically monitors `/` endpoint
- Check deployment logs in Railway dashboard

### Logs
- View logs in Railway dashboard
- Or use CLI: `railway logs`

## Troubleshooting

### If deployment fails:
1. Check build logs in Railway dashboard
2. Ensure all dependencies are in `package.json`
3. Verify `NODE_ENV` is not blocking production features

### Database issues:
- The SQLite file is large (72MB)
- If deployment fails due to size:
  1. Add to `.gitignore`: `chess_puzzle_trainer.db`
  2. Use Railway volumes or PostgreSQL
  3. Initialize database on first run

### Port issues:
- Railway automatically sets PORT environment variable
- Server already configured to use `process.env.PORT || 3000`

## Update Deployment

To update your deployed app:
1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your update message"
   git push origin main
   ```
3. Railway will automatically redeploy

## Useful Railway Commands

```bash
# View deployment status
railway status

# Open app in browser
railway open

# View logs
railway logs

# Run commands in production
railway run [command]

# Environment variables
railway variables
```

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues: https://github.com/budapestdude/chess-puzzle-trainer/issues