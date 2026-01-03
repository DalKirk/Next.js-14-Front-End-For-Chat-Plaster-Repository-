# Custom Domain Setup Guide for starcyeed.com

## Quick Reference

**Frontend**: www.starcyeed.com (canonical) → Vercel  
**Backend**: api.starcyeed.com → Railway  
**Redirect**: starcyeed.com → www.starcyeed.com (301)

---

## Step 1: Railway Backend Domain (api.starcyeed.com)

### In Railway Dashboard:
1. Go to your backend service
2. Click **Settings** → **Domains**
3. Click **Add Custom Domain**
4. Enter: `api.starcyeed.com`
5. Railway will show a CNAME target like:
   ```
   your-service-name.up.railway.app
   ```
6. **Copy this target** (you'll need it for DNS)

### Note:
- Railway auto-provisions SSL/TLS after DNS is verified
- Keep the Railway-provided domain as fallback
- CORS is already updated to allow `https://www.starcyeed.com`

---

## Step 2: DNS Configuration at Your Registrar

Add these DNS records at your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):

### Record 1: Apex → Vercel
- **Type**: `A`
- **Host/Name**: `@` (or leave blank for apex)
- **Value/Points to**: `76.76.21.21`
- **TTL**: `3600` (or Auto)

### Record 2: www → Vercel
- **Type**: `CNAME`
- **Host/Name**: `www`
- **Value/Points to**: `cname.vercel-dns.com`
- **TTL**: `3600` (or Auto)

### Record 3: api → Railway
- **Type**: `CNAME`
- **Host/Name**: `api`
- **Value/Points to**: `<your-railway-service>.up.railway.app` *(from Step 1)*
- **TTL**: `3600` (or Auto)

### Alternative: Use Vercel DNS (Optional)
Instead of A/CNAME records, you can transfer nameservers to Vercel:
1. Vercel → Project → Settings → Domains → "Use Vercel DNS"
2. Vercel will show NS records like:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
3. Update nameservers at your registrar
4. Manage all DNS records inside Vercel dashboard

---

## Step 3: Vercel Frontend Domain

### In Vercel Dashboard:
1. Go to your project
2. Click **Settings** → **Domains**
3. Click **Add Domain**
4. Add: `starcyeed.com` → Click Add
5. Add: `www.starcyeed.com` → Click Add
6. Vercel will:
   - Verify DNS
   - Issue SSL certificates (automatic)
   - Route traffic per your `vercel.json` redirect

### Expected behavior:
- `https://starcyeed.com` → 301 redirect to `https://www.starcyeed.com`
- `https://www.starcyeed.com` → serves your Next.js app
- `https://api.starcyeed.com` → serves your Railway backend

---

## Step 4: Verify DNS Propagation

Run the verification script:
```powershell
.\scripts\verify-dns.ps1
```

Or manually check:
```powershell
# Check A record (apex)
nslookup starcyeed.com

# Check CNAME (www)
nslookup www.starcyeed.com

# Check CNAME (api)
nslookup api.starcyeed.com

# Test HTTPS
curl -I https://www.starcyeed.com
curl -I https://api.starcyeed.com/health
```

---

## Step 5: Update Environment Variables (Already Done ✓)

### Local Development (.env.local):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Production (vercel.json):
```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.starcyeed.com",
    "NEXT_PUBLIC_WS_URL": "wss://api.starcyeed.com"
  }
}
```

### Backend CORS (Already Updated ✓):
- Allow origin: `https://www.starcyeed.com`
- Optional: `https://api.starcyeed.com` (if frontend calls itself)

---

## Timeline

1. **DNS Records Added** → Wait 5-30 minutes for propagation
2. **Vercel Domain Added** → SSL issued within 5 minutes after DNS valid
3. **Railway Domain Added** → SSL issued within 5 minutes after DNS valid
4. **Full Propagation** → Up to 48 hours globally (usually much faster)

---

## Troubleshooting

### DNS Not Resolving?
- Wait 15-30 minutes after adding records
- Clear local DNS cache: `ipconfig /flushdns`
- Check with: `nslookup <domain> 8.8.8.8` (Google DNS)
- Verify records at registrar (typos in host/value)

### SSL Certificate Pending?
- Vercel/Railway need valid DNS before issuing certs
- Check Vercel → Domains → Status indicator
- Railway → Service → Domains → Status

### 502/503 Errors on api.starcyeed.com?
- Ensure Railway service is running
- Check Railway logs for backend errors
- Verify CORS allows `https://www.starcyeed.com`

### Redirect Not Working?
- Ensure `vercel.json` deployed (commit + push)
- Test: `curl -I https://starcyeed.com` should show 301/308
- Check Vercel deployment logs

---

## Post-Setup Checklist

- [ ] Railway domain added and CNAME target copied
- [ ] All 3 DNS records added at registrar
- [ ] Both domains added in Vercel
- [ ] DNS resolves (run verify-dns.ps1)
- [ ] HTTPS works on www.starcyeed.com
- [ ] HTTPS works on api.starcyeed.com
- [ ] Apex redirects to www (301)
- [ ] Frontend can call backend API
- [ ] WebSocket connections work (if applicable)

---

## Quick Commands

```powershell
# Verify DNS
.\scripts\verify-dns.ps1

# Test frontend
curl https://www.starcyeed.com

# Test backend
curl https://api.starcyeed.com/health

# Test redirect
curl -I https://starcyeed.com

# Deploy to Vercel (if using Git integration)
git add .
git commit -m "Configure custom domain"
git push
```

---

Need help? Check:
- Vercel Docs: https://vercel.com/docs/custom-domains
- Railway Docs: https://docs.railway.app/deploy/custom-domains
