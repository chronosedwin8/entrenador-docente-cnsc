# Wompi Integration Deployment Guide
# Date: 2026-01-10

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Wompi Integration Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check for Supabase CLI
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCli) {
    Write-Host "[ERROR] Supabase CLI not found. Install it first:" -ForegroundColor Red
    Write-Host "  npm install -g supabase" -ForegroundColor Yellow
    Write-Host "  OR" -ForegroundColor Yellow
    Write-Host "  scoop install supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "[INFO] Supabase CLI found." -ForegroundColor Green

# Step 1: Set Supabase Secrets
Write-Host ""
Write-Host "STEP 1: Setting Wompi Secrets in Supabase..." -ForegroundColor Yellow
Write-Host ""

# Secrets to set
$secrets = @{
    "WOMPI_PRIVATE_KEY"      = "prv_test_Jl8PEX6z5g75JQOn3kej52zxuMFmqgvZ"
    "WOMPI_EVENTS_SECRET"    = "test_events_EkmH1D9sKpjO3PRlsZuaVZ6EFxXbVzxR"
    "WOMPI_INTEGRITY_SECRET" = "test_integrity_L8R3etJdejhepuVwwxhptc0jjTkDsIxJ"
    "WOMPI_ENVIRONMENT"      = "sandbox"
}

foreach ($key in $secrets.Keys) {
    Write-Host "  Setting $key..." -ForegroundColor Gray
    $value = $secrets[$key]
    supabase secrets set "$key=$value" --project-ref ipostjjiabsmunnewolt
}

Write-Host "[OK] Secrets configured." -ForegroundColor Green

# Step 2: Deploy Edge Functions
Write-Host ""
Write-Host "STEP 2: Deploying Edge Functions..." -ForegroundColor Yellow
Write-Host ""

$functionsDir = Join-Path $PSScriptRoot "supabase\functions"

# Deploy create-payment-intent
Write-Host "  Deploying create-payment-intent..." -ForegroundColor Gray
supabase functions deploy create-payment-intent --project-ref ipostjjiabsmunnewolt

# Deploy wompi-webhook (IMPORTANT: disable JWT verification for webhooks)
Write-Host "  Deploying wompi-webhook (no-verify-jwt)..." -ForegroundColor Gray
supabase functions deploy wompi-webhook --project-ref ipostjjiabsmunnewolt --no-verify-jwt

Write-Host "[OK] Edge Functions deployed." -ForegroundColor Green

# Step 3: Apply Database Migration
Write-Host ""
Write-Host "STEP 3: Database Migration Info" -ForegroundColor Yellow
Write-Host ""
Write-Host "  The migration file is located at:" -ForegroundColor Gray
Write-Host "  supabase\migrations\20260110_create_transactions_table.sql" -ForegroundColor White
Write-Host ""
Write-Host "  Run the following command to apply it:" -ForegroundColor Gray
Write-Host "  supabase db push --project-ref ipostjjiabsmunnewolt" -ForegroundColor White
Write-Host ""
Write-Host "  OR apply manually via Supabase Dashboard SQL Editor." -ForegroundColor Gray

# Step 4: Frontend environment
Write-Host ""
Write-Host "STEP 4: Frontend Environment Variable" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Add the following to your .env.local file:" -ForegroundColor Gray
Write-Host "  VITE_WOMPI_PUBLIC_KEY=pub_test_WzcVDVC12mUQX9BYFQp0hdJnIS69a9Xl" -ForegroundColor White
Write-Host ""

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Apply the database migration (Step 3)" -ForegroundColor White
Write-Host "  2. Add VITE_WOMPI_PUBLIC_KEY to .env.local" -ForegroundColor White
Write-Host "  3. Run 'npm run dev' to test" -ForegroundColor White
Write-Host "  4. Configure webhook URL in Wompi Dashboard" -ForegroundColor White
Write-Host ""
