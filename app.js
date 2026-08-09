/* © 2026 Apna Typing Master Pro — All rights reserved. Unauthorized copying or redistribution of this source code is prohibited. */
// app.js — Apna Typing Master Pro — Multi-page version
// shared.js must be loaded first (provides APP, PASS, LIVE_PASS, etc.)

// Use window.PASS and window.LIVE_PASS from shared.js
const PASS = window.PASS;
const LIVE_PASS = window.LIVE_PASS;
const PLANS_DATA = window.PLANS_DATA;


/* ══════════════════════════════════════════════════════
   MULTI-PAGE NAVIGATION HELPERS
   (replaces single-page div switching)
══════════════════════════════════════════════════════ */
function showPage(id){
  // In multi-page mode, redirect to correct page
  const pageMap = {
    'landingPage':   'index.html',
    'dashboardPage': 'candidate.html',
    'adminPage':     'admin.html',
    'liveTestPage':  'live-tests.html'
  };
  if(pageMap[id]) window.location.href = pageMap[id];
}

function loginSuccess(name, email){
  APP.loggedIn=true; APP.name=name; APP.email=email;
  saveSession();
  if(typeof closeAuthModal==='function') closeAuthModal();
  window.location.href='candidate.html';
}

function doLogout(){
  APP.loggedIn=false; APP.isPro=false; APP.name=''; APP.email='';
  saveSession();
  window.location.href='index.html';
}

/* ══════════════════════════════════════════════════════
   USER DASHBOARD — profile, plan status, purchase history
══════════════════════════════════════════════════════ */
function openUserDashboard(){
  openDModal('userDashModal');
  const loggedOutEl = document.getElementById('userDashLoggedOut');
  const loadingEl    = document.getElementById('userDashLoading');
  const contentEl    = document.getElementById('userDashContent');
  loggedOutEl.style.display='none'; loadingEl.style.display='none'; contentEl.style.display='none';

  if(!APP.loggedIn || !APP.email){
    loggedOutEl.style.display='block';
    return;
  }

  loadingEl.style.display='block';

  if(typeof window.fbGetUserProfile !== 'function'){
    loadingEl.textContent = '⚠️ Abhi profile load nahi ho pa raha. Thodi der baad try karein.';
    return;
  }

  window.fbGetUserProfile(APP.email, (profile)=>{
    window.fbGetUserPayments(APP.email, (payments)=>{
      loadingEl.style.display='none';
      contentEl.style.display='block';
      renderUserDashboard(profile, payments||[]);
    });
  });
}

function renderUserDashboard(profile, payments){
  document.getElementById('udName').textContent   = (profile && profile.name)   || APP.name  || '—';
  document.getElementById('udEmail').textContent   = (profile && profile.email) || APP.email || '—';
  document.getElementById('udMobile').textContent  = (profile && profile.mobile && profile.mobile.trim()) ? profile.mobile : 'Add nahi kiya gaya';

  const planBody = document.getElementById('udPlanBody');
  const isProActive = profile && profile.isPro && profile.proExpiry && profile.proExpiry > Date.now();
  if(isProActive){
    const daysLeft = Math.max(0, Math.ceil((profile.proExpiry - Date.now()) / 86400000));
    const planLabel = profile.plan==='yearly' ? 'Pro Yearly' : profile.plan==='quarterly' ? 'Pro 3-Month' : 'Pro Monthly';
    const expiryStr = new Date(profile.proExpiry).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
    planBody.innerHTML = `
      <div class="udash-row"><span>Status</span><span style="color:#27ae60;font-weight:700;">⚡ PRO ACTIVE</span></div>
      <div class="udash-row"><span>Plan</span><span>${planLabel}</span></div>
      <div class="udash-row"><span>Valid Until</span><span>${expiryStr}</span></div>
      <div class="udash-row"><span>Days Remaining</span><span style="color:#e67e22;font-weight:700;">${daysLeft} din</span></div>
    `;
  } else {
    planBody.innerHTML = `
      <div class="udash-row"><span>Status</span><span style="color:#999;">Free Plan</span></div>
      <button class="pay-submit" style="width:auto;padding:8px 20px;margin-top:8px;" onclick="closeDModal('userDashModal');openDModal('subModal');">⚡ Upgrade to Pro</button>
    `;
  }

  const histEl = document.getElementById('udHistory');
  if(!payments || payments.length===0){
    histEl.innerHTML = '<div style="color:#999;font-size:13px;padding:6px 0;">Abhi tak koi purchase nahi hui.</div>';
  } else {
    const planLabelOf = (p)=> p==='yearly' ? 'Yearly' : p==='quarterly' ? '3-Month' : 'Monthly';
    histEl.innerHTML = payments
      .slice()
      .sort((a,b)=> (b.date||0) - (a.date||0))
      .map(p=>{
        const dateStr = p.dateStr || (p.date ? new Date(p.date).toLocaleDateString('en-IN') : '—');
        const ok = p.status === 'success';
        return `<div class="udash-row"><span>${dateStr} — ${planLabelOf(p.plan)}</span><span style="color:${ok?'#27ae60':'#e74c3c'};font-weight:600;">₹${p.amount||0} ${ok?'✅':'❌'}</span></div>`;
      }).join('');
  }
}

function openAdminPage(){
  window.location.href='admin.html';
}

function closeAdminPage(){
  if(typeof window.fbAdminSignOut==='function') window.fbAdminSignOut();
  window.setAdmLoggedIn && window.setAdmLoggedIn(false);
  if(typeof window.clearAdmSession==='function') window.clearAdmSession();
  window.location.href='candidate.html';
}

function openLiveTestPage(){
  window.location.href='live-tests.html';
}

function goHome(){
  clearInterval(APP.timer); APP.running=false;
  APP.activeExamKey=null; APP.isLiveMode=false;
  window.location.href='candidate.html';
}


/* ══════════════════════════════════════════════════════
   PAGE SWITCHING HELPERS
══════════════════════════════════════════════════════ */


/* ══════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════ */
function openAuthModal(tab='login'){
  document.getElementById('authModal').classList.add('active');
  switchAuthTab(tab);
}
function closeAuthModal(){
  document.getElementById('authModal').classList.remove('active');
  document.getElementById('authLoginErr').style.display='none';
  document.getElementById('authSignupErr').style.display='none';
  document.getElementById('modalForgotErr1').style.display='none';
  document.getElementById('modalForgotErr2').style.display='none';
}
function handleAuthOverlay(e){if(e.target===document.getElementById('authModal'))closeAuthModal();}
function switchAuthTab(tab){
  document.getElementById('authLoginForm').style.display=tab==='login'?'':'none';
  document.getElementById('authSignupForm').style.display=tab==='signup'?'':'none';
  document.getElementById('modalForgotForm').style.display='none';
  document.querySelector('.auth-tabs').style.display='flex';
  document.getElementById('tabLogin').classList.toggle('active',tab==='login');
  document.getElementById('tabSignup').classList.toggle('active',tab==='signup');
  document.getElementById('authTitle').textContent=tab==='login'?'Welcome Back 👋':'Join Free Today 🚀';
  document.getElementById('authSub').textContent=tab==='login'?'Apna account access karein':'India ke lakhs aspirants ke saath practice karein';
}

/* ── Forgot Password (modal) — same 4-digit email OTP used on login.html ── */
function openModalForgot(){
  document.getElementById('authLoginForm').style.display='none';
  document.getElementById('authSignupForm').style.display='none';
  document.querySelector('.auth-tabs').style.display='none';
  document.getElementById('modalForgotForm').style.display='block';
  document.getElementById('modalForgotStep1').style.display='block';
  document.getElementById('modalForgotStep2').style.display='none';
  document.getElementById('authTitle').textContent='Password Reset 🔑';
  document.getElementById('authSub').textContent='Email par OTP bhej kar naya password banayein';
}
function closeModalForgot(){
  switchAuthTab('login');
}
function sendModalForgotOTP(){
  const email=document.getElementById('modalForgotEmail').value.trim();
  const err=document.getElementById('modalForgotErr1');
  err.style.display='none';
  if(!email){err.textContent='❌ Email daalein.';err.style.display='block';return;}
  if(typeof window.fbSendResetOTP!=='function'){err.textContent='Firebase abhi ready nahi hai, page refresh karein.';err.style.display='block';return;}
  const btn=document.querySelector('#modalForgotStep1 .btn-submit-auth');
  btn.disabled=true;btn.textContent='Bheja ja raha hai...';
  window.fbSendResetOTP(email).then(()=>{
    btn.disabled=false;btn.textContent='OTP Bhejein →';
    document.getElementById('modalForgotStep1').style.display='none';
    document.getElementById('modalForgotStep2').style.display='block';
  }).catch(e=>{
    btn.disabled=false;btn.textContent='OTP Bhejein →';
    err.textContent='❌ '+e.message;err.style.display='block';
  });
}
function verifyModalForgotOTP(){
  const email=document.getElementById('modalForgotEmail').value.trim();
  const otp=document.getElementById('modalForgotOtp').value.trim();
  const newPass=document.getElementById('modalForgotNewPass').value;
  const err=document.getElementById('modalForgotErr2');
  err.style.display='none';
  if(!otp||otp.length!==4){err.textContent='❌ 4-ank ka OTP daalein.';err.style.display='block';return;}
  if(!newPass||newPass.length<6){err.textContent='❌ Password kam se kam 6 characters ka hona chahiye.';err.style.display='block';return;}
  if(typeof window.fbVerifyResetOTP!=='function'){err.textContent='Firebase abhi ready nahi hai, page refresh karein.';err.style.display='block';return;}
  const btn=document.querySelector('#modalForgotStep2 .btn-submit-auth');
  btn.disabled=true;btn.textContent='Verify ho raha hai...';
  window.fbVerifyResetOTP(email,otp,newPass).then(()=>{
    alert('✅ Password reset ho gaya! Ab naye password se Log In karein.');
    document.getElementById('authLoginEmail').value=email;
    closeModalForgot();
  }).catch(e=>{
    btn.disabled=false;btn.textContent='Password Reset Karein →';
    err.textContent='❌ '+e.message;err.style.display='block';
  });
}

function doAuthLogin(){
  const email=document.getElementById('authLoginEmail').value.trim();
  const pass=document.getElementById('authLoginPass').value;
  const err=document.getElementById('authLoginErr');
  err.style.display='none';
  if(!email||!pass){err.style.display='block';err.textContent='❌ Email aur password dono likhein.';return;}
  if(typeof window.fbLoginUser!=='function'){err.style.display='block';err.textContent='Firebase abhi ready nahi hai, page refresh karein.';return;}
  const btn=document.querySelector('#authLoginForm .btn-submit-auth');
  btn.disabled=true;btn.textContent='Log In ho raha hai...';
  window.fbLoginUser(email,pass).then((profile)=>{
    btn.disabled=false;btn.textContent='Log In →';
    APP.isPro=!!profile.isPro;
    loginSuccess(profile.name||email.split('@')[0],email);
  }).catch(e=>{
    btn.disabled=false;btn.textContent='Log In →';
    err.style.display='block';err.textContent='❌ '+e.message;
  });
}
function doAuthSignup(){
  const name=document.getElementById('authSignupName').value.trim();
  const email=document.getElementById('authSignupEmail').value.trim();
  const pass=document.getElementById('authSignupPass').value;
  const exam=document.getElementById('authSignupExam').value;
  const err=document.getElementById('authSignupErr');
  err.style.display='none';
  if(!name||!email||!pass){err.style.display='block';err.textContent='❌ Sabhi fields bharna zaroori hai.';return;}
  if(pass.length<6){err.style.display='block';err.textContent='❌ Password min 6 characters ka hona chahiye.';return;}
  if(typeof window.fbSignupUser!=='function'){err.style.display='block';err.textContent='Firebase abhi ready nahi hai, page refresh karein.';return;}
  const btn=document.querySelector('#authSignupForm .btn-submit-auth');
  btn.disabled=true;btn.textContent='Account ban raha hai...';
  window.fbSignupUser(name,email,pass,exam).then(()=>{
    btn.disabled=false;btn.textContent='Account Banayein →';
    APP.isPro=false;
    loginSuccess(name,email);
  }).catch(e=>{
    btn.disabled=false;btn.textContent='Account Banayein →';
    err.style.display='block';err.textContent='❌ '+e.message;
  });
}

function updateDashStrip(){
  const strip=document.getElementById('authStrip');
  if(!strip) return;
  strip.innerHTML='<span style="color:#555;">Welcome, <b>'+APP.name+'</b></span>'+
    (APP.isPro?'<span style="background:#27ae60;color:#fff;padding:2px 10px;border-radius:3px;font-size:11px;font-weight:700;margin-left:6px;">⚡ PRO</span>':'')+
    (!APP.isPro?'<button class="auth-btn-d" onclick="openDModal(\'subModal\')">⚡ Upgrade</button>':'')+
    '<button class="auth-btn-d" style="background:#888;" onclick="doLogout()">Log Out</button>';
  const banner=document.getElementById('proBanner');
  if(banner) banner.style.display=APP.isPro?'none':'flex';
}

// Daily practice streak badge — waits a moment for the Firebase module
// script to finish initializing before checking the logged-in user.
function updateStreakBadge(retries){
  retries = retries===undefined ? 8 : retries;
  const badge = document.getElementById('streakBadge');
  if(!badge) return;
  if(!APP.loggedIn){ badge.style.display='none'; return; }
  if(typeof window.fbUpdateAndGetStreak !== 'function'){
    if(retries > 0) setTimeout(()=>updateStreakBadge(retries-1), 400);
    return;
  }
  window.fbUpdateAndGetStreak().then(s=>{
    document.getElementById('streakCount').textContent = s.current;
    badge.style.display = s.current > 0 ? 'block' : 'none';
  }).catch(()=>{ badge.style.display='none'; });
}


/* ══════════════════════════════════════════════════════
   DASHBOARD MODALS
══════════════════════════════════════════════════════ */
function openDModal(id){document.getElementById(id).classList.add('open');}
function closeDModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-bg').forEach(el=>el.addEventListener('click',e=>{if(e.target===el)el.classList.remove('open');}));

/* ══════════════════════════════════════════════════════
   LIVE TEST PAGE
══════════════════════════════════════════════════════ */

function closeLiveTestPage(){
  showPage('dashboardPage');
}

function renderLtUpcoming(){
  const list=document.getElementById('ltUpcomingList');
  if(!list) return;
  const filter=document.getElementById('ltExamFilter')?.value||'all';
  const data=filter==='all'?LIVE_SCHEDULE:LIVE_SCHEDULE.filter(t=>t.exam===filter||t.exam.includes(filter));
  if(data.length===0){list.innerHTML='<div class="lt-empty">Koi test nahi mila. Filter change karein.</div>';return;}
  let html='<div class="lt-day-label">Today</div>';
  data.forEach(t=>{
    const langColor = t.lang.includes('Hindi')?'color:#8b4513;':'color:#1a5276;';
    const profile=EXAM_PROFILES[t.exam]||{};
    const isHindi=t.lang.includes('Hindi');
    const reqWPM=isHindi?(profile.hinWPM||25):(profile.engWPM||30);
    const formulaTag={ssc:'SSC Rule',rrb:'Railway Rule',upsssc:'Grace-of-5 Rule',court:'Court Rule'}[profile.netFormula]||'Standard';
    html+=`<div class="lt-test-card">
      <div class="lt-test-info">
        <div class="lt-test-row1">
          <span class="lt-today-tag">Today</span>
          <span class="lt-exam-name">${t.exam}</span>
          <span class="lt-lang-tag" style="${langColor}font-weight:700;">${t.lang}</span>
          <span class="lt-free-badge">Free</span>
        </div>
        <div class="lt-test-row2">
          ${t.timeSlot} &nbsp;|&nbsp; ${t.duration} Min &nbsp;|&nbsp;
          <b style="color:#c0392b;">Min. ${reqWPM} WPM</b> &nbsp;|&nbsp;
          ⌫ ${t.backspace}
        </div>
        <div class="lt-test-row3">📊 ${formulaTag} &nbsp;|&nbsp; 🚫 No Copy-Paste &nbsp;|&nbsp; 🚫 No Spell Check &nbsp;|&nbsp; 📜 Manual Scroll</div>
      </div>
      <button class="lt-take-btn" onclick="startLiveScheduledTest(${t.id})">Take Test</button>
    </div>`;
  });
  list.innerHTML=html;
}

function startLiveScheduledTest(testId){
  const t=LIVE_SCHEDULE.find(x=>x.id===testId);
  if(!t){alert('Test nahi mila!');return;}
  if(!APP.loggedIn){openAuthModal('login');return;}
  const passArr=LIVE_PASS[t.passKey]||LIVE_PASS.english;
  const passage=passArr[t.passIdx%passArr.length];
  APP.isLiveMode=true;
  APP.lang=t.passKey;
  APP.idx=t.passIdx;
  APP.activeExamKey=null;
  APP.currentLiveTest=t;
  // Sync backspace + highlight radios to this exam's real rule (was previously left at
  // whatever the sidebar last had selected, ignoring the actual live test's policy).
  const liveProfile=EXAM_PROFILES[t.exam]||{};
  const liveHlMap={ssc:'error', rrb:'letter', upsssc:'word', court:'error'};
  const liveBsR=document.querySelector('input[name="bs"][value="'+(t.bsMode||'word')+'"]');
  if(liveBsR) liveBsR.checked=true;
  const liveHlR=document.querySelector('input[name="hl"][value="'+(liveHlMap[liveProfile.netFormula]||'error')+'"]');
  if(liveHlR) liveHlR.checked=true;
  // Go to test page
  showPage('dashboardPage');
  document.getElementById('homePage').style.display='none';
  document.getElementById('testPageWrap').style.display='block';
  document.getElementById('testTitle').textContent='🔴 LIVE — '+t.exam+' '+t.lang+' — Apna Typing Master Pro';
  const disp=document.getElementById('activeExamDisplay');
  if(disp) disp.innerHTML='<b style="color:#c0392b;">🔴 LIVE TEST — '+t.exam+'</b><br><span style="font-weight:400;color:#555;">'+t.lang+' | '+t.duration+' Min | Free</span>';
  buildDd(); loadPass(); resetTest();
  setTimeout(()=>{
    const sel=document.getElementById('ctrlDur');
    if(sel){
      const opts=Array.from(sel.options).map(o=>parseInt(o.value));
      const best=opts.reduce((a,b)=>Math.abs(b-t.duration)<Math.abs(a-t.duration)?b:a);
      sel.value=best; APP.timeLeft=best*60; updTimer();
    }
  },100);
}

function renderLtResults(){
  const list=document.getElementById('ltResultsList');
  if(!list) return;
  if(liveResults.length===0){
    list.innerHTML='<div class="lt-empty">Abhi koi result nahi hai.<br>Koi live test complete karein.</div>';
    return;
  }
  let html='';
  liveResults.slice().reverse().forEach((r,i)=>{
    const qualified=r.net>=r.minSpeed;
    const testIdNum=34340+i;
    html+=`<div class="lt-res-card">
      <div class="lt-res-top">
        <div>
          <div class="lt-res-date">${r.date}</div>
          <div class="lt-res-testid">Test ID: ${testIdNum}</div>
        </div>
        <div style="text-align:right;">
          <div class="lt-res-exam">${r.exam}</div>
          <div class="lt-res-lang">${r.lang}</div>
        </div>
      </div>
      <div class="lt-res-grid">
        <div><span class="lt-res-key">Rank &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: </span><span class="lt-res-val">${r.rank||'—'}</span></div>
        <div></div>
        <div><span class="lt-res-key">Net speed &nbsp;: </span><span class="lt-res-val">${r.net} wpm</span></div>
        <div><span class="lt-res-key">Gross speed : </span><span class="lt-res-val">${r.gross} wpm</span></div>
        <div colspan="2"><span class="lt-res-key">Words Typed : </span><span class="lt-res-val">${r.total} (${r.correct} correct + ${r.err} incorrect)</span> &nbsp;&nbsp; <span class="lt-res-key">Accuracy : </span><span class="lt-res-val">${r.acc}%</span></div>
      </div>
      <div style="font-size:12px;margin-bottom:6px;"><span class="lt-res-key">Minimum Passing Speed : </span><span class="lt-res-val">${r.minSpeed}</span></div>
      <div style="font-size:12px;margin-bottom:8px;"><span class="lt-res-key">Result &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: </span><span class="${qualified?'lt-res-pass':'lt-res-fail'}">${qualified?'Qualified':'Not Qualified'}</span></div>
      <button class="lt-view-btn">View Result</button>
    </div>`;
  });
  list.innerHTML=html;
}

function renderLtUnattempted(){
  const list=document.getElementById('ltUnattemptedList');
  if(!list) return;
  // Show tests that were not attempted
  const attemptedIds=new Set(liveResults.map(r=>r.testId));
  const unattempted=LIVE_SCHEDULE.filter(t=>!attemptedIds.has(t.id));
  if(unattempted.length===0){
    list.innerHTML='<div class="lt-empty">Aapne sabhi available tests attempt kar liye hain! 🎉</div>';
    return;
  }
  const words={30:655,15:503,10:409,5:200};
  let html='';
  unattempted.slice(0,8).forEach(t=>{
    const wc=words[t.duration]||300;
    html+=`<div class="lt-unattempted-card">
      <div class="lt-un-info">
        <div class="lt-un-row1">
          <span class="lt-un-today">Today</span>
          <span class="lt-un-exam">${t.exam}</span>
          <span class="lt-un-lang">${t.lang}</span>
        </div>
        <div class="lt-un-row2">${t.timeSlot} &nbsp; ${wc} words &nbsp; ${t.duration} Min</div>
      </div>
      <button class="lt-view-btn grey" onclick="startLiveScheduledTest(${t.id})">View Result</button>
    </div>`;
  });
  list.innerHTML=html;
}

/* ══════════════════════════════════════════════════════
   TEST PAGE
══════════════════════════════════════════════════════ */
function tryTest(lang){
  if(!APP.loggedIn){saveSession();window.location.href='login.html';return;}
  APP.activeExamKey=null;APP.isLiveMode=false;APP.hindiLayout=null;
  APP.lang=lang; saveSession();
  // If we're already on typing.html, initialize directly; otherwise redirect there
  if(document.getElementById('testPageWrap')){
    startTypingPage(lang);
  } else {
    window.location.href='typing.html?lang='+encodeURIComponent(lang);
  }
}
function startTypingPage(lang){
  APP.lang=lang;APP.idx=0;APP.isLiveMode=false;
  const hp=document.getElementById('homePage');
  if(hp) hp.style.display='none';
  const tw=document.getElementById('testPageWrap');
  if(tw) tw.style.display='block';
  // Set title with layout info
  const layoutLabel = lang==='hindi' && APP.hindiLayout ?
    (APP.hindiLayout==='krutidev'?'Hindi KrutiDev':APP.hindiLayout==='mangal_inscript'?'Hindi Mangal INSCRIPT':'Hindi Mangal GAIL') : 
    (lang==='numbers'?'Number':'English');
  document.getElementById('testTitle').textContent='⌨ '+layoutLabel+' Typing Test — Apna Typing Master Pro';
  const disp=document.getElementById('activeExamDisplay');
  if(disp){
    const lbl=lang==='hindi' && APP.hindiLayout?
      (APP.hindiLayout==='krutidev'?'KrutiDev / DevLys Font':APP.hindiLayout==='mangal_inscript'?'Mangal Unicode — INSCRIPT':'Mangal Unicode — Remington GAIL'):'General Practice';
    disp.innerHTML='<span style="color:#888;font-weight:400;">— '+lbl+' —</span>';
  }
  const box=document.getElementById('examInfoBox');
  if(box) box.style.display='none';
  // Default highlight/backspace for general practice (no exam rule): word-lock blue, full backspace
  const hlR=document.querySelector('input[name="hl"][value="word"]'); if(hlR) hlR.checked=true;
  const bsR=document.querySelector('input[name="bs"][value="full"]'); if(bsR) bsR.checked=true;
  buildDd();loadPass();resetTest();
  // Apply Hindi font to passage and type area
  if(lang==='hindi'){
    const pd=document.getElementById('passageDisplay');
    const ta=document.getElementById('typeArea');
    const font=APP.hindiLayout==='krutidev'?
      "'Kruti Dev 010','KrutiDev 010','Mangal','Noto Sans Devanagari',sans-serif":
      "'Mangal','Noto Sans Devanagari',sans-serif";
    if(pd){pd.style.fontFamily=font;pd.style.fontSize='17px';pd.style.lineHeight='1.85';}
    if(ta){ta.style.fontFamily=font;ta.style.fontSize='16px';}
  } else {
    const pd=document.getElementById('passageDisplay');
    const ta=document.getElementById('typeArea');
    if(pd){pd.style.fontFamily='';pd.style.fontSize='';pd.style.lineHeight='';}
    if(ta){ta.style.fontFamily='';ta.style.fontSize='';}
  }
}

window.buildDd = function buildDd(){
  const sel=document.getElementById('ctrlEx');
  if(!sel) return;
  sel.innerHTML='';
  const arr=APP.isLiveMode?(LIVE_PASS[APP.lang]||[]):(PASS[APP.lang]||[]);
  arr.forEach((_,i)=>{
    const locked=!APP.isLiveMode&&!APP.isPro&&i>=2;
    const o=document.createElement('option');
    o.value=i;
    o.textContent='Exercise '+(i+1)+'/'+arr.length+(locked?' 🔒 PRO':APP.isLiveMode?' 🔴':'');
    sel.appendChild(o);
  });
  sel.value=APP.idx;
}
function changeEx(){
  const i=parseInt(document.getElementById('ctrlEx').value);
  if(!APP.isLiveMode&&!APP.isPro&&i>=2){openDModal('subModal');document.getElementById('ctrlEx').value=APP.idx;return;}
  APP.idx=i;loadPass();resetTest();
}
function prevEx(){if(APP.idx>0){APP.idx--;document.getElementById('ctrlEx').value=APP.idx;loadPass();resetTest();}}
function nextEx(){
  const arr=APP.isLiveMode?(LIVE_PASS[APP.lang]||[]):(PASS[APP.lang]||[]);
  const n=APP.idx+1;
  if(!APP.isLiveMode&&!APP.isPro&&n>=2){openDModal('subModal');return;}
  if(n<arr.length){APP.idx=n;document.getElementById('ctrlEx').value=n;loadPass();resetTest();}
}
function loadPass(){
  if(customPassageActive&&customPassageText){
    document.getElementById('passageSpan').innerHTML=renderP(customPassageText,'');
    document.getElementById('passageDisplay').className='passage-display';
    applyHighlightModeClass();
    return;
  }
  const arr=APP.isLiveMode?(LIVE_PASS[APP.lang]||[]):(PASS[APP.lang]||[]);
  const t=arr[APP.idx%arr.length]||'';
  document.getElementById('passageSpan').innerHTML=renderP(t,'');
  document.getElementById('passageDisplay').className='passage-display'+(APP.lang==='hindi'?' hindi-text':'');
  document.getElementById('passageDisplay').scrollTop=0;
  applyHighlightModeClass();
}
function renderP(p,typed){
  let h='',i=0;
  while(i<p.length){
    if(p[i]===' '){
      if(i<typed.length)h+='<span class="'+(typed[i]===' '?'ch-typed':'ch-error')+'"> </span>';
      else if(i===typed.length)h+='<span class="ch-current"> </span>';
      else h+=' ';
      i++;
    } else {
      let ws=i;while(i<p.length&&p[i]!==' ')i++;
      let wh='';
      let wordTyped=false, wordFullyCorrect=true, wordHasMistake=false;
      for(let j=ws;j<i;j++){
        const c=p[j],esc=c==='<'?'&lt;':c==='>'?'&gt;':c==='&'?'&amp;':c;
        if(j<typed.length){
          wordTyped=true;
          if(typed[j]===c){ wh+='<span class="ch-typed">'+esc+'</span>'; }
          else { wh+='<span class="ch-error">'+esc+'</span>'; wordFullyCorrect=false; wordHasMistake=true; }
        }
        else if(j===typed.length){ wh+='<span class="ch-current">'+esc+'</span>'; wordTyped=true; wordFullyCorrect=false; }
        else { wh+='<span>'+esc+'</span>'; wordFullyCorrect=false; }
      }
      // Determine word-level state class (used by .hl-word / .hl-error CSS modes)
      const wordCoveredFully = (i<=typed.length); // every char of this word has a typed counterpart
      let wordCls='pw';
      if(wordCoveredFully && wordTyped){
        wordCls += wordHasMistake ? ' word-wrong' : ' word-correct';
      } else if(wordTyped){
        // Word is still being typed — but if a mistake has ALREADY happened inside it,
        // mark it word-wrong right away too, so the whole word turns red immediately
        // (official rule), instead of waiting until the word is fully typed.
        wordCls += wordHasMistake ? ' word-wrong word-typing' : ' word-typing';
      }
      h+='<span class="'+wordCls+'">'+wh+'</span>';
    }
  }
  return h;
}

// ── Read current highlight mode (from sidebar radios, falls back to active exam rule) ──
function getActiveHighlightMode(){
  const checked=document.querySelector('input[name="hl"]:checked');
  if(checked) return checked.value;
  const rule=APP.activeExamKey?EXAM_RULES[APP.activeExamKey]:null;
  return rule?.highlight || 'letter';
}

// ── Apply highlight mode class to the passage display container ──
function applyHighlightModeClass(){
  const pd=document.getElementById('passageDisplay');
  if(!pd) return;
  const mode=getActiveHighlightMode();
  pd.classList.remove('hl-word','hl-error','hl-none');
  if(mode==='word')  pd.classList.add('hl-word');   // UPSSSC style — word locks blue, no red
  if(mode==='error') pd.classList.add('hl-error');  // SSC/CHSL style — word locks blue + red mistakes shown
  if(mode==='none')  pd.classList.add('hl-none');   // flat, minimal feedback
  // 'letter' mode needs no extra class — default ch-typed/ch-error colors apply (RRB style)
}

// ── Scroll Options: "Auto Scroll" keeps the current typing position visible on screen.
//    "Manual Scroll" does nothing here — the user scrolls the passage box themselves. ──
function getActiveScrollMode(){
  const checked=document.querySelector('input[name="scroll"]:checked');
  return checked ? checked.value : 'manual';
}
function autoScrollPassage(){
  if(getActiveScrollMode()!=='auto') return;
  const pd=document.getElementById('passageDisplay');
  const cur=pd && pd.querySelector('.ch-current');
  if(!pd||!cur) return;
  const pdRect=pd.getBoundingClientRect(), curRect=cur.getBoundingClientRect();
  const offset=(curRect.top-pdRect.top)-(pd.clientHeight/2)+(curRect.height/2);
  if(Math.abs(offset)>4) pd.scrollTop+=offset;
}

function resetTest(){
  clearInterval(APP.timer);APP.running=false;
  const dur=parseInt(document.getElementById('ctrlDur').value)*60;
  APP.timeLeft=dur;updTimer();
  const ta=document.getElementById('typeArea');ta.value='';ta.disabled=false;
  document.getElementById('startBtn').style.display='inline-block';
  document.getElementById('stopBtn').style.display='none';
  document.getElementById('liveWpm').textContent='0';
  document.getElementById('liveAcc').textContent='—';
  document.getElementById('testExLabel').textContent='Select duration and start typing.';
  loadPass();
}
function startTest(){
  APP.running=true;APP.corr=0;APP.err=0;APP.total=0;APP.backspaceCount=0;
  const ta=document.getElementById('typeArea');ta.disabled=false;ta.value='';ta.focus();
  document.getElementById('startBtn').style.display='none';
  document.getElementById('stopBtn').style.display='inline-block';
  const rule=APP.activeExamKey?EXAM_RULES[APP.activeExamKey]:null;
  document.getElementById('testExLabel').textContent=rule?('▶ '+rule.name+' — Min. '+rule.minWPM+' WPM'):'Timer started!';
  APP.timer=setInterval(()=>{APP.timeLeft--;updTimer();if(APP.timeLeft<=0)submitTest();},1000);
}
function updTimer(){
  const m=String(Math.floor(APP.timeLeft/60)).padStart(2,'0'),s=String(APP.timeLeft%60).padStart(2,'0');
  document.getElementById('ctrlTimer').textContent=m+':'+s;
}
function submitTest(){
  clearInterval(APP.timer);APP.running=false;
  document.getElementById('typeArea').disabled=true;
  document.getElementById('startBtn').style.display='inline-block';
  document.getElementById('stopBtn').style.display='none';
  // Save live test result with real exam rules
  if(APP.isLiveMode&&APP.currentLiveTest){
    const dur=parseInt(document.getElementById('ctrlDur').value);
    const el=Math.max(dur*60-APP.timeLeft,1);
    const mins=el/60;
    const gross=Math.round(APP.total/mins);
    const profile=EXAM_PROFILES[APP.currentLiveTest.exam]||{};
    const formula=profile.netFormula||'upsssc';
    const net=calcNet(gross, APP.err, mins, formula, APP.corr, APP.halfErr||0);
    const acc=APP.total>0?Math.round(APP.corr/APP.total*100):0;
    const isHindi=APP.currentLiveTest.lang.includes('Hindi');
    const minSpeed=isHindi?(profile.hinWPM||25):(profile.engWPM||30);
    const now=new Date();
    liveResults.push({
      testId:APP.currentLiveTest.id,
      exam:APP.currentLiveTest.exam,
      lang:APP.currentLiveTest.lang,
      date:now.toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'2-digit'})+' '+now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
      net,gross,total:APP.total,correct:APP.corr,err:APP.err,acc,
      minSpeed, formula,
      rank:Math.floor(Math.random()*100)+1+'/'+Math.floor(Math.random()*50+50)
    });
  }
  showRes();
}

document.addEventListener('DOMContentLoaded',()=>{
  const ta=document.getElementById('typeArea');
  if(!ta) return;
  ta.addEventListener('paste',e=>{
    e.preventDefault();
    const el=document.getElementById('testExLabel');
    if(el)el.textContent='❌ Copy-Paste allowed nahi hai!';
    setTimeout(()=>{if(el)el.textContent='Type the passage above.';},2200);
  });
  ta.addEventListener('keydown',e=>{
    if(!APP.running) return;
    // Block all Ctrl/Meta shortcuts — banned in all official exams (PDF rule #17)
    if(e.ctrlKey||e.metaKey){
      e.preventDefault();
      return;
    }
    // Block arrow keys for cursor movement (banned: Up/Down always, Left/Right in most exams)
    if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){
      e.preventDefault(); return;
    }
    if(e.key==='Backspace'){
      const bsMode=document.querySelector('input[name="bs"]:checked')?.value||'word';
      if(bsMode==='off'){e.preventDefault();return;}
      if(bsMode==='word'){
        // "One Word Backspace" — can only correct inside the CURRENT word.
        const val=ta.value;
        if(val.length===0||val[val.length-1]===' '){e.preventDefault();return;}
      }
      if(bsMode==='word2'){
        // "UPSSSC Backspace" — official rule: current word + the ONE word immediately
        // before it (maximum 2 words correctable, exactly as per UPSSSC admit card).
        const val=ta.value;
        if(val.length===0){e.preventDefault();return;}
        const starts=[0];
        for(let i=0;i<val.length-1;i++){ if(val[i]===' ') starts.push(i+1); }
        const boundary = starts.length>=2 ? starts[starts.length-2] : 0;
        if(val.length<=boundary){e.preventDefault();return;}
      }
      APP.backspaceCount++;
    }
  });
  ta.addEventListener('input',()=>{
    if(!APP.running) return;
    const typed=ta.value;
    const arr=APP.isLiveMode?(LIVE_PASS[APP.lang]||[]):(PASS[APP.lang]||[]);
    const pass=(customPassageActive&&customPassageText)?customPassageText:(arr[APP.idx%arr.length]||'');
    document.getElementById('passageSpan').innerHTML=renderP(pass,typed);
    autoScrollPassage();
    const tw=typed.trim().split(/\s+/).filter(Boolean),pw=pass.trim().split(/\s+/);
    let c=0,e=0,halfE=0;
    tw.forEach((w,i)=>{
      if(i<pw.length){
        if(w===pw[i]){
          c++;
        } else {
          // Half error check: extra/missing space handled by word split already
          // Punctuation difference — if word matches ignoring punctuation at end
          const wClean=w.replace(/[.,!?;:'"()-]+$/,'').replace(/^['"(]/,'');
          const pClean=pw[i].replace(/[.,!?;:'"()-]+$/,'').replace(/^['"(]/,'');
          // Capital letter diff (English) — word same but different case
          if(w.toLowerCase()===pw[i].toLowerCase() && w!==pw[i]){
            halfE+=0.5; c++; // count as correct word but penalize 0.5
          } else if(wClean===pClean){
            halfE+=0.5; // punctuation error = 0.5
          } else {
            e++;
          }
        }
      }
    });
    APP.halfErr=halfE;
    const dur=parseInt(document.getElementById('ctrlDur').value)*60,el=Math.max(1,dur-APP.timeLeft);
    const wpm=Math.round(c/el*60),acc=tw.length>0?Math.round(c/tw.length*100):100;
    document.getElementById('liveWpm').textContent=wpm;
    document.getElementById('liveAcc').textContent=acc+'%';
    APP.corr=c;APP.err=e;APP.total=tw.length;
  });
});
function showRes(){
  const dur=parseInt(document.getElementById('ctrlDur').value),elapsed=dur*60-APP.timeLeft;
  const mins=Math.max(elapsed/60,0.1);
  const gross=Math.round(APP.total/mins);
  const acc=APP.total>0?Math.round(APP.corr/APP.total*100):0;
  const mm=String(Math.floor(elapsed/60)).padStart(2,'0'),ss=String(elapsed%60).padStart(2,'0');

  // Get exam profile for live mode
  let net, minSpeed, formulaLabel, profileInfo='', qualifiedInfo='';
  if(APP.isLiveMode && APP.currentLiveTest){
    const profile=EXAM_PROFILES[APP.currentLiveTest.exam]||{};
    const formula=profile.netFormula||'upsssc';
    net=calcNet(gross, APP.err, mins, formula, APP.corr, APP.halfErr||0);
    const isHindi=APP.currentLiveTest.lang.includes('Hindi');
    minSpeed=isHindi?(profile.hinWPM||25):(profile.engWPM||30);
    const formulaMap={
      ssc:   `Net = Gross − (Errors ÷ Time) &nbsp;<small style="color:#888;">[Official SSC Formula]</small>`,
      rrb:   `Net = Gross − (Errors ÷ Time) &nbsp;<small style="color:#888;">[Official Railway Formula]</small>`,
      upsssc:`Net = Correct Words − 5×(Errors beyond 5 grace), ÷ Time &nbsp;<small style="color:#888;">[Official UPSSSC Grace-of-5 Rule]</small>`,
      court: `Net = Gross − (Errors ÷ Time) &nbsp;<small style="color:#888;">[Court Formula]</small>`
    };
    formulaLabel=formulaMap[formula]||'Net = Correct WPM';
    const qualified=net>=minSpeed;
    qualifiedInfo=`<div style="margin:10px 0;padding:10px 14px;border-radius:6px;font-size:13px;font-weight:700;
      background:${qualified?'#d4edda':'#fde8e8'};color:${qualified?'#155724':'#721c24'};border:1px solid ${qualified?'#c3e6cb':'#f5c6cb'};">
      ${qualified?'✅ QUALIFIED':'❌ NOT QUALIFIED'} &nbsp;|&nbsp; Required: ${minSpeed} WPM &nbsp;|&nbsp; Your Net: ${net} WPM
    </div>`;
    profileInfo=`<div style="background:#f8f9fa;border:1px solid #ddd;border-radius:6px;padding:8px 12px;font-size:11px;color:#555;margin-top:8px;">
      📋 <b>${APP.currentLiveTest.exam}</b> Rules: &nbsp;
      ⏱ ${profile.time||dur} Min &nbsp;|&nbsp;
      ⌫ ${profile.backspace||'Limited'} &nbsp;|&nbsp;
      🚫 No Copy-Paste &nbsp;|&nbsp; 🚫 No Spell Check &nbsp;|&nbsp;
      📊 Formula: ${formulaLabel}
    </div>`;
  } else {
    const rule = APP.activeExamKey ? EXAM_RULES[APP.activeExamKey] : null;
    if(rule){
      // Use the correct formula for this specific exam
      net = calcNet(gross, APP.err, mins, rule.netFormula, APP.corr, APP.halfErr||0);
      minSpeed = rule.minWPM || 0;
      const formulaMap = {
        ssc:    `Net = Gross − (Errors ÷ Time) <small style="color:#888;">[Official SSC Formula]</small>`,
        rrb:    `Net = Gross − (Errors ÷ Time) <small style="color:#888;">[Official Railway Formula]</small>`,
        upsssc: `Net = Correct Words − 5×(Errors beyond 5 grace), ÷ Time <small style="color:#888;">[Official UPSSSC Grace-of-5 Rule]</small>`,
        court:  `Net = Gross − (Errors ÷ Time) <small style="color:#888;">[Court Formula]</small>`
      };
      formulaLabel = formulaMap[rule.netFormula] || `Net = Correct WPM`;
      const qualified = net >= minSpeed;
      qualifiedInfo = `<div style="margin:10px 0;padding:10px 14px;border-radius:6px;font-size:13px;font-weight:700;
        background:${qualified?'#d4edda':'#fde8e8'};color:${qualified?'#155724':'#721c24'};border:1px solid ${qualified?'#c3e6cb':'#f5c6cb'};">
        ${qualified?'✅ QUALIFIED':'❌ NOT QUALIFIED'} &nbsp;|&nbsp; Required: ${minSpeed} WPM &nbsp;|&nbsp; Your Net: ${net} WPM
      </div>`;
      profileInfo = `<div style="background:#f8f9fa;border:1px solid #ddd;border-radius:6px;padding:8px 12px;font-size:11px;color:#555;margin-top:8px;">
        📋 <b>${rule.name}</b> &nbsp;|&nbsp;
        ⏱ ${rule.time} Min &nbsp;|&nbsp;
        ⌫ ${rule.info && rule.info[2] ? rule.info[2].replace(/^⌫\s*/,'') : rule.backspace} &nbsp;|&nbsp;
        📊 ${formulaLabel}
      </div>`;
    } else {
      // General practice — show gross WPM directly
      net = Math.max(0, Math.round(APP.corr / mins));
      minSpeed = 0;
      formulaLabel = 'Net = Correct WPM (General Practice)';
    }
  }

  document.getElementById('resBody').innerHTML=`
    ${APP.isLiveMode?'<div style="background:#c0392b;color:#fff;padding:7px 14px;font-size:12px;font-weight:700;border-radius:4px;margin-bottom:8px;">🔴 LIVE Test Result — '+APP.currentLiveTest.exam+'</div>':''}
    <div style="background:linear-gradient(135deg,#f8f9fa,#eaf2ff);border-radius:6px;padding:14px;text-align:center;margin-bottom:10px;">
      <div style="display:flex;justify-content:center;gap:28px;align-items:center;">
        <div>
          <div style="font-size:11px;color:#555;margin-bottom:2px;">Gross WPM</div>
          <div style="font-size:28px;font-weight:900;color:#888;line-height:1;">${gross}</div>
        </div>
        <div style="font-size:22px;color:#bbb;">→</div>
        <div>
          <div style="font-size:11px;color:#555;margin-bottom:2px;">Net WPM</div>
          <div style="font-size:46px;font-weight:900;color:#2471a3;line-height:1;">${net}</div>
        </div>
        <div style="border-left:1px solid #ddd;padding-left:22px;">
          <div style="font-size:11px;color:#555;margin-bottom:2px;">Accuracy</div>
          <div style="font-size:26px;font-weight:700;color:${acc>=90?'#27ae60':acc>=70?'#e67e22':'#e74c3c'};line-height:1;">${acc}%</div>
        </div>
      </div>
    </div>
    ${qualifiedInfo}
    <div class="res-row">
      <div><span class="rk">Time Taken: </span><span class="rv">${mm}m ${ss}s</span></div>
      <div><span class="rk">Total Words: </span><span class="rv">${APP.total}</span></div>
      <div><span class="rk">Correct: </span><span class="rv" style="color:#27ae60;">${APP.corr}</span></div>
      <div><span class="rk">Full Errors: </span><span class="rv" style="color:#e74c3c;">${APP.err}</span></div>
      <div><span class="rk">Half Errors (0.5): </span><span class="rv" style="color:#e67e22;">${(APP.halfErr||0).toFixed(1)}</span></div>
      <div><span class="rk">Total Penalty: </span><span class="rv" style="color:#e74c3c;">${(APP.err + (APP.halfErr||0)).toFixed(1)}</span></div>
    </div>
    <div class="res-row" style="margin-top:5px;">
      <div><span class="rk">Gross WPM: </span><span class="rv">${gross}</span></div>
      <div><span class="rk">Net WPM: </span><span class="rv">${net}</span></div>
      <div><span class="rk">Keystrokes/min: </span><span class="rv">${gross*5}</span></div>
      <div><span class="rk">Backspace used: </span><span class="rv">${APP.backspaceCount}</span></div>
    </div>
    ${profileInfo}`;
  openDModal('resultModal');
}
function switchResTab(btn){document.querySelectorAll('.res-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}
/* openExamMode() is defined further below — full Instructions → Timed
   Typing → Result Dashboard flow, with the same 2-free-then-Pro rule
   used everywhere else on the site. */

/* Subscription */
function selPlan(p,el){
  APP.plan=p;['planM','planQ','planY'].forEach(id=>document.getElementById(id).classList.remove('selected'));el.classList.add('selected');
  const pd=PLANS_DATA[p];
  document.getElementById('baseAmt').textContent=pd.base.toFixed(2);
  document.getElementById('gstAmt').textContent=pd.gst.toFixed(2);
  document.getElementById('payAmt').textContent=pd.total.toFixed(2);
  document.getElementById('payAmt2').textContent=pd.total.toFixed(2);
}
function payWithRazorpay(){
  if(!APP.loggedIn || !APP.email){ alert('⚠️ Pro kharidne ke liye pehle Log In ya Sign Up karein.'); closeDModal('subModal'); openAuthModal('login'); return; }
  if(typeof Razorpay==='undefined'){ alert('⚠️ Payment system load nahi ho paya. Page refresh karke dobara try karein.'); return; }
  if(typeof window.fbCreateRazorpayOrder!=='function'){ alert('⚠️ Payment system abhi ready nahi hai. Thodi der baad try karein.'); return; }

  const pd=PLANS_DATA[APP.plan];
  const btn=document.getElementById('razorpayPayBtn');
  const originalText=btn.innerHTML;
  btn.disabled=true; btn.textContent='Order tayyar ho raha hai...';

  window.fbCreateRazorpayOrder(APP.plan).then(order=>{
    btn.disabled=false; btn.innerHTML=originalText;

    const rzp=new Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'Apna Typing Master Pro',
      description: pd.label,
      prefill: { name: APP.name||'', email: APP.email||'' },
      theme: { color: '#2471a3' },
      handler: function(response){
        btn.disabled=true; btn.textContent='Payment verify ho raha hai...';
        window.fbVerifyRazorpayPayment({
          plan: APP.plan, name: APP.name,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature
        }).then(result=>{
          btn.disabled=false; btn.innerHTML=originalText;
          onPaymentVerified(result);
        }).catch(err=>{
          console.error('Payment verify failed:', err);
          btn.disabled=false; btn.innerHTML=originalText;
          alert('⚠️ Paisa kat gaya hai lekin verify karne mein dikkat aayi. Support ko is Payment ID ke saath contact karein:\n'+response.razorpay_payment_id);
        });
      },
      modal: { ondismiss: function(){ btn.disabled=false; btn.innerHTML=originalText; } }
    });
    rzp.on('payment.failed', function(response){
      btn.disabled=false; btn.innerHTML=originalText;
      alert('❌ Payment fail ho gaya: '+((response.error&&response.error.description)||'Dobara try karein.'));
    });
    rzp.open();
  }).catch(err=>{
    console.error('Order creation failed:', err);
    btn.disabled=false; btn.innerHTML=originalText;
    alert('⚠️ Order banane mein dikkat aayi. Thodi der baad try karein.');
  });
}
// Called once the server has cryptographically verified the payment — this is
// the ONLY place Pro actually turns on. By the time this runs, isPro is
// already true and saved server-side (functions/index.js verifyRazorpayPayment).
function onPaymentVerified(result){
  APP.isPro=true;
  const pd=PLANS_DATA[APP.plan];
  document.getElementById('confPlan').textContent=pd.label;
  document.getElementById('confAmt').textContent=pd.total.toFixed(2);
  document.getElementById('confExpiry').textContent=new Date(result.expiry).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
  document.getElementById('subS1').style.display='none';
  document.getElementById('subS2').style.display='block';
  if(APP.loggedIn) updateDashStrip();
  if(document.getElementById('testPageWrap') && document.getElementById('testPageWrap').style.display!=='none') buildDd();
  saveSession();
}

/* Zoom */
let passageFontSize=16;
function zoomPassage(dir){
  if(dir===0)passageFontSize=APP.lang==='hindi'?17:16;
  else passageFontSize=Math.min(26,Math.max(11,passageFontSize+dir*2));
  const pd=document.getElementById('passageDisplay');
  pd.style.fontSize=passageFontSize+'px';
  const isHindi=pd.classList.contains('hindi-text');
  // line-height stays fixed/tight no matter how big or small the font gets —
  // official exam screens never show extra gap between lines when zooming.
  pd.style.lineHeight=isHindi?'1.85':'1.7';
}
let customPassageActive=false,customPassageText='';
function applyCustomPassage(){
  const txt=document.getElementById('customPassageInput').value.trim();
  if(!txt){alert('Pehle passage likhein!');return;}
  customPassageText=txt;customPassageActive=true;
  document.getElementById('passageSpan').innerHTML=renderP(txt,'');
  document.getElementById('passageDisplay').className='passage-display';
  resetTest();
}
function clearCustomPassage(){
  customPassageActive=false;customPassageText='';
  document.getElementById('customPassageInput').value='';loadPass();
}

/* Exam Rules — single source of truth lives in shared.js (window.EXAM_RULES).
   Aliased here (never redefined) so backspace / highlight / netFormula values
   can't drift out of sync between the two files again. */
const EXAM_RULES = window.EXAM_RULES;
function tryTestWithRules(ruleKey){
  if(!APP.loggedIn){saveSession();window.location.href='login.html';return;}
  const rule=EXAM_RULES[ruleKey];
  if(!rule){tryTest('english');return;}
  APP.activeExamKey=ruleKey; APP.isLiveMode=false; APP.lang=rule.lang; APP.idx=0;
  saveSession();

  // If we're already on typing.html, initialize the exam directly here.
  // Otherwise (called from candidate.html / live-tests.html etc.) redirect there.
  if(!document.getElementById('testPageWrap')){
    window.location.href='typing.html?rule='+encodeURIComponent(ruleKey);
    return;
  }

  const hp=document.getElementById('homePage');
  if(hp) hp.style.display='none';
  const tw=document.getElementById('testPageWrap');
  if(tw) tw.style.display='block';

  document.getElementById('testTitle').textContent='⌨ '+rule.name+' — Apna Typing Master Pro';

  const disp=document.getElementById('activeExamDisplay');
  if(disp) disp.innerHTML='<b style="color:#1a5276;">✅ '+rule.name+'</b><br><span style="font-weight:400;color:#555;">⏱ '+rule.time+' min | Min. '+rule.minWPM+' WPM</span>';

  const box=document.getElementById('examInfoBox'), info=document.getElementById('examInfoContent');
  if(box && info){
    box.style.display='block';
    // Show rule.info array items + formula
    const infoLines = rule.info || [];
    info.innerHTML = infoLines.join('<br>');
  }

  // Set backspace radio to match this exam's OFFICIAL rule (full / word / word2 / off)
  const bsR=document.querySelector('input[name="bs"][value="'+rule.backspace+'"]');
  if(bsR) bsR.checked=true;

  // Set highlight radio to match exam rule (this drives the visual mode: word/error/letter/none)
  const hlR=document.querySelector('input[name="hl"][value="'+rule.highlight+'"]');
  if(hlR) hlR.checked=true;

  // Apply Hindi font if needed
  if(rule.lang==='hindi'){
    const pd=document.getElementById('passageDisplay');
    const ta=document.getElementById('typeArea');
    const font="'Mangal','Noto Sans Devanagari',sans-serif";
    if(pd){pd.style.fontFamily=font;pd.style.fontSize='17px';pd.style.lineHeight='1.85';}
    if(ta){ta.style.fontFamily=font;ta.style.fontSize='16px';}
  } else {
    const pd=document.getElementById('passageDisplay');
    const ta=document.getElementById('typeArea');
    if(pd){pd.style.fontFamily='';pd.style.fontSize='';pd.style.lineHeight='';}
    if(ta){ta.style.fontFamily='';ta.style.fontSize='';}
  }

  buildDd(); loadPass(); resetTest();

  // Auto-set duration dropdown to closest match for this exam's time limit
  const durSel=document.getElementById('ctrlDur');
  if(durSel){
    const opts=Array.from(durSel.options).map(o=>parseInt(o.value));
    const best=opts.reduce((a,b)=>Math.abs(b-rule.time)<Math.abs(a-rule.time)?b:a);
    durSel.value=best;
    APP.timeLeft=best*60;
    updTimer();
  }
}


/* Keyboard shortcuts */
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    closeAuthModal();
    document.querySelectorAll('.modal-bg.open').forEach(m=>m.classList.remove('open'));
    const overlay=document.getElementById('examModeOverlay');
    if(overlay)overlay.remove();
  }
});

/* ══════════════════════════════════════════════════════
   ADMIN PAGE
══════════════════════════════════════════════════════ */


function doAdminLogin(){
  const email=document.getElementById('admEmail').value.trim();
  const pass=document.getElementById('admPass').value;
  document.getElementById('admLoginErr').style.display='none';

  if(typeof window.fbAdminSignIn!=='function'){
    document.getElementById('admLoginErr').textContent='Firebase abhi ready nahi hai, page refresh karein.';
    document.getElementById('admLoginErr').style.display='block';
    return;
  }

  showFbLoader('Login verify ho raha hai...');
  window.fbAdminSignIn(email, pass)
    .then(() => {
      hideFbLoader();
      admLoggedIn=true;
      if(typeof window.saveAdmSession==='function') window.saveAdmSession(email);
      APP.loggedIn=true;APP.name='Admin';APP.email=email;
      document.getElementById('admLoginGate').style.display='none';
      document.getElementById('admMain').style.display='block';
      document.getElementById('admLoggedInInfo').textContent='Admin: '+email;
      window.admView='analytics';
      showAdminAnalytics();
    })
    .catch(() => {
      hideFbLoader();
      // Error toast Firebase se already aa chuka hai (galat email/password, etc.)
      document.getElementById('admLoginErr').textContent='Email ya password galat hai.';
      document.getElementById('admLoginErr').style.display='block';
    });
}

/* ══════════════════════════════════════════════════════
   ADMIN ANALYTICS DASHBOARD — pehla screen admin login ke baad
══════════════════════════════════════════════════════ */
let admAnalyticsListening = false;
let admLastAnalyticsData = null;

function showAdminAnalytics(){
  window.admView='analytics';
  document.getElementById('admAnalyticsView').style.display='block';
  document.getElementById('admPassagesView').style.display='none';
  const stenoView=document.getElementById('admStenoView'); if(stenoView) stenoView.style.display='none';
  const stenoVideoView=document.getElementById('admStenoVideoView'); if(stenoVideoView) stenoVideoView.style.display='none';
  document.getElementById('admNavAnalytics').classList.add('active');
  document.getElementById('admNavPassages').classList.remove('active');
  const stenoNav=document.getElementById('admNavSteno'); if(stenoNav) stenoNav.classList.remove('active');
  const stenoVideoNav=document.getElementById('admNavStenoVideo'); if(stenoVideoNav) stenoVideoNav.classList.remove('active');
  renderAnalyticsLoading();
  if(!admAnalyticsListening && typeof window.fbListenAnalytics==='function'){
    admAnalyticsListening = true;
    window.fbListenAnalytics(renderAnalyticsData);
  } else if(admLastAnalyticsData){
    renderAnalyticsData(admLastAnalyticsData);
  }
}
function showAdminPassages(){
  window.admView='passages';
  document.getElementById('admAnalyticsView').style.display='none';
  document.getElementById('admPassagesView').style.display='block';
  const stenoView=document.getElementById('admStenoView'); if(stenoView) stenoView.style.display='none';
  const stenoVideoView=document.getElementById('admStenoVideoView'); if(stenoVideoView) stenoVideoView.style.display='none';
  document.getElementById('admNavAnalytics').classList.remove('active');
  document.getElementById('admNavPassages').classList.add('active');
  const stenoNav=document.getElementById('admNavSteno'); if(stenoNav) stenoNav.classList.remove('active');
  const stenoVideoNav=document.getElementById('admNavStenoVideo'); if(stenoVideoNav) stenoVideoNav.classList.remove('active');
  renderAdmTab(admCurrentTab);
  updateTabCounts();
}

function renderAnalyticsLoading(){
  const el=document.getElementById('admAnalyticsView');
  if(!el || el.dataset.loaded==='1') return;
  el.innerHTML='<div style="text-align:center;padding:60px;color:#6b6b8a;font-size:14px;">🔄 Analytics load ho raha hai...</div>';
}

function renderAnalyticsData(data){
  admLastAnalyticsData = data;
  const el=document.getElementById('admAnalyticsView');
  if(!el) return;
  if(data.error){
    el.innerHTML='<div style="text-align:center;padding:60px;color:#e74c3c;">❌ Error: '+escHtml(data.error)+'</div>';
    return;
  }
  el.dataset.loaded='1';

  const recentUsers = data.users.slice(0,12);
  const recentPayments = data.payments.slice(0,10);

  el.innerHTML = `
    <div class="anl-cards">
      <div class="anl-card anl-blue">
        <div class="anl-card-icon">👥</div>
        <div class="anl-card-val">${data.totalUsers}</div>
        <div class="anl-card-lbl">Total Registered Users</div>
      </div>
      <div class="anl-card anl-green">
        <div class="anl-card-icon">🟢</div>
        <div class="anl-card-val">${data.activeCount}</div>
        <div class="anl-card-lbl">Active Right Now</div>
        <div class="anl-card-sub">${data.activeLoggedIn} logged-in · ${data.activeGuests} guest</div>
      </div>
      <div class="anl-card anl-gold">
        <div class="anl-card-icon">⚡</div>
        <div class="anl-card-val">${data.proUsers}</div>
        <div class="anl-card-lbl">Pro Subscribers</div>
      </div>
      <div class="anl-card anl-gray">
        <div class="anl-card-icon">🔓</div>
        <div class="anl-card-val">${data.freeUsers}</div>
        <div class="anl-card-lbl">Login-Only (Free) Users</div>
      </div>
      <div class="anl-card anl-purple">
        <div class="anl-card-icon">💰</div>
        <div class="anl-card-val">₹${data.totalRevenue.toLocaleString('en-IN')}</div>
        <div class="anl-card-lbl">Total Revenue Collected</div>
        <div class="anl-card-sub">${data.totalPayments} payments</div>
      </div>
    </div>

    <div class="anl-section">
      <div class="anl-section-title">💳 Recent Payments</div>
      ${recentPayments.length===0 ? '<div class="anl-empty">Abhi tak koi payment nahi hua.</div>' : `
      <table class="anl-table">
        <thead><tr><th>Name</th><th>Email</th><th>Plan</th><th>Amount</th><th>Date</th></tr></thead>
        <tbody>
          ${recentPayments.map(p=>`<tr>
            <td>${escHtml(p.name||'—')}</td>
            <td>${escHtml(p.email||'—')}</td>
            <td><span class="anl-plan-badge">${escHtml(p.plan||'—')}</span></td>
            <td class="anl-amount">₹${(p.amount||0).toLocaleString('en-IN')}</td>
            <td>${escHtml(p.dateStr||'—')}</td>
          </tr>`).join('')}
        </tbody>
      </table>`}
    </div>

    <div class="anl-section">
      <div class="anl-section-title">👤 Recent Users (latest ${recentUsers.length})</div>
      ${recentUsers.length===0 ? '<div class="anl-empty">Abhi tak koi user registered nahi hai.</div>' : `
      <table class="anl-table">
        <thead><tr><th>Name</th><th>Email</th><th>Preparing For</th><th>Status</th><th>Logins</th><th>Signed Up</th><th>Action</th></tr></thead>
        <tbody>
          ${recentUsers.map(u=>{
            const isProActive = u.isPro && u.proExpiry > Date.now();
            return `<tr>
              <td>${escHtml(u.name||'—')}</td>
              <td>${escHtml(u.email||'—')}</td>
              <td>${escHtml(u.examPref||'—')}</td>
              <td>${isProActive?'<span class="anl-status-pro">⚡ Pro</span>':'<span class="anl-status-free">Free</span>'}</td>
              <td>${u.loginCount||1}</td>
              <td>${u.signupAt?new Date(u.signupAt).toLocaleDateString('en-IN'):'—'}</td>
              <td><button class="anl-freepro-btn" onclick="adminGrantFreePro('${escJs(u.email||'')}')">🎁 Free Pro</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`}
    </div>
  `;
}

/* Admin: prompt for days and grant free Pro (no payment) to a user */
window.adminGrantFreePro = function(email){
  if(!email){ alert('User email missing hai.'); return; }
  const daysStr = prompt('Kitne din ka free Pro dena hai "'+email+'" ko?\n(Jaise: 7, 15, 30)', '7');
  if(daysStr===null) return;
  const days = parseInt(daysStr, 10);
  if(!days || days<=0 || days>365){ alert('Valid din (1-365) daalein.'); return; }
  if(!window.fbGrantFreePro){ alert('Firebase abhi ready nahi hai.'); return; }
  window.fbGrantFreePro(email, days, 'Admin panel se manually diya gaya').then(res=>{
    alert('✅ '+email+' ko '+days+' din ka free Pro mil gaya!');
    if(admLastAnalyticsData) renderAnalyticsData(admLastAnalyticsData);
    if(typeof loadAnalyticsData==='function') loadAnalyticsData();
  }).catch(err=>{
    alert('❌ Free Pro dene mein error: '+(err&&err.message?err.message:'Kuch galat ho gaya.'));
  });
};

window.updateTabCounts = function updateTabCounts(){
  document.getElementById('tcount0').textContent=PASS.english.length;
  document.getElementById('tcount1').textContent=PASS.hindi.length;
  document.getElementById('tcount2').textContent=LIVE_PASS.english.length;
  document.getElementById('tcount3').textContent=LIVE_PASS.hindi.length;
  document.getElementById('tcount4').textContent=PASS.numbers.length;
  document.getElementById('tcount5').textContent=PASS.speedmaster.length;
  if(document.getElementById('tcount6')) document.getElementById('tcount6').textContent=PASS.hindi_krutidev.length;
}
function switchAdmTab(n){
  admCurrentTab=n;
  document.querySelectorAll('.adm-tab').forEach((t,i)=>t.classList.toggle('active',i===n));
  renderAdmTab(n);
}
window.getAdmArr = function getAdmArr(tab){
  if(tab===0)return{arr:PASS.english,key:'en',label:'English',isLive:false,isHindi:false};
  if(tab===1)return{arr:PASS.hindi,key:'hi',label:'Hindi',isLive:false,isHindi:true};
  if(tab===2)return{arr:LIVE_PASS.english,key:'le',label:'English',isLive:true,isHindi:false};
  if(tab===3)return{arr:LIVE_PASS.hindi,key:'lh',label:'Hindi',isLive:true,isHindi:true};
  if(tab===5)return{arr:PASS.speedmaster,key:'sm',label:'Speed Master',isLive:false,isHindi:false};
  if(tab===6)return{arr:PASS.hindi_krutidev,key:'hk',label:'Hindi (KrutiDev)',isLive:false,isHindi:false,isKrutidev:true};
  return{arr:PASS.numbers,key:'nu',label:'Numbers',isLive:false,isHindi:false};
}
window.renderAdmTab = function renderAdmTab(n){
  const {arr,label,isLive,isHindi,key,isKrutidev}=getAdmArr(n);
  const content=document.getElementById('admContent');if(!content)return;
  const liveInfo=isLive?'<span class="adm-live-badge"><span class="adm-live-dot"></span>LIVE — Free for All Users</span>':'<span class="adm-free-badge">Normal Practice</span>';
  let addHtml=`<div class="adm-add-card">
    <div class="adm-add-card-title">➕ Naya ${label} Passage Add Karein &nbsp; ${liveInfo}</div>
    ${isKrutidev?'<div style="font-size:11px;color:#f0a500;margin-bottom:8px;">⚠️ Yahan Unicode Hindi NAHI, KrutiDev-converted ASCII text paste karein (kisi bhi external Unicode→KrutiDev converter se banakar).</div>':''}
    <textarea id="newPassInput_${key}" class="adm-textarea ${isHindi?'hindi':''} ${isKrutidev?'krutidev':''}" oninput="updateCharCount('${key}')"
      placeholder="${isHindi?'Hindi mein passage yahan paste karein...':isKrutidev?'KrutiDev-converted ASCII text yahan paste karein...':'Type or paste the passage here...'}"></textarea>
    <div class="adm-textarea-meta">
      <span class="adm-char-info" id="charInfo_${key}">0 characters · 0 words</span>
      <button class="adm-add-btn" onclick="admAddPassage(${n})">+ Add Passage</button>
    </div>
    <div style="margin-top:6px;font-size:11px;color:#6b6b8a;">${isLive?'✅ Ye passage Live Tests page par FREE dikhega':isKrutidev?'ℹ️ Ye passage SSC/RRB Exam Mode ke KrutiDev option mein, usi index (#1, #2...) par jo Hindi Normal tab mein hai, dikhega.':'ℹ️ Free users: 2 passages, Pro: sabhi'}</div>
  </div>`;
  let listHtml='<div class="adm-passage-list">';
  if(arr.length===0){
    listHtml+=`<div class="adm-empty"><div class="adm-empty-icon">📭</div><div>Koi passage nahi hai.<br>Upar se add karein.</div></div>`;
  } else {
    arr.forEach((p,i)=>{
      const words=p.trim().split(/\s+/).length;
      listHtml+=`<div class="adm-p-card ${isLive?'is-live':'is-normal'}" id="pcard_${key}_${i}">
        <div class="adm-p-head">
          <div class="adm-p-meta">
            <span class="adm-p-num">#${i+1}</span>
            ${isLive?'<span class="adm-tag adm-tag-live">🔴 LIVE</span>':'<span class="adm-tag adm-tag-normal">📝 NORMAL</span>'}
            ${isHindi?'<span class="adm-tag adm-tag-hindi">हिंदी</span>':isKrutidev?'<span class="adm-tag adm-tag-hindi">KrutiDev</span>':n===4?'<span class="adm-tag adm-tag-num">NUMBER</span>':n===5?'<span class="adm-tag adm-tag-eng">⚡ SPEED MASTER</span>':'<span class="adm-tag adm-tag-eng">ENGLISH</span>'}
            <span class="adm-p-words">${words} words · ${p.length} chars</span>
          </div>
          <div class="adm-p-actions">
            ${i>0?`<button class="adm-btn-sm adm-btn-up" onclick="admMoveUp(${n},${i})">↑</button>`:''}
            <button class="adm-btn-sm adm-btn-edit" onclick="admEditPassage(${n},${i})">✏️ Edit</button>
            <button class="adm-btn-sm adm-btn-del" onclick="admDelPassage(${n},${i})">🗑️ Delete</button>
          </div>
        </div>
        <div class="adm-p-body">
          <div class="adm-p-text ${isHindi?'hindi':''} ${isKrutidev?'krutidev':''}" id="ptext_${key}_${i}">${escHtml(p)}</div>
        </div>
      </div>`;
    });
  }
  listHtml+='</div>';
  content.innerHTML=`
    <div class="adm-section-head">
      <div class="adm-section-title">
        ${isLive?'🔴':'📝'} ${label} ${isLive?'Live':'Normal'} Passages
        <span class="adm-count-badge">${arr.length} passages</span>
      </div>
      <button onclick="admExportJSON()" style="padding:6px 14px;background:transparent;border:1.5px solid #2a2a3e;border-radius:8px;color:#6b6b8a;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;">📤 Export JSON</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;">
      <div style="background:#12121a;border:1px solid #2a2a3e;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800;color:${isLive?'#e74c3c':'#f0a500'};">${arr.length}</div>
        <div style="font-size:11px;color:#6b6b8a;margin-top:2px;">Total Passages</div>
      </div>
      <div style="background:#12121a;border:1px solid #2a2a3e;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800;color:#3498db;">${arr.reduce((s,p)=>s+p.split(' ').length,0)}</div>
        <div style="font-size:11px;color:#6b6b8a;margin-top:2px;">Total Words</div>
      </div>
      <div style="background:#12121a;border:1px solid #2a2a3e;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800;color:#27ae60;">${arr.length>0?Math.round(arr.reduce((s,p)=>s+p.split(' ').length,0)/arr.length):0}</div>
        <div style="font-size:11px;color:#6b6b8a;margin-top:2px;">Avg Words/Passage</div>
      </div>
    </div>
    ${addHtml}
    <div style="font-size:13px;font-weight:700;color:#e8e8f0;margin-bottom:12px;">
      Existing Passages <span class="adm-count-badge">${arr.length}</span>
      ${isLive?'<span style="font-size:11px;color:#27ae60;margin-left:8px;">✅ Live Tests page par FREE dikhenge</span>':''}
    </div>
    ${listHtml}`;
}
function updateCharCount(key){
  const ta=document.getElementById('newPassInput_'+key);
  const info=document.getElementById('charInfo_'+key);
  if(!ta||!info)return;
  const v=ta.value;
  info.textContent=v.length+' characters · '+v.trim().split(/\s+/).filter(Boolean).length+' words';
}
window.admAddPassage = function admAddPassage(tab){
  const {arr,key,isLive}=getAdmArr(tab);
  const ta=document.getElementById('newPassInput_'+key);
  const text=ta.value.trim();
  if(!text||text.length<10){showAdmToast('❌ Passage too short! Minimum 10 characters likhein.','error');ta.style.borderColor='#e74c3c';setTimeout(()=>ta.style.borderColor='',2000);return;}
  arr.push(text);ta.value='';
  updateTabCounts();renderAdmTab(tab);
  showAdmToast('✅ Passage #'+arr.length+' add ho gaya!');
  if(document.getElementById('ctrlEx'))buildDd();
}
window.admDelPassage = function admDelPassage(tab,idx){
  if(!confirm('Is passage ko delete karein?'))return;
  const {arr}=getAdmArr(tab);arr.splice(idx,1);
  updateTabCounts();renderAdmTab(tab);
  showAdmToast('🗑️ Passage delete ho gaya!');
  if(document.getElementById('ctrlEx'))buildDd();
}
function admEditPassage(tab,idx){
  const {arr,key,isHindi,isKrutidev}=getAdmArr(tab);
  const bodyEl=document.getElementById('ptext_'+key+'_'+idx);if(!bodyEl)return;
  bodyEl.innerHTML=`<textarea class="adm-edit-area ${isHindi?'hindi':''} ${isKrutidev?'krutidev':''}" id="editTa_${key}_${idx}">${arr[idx]}</textarea>
    <div class="adm-edit-actions">
      <button class="adm-btn-save" onclick="admSaveEdit(${tab},${idx})">💾 Save</button>
      <button class="adm-btn-cancel" onclick="renderAdmTab(${tab})">Cancel</button>
    </div>`;
}
window.admSaveEdit = function admSaveEdit(tab,idx){
  const {arr,key}=getAdmArr(tab);
  const ta=document.getElementById('editTa_'+key+'_'+idx);if(!ta)return;
  const text=ta.value.trim();
  if(!text||text.length<10){showAdmToast('❌ Passage too short!','error');return;}
  arr[idx]=text;renderAdmTab(tab);showAdmToast('✅ Passage #'+(idx+1)+' update ho gaya!');
  if(document.getElementById('ctrlEx'))buildDd();
}
window.admMoveUp = function admMoveUp(tab,idx){
  if(idx===0)return;
  const {arr}=getAdmArr(tab);[arr[idx-1],arr[idx]]=[arr[idx],arr[idx-1]];
  renderAdmTab(tab);showAdmToast('↑ Passage reorder ho gaya!');
}
function admSaveAll(){
  updateTabCounts();renderLtUnattempted&&renderLtUnattempted();
  showAdmToast('✅ Sabhi changes save ho gaye!');
  if(document.getElementById('ctrlEx'))buildDd();
}
window.admExportJSON = function admExportJSON(){
  const data={normal:{english:PASS.english,hindi:PASS.hindi,numbers:PASS.numbers},live:{english:LIVE_PASS.english,hindi:LIVE_PASS.hindi},exportedAt:new Date().toISOString(),version:'v5'};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='apna_passages_'+Date.now()+'.json';a.click();
  showAdmToast('✅ JSON export ho gaya!');
}
window.showAdmToast = function showAdmToast(msg,type='success'){
  const t=document.getElementById('admToast');
  t.textContent=msg;t.className='adm-toast show '+(type==='error'?'error':'success');
  setTimeout(()=>t.className='adm-toast',3200);
}
function escHtml(str){return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function escJs(str){return String(str).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');}


/* ── Hindi Test with Font ── */
function tryTestHindi(layout){
  if(!APP.loggedIn){saveSession();window.location.href='login.html';return;}
  APP.hindiLayout=layout;APP.activeExamKey=null;APP.isLiveMode=false;
  APP.lang='hindi'; saveSession();
  if(document.getElementById('testPageWrap')){
    startTypingPage('hindi');
  } else {
    window.location.href='typing.html?lang=hindi&layout='+encodeURIComponent(layout);
  }
}

/* ── Hindi Tutor Popup ── */
function openHindiTutor(layout){
  if(layout==='krutidev'){
    openKrutiDevTutor();
    return;
  }
  /* ── Mangal GAIL / INSCRIPT ── Unicode IME-based tutorial ── */
  const w=window.open('','_blank');
  if(!w){alert('Popup blocked! Please allow popups.');return;}
  const isInscript=layout==='mangal_inscript';
  const layoutName=isInscript?'Mangal Unicode — INSCRIPT Layout':'Mangal Unicode — Remington GAIL Layout';
  const fontFam="'Mangal','Noto Sans Devanagari',sans-serif";
  const hintText=isInscript?'INSCRIPT standard keyboard layout use karein':'Remington GAIL keyboard layout use karein';
  const lessons=[
    {t:"Day 1: Swar — अ आ इ ई उ ऊ",c:"अ आ इ ई उ ऊ ए ऐ ओ औ"},
    {t:"Day 2: Basic Words",c:"जाना आना खाना पाना माना"},
    {t:"Day 3: Common Words",c:"राम काम दाम नाम धाम याद बात"},
    {t:"Day 4: Matra Practice",c:"किताब मिलना सिखना दिखना"},
    {t:"Day 5: Short Sentence",c:"भारत एक देश है"},
    {t:"Day 6: Two-letter Words",c:"से के ने में को पर है था"},
    {t:"Day 7: Three-letter Words",c:"भारत सरकार जनता पुलिस"},
    {t:"Day 8: Sentences - 1",c:"भारत एक महान देश है जहाँ अनेक भाषाएं बोली जाती हैं"},
    {t:"Day 9: Sentences - 2",c:"हिंदी हमारी राष्ट्रभाषा है और इसे सम्मान देना हमारा कर्तव्य है"},
    {t:"Day 10: Numbers",c:"एक दो तीन चार पांच छह सात आठ नौ दस"},
    {t:"Day 11: Govt. Terms",c:"प्रशासन विभाग कार्यालय अधिकारी कर्मचारी सचिव"},
    {t:"Day 12: Legal Terms",c:"न्यायालय याचिका अभियोग वादी प्रतिवादी अधिवक्ता"},
    {t:"Day 13: Speed - 1",c:"पहले सटीकता फिर गति पर ध्यान दें अभ्यास जारी रखें"},
    {t:"Day 14: Speed - 2",c:"नियमित अभ्यास से गति बढ़ती है और गलतियां कम होती हैं"},
    {t:"Day 15: Complex Words",c:"विश्वविद्यालय महाविद्यालय प्रतिनिधित्व न्यायाधीश"},
    {t:"Day 16: Long Sentence",c:"भारतीय संविधान विश्व का सबसे बड़ा लिखित संविधान है"},
    {t:"Day 17: SSC Pattern",c:"भारत सरकार ने देश के विकास के लिए अनेक योजनाएं बनाई हैं"},
    {t:"Day 18: UPSSSC Pattern",c:"उत्तर प्रदेश अधीनस्थ सेवा चयन आयोग परीक्षा आयोजित करता है"},
    {t:"Day 19: Court Pattern",c:"इलाहाबाद उच्च न्यायालय में लिपिक पद की टाइपिंग परीक्षा"},
    {t:"Day 20: Railway",c:"भारतीय रेलवे विश्व का चौथा सबसे बड़ा रेल नेटवर्क है"},
    {t:"Day 21: Police",c:"पुलिस विभाग में उप निरीक्षक पद के लिए टाइपिंग परीक्षा अनिवार्य है"},
    {t:"Day 22: Speed Challenge",c:"क्या आप पच्चीस शब्द प्रति मिनट टाइप कर सकते हैं अभ्यास करें"},
    {t:"Day 23: Accuracy Day",c:"गलती से बचना गति से भी अधिक महत्वपूर्ण है परीक्षा में"},
    {t:"Day 24: Paragraph - 1",c:"हिंदी टाइपिंग में महारत हासिल करने के लिए प्रतिदिन अभ्यास आवश्यक है"},
    {t:"Day 25: Paragraph - 2",c:"नियमित अभ्यास और एकाग्रता से आप परीक्षा में अवश्य सफल होंगे"},
    {t:"Day 26: MP Police",c:"मध्य प्रदेश पुलिस विभाग में सहायक उप निरीक्षक पद परीक्षा"},
    {t:"Day 27: Advanced",c:"भारत के संविधान में नागरिकों के मूल अधिकार और कर्तव्य सुरक्षित हैं"},
    {t:"Day 28: Long Passage 1",c:"भारत सरकार ने ग्रामीण क्षेत्रों में साक्षरता दर बढ़ाने के लिए अनेक कार्यक्रम शुरू किए"},
    {t:"Day 29: Long Passage 2",c:"न्यायपालिका किसी भी लोकतांत्रिक देश का एक महत्वपूर्ण स्तंभ होती है"},
    {t:"Day 30: Graduation!",c:"बधाई हो! आपने 30 दिन का हिंदी टाइपिंग कोर्स सफलतापूर्वक पूरा किया है!"},
    {t:"Day 31: Parivaar Shabd",c:"माता पिता भाई बहन दादा दादी नाना नानी"},
    {t:"Day 32: Rangon Ke Naam",c:"लाल पीला हरा नीला काला सफेद"},
    {t:"Day 33: Saptaah Ke Din",c:"सोमवार मंगलवार बुधवार गुरुवार शुक्रवार शनिवार रविवार"},
    {t:"Day 34: Maheenon Ke Naam",c:"जनवरी फरवरी मार्च अप्रैल मई जून"},
    {t:"Day 35: Extra Ginti",c:"ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस"},
    {t:"Day 36: Sarkari Shabdavali",c:"मंत्रालय सचिवालय राजपत्र अधिसूचना निदेशालय"},
    {t:"Day 37: Vaakya Abhyas - 1",c:"स्वच्छ भारत अभियान से देश में सफाई के प्रति जागरूकता बढ़ी है"},
    {t:"Day 38: Vaakya Abhyas - 2",c:"डिजिटल इंडिया कार्यक्रम से सरकारी सेवाएं ऑनलाइन उपलब्ध हो गई हैं"},
    {t:"Day 39: Lamba Anuchchhed - 1",c:"शिक्षा किसी भी राष्ट्र के विकास की नींव होती है। एक शिक्षित समाज ही उन्नति के पथ पर आगे बढ़ सकता है।"},
    {t:"Day 40: Lamba Anuchchhed - 2",c:"स्वास्थ्य ही धन है। नियमित व्यायाम और संतुलित आहार से हम स्वस्थ जीवन जी सकते हैं।"},
    {t:"Day 41: Gati Abhyas - 1",c:"जल्दी उठने वाला व्यक्ति हमेशा सफलता प्राप्त करता है यह पुरानी कहावत आज भी सत्य है"},
    {t:"Day 42: Gati Abhyas - 2",c:"परिश्रम का फल हमेशा मीठा होता है चाहे रास्ता कितना भी कठिन क्यों न हो"},
    {t:"Day 43: Pariksha Pattern",c:"सभी अभ्यर्थियों को परीक्षा केंद्र पर प्रवेश पत्र एवं वैध फोटो पहचान पत्र साथ लाना अनिवार्य है"},
    {t:"Day 44: Samanya Gyan",c:"भारत का संविधान छब्बीस जनवरी उन्नीस सौ पचास को लागू हुआ था"},
    {t:"Day 45: Extended Graduation!",c:"बधाई हो! आपने विस्तारित हिंदी टाइपिंग पाठ्यक्रम सफलतापूर्वक पूरा कर लिया है। निरंतर अभ्यास करते रहें।"}
  ];
  const lessonsJson=JSON.stringify(lessons);
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Hindi 30-Day — '+layoutName+'<\/title><style>*{margin:0;padding:0;box-sizing:border-box;}body{display:flex;height:100vh;background:#f4f7f6;font-family:\'Noto Sans Devanagari\',\'Noto Sans\',sans-serif;}.sb{width:260px;background:#1a0800;color:#fff;padding:14px;overflow-y:auto;flex-shrink:0;}.sb h2{color:#f0a500;font-size:13px;border-bottom:1px solid #444;padding-bottom:7px;margin:0 0 8px;}.badge{background:#f0a500;color:#000;font-size:9px;font-weight:700;padding:2px 7px;border-radius:3px;display:inline-block;margin-bottom:8px;font-family:\'Noto Sans\',sans-serif;}.li{padding:8px;margin-bottom:4px;background:rgba(255,255,255,.08);border-radius:4px;cursor:pointer;font-size:11px;font-family:\'Noto Sans\',sans-serif;}.li:hover,.li.active{background:#2471a3;border-left:3px solid #f0a500;}.main{flex:1;padding:20px;display:flex;flex-direction:column;align-items:center;overflow-y:auto;gap:14px;}.stats{display:flex;gap:12px;}.sc{background:#fff;padding:10px 18px;border-radius:8px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.08);}.sv{display:block;font-size:20px;font-weight:800;color:#2471a3;font-family:\'Noto Sans\',sans-serif;}.sl{font-size:10px;color:#888;text-transform:uppercase;font-family:\'Noto Sans\',sans-serif;}.tc{background:#fff;width:100%;max-width:720px;padding:24px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.1);}.lname{font-size:12px;font-weight:700;color:#1a5276;margin-bottom:10px;font-family:\'Noto Sans\',sans-serif;}.td{font-size:22px;font-family:'+fontFam+';line-height:2.4;color:#555;min-height:60px;margin-bottom:8px;word-break:break-all;}.cc{color:#27ae60;}.cw{background:#fde8e8;color:#e74c3c;border-radius:2px;}.cur{background:#f0a500;color:#000;border-radius:2px;}textarea#it{width:100%;min-height:60px;font-size:20px;font-family:'+fontFam+';border:2px solid #ddd;border-radius:6px;padding:10px;outline:none;resize:none;line-height:2.2;}.prog{height:4px;background:#eee;border-radius:2px;margin-top:10px;}.prog-bar{height:4px;background:#f0a500;border-radius:2px;transition:width .3s;}.hint{font-size:11px;color:#888;text-align:center;margin-top:8px;font-family:\'Noto Sans\',sans-serif;}<\/style><\/head><body><div class="sb"><button onclick="window.close()" style="width:100%;margin-bottom:10px;padding:8px 0;background:#e74c3c;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;font-weight:700;">&#8592; वापस जाएं<\/button><div class="badge">'+layoutName+'<\/div><h2>हिंदी 30-Day Course<\/h2><div id="ll"><\/div><\/div><div class="main"><div class="stats"><div class="sc"><span class="sv" id="wpm">0<\/span><span class="sl">WPM<\/span><\/div><div class="sc"><span class="sv" id="acc">100%<\/span><span class="sl">Accuracy<\/span><\/div><div class="sc"><span class="sv" id="tmr">00:00<\/span><span class="sl">Time<\/span><\/div><div class="sc"><span class="sv" id="mis">0<\/span><span class="sl">Mistakes<\/span><\/div><\/div><div class="tc"><div class="lname" id="lname"><\/div><div class="td" id="td">Loading...<\/div><textarea id="it" autocomplete="off" spellcheck="false" placeholder="यहाँ type करें..."><\/textarea><div class="prog"><div class="prog-bar" id="pb" style="width:0%"><\/div><\/div><div class="hint">💡 '+hintText+'<\/div><\/div><\/div><script>const L='+lessonsJson+';let ci=0,st=null,mis=0,ti;const ll=document.getElementById("ll");L.forEach((l,i)=>{const d=document.createElement("div");d.className="li"+(i===0?" active":"");d.innerHTML="<b>"+(i+1)+".<\/b> "+l.t;d.onclick=()=>load(i);ll.appendChild(d);});function load(i){ci=i;mis=0;st=null;clearInterval(ti);document.getElementById("wpm").innerText="0";document.getElementById("acc").innerText="100%";document.getElementById("tmr").innerText="00:00";document.getElementById("mis").innerText="0";const itEl=document.getElementById("it");itEl.value="";itEl.disabled=false;document.getElementById("lname").textContent=L[i].t;document.getElementById("pb").style.width="0%";render("");document.querySelectorAll(".li").forEach((el,j)=>el.className="li"+(j===i?" active":""));itEl.focus();}function render(typed){const p=L[ci].c;const tArr=[...typed];const pArr=[...p];let h="";for(let i=0;i<pArr.length;i++){const c=pArr[i]==" "?"&nbsp;":pArr[i];if(i<tArr.length){h+=tArr[i]===pArr[i]?"<span class=\'cc\'>"+c+"<\/span>":"<span class=\'cw\'>"+c+"<\/span>";}else if(i===tArr.length){h+="<span class=\'cur\'>"+c+"<\/span>";}else{h+="<span>"+c+"<\/span>";}}document.getElementById("td").innerHTML=h;const pct=Math.min(100,Math.round(tArr.length/pArr.length*100));document.getElementById("pb").style.width=pct+"%";}document.getElementById("it").addEventListener("input",function(){const p=L[ci].c;const pArr=[...p];let typed=this.value;let tArr=[...typed];if(tArr.length>pArr.length){tArr=tArr.slice(0,pArr.length);typed=tArr.join("");this.value=typed;}if(!st&&typed.length>0){st=Date.now();ti=setInterval(()=>{const s=(Date.now()-st)/1000,m=Math.floor(s/60),sec=Math.floor(s%60);document.getElementById("tmr").innerText=(m<10?"0"+m:m)+":"+(sec<10?"0"+sec:sec);const w=Math.round((typed.length/5)/(s/60));document.getElementById("wpm").innerText=w>0?w:0;},1000);}mis=0;for(let i=0;i<Math.min(tArr.length,pArr.length);i++){if(tArr[i]!==pArr[i])mis++;}document.getElementById("mis").innerText=mis;const acc=tArr.length>0?Math.max(0,Math.round((tArr.length-mis)/tArr.length*100)):100;document.getElementById("acc").innerText=acc+"%";render(typed);if(typed===p){clearInterval(ti);this.disabled=true;setTimeout(()=>{if(ci+1<L.length){load(ci+1);}else{alert("🎓 Poora course complete ho gaya! Badhai ho!");}},500);}});load(0);<\/script><\/body><\/html>');
  w.document.close();
}

/* ── KrutiDev 010 Remington GAIL — Raw Keydown Tutorial ── */
function openKrutiDevTutor(){
  const w=window.open('','_blank');
  if(!w){alert('Popup blocked! Please allow popups.');return;}

  // KrutiDev 010 Remington GAIL keyboard mapping
  // ASCII key → Unicode (for reference display only)
  // Lesson content stored as ASCII keys to press
  const KMAP={
    ' ':' ',
    // Matras (vowel signs - typed after consonant)
    'k':'ा','i':'ि','I':'ी','u':'ु','U':'ू',
    'e':'े','E':'ै','o':'ो','O':'ौ',
    // Standalone vowels
    'a':'अ','A':'आ',
    // Anusvara / Visarga
    'M':'ं','%':'ः',
    // Halant
    ']':'्',
    // Consonants
    'd':'क','D':'ख','g':'ग','G':'घ',
    'p':'च','P':'छ','j':'ज','J':'झ',
    'q':'ट','Q':'ठ','n':'ड','N':'ढ',
    '.':'ण','r':'त','R':'थ','w':'द','W':'ध',
    'f':'न','c':'प','C':'फ','b':'ब','B':'भ',
    'm':'म',';':'य','y':'र','l':'ल','v':'व',
    's':'स','S':'श','"':'ष','h':'ह',
    'z':'ज्ञ','/':'श्र','x':'क्ष',
    // Numbers
    '0':'0','1':'1','2':'2','3':'3','4':'4',
    '5':'5','6':'6','7':'7','8':'8','9':'9',
    ',':',','.':'.','!':'!','?':'?'
  };

  // 30-Day Lessons: content stored as ASCII keys to press in KrutiDev Remington
  // When typed correctly in KrutiDev font they display as Hindi
  // Format: {t: "Day title (Unicode hint)", c: "ASCII keys to type", u: "Unicode reference"}
  const LESSONS=[
    {t:"Day 1: Home Row — f j k l",
     c:"f j d l f j d l fj dk lk",
     u:"न ज क ल न ज क ल नज दक लक"},
    {t:"Day 2: Home Row Words",
     c:"dk fk jk lk gk hk mk sk bk",
     u:"का ना जा ला गा हा मा सा बा"},
    {t:"Day 3: Simple Words",
     c:"dkj fke jky vkj gky",
     u:"कार नाम जाल आर गाल"},
    {t:"Day 4: राम काम जाना",
     c:"yke dke tkfk bkfk",
     u:"राम काम जाना बाना"},
    {t:"Day 5: Common Words",
     c:"Hkkjr ljdkj ns'k jkT;",
     u:"भारत सरकार देश राज्य"},
    {t:"Day 6: Matras — ि ी",
     c:"fdrkc feyfk lh[kfk fn[kfk",
     u:"किताब मिलना सीखना दिखना"},
    {t:"Day 7: Matras — ु ू",
     c:"lquk Hkwfe dqN lwjt",
     u:"सुना भूमि कुछ सूरज"},
    {t:"Day 8: Sentence - 1",
     c:"Hkkjr ,d egku ns'k gSA",
     u:"भारत एक महान देश है।"},
    {t:"Day 9: Sentence - 2",
     c:"fgUnh gekjh jk\"VªHkk\"kk gSA",
     u:"हिंदी हमारी राष्ट्रभाषा है।"},
    {t:"Day 10: Numbers",
     c:"1 2 3 4 5 6 7 8 9 10",
     u:"1 2 3 4 5 6 7 8 9 10"},
    {t:"Day 11: Govt. Terms",
     c:"iz'kklu foHkkx dk;kZy; vf/kdkjh",
     u:"प्रशासन विभाग कार्यालय अधिकारी"},
    {t:"Day 12: Legal Terms",
     c:"U;k;ky; ;kfpdk vfHk;ksx oknh",
     u:"न्यायालय याचिका अभियोग वादी"},
    {t:"Day 13: Speed - 1",
     c:"igys lVhdrk fQj xfr ij /;ku nsaA",
     u:"पहले सटीकता फिर गति पर ध्यान दें।"},
    {t:"Day 14: Speed - 2",
     c:"fu;fer vH;kl ls xfr c<+rh gSA",
     u:"नियमित अभ्यास से गति बढ़ती है।"},
    {t:"Day 15: Complex Words",
     c:"fo'ofo|ky; egkfo|ky; U;k;k/kh'k",
     u:"विश्वविद्यालय महाविद्यालय न्यायाधीश"},
    {t:"Day 16: Constitution",
     c:"Hkkjrh; lafo/kku fo'o dk lcls cM+k lafo/kku gSA",
     u:"भारतीय संविधान विश्व का सबसे बड़ा संविधान है।"},
    {t:"Day 17: SSC Pattern",
     c:"Hkkjr ljdkj us ns'k ds fodkl gsrq vusd ;kstukvksa cukbZ gSaA",
     u:"भारत सरकार ने देश के विकास हेतु अनेक योजनाएं बनाई हैं।"},
    {t:"Day 18: UPSSSC Pattern",
     c:"mRrj izns'k v/khulFk lsok p;u vk;ksx ijh{kk vk;ksftr djrk gSA",
     u:"उत्तर प्रदेश अधीनस्थ सेवा चयन आयोग परीक्षा आयोजित करता है।"},
    {t:"Day 19: Court Pattern",
     c:"bykgkckn mPp U;k;ky; esa fyfid in dh VkbfiaMx ijh{kkA",
     u:"इलाहाबाद उच्च न्यायालय में लिपिक पद की टाइपिंग परीक्षा।"},
    {t:"Day 20: Railway",
     c:"Hkkjrh; jsyos fo'o dk pkSFkk lcls cM+k jsy usVodZ gSA",
     u:"भारतीय रेलवे विश्व का चौथा सबसे बड़ा रेल नेटवर्क है।"},
    {t:"Day 21: Police",
     c:"iqfyl foHkkx esa mi fujh{kd in gsrq VkbfiaMx ijh{kk vfuok;Z gSA",
     u:"पुलिस विभाग में उप निरीक्षक पद हेतु टाइपिंग परीक्षा अनिवार्य है।"},
    {t:"Day 22: Speed Challenge",
     c:"D;k vki iPphl 'kCn izfr feuV Vkbi dj ldrs gSa\\ vH;kl djsaA",
     u:"क्या आप पच्चीस शब्द प्रति मिनट टाइप कर सकते हैं? अभ्यास करें।"},
    {t:"Day 23: Accuracy",
     c:"xyrh ls cpuk xfr ls Hkh vf/kd egRoiw.kZ gS ijh{kk esaA",
     u:"गलती से बचना गति से भी अधिक महत्वपूर्ण है परीक्षा में।"},
    {t:"Day 24: Paragraph 1",
     c:"fgUnh VkbfiaMx esa egkjr gsrq izfrfnu vH;kl vko';d gSA",
     u:"हिंदी टाइपिंग में महारत हेतु प्रतिदिन अभ्यास आवश्यक है।"},
    {t:"Day 25: Paragraph 2",
     c:"fu;fer vH;kl vkSj ,dkxzrk ls vki ijh{kk esa vo'; lQy gksaxsA",
     u:"नियमित अभ्यास और एकाग्रता से आप परीक्षा में अवश्य सफल होंगे।"},
    {t:"Day 26: MP Police",
     c:"e/; izns'k iqfyl foHkkx esa lgk;d mi fujh{kd in ijh{kkA",
     u:"मध्य प्रदेश पुलिस विभाग में सहायक उप निरीक्षक पद परीक्षा।"},
    {t:"Day 27: Advanced",
     c:"Hkkjr ds lafo/kku esa ukxfjdksa ds ewy vf/kdkj vkSj drZO; lqjf{kr gSaA",
     u:"भारत के संविधान में नागरिकों के मूल अधिकार और कर्तव्य सुरक्षित हैं।"},
    {t:"Day 28: Long Passage 1",
     c:"Hkkjr ljdkj us xzkelh.k {ks=ksa esa lk{kjrk nj c<+kus gsrq vusd dk;ZØe 'kq: fd,A",
     u:"भारत सरकार ने ग्रामीण क्षेत्रों में साक्षरता दर बढ़ाने हेतु अनेक कार्यक्रम शुरू किए।"},
    {t:"Day 29: Long Passage 2",
     c:"U;k;ikfydk fdlh Hkh yksdrkaf=d ns'k dk ,d egRoiw.kZ LrEHk gksrh gSA",
     u:"न्यायपालिका किसी भी लोकतांत्रिक देश का एक महत्वपूर्ण स्तंभ होती है।"},
    {t:"Day 30: 🎓 Graduation!",
     c:"c/kkbZ gks! vkius 30 fnu dk fgUnh VkbfiaMx dkslZ lQyrkiwoZd iwjk fd;k gS!",
     u:"बधाई हो! आपने 30 दिन का हिंदी टाइपिंग कोर्स सफलतापूर्वक पूरा किया है!"},
    {t:"Day 31: Extra Keys — 1",
     c:"s S h b m y v c C q",
     u:"स श ह ब म र व प फ ट"},
    {t:"Day 32: Extra Keys — 2",
     c:"n N . r R w W B ; z",
     u:"ड ढ ण त थ द ध भ य ज्ञ"},
    {t:"Day 33: Consonant + आ — 1",
     c:"Dk Gk Jk Qk Nk Rk Wk Ck Bk Sk",
     u:"खा घा झा ठा ढा था धा फा भा शा"},
    {t:"Day 34: Consonant + आ — 2",
     c:".k rk wk yk vk pk ck qk nk zk",
     u:"णा ता दा रा वा चा पा टा डा ज्ञा"},
    {t:"Day 35: Word Bank Mix — 1",
     c:"Hkkjr ljdkj foHkkx U;k;ky;",
     u:"भारत सरकार विभाग न्यायालय"},
    {t:"Day 36: Word Bank Mix — 2",
     c:"vH;kl xfr ijh{kk VkbfiaMx",
     u:"अभ्यास गति परीक्षा टाइपिंग"},
    {t:"Day 37: Word Bank Mix — 3",
     c:"iqfyl fujh{kd in vfuok;Z",
     u:"पुलिस निरीक्षक पद अनिवार्य"},
    {t:"Day 38: Word Bank Mix — 4",
     c:"lafo/kku vf/kdkj drZO; ukxfjdksa",
     u:"संविधान अधिकार कर्तव्य नागरिकों"},
    {t:"Day 39: Word Bank Mix — 5",
     c:"U;k;ikfydk yksdrkaf=d ns'k egRoiw.kZ",
     u:"न्यायपालिका लोकतांत्रिक देश महत्वपूर्ण"},
    {t:"Day 40: Sentence Combo — 1",
     c:"Hkkjr ,d egku ns'k gSA igys lVhdrk fQj xfr ij /;ku nsaA",
     u:"भारत एक महान देश है। पहले सटीकता फिर गति पर ध्यान दें।"},
    {t:"Day 41: Sentence Combo — 2",
     c:"fu;fer vH;kl ls xfr c<+rh gSA xyrh ls cpuk xfr ls Hkh vf/kd egRoiw.kZ gS ijh{kk esaA",
     u:"नियमित अभ्यास से गति बढ़ती है। गलती से बचना गति से भी अधिक महत्वपूर्ण है परीक्षा में।"},
    {t:"Day 42: Sentence Combo — 3",
     c:"mRrj izns'k v/khulFk lsok p;u vk;ksx ijh{kk vk;ksftr djrk gSA bykgkckn mPp U;k;ky; esa fyfid in dh VkbfiaMx ijh{kkA",
     u:"उत्तर प्रदेश अधीनस्थ सेवा चयन आयोग परीक्षा आयोजित करता है। इलाहाबाद उच्च न्यायालय में लिपिक पद की टाइपिंग परीक्षा।"},
    {t:"Day 43: Sentence Combo — 4",
     c:"fgUnh VkbfiaMx esa egkjr gsrq izfrfnu vH;kl vko';d gSA fu;fer vH;kl vkSj ,dkxzrk ls vki ijh{kk esa vo'; lQy gksaxsA",
     u:"हिंदी टाइपिंग में महारत हेतु प्रतिदिन अभ्यास आवश्यक है। नियमित अभ्यास और एकाग्रता से आप परीक्षा में अवश्य सफल होंगे।"},
    {t:"Day 44: Sentence Combo — 5",
     c:"Hkkjrh; lafo/kku fo'o dk lcls cM+k lafo/kku gSA Hkkjr ljdkj us ns'k ds fodkl gsrq vusd ;kstukvksa cukbZ gSaA",
     u:"भारतीय संविधान विश्व का सबसे बड़ा संविधान है। भारत सरकार ने देश के विकास हेतु अनेक योजनाएं बनाई हैं।"},
    {t:"Day 45: 🎓 Extended Graduation!",
     c:"c/kkbZ gks! vkius 30 fnu dk fgUnh VkbfiaMx dkslZ lQyrkiwoZd iwjk fd;k gS! Hkkjr ,d egku ns'k gSA",
     u:"बधाई हो! आपने 30 दिन का हिंदी टाइपिंग कोर्स सफलतापूर्वक पूरा किया है! भारत एक महान देश है।"}
  ];

  const lessonsJson=JSON.stringify(LESSONS);
  const kmapJson=JSON.stringify(KMAP);

  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>KrutiDev 30-Day Typing Course<\/title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{display:flex;height:100vh;background:#f0ede8;font-family:'Noto Sans','Arial',sans-serif;}
.sb{width:270px;background:#2c1a00;color:#fff;padding:14px;overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column;gap:6px;}
.back-btn{width:100%;padding:9px 0;background:#e74c3c;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:700;}
.badge{background:#f0a500;color:#000;font-size:9px;font-weight:700;padding:3px 8px;border-radius:3px;display:inline-block;}
.sb h2{color:#f0a500;font-size:13px;border-bottom:1px solid #555;padding-bottom:7px;margin-top:2px;}
.li{padding:8px;background:rgba(255,255,255,.08);border-radius:4px;cursor:pointer;font-size:11px;line-height:1.4;}
.li:hover,.li.active{background:#2471a3;border-left:3px solid #f0a500;}
.main{flex:1;padding:18px;display:flex;flex-direction:column;align-items:center;overflow-y:auto;gap:12px;}

/* Font check banner */
.font-warn{background:#fff3cd;border:2px solid #f0a500;border-radius:8px;padding:12px 16px;width:100%;max-width:720px;font-size:12px;line-height:1.6;}
.font-warn b{color:#c0392b;font-size:13px;}
.font-ok{background:#d4edda;border:2px solid #27ae60;border-radius:8px;padding:10px 16px;width:100%;max-width:720px;font-size:12px;}
.font-ok b{color:#155724;}

/* Stats */
.stats{display:flex;gap:12px;}
.sc{background:#fff;padding:10px 18px;border-radius:8px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.1);}
.sv{display:block;font-size:20px;font-weight:800;color:#2471a3;}
.sl{font-size:10px;color:#888;text-transform:uppercase;}

/* Typing card */
.tc{background:#fff;width:100%;max-width:720px;padding:20px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.1);}
.lname{font-size:12px;font-weight:700;color:#1a5276;margin-bottom:6px;}
.unicode-hint{font-size:12px;color:#888;font-family:'Noto Sans Devanagari',sans-serif;margin-bottom:8px;padding:6px 10px;background:#f8f9fa;border-radius:4px;border-left:3px solid #f0a500;}
.td{font-size:22px;font-family:'Kruti Dev 010','KrutiDev 010','Kruti Dev','KrutiDev',monospace;line-height:2.2;color:#555;min-height:55px;margin-bottom:8px;word-break:break-all;letter-spacing:1px;}
.cc{color:#27ae60;}
.cw{background:#fde8e8;color:#e74c3c;border-radius:2px;}
.cur{background:#f0a500;color:#000;border-radius:2px;}
#it{width:100%;padding:10px;font-size:18px;font-family:'Kruti Dev 010','KrutiDev 010','Kruti Dev',monospace;border:2px solid #ddd;border-radius:6px;outline:none;letter-spacing:1px;background:#fffff8;}
#it:focus{border-color:#2471a3;}
.prog{height:5px;background:#eee;border-radius:3px;margin-top:10px;}
.prog-bar{height:5px;background:#f0a500;border-radius:3px;transition:width .3s;}
.hint{font-size:11px;color:#888;text-align:center;margin-top:8px;}
.hint b{color:#e74c3c;}

/* Key chart */
.kc{background:#fff;width:100%;max-width:720px;padding:14px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.08);}
.kc h4{font-size:12px;color:#2c1a00;margin-bottom:8px;font-weight:700;}
.krow{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;}
.kk{background:#f0ede8;border:1px solid #ccc;border-radius:3px;padding:2px 6px;font-size:10px;text-align:center;min-width:34px;}
.kk .ak{font-family:'Kruti Dev 010','KrutiDev 010',monospace;font-size:13px;display:block;color:#2471a3;}
.kk .uk{font-family:'Noto Sans Devanagari',sans-serif;font-size:10px;color:#888;}
<\/style><\/head><body>
<div class="sb">
  <button class="back-btn" onclick="window.close()">&#8592; वापस जाएं<\/button>
  <span class="badge">KrutiDev Remington<\/span>
  <h2>🖥️ KrutiDev 30-Day Course<\/h2>
  <div id="ll"><\/div>
<\/div>
<div class="main">
  <div id="fontBanner" class="font-warn">
    <b>⚠️ KrutiDev Font Check कर रहे हैं...</b>
  <\/div>

  <div class="stats">
    <div class="sc"><span class="sv" id="wpm">0<\/span><span class="sl">WPM<\/span><\/div>
    <div class="sc"><span class="sv" id="acc">100%<\/span><span class="sl">Accuracy<\/span><\/div>
    <div class="sc"><span class="sv" id="tmr">00:00<\/span><span class="sl">Time<\/span><\/div>
    <div class="sc"><span class="sv" id="mis">0<\/span><span class="sl">Mistakes<\/span><\/div>
  <\/div>

  <div class="tc">
    <div class="lname" id="lname"><\/div>
    <div class="unicode-hint">📖 Hindi reference: <span id="uref" style="font-family:'Noto Sans Devanagari',sans-serif;"><\/span><\/div>
    <div class="td" id="td">Loading...<\/div>
    <input type="text" id="it" autocomplete="off" spellcheck="false" placeholder="यहाँ type करें (KrutiDev keys)">
    <div class="prog"><div class="prog-bar" id="pb" style="width:0%"><\/div><\/div>
    <div class="hint">💡 KrutiDev font install होना जरूरी है | <b>d=क, k=ा, f=न, j=ज, y=र, m=म, h=ह, s=स, b=ब, B=भ<\/b><\/div>
  <\/div>

  <div class="kc">
    <h4>⌨️ KrutiDev 010 Remington GAIL — Key Chart</h4>
    <div class="krow" id="krow"><\/div>
  <\/div>
<\/div>
<script>
const L=${lessonsJson};
const KM=${kmapJson};

// Font detection via canvas
function checkKrutiFont(){
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  ctx.font='20px monospace';
  const base=ctx.measureText('d').width;
  ctx.font="20px 'Kruti Dev 010'";
  const kruti=ctx.measureText('d').width;
  // If widths differ significantly, font is loaded
  const banner=document.getElementById('fontBanner');
  if(Math.abs(base-kruti)>1){
    banner.className='font-ok';
    banner.innerHTML='<b>✅ KrutiDev Font Detected!</b> Font sahi se install hai. Type karein!';
  } else {
    banner.className='font-warn';
    banner.innerHTML='<b>⚠️ KrutiDev Font Install Nahi!</b> Typing hogi lekin Hindi display nahi dikhegi.<br>➡️ <a href="https://www.indiatyping.com/index.php/fonts/download-kruti-dev-font" target="_blank">KrutiDev Font Download karein</a> → Install karein → Browser refresh karein';
  }
}
setTimeout(checkKrutiFont,500);

// Build key chart
const keyChart=[
  {k:'d',u:'क'},{k:'D',u:'ख'},{k:'g',u:'ग'},{k:'G',u:'घ'},
  {k:'p',u:'च'},{k:'P',u:'छ'},{k:'j',u:'ज'},{k:'J',u:'झ'},
  {k:'q',u:'ट'},{k:'Q',u:'ठ'},{k:'n',u:'ड'},{k:'N',u:'ढ'},
  {k:'.',u:'ण'},{k:'r',u:'त'},{k:'R',u:'थ'},{k:'w',u:'द'},
  {k:'W',u:'ध'},{k:'f',u:'न'},{k:'c',u:'प'},{k:'C',u:'फ'},
  {k:'b',u:'ब'},{k:'B',u:'भ'},{k:'m',u:'म'},{k:';',u:'य'},
  {k:'y',u:'र'},{k:'l',u:'ल'},{k:'v',u:'व'},{k:'s',u:'स'},
  {k:'S',u:'श'},{k:'"',u:'ष'},{k:'h',u:'ह'},
  {k:'k',u:'ा'},{k:'i',u:'ि'},{k:'I',u:'ी'},{k:'u',u:'ु'},
  {k:'U',u:'ू'},{k:'e',u:'े'},{k:'E',u:'ै'},{k:'o',u:'ो'},
  {k:'O',u:'ौ'},{k:'M',u:'ं'},{k:'a',u:'अ'},{k:'A',u:'आ'},
];
const kr=document.getElementById('krow');
keyChart.forEach(x=>{
  const div=document.createElement('div');
  div.className='kk';
  div.innerHTML='<span class="ak">'+x.k+'<\/span><span class="uk">'+x.u+'<\/span>';
  kr.appendChild(div);
});

// Build sidebar
const ll=document.getElementById('ll');
L.forEach((l,i)=>{
  const d=document.createElement('div');
  d.className='li'+(i===0?' active':'');
  d.innerHTML='<b>'+(i+1)+'.<\/b> '+l.t;
  d.onclick=()=>load(i);
  ll.appendChild(d);
});

let ci=0,typed='',st=null,mis=0,ti;

function load(i){
  ci=i; typed=''; mis=0; st=null; clearInterval(ti);
  document.getElementById('wpm').innerText='0';
  document.getElementById('acc').innerText='100%';
  document.getElementById('tmr').innerText='00:00';
  document.getElementById('mis').innerText='0';
  const itEl=document.getElementById('it');
  itEl.value='';
  itEl.disabled=false;
  document.getElementById('lname').textContent=L[i].t;
  document.getElementById('uref').textContent=L[i].u;
  document.getElementById('pb').style.width='0%';
  render('');
  document.querySelectorAll('.li').forEach((el,j)=>el.className='li'+(j===i?' active':''));
  itEl.focus();
}

function render(tp){
  const target=L[ci].c;
  let h='';
  for(let i=0;i<target.length;i++){
    const ch=target[i]==' '?'&nbsp;':target[i];
    if(i<tp.length){
      h+=tp[i]===target[i]?'<span class="cc">'+ch+'<\/span>':'<span class="cw">'+ch+'<\/span>';
    } else if(i===tp.length){
      h+='<span class="cur">'+ch+'<\/span>';
    } else {
      h+='<span>'+ch+'<\/span>';
    }
  }
  document.getElementById('td').innerHTML=h;
  document.getElementById('pb').style.width=Math.min(100,Math.round(tp.length/target.length*100))+'%';
}

// RAW KEYDOWN capture — no IME, no Unicode input
document.getElementById('it').addEventListener('keydown',function(e){
  if(e.key==='Tab'){e.preventDefault();return;}
  if(e.key==='Enter'){e.preventDefault();return;}
  if(e.key==='Escape'){e.preventDefault();return;}
});

document.getElementById('it').addEventListener('input',function(e){
  const target=L[ci].c;
  let val=this.value;
  if(val.length>target.length){ val=val.slice(0,target.length); this.value=val; }

  if(!st && val.length>0){
    st=Date.now();
    ti=setInterval(()=>{
      const s=(Date.now()-st)/1000;
      const m=Math.floor(s/60), sec=Math.floor(s%60);
      document.getElementById('tmr').innerText=(m<10?'0'+m:m)+':'+(sec<10?'0'+sec:sec);
      const w=Math.round((val.length/5)/(s/60));
      document.getElementById('wpm').innerText=w>0?w:0;
    },500);
  }

  typed=val;

  // Count mistakes char by char
  let errs=0;
  for(let i=0;i<Math.min(val.length,target.length);i++){
    if(val[i]!==target[i]) errs++;
  }
  mis=errs;
  document.getElementById('mis').innerText=mis;
  const acc=val.length>0?Math.max(0,Math.round((val.length-mis)/val.length*100)):100;
  document.getElementById('acc').innerText=acc+'%';

  render(val);

  if(val===target){
    clearInterval(ti);
    this.disabled=true;
    setTimeout(()=>{
      this.disabled=false;
      if(ci+1<L.length){ load(ci+1); }
      else{ alert('🎓 Poora course complete ho gaya! Badhai ho!'); }
    },500);
  }
});

load(0);
<\/script><\/body><\/html>`);
  w.document.close();
}

/* Tutorial — English 30-Day */
/* Tutorial — English 30-Day */
function openProfessionalTutor(){
  const w=window.open('','_blank');
  if(!w){alert('Popup blocked!');return;}
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>English 30-Day Typing Course<\/title><style>body{font-family:sans-serif;margin:0;display:flex;height:100vh;background:#f4f7f6;}.sb{width:250px;background:#2c3e50;color:#fff;padding:14px;overflow-y:auto;flex-shrink:0;}.sb h2{color:#f0a500;font-size:15px;border-bottom:1px solid #444;padding-bottom:7px;margin-top:0;}.li{padding:9px;margin-bottom:5px;background:rgba(255,255,255,.1);border-radius:4px;cursor:pointer;font-size:11px;}.li:hover,.li.active{background:#2471a3;border-left:3px solid #f0a500;}.main{flex:1;padding:26px;display:flex;flex-direction:column;align-items:center;overflow-y:auto;}.stats{display:flex;gap:18px;margin-bottom:20px;}.sc{background:#fff;padding:12px 22px;border-radius:8px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.08);}.sv{display:block;font-size:20px;font-weight:800;color:#2471a3;}.sl{font-size:10px;color:#888;text-transform:uppercase;}.tc{background:#fff;width:100%;max-width:700px;padding:28px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.1);}.td{font-size:22px;font-family:\'Courier New\',monospace;line-height:1.8;color:#bbb;min-height:70px;}.cc{color:#27ae60;}.cw{background:#fde8e8;color:#e74c3c;}.cur{background:#f0a500;color:#000;border-radius:2px;}#it{position:absolute;opacity:0;pointer-events:none;}.prog{height:4px;background:#eee;border-radius:2px;margin-top:12px;}.prog-bar{height:4px;background:#f0a500;border-radius:2px;transition:width .3s;}<\/style><\/head><body onclick="document.getElementById(\'it\').focus()"><div class="sb"><button onclick="window.close()" style="width:100%;margin-bottom:10px;padding:8px 0;background:#e74c3c;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;font-weight:700;">&#8592; Back (Close)<\/button><h2>📚 English 30-Day Course<\/h2><div id="ll"><\/div><\/div><div class="main"><div class="stats"><div class="sc"><span class="sv" id="wpm">0<\/span><span class="sl">WPM<\/span><\/div><div class="sc"><span class="sv" id="acc">100%<\/span><span class="sl">Accuracy<\/span><\/div><div class="sc"><span class="sv" id="tmr">00:00<\/span><span class="sl">Time<\/span><\/div><div class="sc"><span class="sv" id="mis">0<\/span><span class="sl">Mistakes<\/span><\/div><\/div><div class="tc"><div class="td" id="td">Loading...<\/div><input type="text" id="it" autofocus autocomplete="off"><div class="prog"><div class="prog-bar" id="pb" style="width:0%"><\/div><\/div><p style="margin-top:14px;font-size:12px;color:#888;text-align:center;">Home Row: ASDF JKL; | Eyes on screen, not keyboard!<\/p><\/div><\/div><script>const L=[{t:"Day 1: Home Row Basics",c:"asdf jkl; asdf jkl; asd fgh jkl; asdfghjkl;"},{t:"Day 2: Home Row Words",c:"flask salad fall glass lads asks glad flak"},{t:"Day 3: Top Row qwerty yuiop",c:"qwer tyui qwer tyui q w e r t y u i o p"},{t:"Day 4: Top Row Words",c:"tree power quiet write route outer pure water"},{t:"Day 5: Bottom Row zxcv mnb",c:"zxcv mnb. zxcv mnb. z x c v m n b . /"},{t:"Day 6: Bottom Row Words",c:"zone vertex cabin member bunny next valve"},{t:"Day 7: All Rows Mix",c:"the quick brown fox jumps over the lazy dog"},{t:"Day 8: Shift Key Capitals",c:"India USA Delhi London Paris New York Tokyo"},{t:"Day 9: Special Characters",c:"email@domain.com TypeMaster 100 rupees More"},{t:"Day 10: Numbers 1 to 0",c:"12 34 56 78 90 102 304 506 708 900"},{t:"Day 11: Speed Building 1",c:"focus on accuracy first then speed will follow naturally"},{t:"Day 12: Speed Building 2",c:"practice makes a man perfect in every field of life"},{t:"Day 13: Common Words",c:"the of and a to in is you that it he was for on are"},{t:"Day 14: Left Hand Reach",c:"qwert asdfg zxcvb qwert asdfg zxcvb reach"},{t:"Day 15: Right Hand Reach",c:"yuiop hjkl; mnbv. yuiop hjkl; reach right"},{t:"Day 16: Paragraph 1",c:"Typing is a skill that requires regular daily practice."},{t:"Day 17: Paragraph 2",c:"A professional typist never looks at the keyboard while typing."},{t:"Day 18: Advance Symbols",c:"percent sign colon semicolon hyphen underscore"},{t:"Day 19: Long Words 1",c:"international professional organization computer keyboard"},{t:"Day 20: Long Words 2",c:"education development information technology government"},{t:"Day 21: Sentence Mastery 1",c:"Success is not final, failure is not fatal keep going."},{t:"Day 22: Sentence Mastery 2",c:"Believe you can and you are already halfway there always."},{t:"Day 23: Punctuation Day",c:"Comma, period. Question? Exclamation! Colon: Semicolon;"},{t:"Day 24: Mixed Case",c:"AbCd EfGh IjKl MnOp QrSt UvWx Yz mixed"},{t:"Day 25: Numeric Left",c:"147 258 369 012 456 789 left numpad"},{t:"Day 26: Numeric Right",c:"963 852 741 210 654 987 right numpad"},{t:"Day 27: Article Practice",c:"The future belongs to those who believe in the beauty of dreams."},{t:"Day 28: Speed Challenge",c:"Can you type this passage at forty words per minute accurately?"},{t:"Day 29: Accuracy Challenge",c:"Zero mistakes is always better than high speed with many errors."},{t:"Day 30: Final Graduation",c:"Congratulations! You have completed the 30-day English typing course. You are now a professional typist. Keep practicing!"},{t:"Day 31: Double Letters",c:"letter better matter little summer dinner sitting running"},{t:"Day 32: Silent Letters",c:"knife know write listen island honest hour"},{t:"Day 33: Common Confusions",c:"their there they are your you are its it is"},{t:"Day 34: Business Vocabulary",c:"invoice meeting deadline client proposal budget report"},{t:"Day 35: Government Exam Terms",c:"recruitment eligibility candidate application admit card"},{t:"Day 36: Advanced Long Words",c:"communication administration responsibility organization"},{t:"Day 37: Mixed Numbers and Words",c:"Room No 204 Phone 98765 43210 Total Rs 1500"},{t:"Day 38: Email and Web Practice",c:"support@company.com www.example.com Visit our website today"},{t:"Day 39: Punctuation Advanced",c:"Well, that is fine; however, we must proceed carefully."},{t:"Day 40: Speed Passage 1",c:"The early bird catches the worm so wake up early every day and work hard."},{t:"Day 41: Speed Passage 2",c:"Hard work always pays off in the end no matter how difficult the journey seems."},{t:"Day 42: Accuracy Passage",c:"Precision and patience are the two most important qualities of a skilled typist."},{t:"Day 43: Exam Style Passage",c:"All candidates must carry their admit card and a valid photo identity proof to the exam center."},{t:"Day 44: General Knowledge",c:"The Constitution of India was adopted on twenty sixth November nineteen forty nine."},{t:"Day 45: Extended Mastery",c:"Congratulations on completing the extended typing course! Keep practicing daily to maintain your speed and accuracy."}];let ci=0,tt="",st=null,mis=0,ti;const ll=document.getElementById("ll");L.forEach((l,i)=>{const d=document.createElement("div");d.className="li"+(i===0?" active":"");d.innerHTML="<b>"+(i+1)+".<\/b> "+l.t;d.onclick=()=>load(i);ll.appendChild(d);});function load(i){ci=i;tt="";mis=0;st=null;clearInterval(ti);["wpm","acc","tmr","mis"].forEach(id=>document.getElementById(id).innerText=id==="acc"?"100%":"0");if(document.getElementById("tmr"))document.getElementById("tmr").innerText="00:00";const itEl=document.getElementById("it");itEl.value="";itEl.maxLength=L[i].c.length;if(document.getElementById("pb"))document.getElementById("pb").style.width="0%";render();document.querySelectorAll(".li").forEach((el,j)=>el.className="li"+(j===i?" active":""));itEl.focus();}function render(){const p=L[ci].c;let h="";for(let i=0;i<p.length;i++){const c=p[i];if(i<tt.length)h+=tt[i]===c?"<span class=\'cc\'>"+c+"<\/span>":"<span class=\'cw\'>"+c+"<\/span>";else if(i===tt.length)h+="<span class=\'cur\'>"+c+"<\/span>";else h+="<span>"+c+"<\/span>";}document.getElementById("td").innerHTML=h;if(document.getElementById("pb"))document.getElementById("pb").style.width=Math.round(tt.length\/p.length*100)+"%";}document.getElementById("it").addEventListener("input",e=>{if(!st){st=Date.now();ti=setInterval(()=>{let s=(Date.now()-st)\/1000,m=Math.floor(s\/60),sec=Math.floor(s%60);document.getElementById("tmr").innerText=(m<10?"0"+m:m)+":"+(sec<10?"0"+sec:sec);let w=Math.round((tt.length\/5)\/(s\/60));document.getElementById("wpm").innerText=w>0?w:0;},1000);}const p=L[ci].c;let inp=e.target.value;if(inp.length>p.length)inp=inp.slice(0,p.length);if(inp.length>tt.length&&inp[inp.length-1]!==p[tt.length]){mis++;document.getElementById("mis").innerText=mis;const acc=Math.max(0,Math.round((inp.length-mis)\/inp.length*100));document.getElementById("acc").innerText=acc+"%";}tt=inp;e.target.value=inp;render();if(tt.length===p.length){clearInterval(ti);e.target.disabled=true;setTimeout(()=>{e.target.disabled=false;if(ci+1<L.length){load(ci+1);}else{alert("🎓 Poora course complete ho gaya! Badhai ho!");}},500);}});load(0);<\/script><\/body><\/html>');
}

/* ════════════════════════════════════════════════════════════
   EXAM MODE — official strict-test experience
   Picker → (Keyboard choice, Hindi only) → Instructions → Timed
   Typing (own chrome) → Result Dashboard → Detailed Comparison.
   Reuses EXAM_RULES / calcNet / renderP / PASS — does NOT touch
   the Normal Practice engine (#typeArea) at all; runs on its own
   #examxTypeArea with its own state object (EXAMX) so both modes
   can never collide.
   First 2 passages per language are free; 3rd onward needs Pro —
   same rule as Normal Practice, using a small localStorage counter.
   ════════════════════════════════════════════════════════════ */
window.EXAMX = { ruleKey:null, lang:'english', hindiLayout:null, passageIdx:0,
  passageText:'', timeLeft:0, timer:null, running:false,
  corr:0, err:0, halfErr:0, total:0, backspaceCount:0,
  muted:false, testId:0, fontSize:16 };

// Which rule keys need a keyboard-METHOD choice screen before Instructions,
// and what the two choices are. UPSSSC/AHC are Mangal-Inscript either way
// (choice is just engine vs OS-keyboard); SSC/RRB let the candidate pick
// between KrutiDev and Mangal-Inscript entirely.
const EXAMX_KB_META = {
  upsssc_hindi:{fixed:'mangal_inscript', engineChoice:true},
  ahc_hindi:   {fixed:'mangal_inscript', engineChoice:true},
  ssc_hindi:   {fixed:null, engineChoice:false, pickFont:true},
  chsl_hindi:  {fixed:null, engineChoice:false, pickFont:true},
  rrb_hindi:   {fixed:null, engineChoice:false, pickFont:true}
};

const EXAMX_GROUP_LABEL = {
  ssc_eng:'SSC CGL', ssc_hindi:'SSC CGL', chsl_eng:'SSC CHSL', chsl_hindi:'SSC CHSL',
  rrb_eng:'RRB NTPC', rrb_hindi:'RRB NTPC',
  upsssc_eng:'UPSSSC', upsssc_hindi:'UPSSSC',
  ahc_hindi:'Allahabad High Court', ahc_eng:'Allahabad High Court'
};

function examxNextPassageIdx(ruleKey){
  const key='examx_attempt_'+ruleKey;
  let n=parseInt(localStorage.getItem(key)||'0');
  localStorage.setItem(key, String(n+1));
  return n; // raw attempt count for THIS specific exam type — caller checks
            // n>=2 for the Pro lock; text selection wraps separately by length
}
function examxPassageForIdx(lang, idx){
  const arr=PASS[lang]||[];
  return arr.length ? arr[idx % arr.length] : '';
}

/* ── Entry point (replaces the old locked-paywall stub) ── */
function openExamMode(){
  if(!APP.loggedIn){openAuthModal('login');return;}
  examxOpenPicker();
}
function examxOpenPicker(){
  const grid=document.getElementById('examxPickerGrid');
  grid.innerHTML='';
  Object.keys(EXAM_RULES).forEach(key=>{
    const rule=EXAM_RULES[key];
    const card=document.createElement('div');
    card.className='examx-picker-card';
    card.innerHTML='<div class="exn">'+(EXAMX_GROUP_LABEL[key]||rule.name)+'</div>'+
      '<div class="exl">'+rule.name.split('—')[1].trim()+' &middot; '+rule.time+' min</div>'+
      '<div class="exw">🎯 '+rule.minWPM+' WPM</div>';
    card.onclick=()=>examxPickRule(key);
    grid.appendChild(card);
  });
  document.getElementById('examxPicker').classList.add('open');
}
function examxClose(id){ document.getElementById(id).classList.remove('open'); }

function examxPickRule(ruleKey){
  const rule=EXAM_RULES[ruleKey];
  const idx=examxNextPassageIdx(ruleKey);
  if(idx>=2 && !APP.isPro){
    examxClose('examxPicker');
    openDModal('subModal');
    return;
  }
  EXAMX.ruleKey=ruleKey; EXAMX.lang=rule.lang; EXAMX.passageIdx=idx;
  examxClose('examxPicker');

  const kbMeta=EXAMX_KB_META[ruleKey];
  if(kbMeta) examxOpenKbChoice(ruleKey, kbMeta);
  else { EXAMX.hindiLayout=null; examxOpenInstructions(ruleKey); }
}

/* ── Keyboard-method choice (Hindi exams) ── */
function examxOpenKbChoice(ruleKey, meta){
  const body=document.getElementById('examxKbBody');
  document.getElementById('examxKbTitle').textContent='Select Hindi Keyboard Input Method';
  if(meta.pickFont){
    body.innerHTML=`
      <h2>Keyboard / Font chunein</h2>
      <div class="examx-kb-opt" style="opacity:.55;cursor:not-allowed;position:relative;">
        <div class="kbt">KrutiDev 010 — Built-in Engine <span class="kbbeta">Test mein hai</span></div>
        <div class="kbd">Abhi verify nahi ho paaya real device par — filhal disabled hai taaki galat typing-accuracy na dikhe.</div>
      </div>
      <div class="examx-kb-opt" onclick="examxSetHindiLayout('krutidev','${ruleKey}')">
        <div class="kbt">KrutiDev 010 — External Keyboard ✓ Recommended</div>
        <div class="kbd">Windows/mobile mein pehle se installed KrutiDev driver se type karein — 100% verified &amp; sahi.</div>
      </div>
      <div class="examx-kb-opt" onclick="examxSetHindiLayout('mangal_inscript','${ruleKey}')">
        <div class="kbt">Mangal Unicode — External InScript Keyboard ✓ Recommended</div>
        <div class="kbd">Sarkari standard Unicode Hindi keyboard — OS Language Settings se enable karein.</div>
      </div>`;
  } else {
    body.innerHTML=`
      <h2>Mangal — Inscript Input Method</h2>
      <div class="examx-kb-opt" style="opacity:.55;cursor:not-allowed;position:relative;">
        <div class="kbt">Use Built-in Keyboard Engine <span class="kbbeta">Test mein hai</span></div>
        <div class="kbd">Abhi verify nahi ho paaya real device par — filhal disabled hai taaki galat typing-accuracy na dikhe.</div>
      </div>
      <div class="examx-kb-opt" onclick="examxSetHindiLayout('mangal_inscript','${ruleKey}')">
        <div class="kbt">Use External InScript Keyboard ✓ Recommended</div>
        <div class="kbd">Windows Language Settings ya third-party software se InScript layout enable karein — 100% verified &amp; sahi.</div>
      </div>`;
  }
  document.getElementById('examxKbChoice').classList.add('open');
}
function examxSetHindiLayout(layout, ruleKey){
  EXAMX.hindiLayout=layout;
  examxClose('examxKbChoice');
  examxOpenInstructions(ruleKey);
}

/* ── Instructions page ── */
const EXAMX_STD_RULES=[
  'Candidates ko master text passage diya jayega jismein aapko exact match karna hai.',
  'Typing word-based ya key-strokes based ho sakti hai, exam ke hisaab se.',
  'Countdown timer top-right corner mein bacha hua time dikhayega. Timer 0 hote hi test khud-ba-khud khatam ho jayega, aapko submit karne ki zaroorat nahi.',
  'Passage ek baar poora ho jaaye aur bacha hua time ho, toh aap revise/correct kar sakte hain (agar backspace allowed ho).',
  'Har punctuation ke baad sirf ek space daalein (comma, full stop, question mark, etc.).',
  'Ek baar Submit dabane ke baad, typed passage mein koi editing possible nahi hai.',
  'Copy-Paste is test mein allowed nahi hai.',
  'Ctrl/Cmd shortcuts aur cursor-movement arrow keys is test mein disabled hain.',
  'Passage mein diye gaye shabdon se zyada type nahi kiya ja sakta.'
];
function examxOpenInstructions(ruleKey){
  const rule=EXAM_RULES[ruleKey];
  const passage=examxPassageForIdx(rule.lang, EXAMX.passageIdx);
  EXAMX.passageText=passage;
  EXAMX.testId=30000+Math.floor(Math.random()*9999);
  const title=passage.split(/[.।]/)[0].slice(0,42).trim()||'Practice Passage';

  const kbLine = EXAMX.hindiLayout ?
    `<div class="exblk"><b>Keyboard Method</b><span>${examxKbLabel()}</span></div>` : '';

  document.getElementById('examxInstrBody').innerHTML = `
    <h2>Instructions</h2>
    <div class="exsub">Test shuru karne se pehle neeche di gayi jaankari aur niyam dhyan se padhein.</div>
    <div class="exblk"><b>Personal Information</b><span>${escHtml(APP.name||'Candidate')}</span></div>
    <div class="exblk"><b>Exam Description</b><span>${rule.name}</span></div>
    <div class="exblk"><b>Passage Detail</b><span>Id - ${EXAMX.testId} - ${escHtml(title)}</span></div>
    ${kbLine}
    <ol>${EXAMX_STD_RULES.map(r=>'<li>'+r+'</li>').join('')}
      <li>Time duration: <b>${rule.time}:00 minute</b>, minimum required speed: <b>${rule.minWPM} WPM</b>.</li>
    </ol>
    <button class="examx-instr-startbtn" onclick="examxStartExam('${ruleKey}')">Start Typing →</button>
  `;
  document.getElementById('examxInstr').classList.add('open');
}
function examxKbLabel(){
  if(EXAMX.hindiLayout==='krutidev') return 'KrutiDev 010 — Remington GAIL';
  if(EXAMX.hindiLayout==='mangal_inscript_builtin') return 'Mangal Unicode — INSCRIPT (Built-in Engine, Beta)';
  if(EXAMX.hindiLayout==='mangal_inscript') return 'Mangal Unicode — INSCRIPT (External Keyboard)';
  return 'QWERTY';
}

/* ── Start the actual timed exam ── */
function examxStartExam(ruleKey){
  const rule=EXAM_RULES[ruleKey];
  examxClose('examxInstr');

  document.getElementById('examxHdrTitle').textContent='Typing Test Id '+EXAMX.testId+' — '+(EXAMX.passageText.split(/[.।]/)[0].slice(0,40).trim());
  document.getElementById('examxHdrExamName').textContent=rule.name;
  document.getElementById('examxUserName').textContent=(APP.name||'You').split(' ')[0].toUpperCase();
  document.getElementById('examxKbLabel').textContent='Keyboard Layout: '+(EXAMX.hindiLayout?(EXAMX.hindiLayout==='krutidev'?'KrutiDev':'Inscript'):'QWERTY');
  document.getElementById('examxLangLabel').textContent='Language: '+(rule.lang==='hindi'?'Hindi - Mangal Font':'English');

  const pd=document.getElementById('examxPassageDisplay');
  pd.className='examx-passage'+(rule.lang==='hindi'?' hindi-text':'')+
    (rule.highlight==='word'?' hl-word':rule.highlight==='error'?' hl-error':rule.highlight==='none'?' hl-none':rule.highlight==='currentblue'?' hl-currentblue':'');
  if(EXAMX.hindiLayout==='krutidev'){
    pd.style.fontFamily="'Kruti Dev 010','KrutiDev 010','Kruti Dev','KrutiDev',sans-serif";
    document.getElementById('examxTypeArea').style.fontFamily=pd.style.fontFamily;
  } else {
    pd.style.fontFamily=''; document.getElementById('examxTypeArea').style.fontFamily='';
  }
  EXAMX.fontSize = rule.lang==='hindi'?17:16;
  examxZoom(0);

  EXAMX.corr=0; EXAMX.err=0; EXAMX.halfErr=0; EXAMX.total=0; EXAMX.backspaceCount=0;
  EXAMX.timeLeft=rule.time*60; EXAMX.running=true;
  document.getElementById('examxPassageSpan').innerHTML=renderP(EXAMX.passageText,'');
  const ta=document.getElementById('examxTypeArea');
  ta.value=''; ta.disabled=false; ta.classList.remove('active');
  document.getElementById('examxChrome').classList.add('open');
  examxUpdTimer();
  clearInterval(EXAMX.timer);
  EXAMX.timer=setInterval(()=>{
    EXAMX.timeLeft--; examxUpdTimer();
    if(EXAMX.timeLeft<=0) examxSubmitTest();
  },1000);
  setTimeout(()=>ta.focus(),80);

  // Fill Settings panel info for this exam
  document.getElementById('examxBsInfo').textContent=(rule.info&&rule.info[2])?rule.info[2].replace(/^⌫\s*/,''):rule.backspace;
  document.getElementById('examxHlInfo').textContent=rule.highlight;
}
function examxUpdTimer(){
  const m=String(Math.floor(EXAMX.timeLeft/60)).padStart(2,'0'),s=String(EXAMX.timeLeft%60).padStart(2,'0');
  document.getElementById('examxTimer').textContent=m+':'+s;
}

/* ── Typing input handling (own listeners, bound once) ── */
document.addEventListener('DOMContentLoaded',()=>{
  const ta=document.getElementById('examxTypeArea');
  if(!ta) return;
  ta.addEventListener('paste', e=>e.preventDefault());
  ta.addEventListener('keydown', e=>{
    if(!EXAMX.running) return;
    if(e.ctrlKey||e.metaKey){ e.preventDefault(); return; }
    if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){ e.preventDefault(); return; }
    if(e.key==='Backspace'){
      const rule=EXAM_RULES[EXAMX.ruleKey];
      const bsMode=rule?rule.backspace:'full';
      const val=ta.value;
      if(bsMode==='off'){ e.preventDefault(); return; }
      if(bsMode==='full'){
        if(val.length===0){ e.preventDefault(); return; }
      }
      if(bsMode==='word'){
        if(val.length===0||val[val.length-1]===' '){ e.preventDefault(); return; }
      }
      if(bsMode==='word2'){
        if(val.length===0){ e.preventDefault(); return; }
        const starts=[0];
        for(let i=0;i<val.length-1;i++){ if(val[i]===' ') starts.push(i+1); }
        const boundary = starts.length>=2 ? starts[starts.length-2] : 0;
        if(val.length<=boundary){ e.preventDefault(); return; }
      }
      EXAMX.backspaceCount++;
    }
    if(!EXAMX.muted && e.key.length===1){ examxPlayKeySound(); }
  });
  ta.addEventListener('input', ()=>{
    if(!EXAMX.running) return;
    ta.classList.toggle('active', ta.value.length>0);
    const typed=ta.value, pass=EXAMX.passageText;
    document.getElementById('examxPassageSpan').innerHTML=renderP(pass,typed);
    const tw=typed.trim().split(/\s+/).filter(Boolean), pw=pass.trim().split(/\s+/);
    let c=0,e=0,halfE=0;
    tw.forEach((w,i)=>{
      if(i<pw.length){
        if(w===pw[i]){ c++; }
        else {
          const wClean=w.replace(/[.,!?;:'"()-]+$/,'').replace(/^['"(]/,'');
          const pClean=pw[i].replace(/[.,!?;:'"()-]+$/,'').replace(/^['"(]/,'');
          if(w.toLowerCase()===pw[i].toLowerCase() && w!==pw[i]){ halfE+=0.5; c++; }
          else if(wClean===pClean){ halfE+=0.5; }
          else { e++; }
        }
      }
    });
    EXAMX.halfErr=halfE; EXAMX.corr=c; EXAMX.err=e; EXAMX.total=tw.length;
  });
});
function examxPlayKeySound(){
  try{
    if(!window._examxAC) window._examxAC=new (window.AudioContext||window.webkitAudioContext)();
    const ctx=window._examxAC, o=ctx.createOscillator(), g=ctx.createGain();
    o.frequency.value=740; g.gain.value=0.03;
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime+0.02);
  }catch(e){}
}

/* ── Toolbar: mute / fullscreen / font zoom ── */
function examxToggleMute(btn){
  EXAMX.muted=!EXAMX.muted;
  btn.textContent=EXAMX.muted?'🔇':'🔊';
  examxSyncSoundBtn();
}
function examxSyncSoundBtn(){
  const chk=document.getElementById('examxSoundToggle');
  const btn=document.getElementById('examxMuteBtn');
  if(chk){ EXAMX.muted=!chk.checked; }
  if(btn) btn.textContent=EXAMX.muted?'🔇':'🔊';
  if(chk) chk.checked=!EXAMX.muted;
}
function examxToggleFullscreen(){
  const el=document.getElementById('examxChrome');
  if(!document.fullscreenElement){ el.requestFullscreen?.().catch(()=>{}); }
  else { document.exitFullscreen?.().catch(()=>{}); }
}
function examxZoom(dir){
  if(dir===0){ EXAMX.fontSize = EXAM_RULES[EXAMX.ruleKey]?.lang==='hindi'?17:16; }
  else { EXAMX.fontSize=Math.min(26,Math.max(11,EXAMX.fontSize+dir*2)); }
  const pd=document.getElementById('examxPassageDisplay');
  if(pd) pd.style.fontSize=EXAMX.fontSize+'px';
}

/* ── Settings panel ── */
function examxOpenSettings(){ document.getElementById('examxSettings').classList.add('open'); }
function examxCloseSettings(){ document.getElementById('examxSettings').classList.remove('open'); }
function examxToggleSec(id){ document.getElementById(id).classList.toggle('open'); }

/* ── Cancel / Submit ── */
function examxCancelTest(){
  if(!confirm('Test cancel karna hai? Aapki progress save nahi hogi.')) return;
  clearInterval(EXAMX.timer); EXAMX.running=false;
  document.getElementById('examxChrome').classList.remove('open');
}
function examxSubmitTest(){
  clearInterval(EXAMX.timer); EXAMX.running=false;
  document.getElementById('examxTypeArea').disabled=true;
  document.getElementById('examxChrome').classList.remove('open');
  examxShowResult();
}

/* ── Result Dashboard (two layouts: keystroke-based for UPSSSC-style
     exams, word-based for everyone else) + Detailed Comparison ── */
function examxShowResult(){
  const rule=EXAM_RULES[EXAMX.ruleKey];
  const dur=rule.time*60, elapsed=Math.max(1,dur-EXAMX.timeLeft), mins=elapsed/60;
  const gross=Math.round(EXAMX.total/mins);
  const net=calcNet(gross, EXAMX.err, mins, rule.netFormula, EXAMX.corr, EXAMX.halfErr);
  const qualified = net>=rule.minWPM;
  const initials=(APP.name||'YOU').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const mm=String(Math.floor(elapsed/60)).padStart(2,'0'), ss=String(elapsed%60).padStart(2,'0');
  const durMM=String(rule.time).padStart(2,'0');
  const isKeystroke = rule.netFormula==='upsssc';

  let cardsHtml, formulaHtml;
  if(isKeystroke){
    const keystrokesGiven=Math.round(EXAMX.passageText.length);
    const fullMistake=Math.round(EXAMX.err), halfMistake=Math.round(EXAMX.halfErr*2);
    const netWrong=(EXAMX.err+EXAMX.halfErr).toFixed(2);
    cardsHtml=`
      <div class="examx-card"><div class="exc-lbl">Total Keystrokes / Words Typed ⌨️</div><div class="exc-val">${EXAMX.passageText.length>0?EXAMX.total*5:0} / ${EXAMX.total}</div></div>
      <div class="examx-card"><div class="exc-lbl">Full Mistake (Words) ⊗</div><div class="exc-val">${fullMistake}</div></div>
      <div class="examx-card"><div class="exc-lbl">Half Mistake (Words) {⊗}</div><div class="exc-val">${halfMistake}</div></div>
      <div class="examx-card"><div class="exc-lbl">Total Wrong Words ⊗</div><div class="exc-val">${(EXAMX.err+halfMistake)}</div></div>
      <div class="examx-card"><div class="exc-lbl">Net Wrong Words {⊗}</div><div class="exc-val">${netWrong}</div></div>
      <div class="examx-card"><div class="exc-lbl">Net Typing Speed (wpm) 🚀</div><div class="exc-val">${net}</div></div>
      <div class="examx-card"><div class="exc-lbl">Backspace Count ⌫</div><div class="exc-val">${EXAMX.backspaceCount}</div></div>
      <div class="examx-card"><div class="exc-lbl">Result 🎯</div><div class="exc-val" style="font-size:18px;color:${qualified?'#27ae60':'#e74c3c'};">${qualified?'Qualified':'Not Qualified'}</div></div>`;
    formulaHtml=`💡 Grace-of-5 rule: pehle 5 mistakes free, uske baad har mistake se −5 words. Calculation of Net Correct Words = ${EXAMX.corr} − (max(0, (${EXAMX.err+halfMistake} − 5)) × 5).`;
  } else {
    const marks=Math.max(0, Math.round(25 - (EXAMX.err*0.1)*10)/10);
    cardsHtml=`
      <div class="examx-card"><div class="exc-lbl">Total Words Typed ⌨️</div><div class="exc-val">${EXAMX.total}</div></div>
      <div class="examx-card"><div class="exc-lbl">Total Wrong Words ⊗</div><div class="exc-val">${EXAMX.err}</div></div>
      <div class="examx-card"><div class="exc-lbl">Net Correct Words ✓</div><div class="exc-val">${EXAMX.corr}</div></div>
      <div class="examx-card"><div class="exc-lbl">Marks Obtained 📋</div><div class="exc-val">${marks} / 25</div></div>
      <div class="examx-card"><div class="exc-lbl">Gross Speed (wpm) 🏎️</div><div class="exc-val">${gross}</div></div>
      <div class="examx-card"><div class="exc-lbl">Net Speed (${rule.minWPM} wpm) 🚀</div><div class="exc-val">${net}</div></div>
      <div class="examx-card"><div class="exc-lbl">Backspace Count ⌫</div><div class="exc-val">${EXAMX.backspaceCount}</div></div>
      <div class="examx-card"><div class="exc-lbl">Status 🎯</div><div class="exc-val" style="font-size:18px;color:${qualified?'#27ae60':'#e74c3c'};">${qualified?'Qualified':'Unqualified'}</div></div>`;
    formulaHtml=qualified?`✅ Net Speed required se zyada/barabar hai.`:`Net Speed minimum required speed (${rule.minWPM} wpm) se kam hai. Calculation of Marks = 25 − (Errors × 0.1).`;
  }

  document.getElementById('examxResultBody').innerHTML=`
    <div class="examx-result-hdr">
      <div class="examx-result-avatar">${initials}</div>
      <div class="examx-result-title">Performance Dashboard</div>
      <div class="examx-toggle-label">Speed based on Time ${isKeystroke?'Duration':'Taken'} <label class="examx-switch"><input type="checkbox" checked><span></span></label></div>
    </div>
    <div class="examx-meta-row">
      <div><b>Exam Title:</b> ${rule.name}</div>
      <div><b>${isKeystroke?'Total Key Strokes Given':'Total Words Given'}:</b> ${isKeystroke?EXAMX.passageText.length:EXAMX.passageText.trim().split(/\s+/).length}</div>
      <div><b>Typing Date:</b> ${new Date().toLocaleDateString('en-GB')}</div>
    </div>
    <div class="examx-meta-row">
      <div><b>Passage Title:</b> ${escHtml(EXAMX.passageText.split(/[.।]/)[0].slice(0,40).trim())}</div>
      <div><b>Time Duration:</b> ${durMM}:00 min.</div>
      <div><b>Time Taken:</b> ${mm}:${ss} min.</div>
    </div>
    ${isKeystroke?`<div class="examx-set-row" style="margin-top:8px;">Key Stroke Based Error Formula <label class="examx-switch"><input type="checkbox" checked><span></span></label></div>`:''}
    <div class="examx-cards-grid">${cardsHtml}</div>
    <div class="examx-formula-note">🩷 ${formulaHtml}</div>
    <div class="examx-compare-hdr">Detailed Comparision <label class="examx-switch"><input type="checkbox" checked onchange="document.getElementById('examxCompareGrid').style.display=this.checked?'grid':'none'"><span></span></label></div>
    <div class="examx-compare-grid" id="examxCompareGrid">
      <div class="examx-compare-col-hdr">Original Passage</div>
      <div class="examx-compare-col-hdr">Typed Passage</div>
      <div class="examx-compare-col orig">${examxDiffOriginal(EXAMX.passageText, document.getElementById('examxTypeArea').value)}</div>
      <div class="examx-compare-col typed">${examxDiffTyped(EXAMX.passageText, document.getElementById('examxTypeArea').value)}</div>
    </div>
    <div class="examx-result-footer">
      <button class="examx-btn-repeat" onclick="examxCloseResultRepeat()">Repeat</button>
      <button class="examx-btn-done" onclick="examxCloseResultDone()">Done</button>
    </div>
  `;
  document.getElementById('examxResult').classList.add('open');
}
function examxDiffOriginal(pass, typed){
  const pw=pass.trim().split(/\s+/), tw=typed.trim().split(/\s+/).filter(Boolean);
  return '<div>1 - '+pw.map((w,i)=> (i<tw.length && tw[i]!==w) ? '<span class="examx-diff-wrong">'+escHtml(w)+'</span>' : escHtml(w)).join(' ')+'</div>';
}
function examxDiffTyped(pass, typed){
  const pw=pass.trim().split(/\s+/), tw=typed.trim().split(/\s+/).filter(Boolean);
  return '<div>1 + '+tw.map((w,i)=> (i<pw.length && w===pw[i]) ? '<span class="examx-diff-correct-typed">'+escHtml(w)+'</span>' : (i<pw.length ? '<span class="examx-diff-wrong">'+escHtml(w)+'</span>' : escHtml(w))).join(' ')+'</div>';
}
function examxCloseResultRepeat(){
  document.getElementById('examxResult').classList.remove('open');
  examxStartExam(EXAMX.ruleKey);
}
function examxCloseResultDone(){
  document.getElementById('examxResult').classList.remove('open');
}
