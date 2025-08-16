@echo off
echo 🔧 Fixing Vercel deployment issues for SceneFlow AI...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1,2 delims=." %%a in ('node --version') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:~1%
if %NODE_VERSION% lss 16 (
    echo ❌ Node.js version 16+ is required. Current version: 
    node --version
    pause
    exit /b 1
)

echo ✅ Node.js version: 
node --version

REM Install Vercel CLI globally if not installed
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installing Vercel CLI...
    npm install -g vercel
) else (
    echo ✅ Vercel CLI already installed
)

REM Install project dependencies
echo 📦 Installing project dependencies...
npm install

REM Test build locally
echo 🧪 Testing build locally...
npm run build

REM Check if build was successful
if %errorlevel% equ 0 (
    echo ✅ Build successful!
    
    REM Check if dist directory exists and has content
    if exist "dist" (
        echo ✅ Build directory created with content
        echo 📁 Build directory contents:
        dir dist
    ) else (
        echo ❌ Build directory is missing
        pause
        exit /b 1
    )
) else (
    echo ❌ Build failed. Please check the error messages above.
    pause
    exit /b 1
)

REM Check Vercel configuration
echo 🔍 Checking Vercel configuration...
if exist "vercel.json" (
    echo ✅ vercel.json found
) else (
    echo ❌ vercel.json missing
    pause
    exit /b 1
)

REM Check .gitignore
echo 🔍 Checking .gitignore...
if exist ".gitignore" (
    echo ✅ .gitignore found
) else (
    echo ❌ .gitignore missing
    pause
    exit /b 1
)

echo.
echo 🎉 All checks passed! Your SceneFlow AI app is ready for Vercel deployment.
echo.
echo 🚀 To deploy:
echo    1. npm run deploy:preview  (for preview)
echo    2. npm run deploy          (for production)
echo.
echo 📖 For detailed instructions, see VERCEL_DEPLOYMENT.md
echo.
echo 🔧 If you encounter issues:
echo    1. Check VERCEL_DEPLOYMENT.md
echo    2. Run: vercel logs [deployment-url]
echo    3. Ensure all environment variables are set
echo.
pause
