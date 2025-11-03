@echo off
REM Push conversation memory fix to Vercel frontend
echo ====================================
echo Pushing Frontend Fix to GitHub
echo ====================================

cd /d "C:\Users\g-kd\OneDrive\Desktop\video-chat-frontend"

echo.
echo Checking git status...
git status

echo.
echo Staging changes...
git add components/ChatInterface.tsx
git add CONVERSATION_FIX.md

echo.
echo Creating commit...
git commit -m "fix: add conversation_id tracking for memory" -m "- Generate unique conversation ID on component mount" -m "- Pass conversation_id to backend API" -m "- Add Clear Chat button that resets conversation" -m "- Add debug logging for conversation tracking" -m "" -m "Fixes issue where Claude couldn't remember user's name" -m "Frontend now properly sends conversation_id to backend"

echo.
echo Pulling latest changes...
git pull --rebase origin main

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo ====================================
echo Done! Vercel will auto-deploy
echo Check: https://next-js-14-front-end-for-chat-plast-kappa.vercel.app/
echo ====================================
pause
