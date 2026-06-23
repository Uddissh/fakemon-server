#!/bin/bash
# Fakemon Chaos — Quick Deploy to Vercel
# Usage: ./quick-deploy.sh

set -e

echo ""
echo "============================================================"
echo "🚀 Fakemon Chaos — Quick Deploy to Vercel"
echo "============================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it first."
    echo "   Download: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: You need to configure .env before deploying!"
    echo ""
    echo "Run the interactive setup wizard:"
    echo "   npm run db:setup"
    echo ""
    echo "Or manually edit .env and set these required variables:"
    echo "   - DATABASE_URL"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo "   - JWT_SHARED_SECRET"
    echo "   - DISCORD_CLIENT_ID"
    echo "   - DISCORD_CLIENT_SECRET"
    echo ""
    exit 0
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo ""
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo ""
echo "============================================================"
echo "Step 1: Supabase Setup"
echo "============================================================"
echo ""
echo "👉 Do you need to set up Supabase? (y/n)"
read -r setup_supabase

if [[ "$setup_supabase" =~ ^[Yy]$ ]]; then
    echo ""
    echo "Running Supabase setup wizard..."
    npm run db:setup
else
    echo "Skipping Supabase setup."
fi

echo ""
echo "============================================================"
echo "Step 2: Run Database Migrations"
echo "============================================================"
echo ""

read -p "Run database migrations now? (y/n): " run_migrations
if [[ "$run_migrations" =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔧 Running migrations..."
    npm run db:migrate
else
    echo "Skipping migrations."
fi

echo ""
echo "============================================================"
echo "Step 3: Verify Database"
echo "============================================================"
echo ""

read -p "Verify database setup? (y/n): " verify_db
if [[ "$verify_db" =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔍 Verifying..."
    npm run db:verify
else
    echo "Skipping verification."
fi

echo ""
echo "============================================================"
echo "Step 4: Deploy to Vercel"
echo "============================================================"
echo ""

# Check if already linked to Vercel
if [ ! -d ".vercel" ]; then
    echo "🔗 Linking to Vercel..."
    vercel link
fi

echo ""
echo "🚀 Deploying to Vercel..."
echo ""

# Deploy to production
vercel --prod

echo ""
echo "============================================================"
echo "✅ Deployment Complete!"
echo "============================================================"
echo ""
echo "📊 Your app is now live on Vercel!"
echo ""
echo "Next steps:"
echo "1. Add environment variables in Vercel dashboard:"
echo "   https://vercel.com/dashboard"
echo ""
echo "2. Update Discord OAuth2 redirect URI:"
echo "   https://discord.com/developers/applications"
echo "   Add: https://your-app.vercel.app/auth/discord/callback"
echo ""
echo "3. Test your deployment:"
echo "   curl https://your-app.vercel.app/health"
echo ""
echo "📚 For detailed instructions, see VERCEL_DEPLOY.md"
echo ""