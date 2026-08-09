# Cloud Functions Deploy Guide
## Ek baar karo — phir sab automatic!

### Step 1 — Node.js install karo
https://nodejs.org → LTS version download karo → install karo

### Step 2 — Firebase CLI install karo
```
npm install -g firebase-tools
```

### Step 3 — Login karo
```
firebase login
```
Browser mein Google account se login karo

### Step 4 — Project folder mein jao
```
cd C:\Users\YourName\Downloads\apna-typing-master-SCHEDULE
firebase use apna-typing-master-pro
```

### Step 5 — Functions deploy karo
```
cd functions
npm install
cd ..
firebase deploy --only functions
```

### Step 6 — Done! ✅
Ab yeh automatic hoga:
- Roz 6:00 AM → Admin se schedule kiye passages Live mein publish
- Raat 10:00 PM → Live passages Normal mein shift

### Admin Panel se Schedule karna:
1. admin.html → Login → "📅 Schedule Live" tab
2. Date select karo
3. 2 English + 2 Hindi passages likhо
4. "Save" karo
5. Subah 6 AM ko automatic live!
