# Troubleshooting: Templates Not Showing

## Quick Checks

### 1. Server Status
```bash
# Check if server is running
ps aux | grep "npm run dev" | grep -v grep

# Check recent logs
tail -n 50 /tmp/vestme-server.log
```

**Expected:** Server running on port 3000, "Template system initialized successfully with 8 templates"

### 2. Browser Console (F12)
Open `/admin/templates` and check for:
- ❌ Red errors in console
- ⚠️ Yellow warnings about state mutations
- 🔴 Failed network requests

### 3. Network Tab
1. Open DevTools → Network
2. Refresh page
3. Find: `GET /api/admin/templates`
4. Check:
   - Status: Should be 200 or 304
   - Response: Should show array of templates

### 4. React Query DevTools
Look for:
- Query key: `["/api/admin/templates"]`
- Status: Should be "success"
- Data: Should have templates array

## Common Issues

### Issue 1: "Cannot assign to read only property"
**Cause:** Array mutation on Zustand/Immer state  
**Fix:** Create array copy before sorting
```typescript
// ❌ Wrong
template.elements.sort(...)

// ✅ Correct  
[...template.elements].sort(...)
```

### Issue 2: Templates array is empty
**Check:**
```javascript
// In browser console on /admin/templates page
// Check if data is being fetched
console.log('Templates query status')
```

**Server logs should show:**
```
✓ Found 8 system templates
✓ Cache rebuilt with 8 templates
✓ Template system initialized successfully
```

### Issue 3: Authentication failing
**Symptoms:** API returns 401 or "No valid authorization header"

**Check:** 
- Are you logged in?
- Try logging out and back in
- Check browser console for Supabase errors

### Issue 4: Filters hiding templates
**Check:**
- Search box is empty
- Category dropdown is "all"
- No active filters

## Debug Mode

Add this to template-management.tsx temporarily:

```typescript
// Add after the useAdminTemplates hook
console.log('🔍 Templates Debug:', {
  isLoading,
  error,
  templatesCount: templates?.length,
  templates: templates?.map(t => ({ id: t.id, name: t.name }))
});
```

This will log template data to console.

## Manual API Test

```bash
# Get your auth token from browser
# 1. Open DevTools → Application → Local Storage
# 2. Find Supabase auth token
# 3. Use in curl:

curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/admin/templates
```

## Reset Steps

If all else fails:

```bash
# 1. Stop server
pkill -f "npm run dev"

# 2. Clear cache
rm -rf node_modules/.vite

# 3. Restart
npm run dev
```

## Database Check

```sql
-- Check templates in database
SELECT id, name, category, "isEnabled" 
FROM slide_templates 
ORDER BY "displayOrder";
```

**Expected:** 8 templates, all enabled

## Server Restart

```bash
cd /Users/vrej.sanati/apps/vestme
pkill -f "node.*server" || true
npm run dev > /tmp/vestme-server.log 2>&1 &

# Wait 5 seconds
sleep 5

# Check status
tail -n 30 /tmp/vestme-server.log
```

## Frontend-Only Issues

If server logs show templates loading but UI doesn't show them:

**Possible causes:**
1. React Query cache issue → Clear browser cache
2. Component rendering error → Check console
3. Array mutation error → Check for `.sort()` on state arrays
4. CSS hiding elements → Inspect with DevTools
5. Conditional rendering bug → Check template-management.tsx logic

## Contact Info

If none of these work, provide:
1. Server log output
2. Browser console errors
3. Network tab screenshot
4. React Query DevTools status

