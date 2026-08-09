/* © 2026 Apna Typing Master Pro — All rights reserved. Unauthorized copying or redistribution of this source code is prohibited. */
/* ══════════════════════════════════════════════════════
   STENO VIDEOS + PDF ADMIN
   3 video categories (learnSteno, chapterExercise, speedBooster)
   + 1 PDF list. Admin pastes YouTube links (videos stay on
   YouTube — never uploaded here) and uploads actual PDF files
   (goes to Firebase Storage, same as Steno Audio). Every
   add/edit/delete saves straight to Firebase, so candidate.html
   picks it up live — no file editing or redeploying needed again.
══════════════════════════════════════════════════════ */

const STENO_VIDEO_CATEGORIES = ['learnSteno', 'chapterExercise', 'speedBooster'];
const STENO_VIDEO_LABELS = {
  learnSteno: 'Learn Steno',
  chapterExercise: 'Chapterwise Exercise',
  speedBooster: 'Speed Booster'
};

let stenoVideoData = {};      // {category: {pushKey: {title, youtubeId, createdAt}}}
let stenoFreeCountData = {};  // {category: number}
let stenoPdfData = {};        // {pushKey: {title, url, createdAt}}
let stenoVideoListening = false;
window.admStenoVideoCurrentTab = window.admStenoVideoCurrentTab || 'learnSteno';

window.showAdminStenoVideo = function(){
  window.admView = 'stenoVideo';
  document.getElementById('admAnalyticsView').style.display = 'none';
  document.getElementById('admPassagesView').style.display = 'none';
  const stenoView=document.getElementById('admStenoView'); if(stenoView) stenoView.style.display='none';
  document.getElementById('admStenoVideoView').style.display = 'block';
  document.getElementById('admNavAnalytics').classList.remove('active');
  document.getElementById('admNavPassages').classList.remove('active');
  const stenoNav=document.getElementById('admNavSteno'); if(stenoNav) stenoNav.classList.remove('active');
  document.getElementById('admNavStenoVideo').classList.add('active');

  if(!stenoVideoListening && typeof window.fbListenStenoVideos === 'function'){
    stenoVideoListening = true;
    window.fbListenStenoVideos((data)=>{
      stenoVideoData = data || {};
      if(window.admView === 'stenoVideo') renderStenoVideoTab(window.admStenoVideoCurrentTab);
    });
    window.fbListenStenoFreeCount((data)=>{
      stenoFreeCountData = data || {};
      if(window.admView === 'stenoVideo') renderStenoVideoTab(window.admStenoVideoCurrentTab);
    });
    window.fbListenStenoPdfs((data)=>{
      stenoPdfData = data || {};
      if(window.admView === 'stenoVideo') renderStenoVideoTab(window.admStenoVideoCurrentTab);
    });
  } else {
    renderStenoVideoTab(window.admStenoVideoCurrentTab);
  }
};

window.switchStenoVideoTab = function(tab){
  window.admStenoVideoCurrentTab = tab;
  const order = [...STENO_VIDEO_CATEGORIES, 'pdf'];
  document.querySelectorAll('#admStenoVideoView .adm-tab').forEach((btn, i)=>{
    btn.classList.toggle('active', order[i] === tab);
  });
  renderStenoVideoTab(tab);
};

function stenoVideoEntries(category){
  const obj = stenoVideoData[category] || {};
  return Object.keys(obj).map(key => ({ key, ...obj[key] })).sort((a,b)=> (a.createdAt||0)-(b.createdAt||0));
}
function stenoPdfEntries(){
  return Object.keys(stenoPdfData).map(key => ({ key, ...stenoPdfData[key] })).sort((a,b)=> (a.createdAt||0)-(b.createdAt||0));
}

function renderStenoVideoTab(tab){
  const container = document.getElementById('admStenoVideoContent');
  if(!container) return;
  if(tab === 'pdf'){ renderStenoPdfSection(container); return; }
  renderStenoVideoSection(container, tab);
}

function renderStenoVideoSection(container, category){
  const entries = stenoVideoEntries(category);
  const freeCount = stenoFreeCountData[category] != null ? stenoFreeCountData[category] : 0;

  const addHtml = `
    <div class="adm-add-card">
      <div class="adm-add-card-title">➕ Naya Video Add Karein &nbsp; <span class="adm-free-badge">${STENO_VIDEO_LABELS[category]}</span></div>
      <div class="steno-adm-new-row">
        <input type="text" id="svNewTitle" class="steno-adm-title" placeholder="Video ka naam — जैसे: Steno Basics — Introduction">
        <input type="text" id="svNewYtLink" class="steno-adm-title" placeholder="YouTube link ya video ID paste karein (Unlisted hona chahiye)">
      </div>
      <div class="adm-textarea-meta">
        <span class="adm-char-info"></span>
        <button class="adm-add-btn" onclick="admAddStenoVideo('${category}')">+ Add Video</button>
      </div>
      <div style="margin-top:6px;font-size:11px;color:#6b6b8a;">ℹ️ Video YouTube par "Unlisted" honi chahiye (poori tarah "Private" nahi), warna kisi aur ko dikhegi nahi.</div>
      <div id="svAddStatus" style="margin-top:8px;font-size:12px;color:#f0a500;"></div>
    </div>

    <div class="adm-add-card" style="margin-top:14px;">
      <div class="adm-add-card-title">🆓 Free Videos Kitni? &nbsp; <span class="adm-free-badge">${STENO_VIDEO_LABELS[category]}</span></div>
      <div style="font-size:12px;color:#6b6b8a;margin-bottom:8px;">Shuru ki itni videos sabko free dikhengi (login-required, Pro nahi chahiye). Isse aage ki videos apne aap 🔒 PRO-locked ho jaayengi.</div>
      <div class="steno-adm-new-row">
        <input type="number" id="svFreeCount" min="0" value="${freeCount}" style="max-width:120px;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);">
        <button class="adm-add-btn" onclick="admSaveStenoFreeCount('${category}')">💾 Free Count Save Karein</button>
      </div>
    </div>
  `;

  let listHtml = '<div class="adm-passage-list">';
  if(entries.length === 0){
    listHtml += `<div class="adm-empty"><div class="adm-empty-icon">📭</div><div>Koi video nahi hai.<br>Upar se add karein.</div></div>`;
  } else {
    entries.forEach((entry, i)=>{
      const locked = i >= freeCount;
      listHtml += `<div class="adm-p-card is-normal" id="svCard_${entry.key}">
        <div class="adm-p-head">
          <div class="adm-p-meta">
            <span class="adm-p-num">#${i+1}</span>
            <span class="adm-tag ${locked?'adm-tag-num':'adm-tag-eng'}">${locked?'🔒 PRO':'🆓 FREE'}</span>
            <span class="adm-p-words">${entry.youtubeId ? '✅ Link set hai' : '⚠️ Link khaali hai'}</span>
          </div>
          <div class="adm-p-actions">
            <button class="adm-btn-sm adm-btn-edit" onclick="admEditStenoVideo('${category}','${entry.key}')">✏️ Edit</button>
            <button class="adm-btn-sm adm-btn-del" onclick="admDeleteStenoVideo('${category}','${entry.key}')">🗑️ Delete</button>
          </div>
        </div>
        <div class="adm-p-body" id="svBody_${entry.key}">
          <div style="font-size:13px;color:#e8e8f0;margin-bottom:4px;">${escStenoVidHtml(entry.title||'(बिना नाम)')}</div>
          <div style="font-size:11px;color:#6b6b8a;word-break:break-all;">${entry.youtubeId ? escStenoVidHtml(entry.youtubeId) : '(link nahi diya gaya)'}</div>
        </div>
      </div>`;
    });
  }
  listHtml += '</div>';

  container.innerHTML = `
    <div class="adm-section-head">
      <div class="adm-section-title">
        🎬 ${STENO_VIDEO_LABELS[category]} Videos
        <span class="adm-count-badge">${entries.length} videos · ${freeCount} free</span>
      </div>
    </div>
    ${addHtml}
    <div style="font-size:13px;font-weight:700;color:#e8e8f0;margin:20px 0 12px;">
      Existing Videos <span class="adm-count-badge">${entries.length}</span>
    </div>
    ${listHtml}
  `;
}

function renderStenoPdfSection(container){
  const entries = stenoPdfEntries();
  const addHtml = `
    <div class="adm-add-card">
      <div class="adm-add-card-title">➕ Naya PDF Add Karein</div>
      <div class="steno-adm-new-row">
        <input type="text" id="pdfNewTitle" class="steno-adm-title" placeholder="PDF ka naam — जैसे: Steno Chapter 1 Notes">
        <input type="file" id="pdfNewFile" accept="application/pdf" class="steno-adm-file">
      </div>
      <div class="adm-textarea-meta">
        <span class="adm-char-info"></span>
        <button class="adm-add-btn" id="pdfAddBtn" onclick="admAddStenoPdf()">+ Upload PDF</button>
      </div>
      <div id="pdfAddStatus" style="margin-top:8px;font-size:12px;color:#f0a500;"></div>
    </div>
  `;

  let listHtml = '<div class="adm-passage-list">';
  if(entries.length === 0){
    listHtml += `<div class="adm-empty"><div class="adm-empty-icon">📭</div><div>Koi PDF nahi hai.<br>Upar se upload karein.</div></div>`;
  } else {
    entries.forEach((entry, i)=>{
      listHtml += `<div class="adm-p-card is-normal">
        <div class="adm-p-head">
          <div class="adm-p-meta">
            <span class="adm-p-num">#${i+1}</span>
            <span class="adm-tag adm-tag-eng">📄 PDF</span>
          </div>
          <div class="adm-p-actions">
            <a class="adm-btn-sm adm-btn-edit" href="${entry.url}" target="_blank" style="text-decoration:none;display:inline-block;">👁 View</a>
            <button class="adm-btn-sm adm-btn-del" onclick="admDeleteStenoPdf('${entry.key}','${(entry.url||'').replace(/'/g,"\\'")}')">🗑️ Delete</button>
          </div>
        </div>
        <div class="adm-p-body">
          <div style="font-size:13px;color:#e8e8f0;">${escStenoVidHtml(entry.title||'(बिना नाम)')}</div>
        </div>
      </div>`;
    });
  }
  listHtml += '</div>';

  container.innerHTML = `
    <div class="adm-section-head">
      <div class="adm-section-title">📄 Steno PDFs <span class="adm-count-badge">${entries.length} PDFs</span></div>
    </div>
    ${addHtml}
    <div style="font-size:13px;font-weight:700;color:#e8e8f0;margin:20px 0 12px;">
      Existing PDFs <span class="adm-count-badge">${entries.length}</span>
    </div>
    ${listHtml}
  `;
}

function escStenoVidHtml(s){
  const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
}

window.admAddStenoVideo = async function(category){
  const titleInput = document.getElementById('svNewTitle');
  const linkInput = document.getElementById('svNewYtLink');
  const statusEl = document.getElementById('svAddStatus');
  const title = titleInput.value.trim();
  const link = linkInput.value.trim();
  if(!title){ if(typeof window.showAdmToast==='function') window.showAdmToast('❌ Video ka naam likhein!', 'error'); return; }
  statusEl.textContent = 'Save ho raha hai...';
  try {
    await window.fbAddStenoVideo(category, title, link);
    titleInput.value = ''; linkInput.value = '';
    statusEl.textContent = '';
    if(typeof window.showAdmToast === 'function') window.showAdmToast('✅ Video add ho gaya!');
  } catch(err){
    statusEl.textContent = '❌ ' + err.message;
    if(typeof window.showAdmToast === 'function') window.showAdmToast('❌ Fail: ' + err.message, 'error');
  }
};

window.admEditStenoVideo = function(category, key){
  const entry = (stenoVideoData[category] || {})[key];
  if(!entry) return;
  const body = document.getElementById('svBody_'+key);
  if(!body) return;
  body.innerHTML = `
    <div class="steno-adm-new-row">
      <input type="text" id="svEditTitle_${key}" class="steno-adm-title" value="${escStenoVidHtml(entry.title||'')}">
      <input type="text" id="svEditLink_${key}" class="steno-adm-title" value="${escStenoVidHtml(entry.youtubeId||'')}">
    </div>
    <div class="adm-textarea-meta" style="margin-top:8px;">
      <span></span>
      <button class="adm-add-btn" onclick="admSaveStenoVideoEdit('${category}','${key}')">💾 Save</button>
    </div>
  `;
};

window.admSaveStenoVideoEdit = async function(category, key){
  const title = document.getElementById('svEditTitle_'+key).value.trim();
  const link = document.getElementById('svEditLink_'+key).value.trim();
  try {
    await window.fbUpdateStenoVideo(category, key, title, link);
    if(typeof window.showAdmToast === 'function') window.showAdmToast('✅ Video update ho gaya!');
  } catch(err){
    if(typeof window.showAdmToast === 'function') window.showAdmToast('❌ Fail: ' + err.message, 'error');
  }
};

window.admDeleteStenoVideo = async function(category, key){
  if(!confirm('Ye video delete karein?')) return;
  try {
    await window.fbDeleteStenoVideo(category, key);
    if(typeof window.showAdmToast === 'function') window.showAdmToast('🗑️ Video delete ho gaya.');
  } catch(err){
    if(typeof window.showAdmToast === 'function') window.showAdmToast('❌ Fail: ' + err.message, 'error');
  }
};

window.admSaveStenoFreeCount = async function(category){
  const val = document.getElementById('svFreeCount').value;
  try {
    await window.fbSetStenoFreeCount(category, val);
    if(typeof window.showAdmToast === 'function') window.showAdmToast('✅ Free count save ho gaya!');
  } catch(err){
    if(typeof window.showAdmToast === 'function') window.showAdmToast('❌ Fail: ' + err.message, 'error');
  }
};

window.admAddStenoPdf = async function(){
  const titleInput = document.getElementById('pdfNewTitle');
  const fileInput = document.getElementById('pdfNewFile');
  const statusEl = document.getElementById('pdfAddStatus');
  const btn = document.getElementById('pdfAddBtn');
  const title = titleInput.value.trim();
  const file = fileInput.files[0];
  if(!file){ if(typeof window.showAdmToast==='function') window.showAdmToast('❌ Pehle PDF file choose karein!', 'error'); return; }
  if(!title){ if(typeof window.showAdmToast==='function') window.showAdmToast('❌ PDF ka naam likhein!', 'error'); return; }

  btn.disabled = true;
  statusEl.style.color = '#f0a500';
  statusEl.textContent = 'Upload shuru ho raha hai...';
  try {
    await window.fbAddStenoPdf(file, title, (pct)=>{
      statusEl.textContent = `Upload ho raha hai... ${pct}%`;
    });
    titleInput.value = ''; fileInput.value = '';
    statusEl.textContent = '';
    btn.disabled = false;
    if(typeof window.showAdmToast === 'function') window.showAdmToast('✅ PDF add ho gaya!');
  } catch(err){
    btn.disabled = false;
    statusEl.style.color = '#ff5555';
    statusEl.textContent = '❌ ' + err.message;
    if(typeof window.showAdmToast === 'function') window.showAdmToast('❌ Upload fail: ' + err.message, 'error');
  }
};

window.admDeleteStenoPdf = async function(key, url){
  if(!confirm('Ye PDF delete karein?')) return;
  try {
    await window.fbDeleteStenoPdf(key, url);
    if(typeof window.showAdmToast === 'function') window.showAdmToast('🗑️ PDF delete ho gaya.');
  } catch(err){
    if(typeof window.showAdmToast === 'function') window.showAdmToast('❌ Fail: ' + err.message, 'error');
  }
};
