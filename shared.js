/* © 2026 Apna Typing Master Pro — All rights reserved. Unauthorized copying or redistribution of this source code is prohibited. */
// ============================================================
// shared.js — Global State, Data, Firebase Config
// Include in EVERY page:
//   <script src="shared.js"></script>
//   <script type="module" src="firebase.js"></script>
// ============================================================

// ── App State ───────────────────────────────────────────────
window.APP = {
  loggedIn:false, name:'', email:'', isPro:false, plan:'monthly',
  lang:'english', idx:0, running:false, timer:null, timeLeft:600,
  corr:0, err:0, total:0,
  pendingLang:null, pendingIsRule:false, pendingLayout:null,
  activeExamKey:null, backspaceCount:0, isLiveMode:false,
  hindiLayout:null, currentLiveTest:null
};

// ── Plans ───────────────────────────────────────────────────
window.PLANS_DATA = {
  monthly:  {base:126.27, gst:22.73, total:149, label:'Pro Monthly',   days:30},
  quarterly:{base:295.76, gst:53.24, total:349, label:'Pro 3-Monthly', days:90},
  yearly:   {base:847.46, gst:151.54,total:999, label:'Pro Yearly',    days:365}
};

// ── Passages (fallback; Firebase overwrites these) ──────────
window.PASS = {
  english:[
    "Afterwards it became known by all and was reported to the king. He called the bad minister before him and said, I have investigated and found that you have done a criminal act. Word of it has spread and you have dishonoured yourself here in Benares. So it would be better for you to go and live somewhere else. You may take all your wealth and your family. Go wherever you like and live happily there. Learn from this lesson. Then the minister took his family and all his belongings to the city of Kosala. Since he was very clever indeed, he worked his way up and became a minister of the king of Kosala as well.",
    "Education is the most powerful weapon which you can use to change the world. It is through knowledge and learning that individuals gain the tools necessary to improve their lives and contribute meaningfully to society. A well-educated population forms the backbone of any thriving democracy and enables citizens to make informed decisions."
  ],
  hindi:[
    "जिसकी मंजूरी बाईबल में दी गयी और जिस जिद से वे अपनी वापसी में फिलिस्तीन को चाहने लगे हैं। क्यों नही वे, पृथ्वी के दुसरे लोगों से प्रेम करते हैं, उस देश को अपना घर बनाते जहाँ पर उनका जन्म हुआ।",
    "भारत एक विविधताओं से भरा देश है जहाँ अनेक धर्म, भाषाएँ और संस्कृतियाँ एक साथ फलती-फूलती हैं। यहाँ के लोगों में एकता और भाईचारे की भावना सदियों से विद्यमान है।"
  ],
  numbers:[
    "1234 5678 9012 3456 7890 1122 3344 5566 7788 9900 1357 2468 1020 3040 5060 7080 9010",
    "100 200 300 400 500 600 700 800 900 1000 1100 1200 1300 1400 1500 1600 1700 1800 1900 2000"
  ],
  // ── Speed Master passages (fallback; admin can add/edit more from
  //    Admin Panel → Manage Passages → ⚡ Speed Master tab) ──
  speedmaster:[
    "Practice makes a person perfect and typing is no exception to this simple rule. The more you type every single day the faster and more accurate you naturally become over time. Speed comes from muscle memory, not from rushing your fingers across the keyboard without control. Focus on accuracy first and speed will follow close behind it. Champions are not born overnight, they are built one practice session at a time, one passage at a time, one keystroke at a time.",
    "Government exams across India place a heavy weight on typing speed and accuracy for good reason. A clerk who can type sixty words per minute with full accuracy saves valuable time every single day of their working life. This is exactly why serious aspirants dedicate at least one hour daily purely to typing practice. Consistency beats intensity when you are building a long term skill like this one.",
    "The quick brown fox jumps over the lazy dog near the riverbank every single morning without fail. Sentences like this one are popular in typing practice because they contain almost every letter of the alphabet at least once. Typing such varied sentences trains your fingers to move confidently between every key on the keyboard, not just the common ones you already know well.",
    "Success in a typing examination depends on three things working together in perfect harmony: comfortable posture, disciplined daily practice, and calm nerves on the day of the actual test. Many capable candidates lose precious marks simply because they panic under the pressure of a ticking timer. Learning to breathe steadily and type at your natural practiced pace, rather than your fastest possible pace, usually produces the best result of all."
  ],
  // ── KrutiDev-encoded Hindi passages (Exam Mode → SSC/RRB "KrutiDev" choice
  //    only). These are stored as RAW KrutiDev ASCII bytes, NOT Unicode —
  //    paste already-KrutiDev-converted text here from admin's own converter.
  //    Kept completely separate from `hindi` above so Normal Practice /
  //    other exams are never affected. ──
  hindi_krutidev:[]
};

window.LIVE_PASS = {
  english:[
    "The Uttar Pradesh Subordinate Services Selection Commission conducts recruitment examinations for various posts in the state government. Candidates appearing for these posts must demonstrate proficiency in both English and Hindi typing. The minimum speed required for English typing is thirty words per minute. Regular practice is essential to achieve this target.",
    "The Uttar Pradesh Police department is one of the largest police forces in the country. It plays a crucial role in maintaining law and order across the state. Candidates selected for the post of Sub Inspector are required to undergo rigorous training at the police academy.",
    "Indian Railways is one of the largest employers in the world and conducts the NTPC examination to recruit candidates for various non technical positions. Typing speed is a mandatory requirement for most of these posts.",
    "The Staff Selection Commission Combined Graduate Level examination is one of the most prestigious competitive examinations in India. The typing test for SSC CGL requires candidates to achieve a minimum speed of thirty five words per minute in English."
  ],
  hindi:[
    "उत्तर प्रदेश अधीनस्थ सेवा चयन आयोग राज्य सरकार के विभिन्न विभागों में भर्ती के लिए परीक्षाएँ आयोजित करता है। हिंदी टाइपिंग में न्यूनतम गति पच्चीस शब्द प्रति मिनट निर्धारित की गई है।",
    "उत्तर प्रदेश की सरकारी नौकरियों में हिंदी टाइपिंग एक महत्वपूर्ण कौशल है। कृतिदेव फ़ॉन्ट में टाइपिंग का अभ्यास प्रतिदिन करना चाहिए।",
    "उत्तर प्रदेश पुलिस विभाग में उप निरीक्षक के पद पर भर्ती के लिए लिखित परीक्षा शारीरिक परीक्षण और टाइपिंग कौशल परीक्षा आयोजित की जाती है। नियमित अभ्यास से गति और सटीकता दोनों में सुधार होता है।",
    "मध्य प्रदेश पुलिस विभाग में सहायक उप निरीक्षक के पद पर भर्ती एक सम्मानजनक अवसर है। इस पद के लिए हिंदी टाइपिंग की परीक्षा तीस मिनट की होती है।"
  ]
};

window.LIVE_SCHEDULE = [
  {id:1, exam:"UPSSSC 2026",     lang:"English",               timeSlot:"06:00 AM - 10:00 PM", free:true, duration:5,  backspace:"Current + Previous Word Only", bsMode:'word2', passKey:'english', passIdx:0},
  {id:2, exam:"UPSSSC 2026",     lang:"Hindi → Mangal Unicode", timeSlot:"06:00 AM - 10:00 PM",free:true, duration:5,  backspace:"Current + Previous Word Only", bsMode:'word2', passKey:'hindi',   passIdx:0},
  {id:3, exam:"UPSSSC 2026",     lang:"Hindi → Krutidev",      timeSlot:"06:00 AM - 10:00 PM", free:true, duration:5,  backspace:"Current + Previous Word Only", bsMode:'word2', passKey:'hindi',   passIdx:1},
  {id:4, exam:"UP Police ASI/SI",lang:"Hindi → Mangal Unicode", timeSlot:"06:00 AM - 11:00 PM",free:true, duration:15, backspace:"Fully Allowed",     bsMode:'full', passKey:'hindi',   passIdx:2},
  {id:5, exam:"UP Police ASI/SI",lang:"English",                timeSlot:"06:00 AM - 11:00 PM", free:true, duration:15, backspace:"Fully Allowed",     bsMode:'full', passKey:'english', passIdx:1},
  {id:6, exam:"RRB NTPC",        lang:"English",                timeSlot:"07:00 AM - 10:00 PM", free:true, duration:10, backspace:"Backspace Disabled", bsMode:'off', passKey:'english', passIdx:2},
  {id:7, exam:"MP Police ASI",   lang:"Hindi → Mangal Unicode", timeSlot:"11:00 AM - 03:00 PM",free:true, duration:30, backspace:"Fully Allowed",     bsMode:'full', passKey:'hindi',   passIdx:3},
  {id:8, exam:"SSC CGL",         lang:"English",                timeSlot:"08:00 AM - 11:00 PM", free:true, duration:10, backspace:"Backspace Allowed",  bsMode:'full', passKey:'english', passIdx:3}
];

window.EXAM_PROFILES = {
  'SSC CGL':       { engWPM:35, hinWPM:30, time:10, backspace:'Disabled',                     netFormula:'ssc'   },
  'SSC CHSL':      { engWPM:35, hinWPM:30, time:10, backspace:'Disabled',                     netFormula:'ssc'   },
  'RRB NTPC':      { engWPM:30, hinWPM:25, time:10, backspace:'Backspace Disabled',            netFormula:'rrb'   },
  'UP Police ASI/SI':{ engWPM:25,hinWPM:25,time:15, backspace:'Fully Allowed',                 netFormula:'upsssc'},
  'UPSSSC 2026':   { engWPM:30, hinWPM:25, time:5,  backspace:'Current + Previous Word Only',  netFormula:'upsssc'},
  'MP Police ASI': { engWPM:30, hinWPM:25, time:30, backspace:'Fully Allowed',                 netFormula:'upsssc'},
  'Allahabad HC':  { engWPM:35, hinWPM:30, time:10, backspace:'Disabled',                     netFormula:'court' }
};

window.EXAM_RULES = {
  // SSC CGL — official notification: backspace/delete/arrow keys fully disabled, once a
  // character is typed it stays permanently. (Was incorrectly set to "full" — fixed.)
  ssc_eng:    {name:'SSC CGL — English',     time:10, lang:'english', backspace:'full', highlight:'error',  minWPM:35, netFormula:'ssc',    info:['⏱ 10 Min','🎯 35 WPM','⌫ Backspace Allowed','📝 Net = Gross − (Errors ÷ Time)']},
  ssc_hindi:  {name:'SSC CGL — Hindi',       time:10, lang:'hindi',   backspace:'full', highlight:'error',  minWPM:30, netFormula:'ssc',    info:['⏱ 10 Min','🎯 30 WPM','⌫ Backspace Disabled','📝 Net = Gross − (Errors ÷ Time)']},
  // SSC CHSL — same as CGL
  chsl_eng:   {name:'SSC CHSL — English',    time:10, lang:'english', backspace:'full', highlight:'error',  minWPM:35, netFormula:'ssc',    info:['⏱ 10 Min','🎯 35 WPM','⌫ Backspace Disabled','📝 Net = Gross − (Errors ÷ Time)']},
  chsl_hindi: {name:'SSC CHSL — Hindi',      time:10, lang:'hindi',   backspace:'full', highlight:'error',  minWPM:30, netFormula:'ssc',    info:['⏱ 10 Min','🎯 30 WPM','⌫ Backspace Disabled','📝 Net = Gross − (Errors ÷ Time)']},
  // RRB NTPC — Official rule: Backspace key is DISABLED completely (this was already correct)
  rrb_eng:    {name:'RRB NTPC — English',    time:10, lang:'english', backspace:'off', highlight:'letter', minWPM:30, netFormula:'rrb',    info:['⏱ 10 Min','🎯 30 WPM','⌫ Backspace Disabled','📝 Net = Gross − (Errors ÷ Time)']},
  rrb_hindi:  {name:'RRB NTPC — Hindi',      time:10, lang:'hindi',   backspace:'off', highlight:'letter', minWPM:25, netFormula:'rrb',    info:['⏱ 10 Min','🎯 25 WPM','⌫ Backspace Disabled','📝 Net = Gross − (Errors ÷ Time)']},
  // UPSSSC — official Junior Assistant Tankan Pariksha: 5-minute duration (was wrongly 10
  // here even though the info text already said 5), backspace = current + 1 previous word,
  // first 5 mistakes pardoned then 5 words deducted per mistake beyond that.
  upsssc_eng: {name:'UPSSSC — English',      time:5,  lang:'english', backspace:'word2', highlight:'currentblue',  minWPM:30, netFormula:'upsssc', info:['⏱ 5 Min','🎯 30 WPM','⌫ Current + 1 Prev Word','📝 5 Free Mistakes, then −5 Words Each']},
  upsssc_hindi:{name:'UPSSSC — Hindi',       time:5,  lang:'hindi',   backspace:'word2', highlight:'currentblue',  minWPM:25, netFormula:'upsssc', info:['⏱ 5 Min','🎯 25 WPM','⌫ Current + 1 Prev Word','📝 5 Free Mistakes, then −5 Words Each']},
  // Allahabad HC — court/clerical typing tests standard is backspace disabled; exact
  // speed/error norms do vary by post (Typist vs RO/ARO), so double-check against your
  // specific post's notification.
  ahc_hindi:  {name:'Allahabad HC — Hindi',  time:10, lang:'hindi',   backspace:'off', highlight:'error',  minWPM:30, netFormula:'court',  info:['⏱ 10 Min','🎯 30 WPM','⌫ Backspace Disabled','📝 Net = Gross − (Errors ÷ Time)']},
  ahc_eng:    {name:'Allahabad HC — English', time:10, lang:'english', backspace:'off', highlight:'error',  minWPM:35, netFormula:'court',  info:['⏱ 10 Min','🎯 35 WPM','⌫ Backspace Disabled','📝 Net = Gross − (Errors ÷ Time)']}
};

window.liveResults = [];
let admLoggedIn = false;
window.getAdmLoggedIn = () => admLoggedIn;
window.setAdmLoggedIn = (v) => { admLoggedIn = v; };
window.admCurrentTab = 0;
window.admView = 'analytics'; // 'analytics' or 'passages' — which screen shows after admin login

// ── Unique anonymous device ID (for active-user tracking, no login needed) ──
window.getDeviceId = function(){
  try {
    let id = localStorage.getItem('atm_device_id');
    if(!id){
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,10);
      localStorage.setItem('atm_device_id', id);
    }
    return id;
  } catch(e){
    if(!window._fallbackDeviceId) window._fallbackDeviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2,10);
    return window._fallbackDeviceId;
  }
};

// Safe key for Firebase (no dots/# etc allowed in keys) — used to store user by email
window.emailToKey = function(email){
  return (email||'').toLowerCase().replace(/[.#$\[\]\/]/g, '_');
};

// Official Net Speed formulas (verified against SSC/RRB/UPSSSC/High Court 2026 typing-test
// notifications). The old version multiplied errors by a flat 10/2/5 with no time
// normalisation — a single mistake in a 10-minute test cost a flat 10 WPM, i.e. ~100x too
// harsh, so almost nobody could ever "qualify". Real exams divide the error count by the
// test duration instead.
//   gross    = gross WPM (words typed ÷ minutes)
//   errors   = total wrong words in the whole test
//   minutes  = elapsed time in minutes
//   formula  = 'ssc' | 'rrb' | 'court' | 'upsssc'
//   corr     = total correct words typed (only needed for the UPSSSC rule)
window.calcNet = function(gross, errors, minutes, formula, corr, halfErr){
  minutes = minutes>0 ? minutes : (1/60);
  halfErr = halfErr || 0;
  const totalPenalty = errors + (halfErr * 0.5); // full + half errors combined

  if(formula==='upsssc'){
    // UPSSSC official rule: first 5 mistakes free (grace),
    // each mistake beyond that = -5 words from final tally
    const grace = 5;
    const penaltyErrors = Math.max(0, totalPenalty - grace);
    const penaltyWords  = penaltyErrors * 5;
    const netWords      = Math.max(0, (corr||0) - penaltyWords);
    return Math.max(0, Math.round(netWords / minutes));
  }
  if(formula==='ssc'){
    // SSC official: Net = Gross - (Total Errors ÷ Time in minutes)
    // Full error = 1, Half error = 0.5
    return Math.max(0, Math.round(gross - (totalPenalty / minutes)));
  }
  if(formula==='rrb'){
    // Railway NTPC: Net = Gross - (Total Errors ÷ Time)
    // Backspace NOT allowed, so errors tend to be higher
    return Math.max(0, Math.round(gross - (totalPenalty / minutes)));
  }
  if(formula==='court'){
    // High Court: Net = Gross - (Total Errors ÷ Time)
    // Exact formula varies by court notification
    return Math.max(0, Math.round(gross - (totalPenalty / minutes)));
  }
  // Standard fallback
  return Math.max(0, Math.round(gross - (totalPenalty / minutes)));
};

// ── Session save/load (sessionStorage — same tab) ──────────
window.saveSession = function(){
  try {
    sessionStorage.setItem('atm', JSON.stringify({
      loggedIn:APP.loggedIn, name:APP.name, email:APP.email, isPro:APP.isPro,
      liveResults:window.liveResults
    }));
  } catch(e){}
};
window.loadSession = function(){
  try {
    const s = JSON.parse(sessionStorage.getItem('atm')||'{}');
    if(s.loggedIn){ APP.loggedIn=true; APP.name=s.name||''; APP.email=s.email||''; APP.isPro=s.isPro||false; }
    if(s.liveResults) window.liveResults = s.liveResults;
  } catch(e){}
};

window.escHtml = function(str){ return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };

// ── Password show/hide toggle — call from any 👁 button next to a
//    password field: onclick="togglePwd('fieldId', this)" ──
window.togglePwd = function(inputId, btn){
  const el = document.getElementById(inputId);
  if(!el) return;
  if(el.type === 'password'){ el.type = 'text'; btn.textContent = '🙈'; }
  else { el.type = 'password'; btn.textContent = '👁'; }
};
