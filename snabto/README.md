# Snabto — Home Care Services Website

## How to Use

### Option 1: Open Directly (No Installation Needed)
Just double-click `index.html` to open the website in your browser.

### Option 2: Upload to Web Hosting
Upload the entire `snabto` folder to any web hosting service:
- **Hostinger**, **GoDaddy**, **cPanel** → Upload via File Manager
- **Netlify** → Drag and drop the `snabto` folder at netlify.com/drop
- **Vercel** → Run `npx vercel` in this folder
- **GitHub Pages** → Push to a GitHub repo and enable Pages

## Folder Structure

```
snabto/
├── index.html          ← Main website file (open this)
├── src/
│   ├── images.js       ← All service images (embedded, no internet needed)
│   └── app.js          ← All website logic and components
└── README.md           ← This file
```

## Features Included

### Customer Side
- 📍 Live location detection
- 🏠 House Cleaning (1-Day / Monthly / Yearly plans, 20% off on subscriptions)
- 🚗 Car Washing (₹99 / ₹1,299 monthly)
- 🔧 Plumber (₹299 visit)
- 🔩 Car/Bike Repair (₹399 visit)
- 🛞 Puncture Fix (Bike ₹119 / Car ₹199)
- ⚡ Electrician (₹249 visit)
- 💳 UPI Payment flow
- 📋 My Bookings with Subscription Calendar
- ⭐ Rating & Feedback

### Maid/Worker Portal
- Phone login
- Dashboard with earnings & orders
- Mark orders as completed
- Work calendar
- Earnings tracker

### Help & Support
- Call helpline
- WhatsApp support
- Email support
- Working hours

## Customization

To change your **phone number** or **UPI ID**, open `src/app.js` and search for:
- `+91 99999 99999` → replace with your number
- `wa.me/919999999999` → replace with your WhatsApp number
- `support@snabto.in` → replace with your email

To change **prices**, search for the price values in `src/app.js`.

---
Built with React 18 • No build tools required
