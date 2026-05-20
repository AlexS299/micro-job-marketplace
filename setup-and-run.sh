#!/usr/bin/env bash
set -e

echo "🚀 מגדיר מערכת הנה\"ח..."

# Clone
if [ ! -d "micro-job-marketplace" ]; then
  git clone -b claude/ai-business-accounting-app-2o4hx \
    https://github.com/AlexS299/micro-job-marketplace
fi

cd micro-job-marketplace

# .env
if [ ! -f ".env" ]; then
  cp .env.example .env
  # Generate random secret
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  sed -i.bak "s/your-random-secret-min-32-chars/$SECRET/" .env
  sed -i.bak "s/your-64-char-hex-key/$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")/" .env
  rm -f .env.bak
  echo "✅ .env נוצר"
fi

# Install
npm install --legacy-peer-deps

# DB
npx prisma db push

echo ""
echo "✅ הכל מוכן!"
echo ""
echo "פותח בדפדפן: http://localhost:3000"
echo "לעצירה: Ctrl+C"
echo ""

# Open browser (Mac/Linux)
(sleep 3 && open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null || true) &

npm run dev
