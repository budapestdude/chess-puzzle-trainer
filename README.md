# Chess Puzzle Trainer

An interactive chess puzzle training application with multiple game modes, user progress tracking, and a comprehensive puzzle database.

## Features

- 🎯 Multiple training modes (Standard, Rush, Focused)
- 📊 User progress tracking and statistics
- 🏆 Leaderboards and achievements
- 📱 Responsive design for all devices
- 🔐 User authentication system
- 💾 SQLite database with 2000+ puzzles

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript, Chess.js, Chessboard.js
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Authentication**: bcrypt
- **Security**: CORS, Rate Limiting

## Local Development

1. Clone the repository:
```bash
git clone <your-repo-url>
cd chess-puzzle-trainer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:3000 in your browser

## Deployment to Railway

### Prerequisites
- GitHub account
- Railway account (sign up at [railway.app](https://railway.app))

### Step-by-Step Deployment

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. **Deploy on Railway:**
   - Go to [railway.app](https://railway.app) and sign in
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will automatically detect Node.js and start deployment

3. **Configure Persistent Storage (IMPORTANT):**
   - In Railway dashboard, click on your service
   - Go to "Settings" → "Volumes"
   - Click "Add Volume"
   - Mount path: `/app/data`
   - This ensures your database persists between deployments

4. **Set Environment Variables:**
   - Go to "Variables" tab
   - Add the following:
   ```
   DATABASE_PATH=/app/data/chess_puzzle_trainer.db
   NODE_ENV=production
   ```
   - Optionally add:
   ```
   ALLOWED_ORIGINS=https://your-app.up.railway.app
   ```

5. **Generate Domain:**
   - Go to "Settings" → "Domains"
   - Click "Generate Domain"
   - Your app will be available at `https://your-app.up.railway.app`

### Important Notes

- **Database Persistence**: Without configuring a volume, your database will reset on each deployment
- **First Deploy**: The app will create the database automatically on first run
- **Monitoring**: Check logs in Railway dashboard for any issues
- **Costs**: Railway provides $5 free credit monthly

## Environment Variables

See `.env.example` for all configuration options:

- `NODE_ENV`: Set to 'production' for production deployments
- `PORT`: Automatically provided by Railway
- `DATABASE_PATH`: Path to SQLite database (use `/app/data/` on Railway)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins

## Project Structure

```
├── server.js           # Express server
├── database.js         # Database connection and queries
├── landing.html        # Landing page
├── trainer.html        # Main puzzle trainer
├── profile.html        # User profile page
├── admin.html          # Admin dashboard
├── trainerApp.js       # Puzzle trainer logic
├── userAuth.js         # Authentication logic
├── styles.css          # Main styles
└── trainer.css         # Trainer-specific styles
```

## Troubleshooting

### Database Issues on Railway
- Ensure volume is mounted at `/app/data`
- Check DATABASE_PATH environment variable is set correctly
- View logs for database connection errors

### CORS Errors
- Set ALLOWED_ORIGINS environment variable to your Railway domain
- Format: `https://your-app.up.railway.app`

### Port Issues
- Don't set PORT manually - Railway provides it automatically
- The app uses `process.env.PORT || 3000`

## Support

For issues or questions, please open an issue on GitHub.

## License

ISC