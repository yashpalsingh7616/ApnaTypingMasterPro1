/**
 * ADMIN PASSWORD RESET — EMAIL KE BINA
 * ======================================
 * Ye script Firebase Console ke "Reset password" email par depend nahi karti
 * — seedha Admin SDK use karke aapka password directly set kar deti hai.
 *
 * KAISE USE KAREIN:
 *
 * 1) Terminal mein apne project folder ke andar jaake ye install karo:
 *      npm install firebase-admin
 *
 * 2) Service Account key download karo:
 *      Firebase Console → ⚙️ Project Settings → Service Accounts tab
 *      → "Generate new private key" button dabao
 *      → Ek .json file download hogi (jaise "apna-typing-xxxx-firebase-adminsdk.json")
 *      → Usse isi folder mein "serviceAccountKey.json" naam se save karo
 *
 * 3) Neeche NEW_PASSWORD wali line mein apna naya password likho
 *
 * 4) Terminal mein chalao:
 *      node reset-admin-password.js
 *
 * 5) "✅ Password set ho gaya!" dikhte hi, usi naye password se login karo.
 *
 * ⚠️ ZAROORI: Kaam ho jaane ke baad "serviceAccountKey.json" file ko DELETE
 * kar do aur kabhi bhi GitHub/kisi ke saath share mat karo — isse poori
 * Firebase project (poora database, sab kuch) full-access mil jaata hai.
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

const ADMIN_EMAIL   = 'yashpalsingh7616@gmail.com';
const NEW_PASSWORD  = 'YAHAN_APNA_NAYA_PASSWORD_LIKHO';   // ← ise badal do, kam se kam 6 characters

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run(){
  try {
    // Pehle check karte hain ki ye email Firebase Auth mein exist karta hai ya nahi
    let user;
    try {
      user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
      console.log('✅ Account mil gaya — UID:', user.uid);
    } catch(e){
      if(e.code === 'auth/user-not-found'){
        console.log('⚠️ Ye email Firebase Auth mein exist hi nahi karta — naya account bana rahe hain...');
        user = await admin.auth().createUser({
          email: ADMIN_EMAIL,
          password: NEW_PASSWORD,
          emailVerified: true   // seedha verified — email-verification wait nahi karna padega
        });
        console.log('✅ Naya admin account ban gaya! UID:', user.uid);
        console.log('🎉 Ab is email/password se seedha Login kar sakte ho — kuch aur nahi karna.');
        return;
      }
      throw e;
    }

    // Account exist karta hai — password update + email verified force kar do
    await admin.auth().updateUser(user.uid, {
      password: NEW_PASSWORD,
      emailVerified: true
    });
    console.log('✅ Password set ho gaya! Ab is naye password se Login karein:', ADMIN_EMAIL);
  } catch(err){
    console.error('❌ Error:', err.message);
  }
}

run();
