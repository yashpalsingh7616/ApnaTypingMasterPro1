/* © 2026 Apna Typing Master Pro — All rights reserved. Unauthorized copying or redistribution of this source code is prohibited. */
/* ══════════════════════════════════════════════════════
   STENO DICTATION AUDIO ADMIN
   4 categories: hi-80, hi-100, en-80, en-100 — admin keeps adding
   audio+text pairs (no fixed limit), exactly like the Normal Passages
   admin flow. Every add/edit/delete is saved straight to Firebase
   (Storage for the audio file, Realtime DB for the matching text),
   so every visitor sees the same content immediately.
══════════════════════════════════════════════════════ */

const STENO_CATEGORIES = ['hi-80', 'hi-100', 'en-80', 'en-100'];
const STENO_CATEGORY_LABELS = {
  'hi-80': 'Hindi · 80 WPM',
  'hi-100': 'Hindi · 100 WPM',
  'en-80': 'English · 80 WPM',
  'en-100': 'English · 100 WPM'
};

let stenoAdminData = {};        // full snapshot from Firebase: {category: {pushKey: {title,text,audioURL}}}
let stenoListening = false;
window.admStenoCurrentCategory = window.admStenoCurrentCategory || 'hi-80';

window.showAdminSteno = function(){
  window.admView = 'steno';
  document.getElementById('admAnalyticsView').style.display = 'none';
  document.getElementById('admPassagesView').style.display = 'none';
  const stenoVideoView=document.getElementById('admStenoVideoView'); if(stenoVideoView) stenoVideoView.style.display='none';
  document.getElementById('admStenoView').style.display = 'block';
  document.getElementById('admNavAnalytics').classList.remove('active');
  document.getElementById('admNavPassages').classList.remove('active');
  document.getElementById('admNavSteno').classList.add('active');
  const stenoVideoNav=document.getElementById('admNavStenoVideo'); if(stenoVideoNav) stenoVideoNav.classList.remove('active');

  if(!stenoListening && typeof window.fbListenStenoPassages === 'function'){
    stenoListening = true;
    window.fbListenStenoPassages((data)=>{
      stenoAdminData = data || {};
      if(window.admView === 'steno') renderStenoTab(window.admStenoCurrentCategory);
    });
  } else {
    renderStenoTab(window.admStenoCurrentCategory);
  }
};

window.switchStenoTab = function(category){
  window.admStenoCurrentCategory = category;
  document.querySelectorAll('#admStenoView .adm-tab').forEach((btn, i)=>{
    btn.classList.toggle('active', STENO_CATEGORIES[i] === category);
  });
  renderStenoTab(category);
};

function categoryEntries(category){
  const obj = stenoAdminData[category] || {};
  return Object.keys(obj)
    .map(key => ({ key, ...obj[key] }))
    .sort((a,b)=> (a.createdAt||0) - (b.createdAt||0));
}

function renderStenoTab(category){
  const container = document.getElementById('admStenoContent');
  if(!container) return;
  const entries = categoryEntries(category);
  const isHindi = category.startsWith('hi-');

  let addHtml = `
    <div class="adm-add-card">
      <div class="adm-add-card-title">➕ Naya Audio + Matching Text Add Karein &nbsp; <span class="adm-free-badge">${STENO_CATEGORY_LABELS[category]}</span></div>
      <div class="steno-adm-new-row">
        <input type="text" id="stenoNewTitle" class="steno-adm-title" placeholder="Naam (optional) — जैसे: पत्र 1 — कार्यालय सूचना">
        <input type="file" id="stenoNewFile" accept="audio/*" class="steno-adm-file">
      </div>
      <textarea id="stenoNewText" class="adm-textarea ${isHindi?'hindi':''}" oninput="updateStenoCharCount()"
        placeholder="${isHindi?'ऑडियो में जो बोला गया है, वही text यहाँ लिखें...':'Type exactly what is spoken in the audio...'}"></textarea>
      <div class="adm-textarea-meta">
        <span class="adm-char-info" id="stenoCharInfo">0 characters · 0 words</span>
        <button class="adm-add-btn" id="stenoAddBtn" onclick="admAddStenoPassage()">+ Add Passage</button>
      </div>
      <div style="margin-top:6px;font-size:11px;color:#6b6b8a;">ℹ️ Audio file zaroori hai — text bina audio ke save nahi hota, taaki result hamesha sahi text se milaan kare.</div>
      <div id="stenoAddStatus" style="margin-top:8px;font-size:12px;color:#f0a500;"></div>
    </div>
  `;

  let listHtml = '<div class="adm-passage-list">';
  if(entries.length === 0){
    listHtml += `<div class="adm-empty"><div class="adm-empty-icon">📭</div><div>Koi audio passage nahi hai.<br>Upar se add karein.</div></div>`;
  } else {
    entries.forEach((entry, i)=>{
      const words = (entry.text || '').trim().split(/\s+/).filter(Boolean).length;
      listHtml += `<div class="adm-p-card is-normal" id="stenoCard_${entry.key}">
        <div class="adm-p-head">
          <div class="adm-p-meta">
            <span class="adm-p-num">#${i+1}</span>
            <span class="adm-tag ${isHindi?'adm-tag-hindi':'adm-tag-eng'}">${isHindi?'हिंदी':'ENGLISH'}</span>
            <span class="adm-p-words">${words} words · ${(entry.text||'').length} chars</span>
          </div>
          <div class="adm-p-actions">
            <button class="adm-btn-sm adm-btn-edit" onclick="stenoPreview('${category}','${entry.key}')">▶ Preview</button>
            <label class="adm-btn-sm adm-btn-up" style="cursor:pointer;">
              🔁 Replace Audio<input type="file" accept="audio/*" style="display:none;" onchange="stenoReplaceAudio('${category}','${entry.key}',this)">
            </label>
            <button class="adm-btn-sm adm-btn-edit" onclick="stenoEditPassage('${category}','${entry.key}')">✏️ Edit Text</button>
            <button class="adm-btn-sm adm-btn-del" onclick="stenoDeletePassage('${category}','${entry.key}','${(entry.audioURL||'').replace(/'/g,"\\'")}')">🗑️ Delete</button>
          </div>
        </div>
        <div class="adm-p-body">
          <div style="font-size:12px;color:#f0a500;margin-bottom:6px;">${entry.title ? escStenoHtml(entry.title) : '<span style="color:#6b6b8a;">(बिना नाम)</span>'}</div>
          <div class="adm-p-text ${isHindi?'hindi':''}" id="stenoText_${entry.key}">${escStenoHtml(entry.text || '')}</div>
        </div>
      </div>`;
    });
  }
  listHtml += '</div>';

  container.innerHTML = `
    <div class="adm-section-head">
      <div class="adm-section-title">
        🎙 ${STENO_CATEGORY_LABELS[category]} Dictation Passages
        <span class="adm-count-badge">${entries.length} passages</span>
      </div>
    </div>
    ${addHtml}
    <div style="font-size:13px;font-weight:700;color:#e8e8f0;margin:20px 0 12px;">
      Existing Passages <span class="adm-count-badge">${entries.length}</span>
    </div>
    ${listHtml}
  `;
}

window.updateStenoCharCount = function(){
  const ta = document.getElementById('stenoNewText');
  const info = document.getElementById('stenoCharInfo');
  if(!ta || !info) return;
  const v = ta.value;
  info.textContent = v.length + ' characters · ' + v.trim().split(/\s+/).filter(Boolean).length + ' words';
};

window.admAddStenoPassage = async function(){
  const category = window.admStenoCurrentCategory;
  const titleInput = document.getElementById('stenoNewTitle');
  const fileInput = document.getElementById('stenoNewFile');
  const textArea = document.getElementById('stenoNewText');
  const statusEl = document.getElementById('stenoAddStatus');
  const btn = document.getElementById('stenoAddBtn');

  const text = textArea.value.trim();
  const file = fileInput.files[0];

  if(!file){ if(typeof window.showAdmToast==='function') window.showAdmToast('❌ Pehle audio file choose karein!', 'error'); return; }
  if(!text || text.length < 10){ if(typeof window.showAdmToast==='function') window.showAdmToast('❌ Text bahut chhota hai! Kam se kam 10 characters likhein.', 'error'); return; }

  btn.disabled = true;
  statusEl.style.color = '#f0a500';
  statusEl.textContent = 'Upload shuru ho raha hai...';
  try {
    await window.fbAddStenoPassage(category, file, text, titleInput.value.trim(), (pct)=>{
      statusEl.textContent = `Upload ho raha hai... ${pct}%`;
    });
    titleInput.value = '';
    fileInput.value = '';
    textArea.value = '';
    updateStenoCharCount();
    statusEl.textContent = '';
    btn.disabled = false;
    if(typeof window.showAdmToast === 'function') window.showAdmToast('✅ Passage add ho gaya!');
  } catch(err){
    btn.disabled = false;
    statusEl.style.color = '#ff5555';
    statusEl.textContent = '❌ ' + err.message;
    if(typeof window.showAdmToast === 'function') window.showAdmToast('❌ Upload fail: ' + err.message, 'error');
  }
};

window.stenoPreview = function(category, key){
  const entry = (stenoAdminData[category] || {})[key];
  if(!entry || !entry.audioURL){ alert('Audio nahi mili.'); return; }
  new Audio(entry.audioURL).play();
};

window.stenoReplaceAudio = async function(category, key, inputEl){
  const file = inputEl.files[0];
  if(!file) return;
  if(typeof window.showAdmToast === 'function') window.showAdmToast('⏳ Naya audio upload ho raha hai... 0%');
  try {
    await window.fbReplaceStenoAudio(category, key, file, (pct)=>{
      if(typeof window.showAdmToast === 'function') window.showAdmToast(`⏳ Upload ho raha hai... ${pct}%`);
    });
    if(typeof window.showAdmToast === 'function') window.showAdmToast('✅ Audio replace ho gaya!');
  } catch(err){
    if(typeof window.showAdmToast === 'function') window.showAdmToast('❌ Fail: ' + err.message, 'error');
  }
};

window.stenoEditPassage = function(category, key){
  const entry = (stenoAdminData[category] || {})[key];
  if(!entry) return;
  const bodyEl = document.getElementById('stenoText_' + key);
  if(!bodyEl) return;
  const isHindi = category.startsWith('hi-');
  bodyEl.outerHTML = `
    <div id="stenoText_${key}">
      <input type="text" id="stenoEditTitle_${key}" class="steno-adm-title" style="margin-bottom:8px;" value="${escStenoAttr(entry.title||'')}" placeholder="Naam (optional)">
      <textarea class="adm-edit-area ${isHindi?'hindi':''}" id="stenoEditTa_${key}">${entry.text||''}</textarea>
      <div class="adm-edit-actions">
        <button class="adm-btn-save" onclick="stenoSaveEdit('${category}','${key}')">💾 Save</button>
        <button class="adm-btn-cancel" onclick="renderStenoTab('${category}')">Cancel</button>
      </div>
    </div>`;
};

window.stenoSaveEdit = async function(category, key){
  const ta = document.getElementById('stenoEditTa_' + key);
  const titleInput = document.getElementById('stenoEditTitle_' + key);
  if(!ta) return;
  const text = ta.value.trim();
  if(!text || text.length < 10){ if(typeof window.showAdmToast==='function') window.showAdmToast('❌ Text bahut chhota hai!', 'error'); return; }
  try {
    await window.fbUpdateStenoPassageText(category, key, titleInput.value.trim(), text);
    if(typeof window.showAdmToast === 'function') window.showAdmToast('✅ Passage update ho gaya!');
  } catch(err){
    if(typeof window.showAdmToast === 'function') window.showAdmToast('❌ Save fail: ' + err.message, 'error');
  }
};

window.stenoDeletePassage = async function(category, key, audioURL){
  if(!confirm('Is passage (audio + text) ko delete karein?')) return;
  try {
    await window.fbDeleteStenoPassage(category, key, audioURL);
    if(typeof window.showAdmToast === 'function') window.showAdmToast('🗑️ Passage delete ho gaya!');
  } catch(err){
    if(typeof window.showAdmToast === 'function') window.showAdmToast('❌ Delete fail: ' + err.message, 'error');
  }
};

function escStenoHtml(str){
  return String(str).replace(/[&<>]/g, c=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
}
function escStenoAttr(str){
  return String(str).replace(/"/g, '&quot;');
}
