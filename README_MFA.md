# Multi-Factor Authentication (MFA) Implementation

## Overview

This implementation provides a comprehensive Multi-Factor Authentication system for the Web Store application, supporting multiple authentication methods and secure user verification.

## Features

- ✅ **TOTP (Time-based One-Time Password)** - Google Authenticator, Authy, etc.
- ✅ **SMS OTP** - SMS-based verification codes
- ✅ **Email OTP** - Email-based verification codes
- ✅ **Backup Codes** - For account recovery
- ✅ **Session Management** - Secure session tracking
- ✅ **Rate Limiting** - Protection against brute force attacks
- ✅ **Code Expiration** - Time-based code validation

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pnpm install
```

### 2. Database Setup

```bash
# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev --name add-mfa-support

# Or run the manual setup script
psql -d your_database -f scripts/setup-mfa.sql
```

### 3. Environment Configuration

Add these environment variables to your `.env` file:

```env
# JWT Configuration
SUPABASE_JWT_SECRET=your-super-secret-jwt-key

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Application Configuration
APPLICATION_BASE_URL=http://localhost:3000

# Optional: SMS Configuration (for SMS MFA)
SMS_PROVIDER_API_KEY=your-sms-api-key
SMS_PROVIDER_SECRET=your-sms-secret
```

### 4. Start the Application

```bash
pnpm start:dev
```

## API Usage Examples

### User Registration

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "fullname": "John Doe"
  }'
```

### User Login

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### Setup TOTP MFA

```bash
# 1. Setup TOTP (requires authentication)
curl -X POST http://localhost:4000/auth/mfa/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "TOTP"
  }'
```

Response will include QR code URL and secret:

```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "otpauthUrl": "otpauth://totp/Web%20Store:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Web%20Store",
  "qrCode": "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/Web%20Store:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Web%20Store"
}
```

### Verify TOTP Setup

```bash
curl -X POST http://localhost:4000/auth/mfa/verify-setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "TOTP",
    "code": "123456"
  }'
```

### Setup SMS MFA

```bash
curl -X POST http://localhost:4000/auth/mfa/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "SMS",
    "phone": "+1234567890"
  }'
```

### Login with MFA

```bash
# 1. Initial login (may require MFA)
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

If MFA is required, you'll get:

```json
{
  "message": "MFA verification required",
  "requiresMfa": true,
  "mfaMethods": [
    { "type": "TOTP", "isEnabled": true },
    { "type": "SMS", "isEnabled": true }
  ],
  "hasBackupCodes": true
}
```

### Verify MFA During Login

```bash
# 2. Verify MFA
curl -X POST http://localhost:4000/auth/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id-from-login",
    "type": "TOTP",
    "code": "123456"
  }'
```

### Request SMS/Email Code

```bash
curl -X POST http://localhost:4000/auth/mfa/request-code \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id-from-login",
    "type": "SMS"
  }'
```

### Use Backup Code

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "backupCode": "A1B2C3D4"
  }'
```

## Frontend Integration

### React/Next.js Example

```typescript
// Login component
const LoginComponent = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaMethods, setMfaMethods] = useState([]);

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.requiresMfa) {
        setRequiresMfa(true);
        setMfaMethods(data.mfaMethods);
      } else {
        // Login successful, redirect
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleMfaVerification = async () => {
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.userId,
          type: 'TOTP',
          code: mfaCode,
        }),
      });

      if (response.ok) {
        // MFA verified, complete login
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('MFA verification failed:', error);
    }
  };

  return (
    <div>
      {!requiresMfa ? (
        <form onSubmit={handleLogin}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button type="submit">Login</button>
        </form>
      ) : (
        <div>
          <h3>MFA Verification Required</h3>
          <input
            type="text"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            placeholder="Enter MFA Code"
          />
          <button onClick={handleMfaVerification}>Verify</button>
        </div>
      )}
    </div>
  );
};
```

## Security Features

### Rate Limiting

- MFA code requests: 1 per minute
- Login attempts: 5 per 15 minutes
- Backup code attempts: 3 per hour

### Code Expiration

- SMS/Email codes: 5 minutes
- TOTP codes: 30 seconds (standard)
- Backup codes: No expiration (until used)

### Session Management

- JWT tokens: 1 hour expiration
- Session tokens: 24 hours expiration
- Automatic session cleanup

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run MFA-specific tests
pnpm test --testNamePattern="MFA"
```

### Manual Testing

1. **Register a new user**
2. **Login without MFA** - Should work normally
3. **Setup TOTP MFA** - Should generate QR code
4. **Verify TOTP setup** - Should enable MFA
5. **Login with MFA** - Should require TOTP code
6. **Use backup code** - Should work for recovery

## Troubleshooting

### Common Issues

1. **Prisma Client Errors**

   ```bash
   # Regenerate Prisma client
   pnpm prisma generate
   ```

2. **Database Migration Issues**

   ```bash
   # Reset database (development only)
   pnpm prisma migrate reset
   ```

3. **Email Not Sending**
   - Check email configuration in `.env`
   - Verify SMTP settings
   - Check email service logs

4. **TOTP Not Working**
   - Ensure system time is synchronized
   - Check TOTP app configuration
   - Verify secret key format

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=true
LOG_LEVEL=debug
```

## Production Deployment

### Checklist

- [ ] Update environment variables for production
- [ ] Configure SSL/TLS certificates
- [ ] Setup email service (SendGrid, AWS SES, etc.)
- [ ] Configure SMS service (Twilio, AWS SNS, etc.)
- [ ] Setup monitoring and logging
- [ ] Configure rate limiting
- [ ] Test all MFA flows
- [ ] Backup database schema

### Environment Variables (Production)

```env
# Production JWT Secret (use strong secret)
SUPABASE_JWT_SECRET=your-production-jwt-secret

# Production Email Service
EMAIL_USER=your-production-email
EMAIL_PASS=your-production-password

# Production SMS Service
SMS_PROVIDER_API_KEY=your-production-sms-key
SMS_PROVIDER_SECRET=your-production-sms-secret

# Production URLs
APPLICATION_BASE_URL=https://your-domain.com
FRONTEND_URL=https://your-frontend-domain.com
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.
