# 🪟 Windows Setup & Management Guide

This guide provides Windows PowerShell commands for managing the Couple Chat application.

## ✅ Prerequisites

- Node.js 18+ installed
- Git installed
- Windows PowerShell (or PowerShell 7+)
- Vercel CLI installed globally

## 🚀 Quick Start Commands

### Start Both Servers (Development)

```powershell
# In PowerShell Terminal 1 - Start Backend
cd 'c:\Users\Rushi Shivshette\Downloads\New folder\couple-chat\backend'
npm start

# In PowerShell Terminal 2 - Start Frontend
cd 'c:\Users\Rushi Shivshette\Downloads\New folder\couple-chat\frontend'
npm run dev
```

**Access the app:**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

### Kill All Node Processes (If Needed)

```powershell
taskkill /F /IM node.exe
```

### Check Running Servers

```powershell
# Check if backend is running on port 3001
netstat -ano | findstr :3001

# Check if frontend is running on port 5173
netstat -ano | findstr :5173
```

## 📝 Git Commands (Windows PowerShell)

### Check Status
```powershell
cd 'c:\Users\Rushi Shivshette\Downloads\New folder\couple-chat'
git status
```

### View Recent Commits (CORRECT WAY)
```powershell
# Windows PowerShell syntax (NOT Unix 'head')
cd 'c:\Users\Rushi Shivshette\Downloads\New folder\couple-chat'
git log --oneline | Select-Object -First 5
```

### Add and Commit Changes
```powershell
cd 'c:\Users\Rushi Shivshette\Downloads\New folder\couple-chat'
git add -A
git commit -m "Your commit message here"
```

### Push to GitHub
```powershell
cd 'c:\Users\Rushi Shivshette\Downloads\New folder\couple-chat'
git push origin master
```

## 🚀 Vercel Deployment

### Deploy to Production
```powershell
cd 'c:\Users\Rushi Shivshette\Downloads\New folder\couple-chat'
vercel --prod
```

### Login to Vercel
```powershell
vercel login
```

## 🔍 Troubleshooting Commands

### Check Node Version
```powershell
node --version
npm --version
```

### Clear npm Cache
```powershell
npm cache clean --force
```

### Reinstall Dependencies
```powershell
# Backend
cd 'c:\Users\Rushi Shivshette\Downloads\New folder\couple-chat\backend'
Remove-Item -Recurse node_modules
npm install

# Frontend
cd 'c:\Users\Rushi Shivshette\Downloads\New folder\couple-chat\frontend'
Remove-Item -Recurse node_modules
npm install
```

### View Backend Logs
```powershell
cd 'c:\Users\Rushi Shivshette\Downloads\New folder\couple-chat\backend'
node server.js
```

### View Frontend Logs
```powershell
cd 'c:\Users\Rushi Shivshette\Downloads\New folder\couple-chat\frontend'
npm run dev
```

## 🔐 Login Credentials

```
User 1:
  Name: Sarojana
  Password: love24

User 2:
  Name: Rushi
  Password: love24
```

## 💡 Important Notes for Windows Users

❌ **DON'T USE:** Unix/Linux commands like `head`, `tail`, `grep`, `ls`
✅ **USE INSTEAD:** PowerShell equivalents:

| Unix Command | PowerShell Alternative |
|------------|----------------------|
| `head -5` | `Select-Object -First 5` |
| `tail -5` | `Select-Object -Last 5` |
| `ls` | `Get-ChildItem` or `dir` |
| `grep` | `Select-String` |
| `rm -rf` | `Remove-Item -Recurse -Force` |
| `cat` | `Get-Content` |

## 🔗 Useful Links

- **GitHub Repository:** https://github.com/RushiREPO/ourspace
- **Live App (Vercel):** https://couple-chat-alpha.vercel.app
- **Backend (Local):** http://localhost:3001
- **Frontend (Local):** http://localhost:5173

## 📊 Current Status

- ✅ Both servers ready to run
- ✅ End-to-End Encryption enabled
- ✅ GitHub repo linked
- ✅ Vercel deployment active
- ✅ All features working

## 🆘 Emergency Commands

```powershell
# Kill everything and start fresh
taskkill /F /IM node.exe
Start-Sleep -Seconds 2

# Clean repository
cd 'c:\Users\Rushi Shivshette\Downloads\New folder\couple-chat'
git clean -fd
git reset --hard

# Reinstall all dependencies
cd backend; Remove-Item -Recurse node_modules; npm install
cd ../frontend; Remove-Item -Recurse node_modules; npm install
```

---

**Last Updated:** March 23, 2026
**Platform:** Windows PowerShell
