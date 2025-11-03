@echo off
REM Commit MarkdownRenderer list fix to GitHub
echo ====================================
echo Committing Markdown List Fix
echo ====================================

cd /d "C:\Users\g-kd\OneDrive\Desktop\video-chat-frontend"

echo.
echo Staging MarkdownRenderer.tsx...
git add components/MarkdownRenderer.tsx

echo.
echo Creating commit...
git commit -m "fix: change list rendering from list-inside to list-outside" -m "- Bullets and numbers now appear at start of line, not on separate line" -m "- Added proper padding-left (1.5rem) for list indentation" -m "- Changed list-style-position to outside for proper display"

echo.
echo Pulling latest changes...
git pull --rebase origin master

echo.
echo Pushing to GitHub...
git push origin master

echo.
echo ====================================
echo Done! Vercel will auto-deploy
echo Check: https://next-js-14-front-end-for-chat-plast-kappa.vercel.app/
echo ====================================
pause
