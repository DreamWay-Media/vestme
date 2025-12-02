# Image Upload Security Implementation

## Overview
Comprehensive multi-layer security system to protect against malicious image uploads, script injection, and abuse.

---

## 🛡️ Security Layers

### Layer 1: File Signature Verification
**Purpose**: Prevent file type spoofing  
**Implementation**: `ImageSecurityValidator.verifyFileSignature()`

- Validates file magic bytes match claimed MIME type
- Checks actual file headers (not just extensions)
- Supported formats: JPEG, PNG, WebP, GIF
- Prevents attackers from renaming malicious files (e.g., `script.js` → `image.jpg`)

**Magic Bytes Verified**:
- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47 0D 0A 1A 0A`
- WebP: `52 49 46 46` + `WEBP` at offset 8
- GIF: `47 49 46 38 37 61` (GIF87a) or `47 49 46 38 39 61` (GIF89a)

### Layer 2: Filename Sanitization
**Purpose**: Prevent path traversal and script injection  
**Implementation**: `ImageSecurityValidator.sanitizeFilename()`

- Removes path separators (`/`, `\`)
- Removes null bytes (`\0`)
- Replaces special characters with underscores
- Converts to lowercase for consistency
- Limits filename length to 100 characters
- Removes dangerous patterns (e.g., `../`, `%00`)

**Example**:
```
Input:  "../../../etc/passwd.jpg"
Output: "etc_passwd.jpg"

Input:  "my<script>alert('xss')</script>.png"
Output: "my_script_alert_xss_script_.png"
```

### Layer 3: Text Input Validation
**Purpose**: Prevent XSS in tags, descriptions, and alt text  
**Implementation**: `ImageSecurityValidator.sanitizeTextInput()`

**Blocked Patterns**:
- Script tags: `<script>`, `</script>`
- JavaScript protocol: `javascript:`
- Event handlers: `onclick=`, `onload=`, etc.
- Data URIs with HTML: `data:text/html`
- VBScript: `vbscript:`
- Path traversal: `../`, `%2e%2e`
- Null bytes: `%00`

**Limits**:
- Tags: 50 characters each
- Description: 1000 characters
- Alt text: 500 characters

### Layer 4: Image Dimension Validation
**Purpose**: Prevent image bombs (decompression attacks)  
**Implementation**: `ImageSecurityValidator.validateImageDimensions()`

**Limits**:
- Max width: 10,000 pixels
- Max height: 10,000 pixels
- Max total pixels: 50,000,000 (50 megapixels)

**Why**: Attackers can create small files that decompress to gigabytes in memory, causing DoS.

### Layer 5: Image Re-encoding & Sanitization
**Purpose**: Strip embedded scripts, EXIF data, and malicious payloads  
**Implementation**: `ImageSecurityValidator.sanitizeImageContent()`

**Process**:
1. Parse image with `sharp` (validates structure)
2. Strip ALL metadata (EXIF, IPTC, XMP, ICC profiles)
3. Re-encode image in its claimed format
4. Return sanitized buffer for upload

**Benefits**:
- Removes steganography payloads
- Strips GPS coordinates and camera info
- Removes potential script injection in metadata
- Validates image is actually processable
- GIFs are converted to PNG for additional safety

### Layer 6: Rate Limiting
**Purpose**: Prevent abuse and DoS attacks  
**Implementation**: `rateLimiters.upload` and `rateLimiters.extract`

**Upload Rate Limits**:
- 20 uploads per 15 minutes (per user)
- Only counts successful uploads
- Returns `429 Too Many Requests` with `Retry-After` header

**Extract Rate Limits**:
- 10 extractions per hour (per user)
- Prevents scraping abuse
- Protects against bandwidth exhaustion

**Headers Set**:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Timestamp when limit resets
- `Retry-After`: Seconds until retry allowed (on 429)

### Layer 7: Storage Quota Enforcement
**Purpose**: Prevent storage exhaustion  
**Implementation**: `MediaManager.checkStorageQuota()`

**Limits**:
- 32 MB per project (all media combined)
- 10 MB per individual file
- Returns clear error when quota exceeded

### Layer 8: HTTP Security Headers
**Purpose**: Browser-level protection against XSS and clickjacking  
**Implementation**: Express middleware in `server/index.ts`

**Headers**:
```http
Content-Security-Policy: default-src 'self'; img-src 'self' data: https: blob:; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Protects Against**:
- Cross-Site Scripting (XSS)
- Clickjacking
- MIME-sniffing attacks
- Information leakage via Referer
- Unwanted permission requests

### Layer 9: Supabase Storage Security
**Purpose**: Server-side file access control  
**Implementation**: Supabase Storage Policies

**Configuration**:
- Public bucket with signed URLs
- Row-level security policies
- User can only access their project's media
- Automatic HTTPS for all URLs
- CDN-backed for DDoS protection

---

## 🔍 Attack Scenarios & Mitigations

### Scenario 1: SVG Script Injection
**Attack**: Upload SVG with embedded JavaScript
```xml
<svg><script>alert('XSS')</script></svg>
```
**Mitigation**: 
- SVG not in allowed file types
- Even if allowed, re-encoding would strip scripts
- CSP headers prevent script execution

### Scenario 2: Polyglot File
**Attack**: File that's valid as both image and script
```
GIF89a<script>alert('XSS')</script>
```
**Mitigation**:
- File signature verification catches mismatches
- Re-encoding strips non-image data
- Served with correct `Content-Type` header

### Scenario 3: Metadata Injection
**Attack**: Embed malicious code in EXIF data
**Mitigation**:
- All metadata stripped during re-encoding
- EXIF, IPTC, XMP completely removed

### Scenario 4: Image Bomb
**Attack**: 1 KB file that decompresses to 10 GB
**Mitigation**:
- Dimension validation before processing
- Max 50 megapixels enforced
- Fails before memory exhaustion

### Scenario 5: Path Traversal
**Attack**: Filename `../../../etc/passwd.jpg`
**Mitigation**:
- Filename sanitization removes `../`
- Timestamp prefix ensures unique names
- Supabase storage is sandboxed per project

### Scenario 6: MIME Confusion
**Attack**: Upload `script.js` as `image/jpeg`
**Mitigation**:
- Magic byte verification catches mismatch
- Upload rejected before storage

### Scenario 7: DoS via Mass Uploads
**Attack**: Thousands of uploads to exhaust storage/bandwidth
**Mitigation**:
- Rate limiting: 20 uploads / 15 minutes
- Storage quota: 32 MB per project
- Both enforced server-side

### Scenario 8: XSS via Alt Text
**Attack**: Alt text: `<img src=x onerror=alert('XSS')>`
**Mitigation**:
- Text input validation blocks script patterns
- Database stores only sanitized text
- Frontend escapes all user content

---

## 📋 Validation Flow

```
User uploads file
    ↓
[Rate Limiter]
    ↓ (< 20 uploads / 15 min?)
[Security Validator]
    ↓
├─ Verify file signature (magic bytes)
├─ Sanitize filename
├─ Validate text inputs (tags, description, alt)
├─ Check image dimensions
└─ Re-encode & strip metadata
    ↓
[File Type Check]
    ↓ (allowed MIME type?)
[Storage Quota Check]
    ↓ (< 32 MB total?)
[Upload to Supabase]
    ↓ (sanitized buffer)
[AI Analysis]
    ↓ (tag generation)
[Database Insert]
    ↓ (sanitized metadata)
✅ Success
```

---

## 🧪 Testing Security

### Test 1: Type Spoofing
```bash
# Create fake image (actually a text file)
echo "malicious content" > fake.jpg

# Try to upload
# Expected: "File signature does not match claimed type"
```

### Test 2: Script Injection in Filename
```bash
# Try filename with script
filename: "test<script>alert('xss')</script>.jpg"
# Expected: Sanitized to "test_script_alert_xss_script_.jpg"
```

### Test 3: Path Traversal
```bash
# Try path traversal
filename: "../../../etc/passwd.jpg"
# Expected: Sanitized to "etc_passwd.jpg"
```

### Test 4: Image Bomb
```bash
# Create 1x1 pixel image, claim it's 20000x20000
# Expected: "Image dimensions exceed maximum allowed"
```

### Test 5: Rate Limiting
```bash
# Upload 21 files within 15 minutes
# Expected: 21st upload returns 429 with Retry-After header
```

### Test 6: XSS in Description
```bash
description: "<script>alert('xss')</script>"
# Expected: "Input contains potentially malicious content"
```

---

## 🔧 Configuration

### Environment Variables
```env
# Already configured
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### Adjustable Limits
File: `server/services/imageSecurityValidator.ts`
```typescript
const MAX_IMAGE_WIDTH = 10000;
const MAX_IMAGE_HEIGHT = 10000;
const MAX_TOTAL_PIXELS = 50000000;
```

File: `server/services/mediaManager.ts`
```typescript
const MAX_STORAGE_PER_PROJECT_MB = 32;
const MAX_FILE_SIZE_MB = 10;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
```

File: `server/middleware/rateLimiter.ts`
```typescript
upload: {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // uploads per window
}
```

---

## 🚨 Monitoring & Logging

All security events are logged:
```
🔒 Starting secure upload: filename.jpg
✅ Security validation passed for: filename.jpg
🧹 Image sanitized: 150000 bytes → 145000 bytes
✅ Media uploaded successfully with security validation: uuid
```

Failed security checks:
```
❌ Security validation failed: File signature does not match claimed type
⚠️  Upload warnings: Filename was sanitized for security
```

Rate limit hits:
```
429 Too Many Requests
Retry-After: 300
X-RateLimit-Remaining: 0
```

---

## 📚 References

- **OWASP File Upload Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- **CWE-434 (Unrestricted Upload)**: https://cwe.mitre.org/data/definitions/434.html
- **CWE-79 (XSS)**: https://cwe.mitre.org/data/definitions/79.html
- **Image Bombs**: https://en.wikipedia.org/wiki/Zip_bomb

---

## ✅ Security Checklist

- [x] File signature verification (magic bytes)
- [x] Filename sanitization
- [x] Text input validation (XSS prevention)
- [x] Image dimension limits (DoS prevention)
- [x] Metadata stripping (privacy + security)
- [x] Image re-encoding (payload removal)
- [x] Rate limiting (abuse prevention)
- [x] Storage quotas (resource limits)
- [x] HTTP security headers (CSP, X-Frame-Options, etc.)
- [x] MIME type validation
- [x] File size limits
- [x] User authentication required
- [x] Project-based access control
- [x] Comprehensive error logging
- [x] Supabase storage policies

---

## 🔄 Updates & Maintenance

**Last Updated**: 2025-11-12  
**Version**: 1.0.0

**Future Enhancements**:
- [ ] Implement Redis-backed rate limiting for multi-server deployments
- [ ] Add virus scanning with ClamAV
- [ ] Implement image watermarking for traceability
- [ ] Add honeypot fields to catch bots
- [ ] Implement CAPTCHA for high-risk actions
- [ ] Add audit logging to database
- [ ] Implement IP-based blocking for repeated violations

