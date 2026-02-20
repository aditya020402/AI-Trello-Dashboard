# OpenAI API Key Troubleshooting Guide

## Common Issues and Solutions

If your OpenAI API key isn't working, here are the most common causes and how to fix them:

### 1. **Billing/Payment Method Not Set Up** ⚡ (Most Common)

**Problem:** New API keys won't work without an active payment method.

**Solution:**

1. Go to [OpenAI Billing Dashboard](https://platform.openai.com/account/billing/overview)
2. Click "Billing" → "Payment methods"
3. **Add a valid payment method** (credit/debit card)
4. Check if you have a free trial credit (some accounts get $5 free credits)
5. Wait a few seconds and try again

---

### 2. **Key Copied Incorrectly (Extra Spaces, Missing Characters)**

**Problem:** The key might have spaces or be truncated when copying.

**Solution:**

1. Go to [API Keys Page](https://platform.openai.com/api-keys)
2. Click "Copy" button (don't select and copy manually)
3. Make sure the full value is copied (should be ~80 characters)
4. In `.env` file, paste like this (NO quotes, NO spaces):
   ```
   OPENAI_API_KEY=sk-proj-YOURKEYHERE
   ```
5. **Verify character count** - OpenAI keys are typically 48-80 characters

---

### 3. **Backend Server Not Restarted After Updating .env**

**Problem:** The backend is still using the old (or no) API key.

**Solution:**

1. Stop the backend (Ctrl+C in the terminal)
2. Verify new key in `.env` file
3. Restart backend:
   ```bash
   cd backend
   npm run dev
   ```
4. Watch console for: `Using OpenAI API key: sk-proj-...`

---

### 4. **Key Expired or Revoked**

**Problem:** The old key or the new one was deleted/regenerated.

**Solution:**

1. Go to [API Keys](https://platform.openai.com/api-keys)
2. Look for your key - if it says "Expired" or is missing, regenerate it
3. Create a NEW key:
   - Click "Create new secret key"
   - Give it a name (e.g., "Taskboard")
   - Copy immediately (you can only see it once!)
4. Update `.env` with the new key
5. Restart backend

---

### 5. **Account Suspended or Limited**

**Problem:** Your account might be suspended or rate-limited.

**Solution:**

1. Go to [Account Settings](https://platform.openai.com/account/general/overview)
2. Check for any warnings or suspension messages
3. Ensure you have sufficient credits:
   - Free trial: Check if $5 credit is still available
   - Paid account: Check billing balance
4. If suspended, follow the instructions to resolve it

---

## Diagnostic Steps

### Step 1: Test the API Key Endpoint

I've added a test endpoint to your backend. Use it to verify your key works:

```bash
# Test if API key is valid
curl http://localhost:3000/api/chat/test
```

**Success Response:**

```json
{
  "success": true,
  "message": "OpenAI API key is valid and working!",
  "modelsAvailable": "Available"
}
```

**Error Response will show:**

```json
{
  "success": false,
  "error": "API key test failed",
  "details": "Detailed error message here",
  "suggestion": "Help text based on error type"
}
```

### Step 2: Check Backend Logs

When you test the API, check backend console for detailed logs like:

```
Using OpenAI API key: sk-proj-...abc123 - Length: 65
```

This tells you:

- ✅ Key is being read
- ✅ Key starts with `sk-proj-`
- ✅ Key length (55-80 chars is normal)

### Step 3: Common Error Messages

| Error                        | Cause                      | Solution                              |
| ---------------------------- | -------------------------- | ------------------------------------- |
| `401 Unauthorized`           | Invalid API key            | Regenerate new key, verify copy-paste |
| `Billing_hard_limit_reached` | No payment method          | Add credit card to account            |
| `Rate limit exceeded`        | Too many requests too fast | Wait 60 seconds, try again            |
| `429 Too Many Requests`      | API overloaded             | Wait and retry later                  |
| `Invalid request`            | Bad API key format         | Check key starts with `sk-`           |

---

## Double-Check Your .env File

Your `.env` file should look like this:

```dotenv
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskboard
JWT_SECRET=your-secret-key
PORT=3000
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY_HERE
```

**Make sure:**

- ✅ No quotes around the key: `OPENAI_API_KEY=sk-...` (NOT `OPENAI_API_KEY="sk-..."`)
- ✅ No extra spaces: `OPENAI_API_KEY=sk-proj-abc123` (NOT `OPENAI_API_KEY= sk-proj-abc123 `)
- ✅ Entire key is there (check character count matches platform)
- ✅ Backend has been restarted after updating

---

## Quick Fix Checklist

- [ ] Do I have a payment method on my OpenAI account?
- [ ] Did I copy the entire key (48-80 characters)?
- [ ] Did I paste it without quotes or extra spaces?
- [ ] Did I restart the backend after updating .env?
- [ ] Does the key start with `sk-proj-`?
- [ ] Did I test with the `/api/chat/test` endpoint?
- [ ] Does the backend console show the key is being loaded?

---

## Need More Help?

### Check Backend Console Output

When you try to chat with your card, the backend should show detailed error info:

```
OpenAI API Error Details: {
  message: '...',
  status: 401,
  type: 'AuthenticationError',
  code: 'invalid_api_key'
}
```

This tells you exactly what OpenAI is rejecting.

### Verify Account Status

1. Log in to [OpenAI Platform](https://platform.openai.com)
2. Check [API Usage](https://platform.openai.com/account/usage/overview)
3. Check [Billing](https://platform.openai.com/account/billing/overview)
4. Check [API Keys](https://platform.openai.com/api-keys)

### Common Success Indicators

- ✅ API key page shows your key (not red/warning)
- ✅ Billing page shows credit balance > $0
- ✅ No usage limits or restrictions shown
- ✅ `/api/chat/test` endpoint returns success

---

## If Still Not Working

1. **Generate a completely new key:**
   - Delete the old one if it exists
   - Create a fresh key from scratch
   - Copy immediately after creation

2. **Ensure payment is valid:**
   - Use a different card if first one fails
   - Verify card hasn't expired
   - Check for security restrictions from your bank

3. **Wait and try again:**
   - Sometimes OpenAI takes a minute to activate new keys
   - Wait 5 minutes and retry

4. **Check OpenAI Status:**
   - Visit [OpenAI Status Page](https://status.openai.com/)
   - See if there are any service issues

---

## Security Note

⚠️ **Never commit your API key to Git!**

- Keep `.env` in `.gitignore`
- Regenerate the key if it was ever exposed
- Treat API keys like passwords
