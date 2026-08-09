# Razorpay Payment Setup

Payment integration ka code poora ready hai. Bas neeche diye 8 steps follow karke apni
Razorpay keys daalni hain — code mein kahin bhi key/secret hardcode nahi karna.

## Kya badla
- `processPay()` (app.js) ab real Razorpay Checkout kholta hai — pehle sirf fake "success" screen dikhata tha.
- `functions/index.js` mein 3 naye functions: `createRazorpayOrder`, `verifyRazorpayPayment` (signature verify karke Pro grant karta hai), `razorpayWebhook` (backup, agar user tab band kar de payment ke turant baad).
- `firebase.json` add kiya — pehle project mein tha hi nahi, jiske bina `firebase deploy` ko pata nahi chalta ki functions/database-rules/storage-rules kahan se deploy karne hain.
- `firebase-database-rules.json`: `isPro`/`plan`/`proExpiry`/`payments` ab koi bhi client seedha likh nahi sakta — sirf Cloud Function (Admin SDK) likh sakta hai. Pehle koi bhi logged-in user browser console se khud ko Pro bana sakta tha — ye hole band ho gaya.
- Fake card/UPI/CVV input fields hata diye (typing.html, live-tests.html, candidate.html) — asli payment Razorpay ke apne secure popup mein hota hai, humare server par card details kabhi aate hi nahi.

## Setup — ek baar karna hai

1. **Razorpay account banao**: https://razorpay.com — signup karke Test Mode se shuru karo (Live Mode ke liye business KYC docs chahiye, wo baad mein).

2. **Test API keys lo**: Dashboard → Settings → API Keys → Generate Test Key. Key ID aur Key Secret dono copy kar lo.

3. **Webhook set karo**: Dashboard → Settings → Webhooks → Add New Webhook
   - URL: deploy karne ke baad milegi, format `https://<region>-<project-id>.cloudfunctions.net/razorpayWebhook`
   - Secret: koi bhi strong random string bana lo, yaad rakho (step 5 mein wahi use hoga)
   - Active events: `payment.captured` tick karo

4. **Dependencies install karo**:
   ```
   cd functions
   npm install
   cd ..
   ```

5. **Secrets save karo** (kabhi bhi code mein ye values mat likhna):
   ```
   firebase functions:secrets:set RAZORPAY_KEY_ID
   firebase functions:secrets:set RAZORPAY_KEY_SECRET
   firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
   ```
   Har command paste karne ko bolegi — respective value paste kar dena.

6. **Deploy karo**:
   ```
   firebase deploy --only functions
   ```
   Deploy hone ke baad terminal mein `razorpayWebhook` ka real URL print hoga — wahi step 3 mein Razorpay dashboard mein daalo.

7. **Test karo**: Razorpay ke published test card / test UPI numbers se try karo (unki docs mein "test card numbers" search karo) — Live keys daalne se pehle Test Mode mein poora flow (pay → Pro activate → dashboard mein dikhna) check kar lo.

8. **Real paisa lena ho to**: Razorpay dashboard par Live Mode activate karo (KYC complete karne ke baad), Live keys se step 2-3 dobara karo, phir step 5 dubara run karke test keys ko live keys se replace kar do.

## Note
Is sandbox mein internet access nahi hai, isliye ye khud deploy/test nahi kar saka — code Razorpay ki standard, well-documented Orders API + signature verification pattern follow karta hai. Agar deploy ke baad koi specific error aaye to wo paste kar dena, dekh lunga.
