# Security Action Plan - Quick Reference

## 🚨 CRITICAL - Fix Today

### 1. XSS Protection (30 minutes)
```bash
npm install dompurify isomorphic-dompurify @types/dompurify
```

**Files to update:**
- `client/src/components/SlideRenderer.tsx`
- `client/src/pages/deck-viewer.tsx`
- `client/src/components/ui/chart.tsx`

**Code change:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

// Replace ALL instances of:
dangerouslySetInnerHTML={{ __html: content }}

// With:
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'span', 'p', 'div'],
  ALLOWED_ATTR: ['style', 'class']
})}}
```

---

### 2. Admin Authorization (15 minutes)

**File:** `server/routes.ts` (line 2360-2365)

**Replace:**
```typescript
const isAdmin = (req: any, res: any, next: any) => {
  // TODO: Implement proper admin role checking
  next();
};
```

**With:**
```typescript
const isAdmin = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.id;
    const { storage } = await import('./storage');
    const user = await storage.getUser(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Admin access required' 
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed' });
  }
};
```

**Database migration needed:**
```sql
-- Add role column to users table
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@domain.com';
CREATE INDEX idx_users_role ON users(role);
```

---

### 3. Update Vulnerable Packages (10 minutes)
```bash
npm update undici
npm update js-yaml
npm audit fix --force
```

---

### 4. CSRF Protection (5 minutes)

**File:** `server/supabaseAuth.ts` (line 32-36)

**Update:**
```typescript
cookie: {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: sessionTtl,
}
```

---

## ⚡ HIGH PRIORITY - Fix This Week

### 5. CORS Configuration (15 minutes)
```bash
npm install cors @types/cors
```

**File:** `server/index.ts` (after line 9)

**Add:**
```typescript
import cors from 'cors';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'https://yourdomain.com',
  'https://www.yourdomain.com'
];

if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Update `.env.example`:**
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

### 6. Enhanced Security Headers (10 minutes)
```bash
npm install helmet
```

**File:** `server/index.ts` (after line 6)

**Add:**
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: false, // We have custom CSP
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

### 7. Remove Sensitive Logging (20 minutes)

**Files to update:**
- `server/supabaseAuth.ts` - Remove lines 51, 62, 66
- `client/src/lib/queryClient.ts` - Remove lines 43, 98
- `client/src/contexts/AuthContext.tsx` - Remove line 61

**Search and replace:** Remove all `console.log` containing:
- token
- password  
- secret
- key
- authorization

---

### 8. Rate Limiting on All Endpoints (30 minutes)

**File:** `server/routes.ts`

**Add after line 65:**
```typescript
import { rateLimiters } from './middleware/rateLimiter';

// Apply general rate limiting to all API routes
app.use('/api', rateLimiters.api);
```

---

## 📋 MEDIUM PRIORITY - Next 2 Weeks

### 9. Input Validation Middleware

Create `server/middleware/validate.ts`:
```typescript
import { z } from 'zod';
import { fromError } from 'zod-validation-error';

export const validate = (schema: z.ZodSchema) => {
  return async (req: any, res: any, next: any) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      const validationError = fromError(error);
      res.status(400).json({ 
        error: 'Validation failed', 
        message: validationError.toString(),
        details: error.errors 
      });
    }
  };
};
```

Apply to all POST/PUT endpoints.

---

### 10. Improved Error Handling

**File:** `server/index.ts` (replace lines 87-93)

```typescript
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Log error (implement proper logger)
  console.error('[ERROR]', {
    status,
    message: err.message,
    path: req.path,
    method: req.method,
    ...(isProduction ? {} : { stack: err.stack })
  });
  
  // Send sanitized response
  res.status(status).json({ 
    error: isProduction ? 'Internal Server Error' : err.message,
    ...(isProduction ? {} : { stack: err.stack })
  });
});
```

---

### 11. Environment Variable Validation

Create `server/env.ts`:
```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().default('3000'),
  ALLOWED_ORIGINS: z.string().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌ Invalid environment variables:');
  console.error(result.error.format());
  process.exit(1);
}

export const env = result.data;
```

**Import in `server/index.ts`:**
```typescript
import './env'; // Validates on startup
```

---

### 12. CSP with Nonces

**File:** `server/index.ts` (replace CSP section)

```typescript
import crypto from 'crypto';

app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;
  
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; ` +
    `script-src 'self' 'nonce-${nonce}'; ` +
    `style-src 'self' 'nonce-${nonce}'; ` +
    `img-src 'self' data: https: blob:; ` +
    `font-src 'self' data:; ` +
    `connect-src 'self' https:; ` +
    `frame-ancestors 'none'; ` +
    `report-uri /api/csp-report;`
  );
  
  next();
});

// CSP violation reporting
app.post('/api/csp-report', 
  express.json({ type: 'application/csp-report' }), 
  (req, res) => {
    console.warn('CSP Violation:', req.body);
    res.status(204).end();
  }
);
```

---

## 🔍 MONITORING - Set Up This Week

### 13. Add Sentry for Error Tracking
```bash
npm install @sentry/node @sentry/tracing
```

**File:** `server/index.ts`
```typescript
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Tracing.Integrations.Express({ app }),
  ],
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// ... your routes ...

app.use(Sentry.Handlers.errorHandler());
```

---

## 📝 DOCUMENTATION

### 14. Create security.txt

Create `client/public/.well-known/security.txt`:
```
Contact: security@yourdomain.com
Expires: 2026-12-31T23:59:59.000Z
Preferred-Languages: en
Canonical: https://yourdomain.com/.well-known/security.txt
```

---

## 🧪 TESTING

### 15. Security Testing Commands
```bash
# Dependency audit
npm audit

# Check for outdated packages
npm outdated

# Run security linter
npx eslint . --ext .ts,.tsx --max-warnings 0

# Check for secrets in code
npx trufflehog filesystem . --json

# OWASP dependency check (install first: npm i -g @cyclonedx/cyclonedx-npm)
cyclonedx-npm --output-file bom.json
```

---

## 📊 Progress Tracking

**Critical (Must Fix):**
- [ ] XSS Protection with DOMPurify
- [ ] Admin Authorization
- [ ] Update Vulnerable Packages
- [ ] CSRF Protection

**High Priority:**
- [ ] CORS Configuration
- [ ] Enhanced Security Headers
- [ ] Remove Sensitive Logging
- [ ] Rate Limiting on All Endpoints

**Medium Priority:**
- [ ] Input Validation Middleware
- [ ] Improved Error Handling
- [ ] Environment Variable Validation
- [ ] CSP with Nonces

**Monitoring:**
- [ ] Sentry Integration
- [ ] Security Documentation
- [ ] Testing Suite

---

## 🆘 Emergency Contacts

**Security Incident Response:**
1. Immediately revoke all API keys/tokens
2. Check audit logs for unauthorized access
3. Notify affected users if data breach
4. Document incident
5. Apply fixes
6. Conduct post-mortem

**Useful Resources:**
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Node.js Security Best Practices: https://nodejs.org/en/docs/guides/security/
- Express Security: https://expressjs.com/en/advanced/best-practice-security.html

---

**Last Updated:** November 17, 2025



