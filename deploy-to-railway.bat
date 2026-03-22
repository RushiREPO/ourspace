@echo off
echo 🚀 Deploying Couple Chat to Railway...
echo.

echo 📦 Building frontend...
cd frontend
call npm install
call npm run build
cd ..

echo 🔧 Setting up Railway...
if not exist railway.json (
    echo Creating railway.json...
    echo { > railway.json
    echo   "build": { >> railway.json
    echo     "builder": "NIXPACKS" >> railway.json
    echo   }, >> railway.json
    echo   "deploy": { >> railway.json
    echo     "startCommand": "npm start" >> railway.json
    echo   } >> railway.json
    echo } >> railway.json
)

echo ✅ Ready for Railway deployment!
echo.
echo 📋 Next steps:
echo 1. Create a GitHub repository
echo 2. Push this code to GitHub
echo 3. Go to railway.app and deploy from your repo
echo 4. Set environment variables in Railway dashboard
echo.
echo 🔑 Required environment variables:
echo JWT_SECRET=your-long-random-secret-here
echo USER1_NAME=Sarojana
echo USER1_PASS=love24
echo USER2_NAME=Rushi
echo USER2_PASS=love24
echo NODE_ENV=production
echo.
pause