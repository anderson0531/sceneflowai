# 🚀 Vercel Deployment Guide for SceneFlow AI

This guide will help you resolve Vercel deployment issues and successfully deploy your SceneFlow AI application.

## 🔧 **Prerequisites**

1. **Node.js 16+** installed on your machine
2. **Vercel CLI** installed globally
3. **Git repository** with your SceneFlow AI code

## 📦 **Installation Steps**

### **1. Install Vercel CLI**
```bash
npm install -g vercel
```

### **2. Install Project Dependencies**
```bash
npm install
```

### **3. Verify Vercel Configuration**
Ensure you have these files in your project root:
- ✅ `vercel.json` - Vercel configuration
- ✅ `build-vercel.js` - Custom build script
- ✅ `.gitignore` - Proper file exclusions

## 🚀 **Deployment Steps**

### **Option 1: Deploy via Vercel CLI (Recommended)**

#### **First Time Deployment**
```bash
# Login to Vercel (if not already logged in)
vercel login

# Deploy to preview
npm run deploy:preview

# Deploy to production
npm run deploy
```

#### **Subsequent Deployments**
```bash
# Quick preview deployment
vercel

# Production deployment
vercel --prod
```

### **Option 2: Deploy via Vercel Dashboard**

1. **Push your code to GitHub**
2. **Go to [vercel.com](https://vercel.com)**
3. **Click "New Project"**
4. **Import your GitHub repository**
5. **Configure build settings:**
   - **Framework Preset**: Other
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

## 🛠️ **Troubleshooting Common Issues**

### **Issue 1: Build Failures**

#### **Problem**: Build script not found
```bash
# Solution: Ensure build script exists and is executable
chmod +x build-vercel.js
npm run build
```

#### **Problem**: Missing dependencies
```bash
# Solution: Install all dependencies
npm install
npm install vercel --save-dev
```

### **Issue 2: File Not Found Errors**

#### **Problem**: Assets not loading
```bash
# Check if files exist in dist/ directory
ls -la dist/

# Rebuild if necessary
npm run build
```

#### **Problem**: Service Worker not working
```bash
# Ensure sw.js is copied to build directory
# Check vercel.json routes configuration
```

### **Issue 3: Routing Issues**

#### **Problem**: 404 errors on refresh
```bash
# This is handled by vercel.json routes
# Ensure SPA routing is configured correctly
```

#### **Problem**: API routes not working
```bash
# Check vercel.json functions configuration
# Ensure API directory structure is correct
```

### **Issue 4: Environment Variables**

#### **Problem**: Missing environment variables
```bash
# Set environment variables in Vercel dashboard
# Or use vercel env add command
vercel env add VARIABLE_NAME
```

## 🔍 **Debugging Steps**

### **1. Check Build Output**
```bash
# Run build locally
npm run build

# Check dist/ directory contents
ls -la dist/
```

### **2. Test Locally**
```bash
# Serve built files locally
cd dist
npx http-server -p 8000

# Open http://localhost:8000 in browser
```

### **3. Check Vercel Logs**
```bash
# View deployment logs
vercel logs [deployment-url]

# View function logs
vercel logs [deployment-url] --function=api
```

### **4. Verify Configuration**
```bash
# Check Vercel configuration
vercel inspect [deployment-url]
```

## 📱 **PWA Configuration for Vercel**

### **Service Worker Headers**
The `vercel.json` includes proper headers for PWA functionality:
- `Cache-Control: no-cache` for sw.js
- `Service-Worker-Allowed: /` for service worker scope

### **Manifest.json**
Ensure your `manifest.json` is properly configured and copied to the build directory.

## 🌐 **Custom Domain Setup**

### **1. Add Custom Domain in Vercel Dashboard**
1. Go to your project settings
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

### **2. Update Homepage in package.json**
```json
{
  "homepage": "https://yourdomain.com"
}
```

## 📊 **Performance Optimization**

### **1. Enable Compression**
Vercel automatically compresses static assets.

### **2. CDN Distribution**
Vercel provides global CDN for fast loading worldwide.

### **3. Automatic HTTPS**
Vercel provides SSL certificates automatically.

## 🔒 **Security Considerations**

### **1. Environment Variables**
- Never commit sensitive data to Git
- Use Vercel environment variables for API keys
- Use `.env.local` for local development

### **2. Headers**
The `vercel.json` includes security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

## 📋 **Deployment Checklist**

Before deploying, ensure:

- [ ] All dependencies are installed (`npm install`)
- [ ] Build script runs successfully (`npm run build`)
- [ ] `dist/` directory contains all necessary files
- [ ] `vercel.json` is properly configured
- [ ] `.gitignore` excludes unnecessary files
- [ ] Environment variables are set (if needed)
- [ ] Custom domain is configured (if applicable)

## 🆘 **Getting Help**

### **Vercel Support**
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Vercel Support](https://vercel.com/support)

### **SceneFlow AI Specific Issues**
- Check this deployment guide
- Review `vercel.json` configuration
- Verify build script output
- Test locally before deploying

## 🎉 **Success Indicators**

Your deployment is successful when:

1. ✅ Build completes without errors
2. ✅ All assets load correctly
3. ✅ Service worker registers properly
4. ✅ PWA install prompt appears
5. ✅ All workflow features work as expected
6. ✅ Cue Assistant responds correctly
7. ✅ Credit system functions properly

---

**Happy Deploying! 🚀**

If you continue to experience issues, please check the troubleshooting section above or refer to the Vercel documentation for additional help.
