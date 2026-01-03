# GoDaddy DNS Setup for starcyeed.com

## Step-by-Step Instructions

### 1. Log into GoDaddy
1. Go to https://www.godaddy.com
2. Click **Sign In** (top right)
3. Enter your credentials

### 2. Navigate to DNS Management
1. Click your profile icon → **My Products**
2. Find **starcyeed.com** in your domain list
3. Click the **DNS** button next to the domain
   - Or click the three dots (•••) → **Manage DNS**

### 3. Add the Three DNS Records

You'll see a list of existing DNS records. Click **Add** for each new record:

---

#### Record 1: Apex Domain → Vercel

Click **Add** button:
- **Type**: Select `A`
- **Name**: `@`
- **Value**: `76.76.21.21`
- **TTL**: `1 Hour` (or leave default)

Click **Save**

---

#### Record 2: WWW Subdomain → Vercel

Click **Add** button:
- **Type**: Select `CNAME`
- **Name**: `www`
- **Value**: `cname.vercel-dns.com`
- **TTL**: `1 Hour` (or leave default)

Click **Save**

---

#### Record 3: API Subdomain → Railway

Click **Add** button:
- **Type**: Select `CNAME`
- **Name**: `api`
- **Value**: `b9bs6i89.up.railway.app`
- **TTL**: `1 Hour` (or leave default)

Click **Save**

---

### 4. Remove Conflicting Records (If Needed)

**Important**: If you see existing records that conflict, you may need to remove them:

- If there's an existing `A` record for `@` pointing elsewhere → Delete it
- If there's an existing `CNAME` for `www` pointing to GoDaddy parking → Delete it
- If there's a `CNAME` for `@` (not allowed with A record) → Delete it

**Common GoDaddy parking record to remove:**
- Type: `CNAME`, Name: `@`, Value: `@` or `parked`

---

### 5. Verify Your Changes

After adding all three records, you should see:

| Type  | Name | Value/Points To              | TTL    |
|-------|------|------------------------------|--------|
| A     | @    | 76.76.21.21                  | 1 Hour |
| CNAME | www  | cname.vercel-dns.com         | 1 Hour |
| CNAME | api  | b9bs6i89.up.railway.app      | 1 Hour |

---

### 6. Wait for Propagation

- **Typical time**: 5-30 minutes
- **Maximum time**: Up to 48 hours (rarely)
- GoDaddy DNS usually propagates within 10-15 minutes

### 7. Check DNS Status

After 10-15 minutes, run the verification script:

```powershell
.\scripts\verify-dns.ps1
```

Or check manually:
```powershell
nslookup starcyeed.com
nslookup www.starcyeed.com
nslookup api.starcyeed.com
```

---

## Common GoDaddy Issues

### Issue: Can't add CNAME for @ (apex)
**Solution**: Use A record for `@` instead. CNAME for apex is not allowed by DNS standards.

### Issue: "Record already exists"
**Solution**: 
1. Find the existing record in the list
2. Click the pencil icon to edit it
3. Update the value to match above
4. Or delete it and add new

### Issue: Forwarding is enabled
**Solution**:
1. Go to **Domain Settings** (not DNS)
2. Click **Manage** next to Forwarding
3. **Disable** domain forwarding
4. Return to DNS management

### Issue: DNS changes not showing
**Solution**:
1. Clear your local DNS cache:
   ```powershell
   ipconfig /flushdns
   ```
2. Check with Google DNS:
   ```powershell
   nslookup starcyeed.com 8.8.8.8
   ```
3. Wait 5 more minutes and try again

---

## Next Steps After DNS is Configured

1. **Wait 15 minutes** for initial propagation
2. **Run verification script**:
   ```powershell
   .\scripts\verify-dns.ps1
   ```
3. **Add domains in Vercel**:
   - Go to your Vercel project
   - Settings → Domains
   - Add `starcyeed.com`
   - Add `www.starcyeed.com`
4. **Verify Railway**:
   - Railway will automatically detect the DNS
   - SSL will be issued within 5 minutes

---

## GoDaddy Support Resources

- DNS Management: https://www.godaddy.com/help/manage-dns-records-680
- CNAME Records: https://www.godaddy.com/help/add-a-cname-record-19236
- A Records: https://www.godaddy.com/help/add-an-a-record-19238

---

## Quick Reference Card

**Your DNS records for copy-paste:**

```
Record 1 (A):
Name: @
Value: 76.76.21.21

Record 2 (CNAME):
Name: www
Value: cname.vercel-dns.com

Record 3 (CNAME):
Name: api
Value: b9bs6i89.up.railway.app
```

**After adding these, your sites will be:**
- https://www.starcyeed.com (main site)
- https://starcyeed.com (redirects to www)
- https://api.starcyeed.com (backend API)
