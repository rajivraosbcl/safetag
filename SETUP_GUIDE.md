# SafeTag - Setup & Configuration Guide

## Overview
SafeTag is a platform that allows car owners to share a QR code on their vehicle. When someone scans the QR code, they can call the driver (through a central number) or send messages - all while keeping the driver's phone number confidential.

## Project Structure

```
app/
├── api/                          # API Routes
│   ├── call/initiate/           # Initiate calls to drivers
│   ├── message/send/            # Send messages to drivers
│   ├── voice/twiml/             # Twilio voice response
│   ├── subscription/verify/     # Check subscription status
│   ├── payment/verify/          # Verify Razorpay payments
│   └── create-order/            # Create Razorpay orders
├── lib/
│   ├── supabase.js              # Supabase client
│   ├── twilio.ts                # Twilio utilities
│   └── storage.ts               # File upload utilities
├── dashboard/                    # Driver dashboard
├── qr/                           # Public QR landing page
├── login/                        # User login
├── signup/                       # User signup
└── payment-confirmation/         # Payment success page
```

## Required Services & Setup

### 1. **Twilio** (For Calls & SMS)

#### Setup Steps:
1. Go to [Twilio.com](https://www.twilio.com) and create a free account
2. Verify your phone number
3. Get your credentials:
   - **Account SID**: Found in Twilio Dashboard
   - **Auth Token**: Found in Twilio Dashboard
   - **Phone Number**: Get a Twilio phone number (with voice & SMS capabilities)

#### Environment Variables:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio number in E.164 format
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Used for Twilio callbacks
```

#### For Production:
- Purchase a real Twilio number (starts at $1-2/month)
- Request voice and SMS capabilities
- Add your app URL to Twilio's webhook settings

---

### 2. **Supabase** (Database & Storage)

#### Setup Steps:
1. Go to [Supabase.com](https://supabase.com) and create a project
2. Create a new organization and project
3. Get your credentials from Settings → API

#### Environment Variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

#### Create Storage Bucket:
1. Go to Storage in Supabase dashboard
2. Create a new bucket named `rc-documents`
3. Set it to Private
4. Add RLS (Row Level Security) policy to allow users to upload

#### Database Tables to Create:

**1. Users Table**
```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text not null,
  phone_number text unique not null,
  car_number text unique not null,
  rc_file_path text,
  emergency_contact_name text not null,
  emergency_contact_phone text not null,
  user_type text check (user_type in ('driver', 'user')),
  subscription_status text check (subscription_status in ('active', 'expired', 'pending')),
  subscription_expiry timestamp,
  subscription_plan text check (subscription_plan in ('annual', 'monthly')),
  subscription_start_date timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
```

**2. Payments Table**
```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  amount integer not null,
  currency text default 'INR',
  plan text,
  status text check (status in ('success', 'failed', 'pending')),
  created_at timestamp default now()
);
```

**3. Call Logs Table**
```sql
create table call_logs (
  id uuid primary key default gen_random_uuid(),
  caller_id text not null,
  driver_id uuid not null references users(id) on delete cascade,
  call_sid text,
  status text,
  duration integer,
  created_at timestamp default now()
);
```

**4. Messages Table**
```sql
create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null,
  driver_id uuid not null references users(id) on delete cascade,
  message text not null,
  message_sid text,
  status text,
  created_at timestamp default now()
);
```

---

### 3. **Razorpay** (Payments - India)

#### Setup Steps:
1. Go to [Razorpay.com](https://razorpay.com) and create a merchant account
2. Complete KYC verification
3. Get API keys from Settings → API Keys

#### Environment Variables:
```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

#### Pricing Setup:
- Annual: ₹999 (99900 paise)
- Monthly: ₹100 (10000 paise)

---

## Installation & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
```bash
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

### 3. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

---

## Key Features & How They Work

### 🚗 QR Code System
- Driver gets a unique QR code based on their car number
- QR links to `/qr?car=CAR_NUMBER`
- Non-drivers can scan and see driver's name + car number (no phone number exposed)

### 📞 Call Flow
1. User scans QR code → Opens public landing page
2. Clicks "Call Driver" button
3. Backend calls `/api/call/initiate`
4. Twilio initiates call FROM central number TO driver
5. Call is logged in database
6. **Only active subscribers can receive calls**

### 💬 Message Flow
1. User enters message and sends
2. Backend calls `/api/message/send`
3. Twilio sends SMS to driver (via central number)
4. Message is logged in database
5. **All members can send messages (no subscription required)**

### 💳 Subscription Flow
1. User signs up → fills form
2. Clicks "Choose Plan" → Razorpay payment
3. Payment verified → subscription activated
4. User can now receive calls & see their QR dashboard

### 📊 Driver Dashboard
- View QR code to print/place on car
- See all incoming messages
- See all incoming call attempts
- View profile & subscription status
- Manage subscription renewal

---

## API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/call/initiate` | POST | Initiate a call to driver |
| `/api/message/send` | POST | Send message to driver |
| `/api/subscription/verify` | GET | Check if subscription is active |
| `/api/payment/verify` | POST | Verify Razorpay payment |
| `/api/create-order` | POST | Create Razorpay order |
| `/api/voice/twiml` | POST | Twilio voice response |

---

## Security Considerations

✅ **What's Protected:**
- Driver's real phone number never shown to callers
- Calls/messages only work with active subscription
- RC documents stored in private storage bucket
- Payment signatures verified with Razorpay

⚠️ **To-Do:**
- Add rate limiting on call/message endpoints
- Add CAPTCHA to prevent abuse
- Implement phone number verification with OTP
- Add admin approval for RC verification
- Implement IP-based rate limiting

---

## Deployment Checklist

- [ ] Set production Twilio phone number
- [ ] Update `NEXT_PUBLIC_APP_URL` to your domain
- [ ] Switch Razorpay to production mode
- [ ] Enable HTTPS (required by Twilio)
- [ ] Set up database backups
- [ ] Configure error logging (Sentry, LogRocket)
- [ ] Add monitoring & alerting
- [ ] Set up CI/CD pipeline

---

## Testing

### Test Call Flow:
```bash
# 1. Sign up as driver
# 2. Get QR code from dashboard
# 3. Scan QR with another device
# 4. Click "Call Driver" with Twilio test credentials
```

### Test Messages:
```bash
# 1. Send message from QR page
# 2. Check Twilio console for SMS status
# 3. Verify message stored in database
```

### Test Subscription Verification:
```bash
curl "http://localhost:3000/api/subscription/verify?userId=user_id_here"
```

---

## Troubleshooting

**Twilio calls not working:**
- Check `NEXT_PUBLIC_APP_URL` is correct
- Verify webhook URL in Twilio dashboard
- Check call logs in Twilio console

**Supabase connection issues:**
- Verify keys are correct
- Check network firewall
- Ensure RLS policies are correct

**Razorpay payments failing:**
- Verify keys in test mode
- Check amount is in paise (not rupees)
- Look at Razorpay dashboard for errors

---

## Next Steps

1. **Set up all services** (Twilio, Supabase, Razorpay)
2. **Create database tables** in Supabase
3. **Test locally** with mock data
4. **Deploy to production** (Vercel recommended)
5. **Monitor & iterate** based on user feedback

---

**Questions? Refer to each service's documentation:**
- [Twilio Docs](https://www.twilio.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Razorpay Docs](https://razorpay.com/docs)
