/* © 2026 Apna Typing Master Pro — All rights reserved. Unauthorized copying or redistribution of this source code is prohibited. */
// ============================================================
// firebase.js — Firebase Realtime DB + Auth Module
// Include as: <script type="module" src="firebase.js"></script>
// MUST come AFTER shared.js
// ============================================================
import { initializeApp }            from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update, get, push, remove, serverTimestamp, runTransaction }
                                    from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendEmailVerification }
                                    from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject }
                                    from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getFunctions, httpsCallable }
                                    from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";
import { initializeAppCheck, ReCaptchaV3Provider }
                                    from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-check.js";

// Config firebase-config.js se aata hai (jo .gitignore mein hai, GitHub pe nahi jaata)
// Agar window.FIREBASE_CONFIG nahi mila toh error clearly dikhega
const firebaseConfig = window.FIREBASE_CONFIG || null;
if(!firebaseConfig){
  console.error('❌ firebase-config.js load nahi hua! HTML file mein <script src="firebase-config.js"> add karo BEFORE firebase.js');
}

let fbApp, db, auth, storage, fns, fbOk = false;
try {
  if(!firebaseConfig) throw new Error('Config missing — firebase-config.js load nahi hua');
  fbApp = initializeApp(firebaseConfig);

  // ── App Check: rejects requests that don't come from this real, registered
  // site — so even if someone copies all this code to another domain, their
  // copy's Firebase calls (database/storage/functions) will simply fail.
  // ⚠️ REQUIRES ONE-TIME SETUP IN FIREBASE CONSOLE (see storage.rules-style
  // note below) — until you do that setup, this silently does nothing extra
  // and the site keeps working exactly as before.
  if(window.RECAPTCHA_V3_SITE_KEY){
    try {
      initializeAppCheck(fbApp, {
        provider: new ReCaptchaV3Provider(window.RECAPTCHA_V3_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
    } catch(e){ console.warn('App Check init skipped:', e.message); }
  }

  db    = getDatabase(fbApp);
  auth  = getAuth(fbApp);
  storage = getStorage(fbApp);
  fns   = getFunctions(fbApp);
  fbOk  = true;
} catch(e){ console.error('Firebase init error:', e); }

// ── UI helpers ───────────────────────────────────────────────
function showLoader(msg){
  let el=document.getElementById('fbLoader');
  if(!el){ el=document.createElement('div'); el.id='fbLoader';
    el.style.cssText='position:fixed;bottom:18px;right:18px;background:#1a5276;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.4);'; document.body.appendChild(el); }
  el.textContent='🔄 '+msg; el.style.display='block';
}
function hideLoader(){ const el=document.getElementById('fbLoader'); if(el) el.style.display='none'; }
function toast(msg,ok=true){
  let el=document.getElementById('fbToast');
  if(!el){ el=document.createElement('div'); el.id='fbToast';
    el.style.cssText='position:fixed;bottom:18px;right:18px;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.4);max-width:320px;'; document.body.appendChild(el); }
  el.style.background=ok?'#27ae60':'#e74c3c'; el.style.color='#fff';
  el.textContent=msg; el.style.display='block';
  setTimeout(()=>{ el.style.display='none'; }, ok?3500:6000);
}
window.showFbToast = toast;
window.showFbLoader = showLoader;
window.hideFbLoader = hideLoader;

// ── DB Path helper ───────────────────────────────────────────
function tabPath(tab){
  if(tab===0) return 'passages/normal/english';
  if(tab===1) return 'passages/normal/hindi';
  if(tab===2) return 'passages/live/english';
  if(tab===3) return 'passages/live/hindi';
  if(tab===5) return 'passages/normal/speedmaster';
  return 'passages/normal/numbers';
}

// ── Read: Listen to all passage paths ───────────────────────
function listenAll(){
  if(!fbOk){ toast('❌ Firebase connect nahi ho paya.',false); return; }
  showLoader('Firebase se passages load ho rahe hain...');
  const paths=[
    {p:'passages/normal/english', t:()=>window.PASS.english},
    {p:'passages/normal/hindi',   t:()=>window.PASS.hindi},
    {p:'passages/normal/numbers', t:()=>window.PASS.numbers},
    {p:'passages/normal/speedmaster', t:()=>window.PASS.speedmaster},
    {p:'passages/live/english',   t:()=>window.LIVE_PASS.english},
    {p:'passages/live/hindi',     t:()=>window.LIVE_PASS.hindi},
  ];
  let done=0;
  const safetyTimer=setTimeout(()=>{ if(done<paths.length){ hideLoader(); toast('⚠️ Firebase timeout. Internet check karein.',false); }},10000);
  paths.forEach(({p,t})=>{
    onValue(ref(db,p),(snap)=>{
      const arr=t(); arr.length=0;
      if(snap.exists()){ Object.keys(snap.val()).map(Number).sort((a,b)=>a-b).forEach(k=>arr.push(snap.val()[k])); }
      done++;
      if(done===paths.length){
        clearTimeout(safetyTimer); hideLoader();
        if(typeof window.updateTabCounts==='function') window.updateTabCounts();
        if(typeof window.renderAdmTab==='function') window.renderAdmTab(window.admCurrentTab);
        if(typeof window.buildDd==='function') window.buildDd();
      }
    },(err)=>{ clearTimeout(safetyTimer); hideLoader(); toast('❌ Load error: '+err.message,false); });
  });
}

// ── Write: Save array to Firebase ───────────────────────────
function saveTab(tab, retry=0){
  if(!fbOk){ toast('❌ Firebase ready nahi hai.',false); return; }
  const path=tabPath(tab);
  let arr;
  if(tab===0) arr=window.PASS.english;
  else if(tab===1) arr=window.PASS.hindi;
  else if(tab===2) arr=window.LIVE_PASS.english;
  else if(tab===3) arr=window.LIVE_PASS.hindi;
  else if(tab===5) arr=window.PASS.speedmaster;
  else arr=window.PASS.numbers;
  const obj={}; arr.forEach((p,i)=>{ obj[String(i)]=p; });
  showLoader('Firebase mein save ho raha hai...');
  set(ref(db,path),obj)
    .then(()=>{ hideLoader(); toast('✅ Firebase mein save ho gaya!'); })
    .catch(err=>{ hideLoader();
      if(retry<1){ setTimeout(()=>saveTab(tab,retry+1),1500); return; }
      toast('❌ Save NAHI hua: '+err.message,false);
    });
}
window.saveArrayToFirebase = saveTab;

// ── Live → Normal migration (manual trigger; the Cloud Function in
//    /functions runs the exact same logic automatically every day at 10 PM) ──
window.fbMigrateLiveToNormal = function(){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai.'));
  showLoader('Live passages ko Normal mein migrate kiya ja raha hai...');
  return Promise.all([
    get(ref(db,'passages/live/english')),
    get(ref(db,'passages/live/hindi')),
    get(ref(db,'passages/normal/english')),
    get(ref(db,'passages/normal/hindi'))
  ]).then(([liveEngSnap, liveHinSnap, normEngSnap, normHinSnap])=>{
    const toArr = (snap)=> snap.exists() ? Object.keys(snap.val()).map(Number).sort((a,b)=>a-b).map(k=>snap.val()[k]) : [];
    const liveEng = toArr(liveEngSnap), liveHin = toArr(liveHinSnap);
    const normEng = toArr(normEngSnap), normHin = toArr(normHinSnap);

    const updates = {};
    let movedCount = 0;
    if(liveEng.length){ updates['passages/normal/english'] = objFromArr([...normEng, ...liveEng]); updates['passages/live/english'] = null; movedCount += liveEng.length; }
    if(liveHin.length){ updates['passages/normal/hindi']   = objFromArr([...normHin, ...liveHin]); updates['passages/live/hindi']   = null; movedCount += liveHin.length; }

    if(Object.keys(updates).length === 0){
      hideLoader();
      toast('ℹ️ Koi live passage nahi mila migrate karne ke liye.');
      return;
    }
    return update(ref(db), updates).then(()=>{
      hideLoader();
      toast(`✅ ${movedCount} live passage(s) Normal section mein migrate ho gaye!`);
      // refresh local in-memory arrays + admin UI immediately
      window.PASS.english = [...normEng, ...liveEng];
      window.PASS.hindi = [...normHin, ...liveHin];
      window.LIVE_PASS.english = [];
      window.LIVE_PASS.hindi = [];
      if(typeof window.updateTabCounts==='function') window.updateTabCounts();
      if(typeof window.renderAdmTab==='function') window.renderAdmTab(window.admCurrentTab);
    });
  }).catch(err=>{ hideLoader(); toast('❌ Migration fail: '+err.message,false); throw err; });
};
function objFromArr(arr){ const o={}; arr.forEach((p,i)=>{ o[String(i)]=p; }); return o; }

// ── Admin Auth ───────────────────────────────────────────────
window.fbAdminSignIn = function(email, password){
  if(!fbOk) return Promise.reject(new Error('Firebase not ready'));
  return signInWithEmailAndPassword(auth, email, password)
    .catch(err=>{ toast('❌ Login fail: '+err.message,false); throw err; });
};
window.fbAdminSignOut = function(){
  if(!fbOk||!auth) return;
  signOut(auth).catch(e=>console.error(e));
};

// ── Admin Forgot Password — now uses the same 4-digit OTP system as
//    candidates (see fbSendResetOTP / fbVerifyResetOTP further below) ──

// ── Schedule: Get passages for a date ───────────────────
window.fbGetScheduledPassages = function(date, callback){
  if(!fbOk){ callback({eng:[],hin:[]}); return; }
  Promise.all([
    get(ref(db,`scheduledPassages/english/${date}`)),
    get(ref(db,`scheduledPassages/hindi/${date}`))
  ]).then(([engSnap,hinSnap])=>{
    const toArr=(snap)=>{
      if(!snap.exists()) return [];
      const v=snap.val();
      if(typeof v==='string') return [v];
      return Object.keys(v).map(Number).sort((a,b)=>a-b).map(k=>v[k]).filter(Boolean);
    };
    callback({eng:toArr(engSnap), hin:toArr(hinSnap)});
  }).catch(()=>callback({eng:[],hin:[]}));
};

// ── Schedule: Save 2 English + 2 Hindi passages for a date
window.fbSaveScheduledPassages = function(date, engArr, hinArr){
  if(!fbOk) return Promise.reject(new Error('Firebase not ready'));
  const updates = {};
  const toObj=(arr)=>{ const o={}; arr.forEach((p,i)=>{ o[String(i)]=p; }); return o; };
  if(engArr.length>0) updates[`scheduledPassages/english/${date}`]=toObj(engArr);
  if(hinArr.length>0) updates[`scheduledPassages/hindi/${date}`]=toObj(hinArr);
  return update(ref(db),updates);
};

// ── Schedule: Get list of all upcoming scheduled dates ───
window.fbGetUpcomingSchedule = function(callback){
  if(!fbOk){ callback([]); return; }
  Promise.all([
    get(ref(db,'scheduledPassages/english')),
    get(ref(db,'scheduledPassages/hindi'))
  ]).then(([engSnap,hinSnap])=>{
    const dates={};
    if(engSnap.exists()){
      Object.keys(engSnap.val()).forEach(d=>{
        const v=engSnap.val()[d];
        const cnt=typeof v==='string'?1:Object.keys(v).length;
        if(!dates[d]) dates[d]={engCount:0,hinCount:0};
        dates[d].engCount=cnt;
      });
    }
    if(hinSnap.exists()){
      Object.keys(hinSnap.val()).forEach(d=>{
        const v=hinSnap.val()[d];
        const cnt=typeof v==='string'?1:Object.keys(v).length;
        if(!dates[d]) dates[d]={engCount:0,hinCount:0};
        dates[d].hinCount=cnt;
      });
    }
    const sorted=Object.keys(dates).sort().map(d=>({date:d,...dates[d]}));
    callback(sorted);
  }).catch(()=>callback([]));
};

// ── Manual Publish — call Cloud Function directly ────────
window.fbCallManualPublish = function(){
  if(!fbOk) return Promise.reject(new Error('Firebase not ready'));
  const fns=getFunctions(fbApp,'asia-south1');
  const fn=httpsCallable(fns,'manualPublishToday');
  return fn().then(res=>res.data);
};

// ── Admin: grant someone free Pro days without payment ────
window.fbGrantFreePro = function(email, days, note){
  if(!fbOk) return Promise.reject(new Error('Firebase not ready'));
  const fns=getFunctions(fbApp,'asia-south1');
  const fn=httpsCallable(fns,'grantFreeProAdmin');
  return fn({ email, days, note }).then(res=>res.data);
};

// ── Regular User Auth (real Firebase accounts — NOT the old fake local check) ──
// Signup: creates an actual Firebase Auth account, then writes the profile
// to Realtime DB. If the email is already registered, Firebase itself
// rejects it (auth/email-already-in-use) — user has to Log In instead.
window.fbSignupUser = function(name, email, password, examPref, mobile){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai, page refresh karein.'));
  let createdUser=null;
  return createUserWithEmailAndPassword(auth, email, password)
    .then((cred)=>{
      createdUser=cred.user;
      // Verification link bhejo — jab tak user isse click na kare, uska
      // email "asli/original" confirm nahi mana jayega (emailVerified:false
      // profile mein rahega, login ke time isi ke hisaab se gate lagta hai).
      sendEmailVerification(createdUser).catch(()=>{}); // best-effort, signup na ruke agar ye fail ho
      const key = window.emailToKey(email);
      const profile = {
        name: name||'', email: email||'', mobile: mobile||'', examPref: examPref||'',
        signupAt: Date.now(), lastLoginAt: Date.now(),
        loginCount: 1, isPro: false, plan: null, proExpiry: null,
        emailVerified: false
      };
      return set(ref(db, 'users/'+key), profile)
        .then(()=>{
          const today = new Date().toISOString().slice(0,10);
          runTransaction(ref(db,'dailyStats/'+today+'/signups'), (cur)=>(cur||0)+1);
          // Firebase khud-ba-khud naye user ko sign-in kar deta hai — usse
          // turant sign-out kar dete hain taaki verification-gate bypass na ho.
          return signOut(auth).then(()=> profile);
        })
        .catch(dbErr=>{
          // Auth account was created but the profile save failed (e.g. database
          // rules not published yet) — roll back the Auth account so this email
          // is NOT left half-registered and stuck. Then surface a clear, honest
          // error instead of the generic "signup fail" message.
          return createdUser.delete().catch(()=>{}).then(()=>{
            const e = new Error('Account create toh hua, par profile save nahi ho paya (database permission issue). Firebase Database Rules publish hain ya nahi check karein, phir dobara try karein.');
            e.code='profile-save-failed';
            throw e;
          });
        });
    })
    .catch(err=>{
      if(err.code==='profile-save-failed') throw err; // already has the right message
      let msg = 'Signup fail hua.';
      if(err.code==='auth/email-already-in-use') msg = 'Ye email pehle se registered hai — Log In karein.';
      else if(err.code==='auth/invalid-email') msg = 'Email sahi format mein nahi hai.';
      else if(err.code==='auth/weak-password') msg = 'Password kam se kam 6 characters ka hona chahiye.';
      const e = new Error(msg); e.code = err.code; throw e;
    });
};

// Login: only succeeds if this email+password matches a REAL registered
// Firebase account — a random unregistered email will always fail here
// (auth/user-not-found), so users can no longer log in without signing up.
window.fbLoginUser = function(email, password){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai, page refresh karein.'));
  return signInWithEmailAndPassword(auth, email, password)
    .then((cred)=>{
      // Agar user ne abhi tak apne email ka verification link click nahi
      // kiya (matlab email "asli/original" confirm nahi hua), to login
      // yahin rok dete hain — account bana rehta hai (Firebase Auth mein
      // ye avoid nahi ho sakta), lekin site use karne nahi denge jab tak
      // verify na ho.
      if(!cred.user.emailVerified){
        return signOut(auth).then(()=>{
          const e = new Error('Aapka email abhi verify nahi hua hai. Apna inbox (aur spam folder) check karein, verification link par click karein, phir dobara Login karein.');
          e.code = 'email-not-verified';
          e.unverifiedUser = { email }; // resend button ke liye
          throw e;
        });
      }
      const key = window.emailToKey(email);
      const userRef = ref(db, 'users/'+key);
      return get(userRef).then(snap=>{
        const existing = snap.exists() ? snap.val() : null;
        const profile = existing || { name: email.split('@')[0], email, examPref:'', isPro:false, plan:null, proExpiry:null };
        const updates = { lastLoginAt: Date.now(), loginCount: (existing?.loginCount||0)+1, emailVerified: true };
        return set(userRef, {...profile, ...updates}).then(()=>{
          const today = new Date().toISOString().slice(0,10);
          runTransaction(ref(db,'dailyStats/'+today+'/logins'), (cur)=>(cur||0)+1);
          return {...profile, ...updates};
        });
      });
    })
    .catch(err=>{
      if(err.code==='email-not-verified') throw err; // already has the right message
      let msg = 'Login fail hua.';
      if(err.code==='auth/user-not-found' || err.code==='auth/invalid-credential') msg = 'Ye account exist nahi karta — pehle Sign Up karein.';
      else if(err.code==='auth/wrong-password') msg = 'Password galat hai.';
      else if(err.code==='auth/invalid-email') msg = 'Email sahi format mein nahi hai.';
      else if(err.code==='auth/too-many-requests') msg = 'Bahut zyada attempts ho gaye, thodi der baad try karein.';
      const e = new Error(msg); e.code = err.code; throw e;
    });
};

// Verification email dobara bhejne ke liye (agar pehla mail na mila ho ya
// expire ho gaya ho) — email+password se dobara sign-in karke bhejta hai
// (kyunki Firebase ko bhejne ke liye currentUser chahiye, aur login khud
// unverified hone par turant sign-out kar deta hai).
window.fbResendVerification = function(email, password){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai.'));
  return signInWithEmailAndPassword(auth, email, password).then(cred=>{
    if(cred.user.emailVerified){
      return signOut(auth).then(()=>{ throw Object.assign(new Error('Ye email pehle se verified hai — seedha Login karein.'), {code:'already-verified'}); });
    }
    return sendEmailVerification(cred.user).then(()=> signOut(auth)).then(()=>({success:true}));
  });
};

window.fbSignOutAuth = function(){
  if(!fbOk||!auth) return Promise.resolve();
  return signOut(auth).catch(e=>console.error(e));
};

// ── Forgot Password — Email OTP (calls the Cloud Functions above) ─────
window.fbSendResetOTP = function(email){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai, page refresh karein.'));
  const fn = httpsCallable(fns, 'sendPasswordResetOTP');
  return fn({ email }).then(r=>r.data)
    .catch(err=>{ throw new Error(err.message || 'OTP bhejne mein error aaya.'); });
};
window.fbVerifyResetOTP = function(email, otp, newPassword){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai, page refresh karein.'));
  const fn = httpsCallable(fns, 'verifyPasswordResetOTP');
  return fn({ email, otp, newPassword }).then(r=>r.data)
    .catch(err=>{ throw new Error(err.message || 'OTP verify nahi hua.'); });
};

// ── Contact Form — emails the admin via the same Brevo SMTP relay ─────
window.fbSendContactMessage = function(name, email, subject, message){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai, page refresh karein.'));
  const fn = httpsCallable(fns, 'sendContactMessage');
  return fn({ name, email, subject, message }).then(r=>r.data)
    .catch(err=>{ throw new Error(err.message || 'Message bhejne mein error aaya.'); });
};

// ── Daily Practice Streak ──────────────────────────────────────────
// Call once per page-load (dashboard). Compares today's date to the
// last-active date stored on the user's profile:
//   same day        → streak unchanged
//   exactly 1 day gap → streak +1 (kept the streak alive)
//   more than 1 day  → streak resets to 1 (broken streak)
window.fbUpdateAndGetStreak = function(){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai.'));
  const email = auth.currentUser && auth.currentUser.email;
  if(!email) return Promise.reject(new Error('Login required.'));
  const key = window.emailToKey(email);
  const streakRef = ref(db, `users/${key}/streak`);
  return get(streakRef).then(snap=>{
    const cur = snap.exists() ? snap.val() : { current:0, longest:0, lastActiveDate:null };
    const today = new Date().toISOString().slice(0,10);
    if(cur.lastActiveDate === today){
      return cur; // already counted today, no change
    }
    let newCurrent = 1;
    if(cur.lastActiveDate){
      const last = new Date(cur.lastActiveDate);
      const diffDays = Math.round((new Date(today) - last) / 86400000);
      if(diffDays === 1) newCurrent = (cur.current||0) + 1;
    }
    const updated = {
      current: newCurrent,
      longest: Math.max(newCurrent, cur.longest||0),
      lastActiveDate: today
    };
    return set(streakRef, updated).then(()=> updated);
  });
};

// ════════════════════════════════════════════════════════════
// STENOGRAPHY DICTATION — 4 categories (hi-80, hi-100, en-80, en-100).
// Unlimited audio+text pairs per category (keep adding, just like the
// Normal Passages admin) — each pair gets a unique Firebase push key.
// Audio file → Firebase Storage. Matching text + audio URL → Realtime DB,
// so every visitor / student sees the SAME admin-uploaded content.
// DB path:      stenoPassages/{category}/{pushKey} = {title,text,audioURL,createdAt}
// Storage path: stenoAudio/{category}/{pushKey}.<ext>
// ════════════════════════════════════════════════════════════

// Shared helper: uploads a file to Storage using the RESUMABLE uploader so we
// get real byte-by-byte progress (0-100%) instead of one silent blocking call.
// This is what fixes the "Upload ho raha hai..." message getting stuck with
// no feedback for large audio files — onProgress(pct) now fires continuously,
// and a stalled/failed upload reports a real error instead of hanging forever.
function uploadFileWithProgress(sRef, file, onProgress){
  return new Promise((resolve, reject)=>{
    const task = uploadBytesResumable(sRef, file);
    // Safety net: agar upload genuinely atak jaaye (dead connection, bucket
    // CORS issue, etc.) aur Firebase khud koi error/progress na de, to bhi
    // admin ko 45s ke baad clear error mil jaaye — hamesha ke liye spinner
    // na dikhta rahe.
    let lastProgressAt = Date.now();
    const stallCheck = setInterval(()=>{
      if(Date.now() - lastProgressAt > 45000){
        clearInterval(stallCheck);
        task.cancel();
        reject(new Error('Upload atak gaya (45s tak koi progress nahi). Internet check karein ya chhoti/compressed audio file try karein.'));
      }
    }, 5000);
    task.on('state_changed',
      (snap)=>{
        lastProgressAt = Date.now();
        const pct = snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
        if(typeof onProgress === 'function') onProgress(pct);
      },
      (err)=>{
        clearInterval(stallCheck);
        reject(err);
      },
      ()=>{
        clearInterval(stallCheck);
        resolve();
      }
    );
  });
}

// Adds ONE new audio+text passage to a category. Uploads the audio file to
// Storage first (using a freshly generated push key so it's unique), then
// writes the matching text + resulting download URL to the Realtime DB.
window.fbAddStenoPassage = function(category, file, text, title, onProgress){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai.'));
  const listRef = ref(db, `stenoPassages/${category}`);
  const newRef = push(listRef);
  const key = newRef.key;
  const ext = (file.name.split('.').pop() || 'mp3').toLowerCase();
  const sRef = storageRef(storage, `stenoAudio/${category}/${key}.${ext}`);
  return uploadFileWithProgress(sRef, file, onProgress)
    .then(()=> getDownloadURL(sRef))
    .then((audioURL)=> set(newRef, { title: title || '', text, audioURL, createdAt: Date.now() }))
    .then(()=> key);
};

// Update just the text/title of an existing passage (audio stays as-is).
window.fbUpdateStenoPassageText = function(category, key, title, text){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai.'));
  return update(ref(db, `stenoPassages/${category}/${key}`), { title, text, updatedAt: Date.now() });
};

// Replace just the audio file of an existing passage (text/title stays as-is).
window.fbReplaceStenoAudio = function(category, key, file, onProgress){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai.'));
  const ext = (file.name.split('.').pop() || 'mp3').toLowerCase();
  const sRef = storageRef(storage, `stenoAudio/${category}/${key}.${ext}`);
  return uploadFileWithProgress(sRef, file, onProgress)
    .then(()=> getDownloadURL(sRef))
    .then((audioURL)=> update(ref(db, `stenoPassages/${category}/${key}`), { audioURL, updatedAt: Date.now() }));
};

window.fbDeleteStenoPassage = function(category, key, audioURL){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai.'));
  const dbDelete = remove(ref(db, `stenoPassages/${category}/${key}`));
  // best-effort: also remove the audio file from Storage (ignore errors — e.g. already gone)
  if(audioURL){
    try {
      const sRef = storageRef(storage, audioURL);
      deleteObject(sRef).catch(()=>{});
    } catch(e){ /* ignore malformed url */ }
  }
  return dbDelete;
};

window.fbListenStenoPassages = function(callback){
  if(!fbOk){ callback({}); return; }
  onValue(ref(db, 'stenoPassages'), (snap)=>{
    callback(snap.exists() ? snap.val() : {});
  }, (err)=>{ console.error('steno listen error', err); callback({}); });
};

window.fbGetStenoPassagesOnce = function(callback){
  if(!fbOk){ callback({}); return; }
  get(ref(db, 'stenoPassages')).then(snap=>{
    callback(snap.exists() ? snap.val() : {});
  }).catch(err=>{ console.error('steno get error', err); callback({}); });
};

/* ══════════════════════════════════════════════════════
   STENO VIDEOS + PDFs (Learn Steno / Chapterwise Exercise /
   Speed Booster + PDF list) — admin-managed, live everywhere.
   DB shape:
     stenoVideos/{category}/{pushKey} = {title, youtubeId, order}
     stenoVideoFreeCount/{category}   = number
     stenoPdfs/{pushKey}              = {title, url, createdAt}
   Videos themselves live on YouTube (not Firebase) — only the
   tiny title+ID metadata is stored here, so this costs ~nothing
   against the free Realtime Database quota even with hundreds
   of entries. Only PDFs use Storage (needs Blaze plan, 5GB free).
══════════════════════════════════════════════════════ */
window.fbAddStenoVideo = function(category, title, youtubeId){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai.'));
  const newRef = push(ref(db, `stenoVideos/${category}`));
  return set(newRef, { title: title||'', youtubeId: youtubeId||'', createdAt: Date.now() });
};
window.fbUpdateStenoVideo = function(category, key, title, youtubeId){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai.'));
  return update(ref(db, `stenoVideos/${category}/${key}`), { title: title||'', youtubeId: youtubeId||'' });
};
window.fbDeleteStenoVideo = function(category, key){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai.'));
  return remove(ref(db, `stenoVideos/${category}/${key}`));
};
window.fbListenStenoVideos = function(callback){
  if(!fbOk){ callback({}); return; }
  onValue(ref(db, 'stenoVideos'), (snap)=>{
    callback(snap.exists() ? snap.val() : {});
  }, (err)=>{ console.error('steno video listen error', err); callback({}); });
};

window.fbSetStenoFreeCount = function(category, count){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai.'));
  return set(ref(db, `stenoVideoFreeCount/${category}`), Number(count)||0);
};
window.fbListenStenoFreeCount = function(callback){
  if(!fbOk){ callback({}); return; }
  onValue(ref(db, 'stenoVideoFreeCount'), (snap)=>{
    callback(snap.exists() ? snap.val() : {});
  }, (err)=>{ console.error('steno free-count listen error', err); callback({}); });
};

window.fbAddStenoPdf = function(file, title, onProgress){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai.'));
  const newRef = push(ref(db, 'stenoPdfs'));
  const key = newRef.key;
  const sRef = storageRef(storage, `stenoPdfs/${key}.pdf`);
  return uploadFileWithProgress(sRef, file, onProgress)
    .then(()=> getDownloadURL(sRef))
    .then((url)=> set(newRef, { title: title||'PDF', url, createdAt: Date.now() }))
    .then(()=> key);
};
window.fbDeleteStenoPdf = function(key, url){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai.'));
  const dbDelete = remove(ref(db, `stenoPdfs/${key}`));
  if(url){
    try { deleteObject(storageRef(storage, url)).catch(()=>{}); } catch(e){}
  }
  return dbDelete;
};
window.fbListenStenoPdfs = function(callback){
  if(!fbOk){ callback({}); return; }
  onValue(ref(db, 'stenoPdfs'), (snap)=>{
    callback(snap.exists() ? snap.val() : {});
  }, (err)=>{ console.error('steno pdf listen error', err); callback({}); });
};

// One-time fetches (used by candidate.html on page load — a listener isn't
// needed there since the page reloads on every visit anyway)
window.fbGetStenoVideosOnce = function(){
  if(!fbOk) return Promise.resolve(null);
  return get(ref(db, 'stenoVideos')).then(snap=> snap.exists() ? snap.val() : null);
};
window.fbGetStenoFreeCountOnce = function(){
  if(!fbOk) return Promise.resolve(null);
  return get(ref(db, 'stenoVideoFreeCount')).then(snap=> snap.exists() ? snap.val() : null);
};
window.fbGetStenoPdfsOnce = function(){
  if(!fbOk) return Promise.resolve(null);
  return get(ref(db, 'stenoPdfs')).then(snap=> snap.exists() ? snap.val() : null);
};

// ════════════════════════════════════════════════════════════
// ANALYTICS / USER TRACKING SYSTEM
// Firebase paths:
//   users/{emailKey}                    → {name,email,mobile,examPref,signupAt,lastLoginAt,loginCount,isPro,plan,proExpiry}
//   activeSessions/{devId}              → {lastSeen, userEmail|null}   (auto-expires via lastSeen check)
//   payments/{emailKey}/ownerEmail      → "user@x.com"   (flat metadata field, used by security rules to verify ownership)
//   payments/{emailKey}/{pushId}        → {name,plan,amount,date,dateStr,status}
//   dailyStats/{yyyy-mm-dd}             → {signups,logins,testsCompleted}
// ════════════════════════════════════════════════════════════

const HEARTBEAT_MS = 60000; // active user = seen in last 2 min

// NOTE: the old fbTrackSignup/fbTrackLogin functions have been removed.
// Real signup/login tracking now happens inside fbSignupUser/fbLoginUser
// below, right after a genuine Firebase Auth account is created/verified —
// so there's no longer a way to write a "users/" record without a real,
// verified Firebase account behind it.



// ── Real payment flow (Razorpay) ─────────────────────────────
// Two-step, both server-verified — the browser never has the power to grant
// itself Pro. Step 1 asks the server to open a Razorpay Order (server decides
// the real amount). Step 2, called only after Razorpay Checkout itself reports
// success, sends the payment proof back for signature verification before Pro
// is actually granted. See functions/index.js for the verification logic.
window.fbCreateRazorpayOrder = function(planKey){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai.'));
  const createOrderFn = httpsCallable(fns, 'createRazorpayOrder');
  return createOrderFn({ plan: planKey }).then(res=>res.data);
};

window.fbVerifyRazorpayPayment = function(payload){
  if(!fbOk) return Promise.reject(new Error('Firebase ready nahi hai.'));
  const verifyFn = httpsCallable(fns, 'verifyRazorpayPayment');
  return verifyFn(payload).then(res=>res.data);
};

// ── User Dashboard: read a logged-in user's OWN profile + payment history ──
window.fbGetUserProfile = function(email, callback){
  if(!fbOk || !email){ callback(null); return; }
  const key = window.emailToKey(email);
  get(ref(db, 'users/'+key)).then(snap=>{
    callback(snap.exists() ? snap.val() : null);
  }).catch(err=>{ console.error('get user profile error', err); callback(null); });
};

window.fbGetUserPayments = function(email, callback){
  if(!fbOk || !email){ callback([]); return; }
  const key = window.emailToKey(email);
  get(ref(db, 'payments/'+key)).then(snap=>{
    if(!snap.exists()){ callback([]); return; }
    const all = snap.val();
    const list = Object.keys(all)
      .filter(k=> k !== 'ownerEmail')            // skip the metadata field, keep only real payment records
      .map(k=> all[k]);
    callback(list);
  }).catch(err=>{ console.error('get user payments error', err); callback([]); });
};

// ── Active session heartbeat (anonymous device, no login required) ──
window.fbStartHeartbeat = function(){
  if(!fbOk) return;
  const devId = window.getDeviceId();
  const sessRef = ref(db, 'activeSessions/'+devId);
  function beat(){
    set(sessRef, {
      lastSeen: Date.now(),
      userEmail: (window.APP && window.APP.loggedIn) ? window.APP.email : null,
      userName: (window.APP && window.APP.loggedIn) ? window.APP.name : 'Guest',
      isPro: (window.APP && window.APP.isPro) || false
    }).catch(()=>{});
  }
  beat();
  setInterval(beat, HEARTBEAT_MS);
  window.addEventListener('beforeunload', ()=>{
    try{ set(sessRef, null); }catch(e){}
  });
};

// ── ADMIN: read full analytics snapshot ──────────────────────
window.fbGetAnalytics = function(callback){
  if(!fbOk){ callback({error:'Firebase not ready'}); return; }
  Promise.all([
    get(ref(db,'users')),
    get(ref(db,'payments')),
    get(ref(db,'activeSessions')),
    get(ref(db,'dailyStats'))
  ]).then(([usersSnap, paySnap, sessSnap, statsSnap])=>{
    const users = usersSnap.exists() ? usersSnap.val() : {};
    const paymentsByUser = paySnap.exists() ? paySnap.val() : {};
    // payments are now nested as payments/{emailKey}/{pushId}, plus a flat
    // "ownerEmail" metadata field per user — skip that, flatten the rest.
    const payments = Object.values(paymentsByUser).flatMap(userNode =>
      Object.keys(userNode)
        .filter(k => k !== 'ownerEmail')
        .map(k => userNode[k])
    );
    const sessions = sessSnap.exists() ? sessSnap.val() : {};
    const dailyStats = statsSnap.exists() ? statsSnap.val() : {};

    const usersArr = Object.values(users);
    const totalUsers = usersArr.length;
    const proUsers = usersArr.filter(u=>u.isPro && u.proExpiry > Date.now()).length;
    const totalRevenue = payments.reduce((sum,p)=>sum+(p.amount||0),0);
    const totalPayments = payments.length;

    // Active = heartbeat within last 3 minutes
    const cutoff = Date.now() - (HEARTBEAT_MS*3);
    const activeArr = Object.values(sessions).filter(s=>s.lastSeen > cutoff);
    const activeCount = activeArr.length;
    const activeLoggedIn = activeArr.filter(s=>s.userEmail).length;
    const activeGuests = activeCount - activeLoggedIn;

    // Login-only users = signed up but isPro false
    const freeUsers = totalUsers - proUsers;

    callback({
      totalUsers, proUsers, freeUsers,
      totalRevenue, totalPayments,
      activeCount, activeLoggedIn, activeGuests,
      users: usersArr.sort((a,b)=>(b.signupAt||0)-(a.signupAt||0)),
      payments: payments.sort((a,b)=>(b.date||0)-(a.date||0)),
      dailyStats
    });
  }).catch(err=>{ console.error('analytics read error',err); callback({error:err.message}); });
};

// ── ADMIN: live-listen to analytics (auto refresh) ───────────
window.fbListenAnalytics = function(callback){
  if(!fbOk){ callback({error:'Firebase not ready'}); return; }
  const refresh = ()=>window.fbGetAnalytics(callback);
  onValue(ref(db,'users'), refresh);
  onValue(ref(db,'payments'), refresh);
  onValue(ref(db,'activeSessions'), refresh);
};

// ── Override admin functions to also sync Firebase ──────────
window.addEventListener('DOMContentLoaded',()=>{
  const _add=window.admAddPassage, _del=window.admDelPassage,
        _save=window.admSaveEdit,  _up=window.admMoveUp;

  if(typeof _add==='function'){
    window.admAddPassage=function(tab){
      const {key}=window.getAdmArr(tab);
      const ta=document.getElementById('newPassInput_'+key);
      if(!ta||ta.value.trim().length<10){ _add(tab); return; }
      _add(tab); saveTab(tab);
    };
  }
  if(typeof _del==='function'){
    window.admDelPassage=function(tab,idx){
      if(!confirm('Is passage ko delete karein?')) return;
      const {arr}=window.getAdmArr(tab); arr.splice(idx,1);
      if(typeof window.updateTabCounts==='function') window.updateTabCounts();
      if(typeof window.renderAdmTab==='function') window.renderAdmTab(tab);
      if(typeof window.showAdmToast==='function') window.showAdmToast('🗑️ Delete ho gaya!');
      if(document.getElementById('ctrlEx')&&typeof window.buildDd==='function') window.buildDd();
      saveTab(tab);
    };
  }
  if(typeof _save==='function'){
    window.admSaveEdit=function(tab,idx){
      const {arr,key}=window.getAdmArr(tab);
      const ta=document.getElementById('editTa_'+key+'_'+idx); if(!ta) return;
      const text=ta.value.trim();
      if(!text||text.length<10){ if(typeof window.showAdmToast==='function') window.showAdmToast('❌ Too short!','error'); return; }
      arr[idx]=text;
      if(typeof window.renderAdmTab==='function') window.renderAdmTab(tab);
      if(typeof window.showAdmToast==='function') window.showAdmToast('✅ Passage update ho gaya!');
      if(document.getElementById('ctrlEx')&&typeof window.buildDd==='function') window.buildDd();
      saveTab(tab);
    };
  }
  if(typeof _up==='function'){
    window.admMoveUp=function(tab,idx){
      if(idx===0) return;
      const {arr}=window.getAdmArr(tab); [arr[idx-1],arr[idx]]=[arr[idx],arr[idx-1]];
      if(typeof window.renderAdmTab==='function') window.renderAdmTab(tab);
      if(typeof window.showAdmToast==='function') window.showAdmToast('↑ Reorder ho gaya!');
      saveTab(tab);
    };
  }

  // JSON Import button injection for admin page
  const _rTab=window.renderAdmTab;
  if(typeof _rTab==='function'){
    window.renderAdmTab=function(n){
      _rTab(n);
      const head=document.querySelector('.adm-section-head');
      if(head&&!head.querySelector('#fbImportBtn')){
        const btn=document.createElement('button');
        btn.id='fbImportBtn';
        btn.innerHTML='📥 JSON se Import';
        btn.style.cssText='padding:6px 14px;background:#2471a3;border:none;border-radius:8px;color:#fff;font-size:12px;cursor:pointer;font-family:\'DM Sans\',sans-serif;margin-right:8px;';
        btn.onclick=()=>{
          const inp=document.createElement('input'); inp.type='file'; inp.accept='.json';
          inp.onchange=(e)=>{
            const file=e.target.files[0]; if(!file) return;
            const reader=new FileReader();
            reader.onload=(ev)=>{
              try {
                const data=JSON.parse(ev.target.result);
                const norm=data.normal||{}, live=data.live||{};
                if(norm.english){window.PASS.english=norm.english; saveTab(0);}
                if(norm.hindi)  {window.PASS.hindi=norm.hindi;     saveTab(1);}
                if(live.english){window.LIVE_PASS.english=live.english; saveTab(2);}
                if(live.hindi)  {window.LIVE_PASS.hindi=live.hindi;     saveTab(3);}
                if(norm.numbers){window.PASS.numbers=norm.numbers; saveTab(4);}
                if(typeof window.updateTabCounts==='function') window.updateTabCounts();
                if(typeof window.renderAdmTab==='function') window.renderAdmTab(window.admCurrentTab);
                toast('✅ Import ho gaya aur Firebase mein save ho raha hai!');
              } catch(err){ toast('❌ JSON parse error: '+err.message,false); }
            };
            reader.readAsText(file);
          };
          inp.click();
        };
        head.insertBefore(btn, head.firstChild);
      }
    };
  }

  // Export JSON
  window.admExportJSON=function(){
    const data={normal:{english:window.PASS.english,hindi:window.PASS.hindi,numbers:window.PASS.numbers},live:{english:window.LIVE_PASS.english,hindi:window.LIVE_PASS.hindi},exportedAt:new Date().toISOString(),version:'v7'};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='apna_passages_'+Date.now()+'.json'; a.click();
    if(typeof window.showAdmToast==='function') window.showAdmToast('✅ Export ho gaya!');
  };

  // Start listening
  listenAll();

  // Start active-session heartbeat (every page, tracks Guest + logged-in users)
  window.fbStartHeartbeat();
});
