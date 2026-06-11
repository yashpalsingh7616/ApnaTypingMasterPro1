// ============================================================================
// FIREBASE ENGINE INITIALIZATION (कंसोल की लाइव क्रेडेंशियल्स यहाँ अपडेट करें)
// ============================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAnW7etN6Z3VTjot5KjpmG6JeDlkOBJbE4",
  authDomain: "apna-typing-master-pro.firebaseapp.com",
  projectId: "apna-typing-master-pro",
  storageBucket: "apna-typing-master-pro.firebasestorage.app",
  messagingSenderId: "256116678227",
  appId: "1:256116678227:web:544898c8211226c69370a6",
  measurementId: "G-DR7LY8Z642"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// डिफ़ॉल्ट लोकल फॉलबैक पैसेज लाइब्रेरी (L)
let L = [
    { c: "Welcome to Apna Typing Master Pro. Connect your cloud console database to stream live mock examinations synchronously right here." }
];

let ci = 0;
let tt = "";
let st = null;
let ti = null;
let mis = 0;
let baseTimeLimit = 60; // सेकंड्स में

// DOM नोड्स की उपलब्धता चेक करना
const tdNode = document.getElementById("td");
const itNode = document.getElementById("it");

// ============================================================================
// CONFIGURATION RESOLVER (डैशबोर्ड सेटिंग्स लोड करना)
// ============================================================================
function initConfig() {
    if (!tdNode) return;

    const savedLang = localStorage.getItem('cfg_lang') || 'english';
    const savedTime = parseInt(localStorage.getItem('cfg_time')) || 60;
    const isLive = localStorage.getItem('cfg_isLive') === 'true';
    
    baseTimeLimit = savedTime;
    
    // लाइव क्लाउड या पूल से डेटा फ़ेच करने का सिंक ट्रिगर
    onValue(ref(db, `paragraphLibrary/${savedLang}`), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            L = Object.values(data).map(text => ({ c: text }));
            ci = Math.floor(Math.random() * L.length);
        }
        render();
    });
}

// ============================================================================
// TYPING REALTIME ENGINE LAW (मूल रेंडरर और इवैल्यूएटर)
// ============================================================================
function render() {
    if (!tdNode) return;
    const p = L[ci].c;
    let h = "";
    for (let i = 0; i < p.length; i++) {
        const c = p[i];
        if (i < tt.length) {
            h += tt[i] === c ? "<span class='cc'>" + c + "</span>" : "<span class='cw'>" + c + "</span>";
        } else if (i === tt.length) {
            h += "<span class='cur'>" + c + "</span>";
        } else {
            h += "<span>" + c + "</span>";
        }
    }
    tdNode.innerHTML = h;
}

if (itNode) {
    // बैकस्पेस लॉक फीचर का इंप्लीमेंटेशन
    itNode.addEventListener('keydown', (e) => {
        const backspaceLock = localStorage.getItem('cfg_back') === 'disabled';
        if (e.key === 'Backspace' && backspaceLock) {
            e.preventDefault();
        }
    });

    itNode.addEventListener("input", e => {
        tt = e.target.value;
        
        if (!st) {
            st = Date.now();
            ti = setInterval(() => {
                let elapsed = (Date.now() - st) / 1000;
                let remaining = baseTimeLimit - elapsed;
                
                if (remaining <= 0) {
                    clearInterval(ti);
                    remaining = 0;
                    itNode.disabled = true;
                    showFinalScorecard();
                }

                let m = Math.floor(remaining / 60);
                let sec = Math.floor(remaining % 60);
                document.getElementById("tmr").innerText = (m < 10 ? "0" + m : m) + ":" + (sec < 10 ? "0" + sec : sec);
                
                let w = Math.round((tt.length / 5) / (elapsed / 60));
                document.getElementById("wpm").innerText = w > 0 ? w : 0;
            }, 1000);
        }

        const p = L[ci].c;
        if (tt.length > 0 && tt[tt.length - 1] !== p[tt.length - 1]) {
            mis++;
            document.getElementById("mis").innerText = mis;
        }

        render();
        
        if (tt.length >= p.length) {
            clearInterval(ti);
            itNode.disabled = true;
            showFinalScorecard();
        }
    });
}

function showFinalScorecard() {
    const elapsedMin = baseTimeLimit / 60;
    const grossWpm = Math.round((tt.length / 5) / elapsedMin);
    const netWpm = Math.max(0, grossWpm - (mis / elapsedMin));
    const acc = tt.length > 0 ? Math.max(0, Math.round((tt.length - mis) / tt.length * 100)) : 100;

    document.getElementById('res-gross').innerText = grossWpm + " WPM";
    document.getElementById('res-net').innerText = Math.round(netWpm) + " WPM";
    document.getElementById('res-acc').innerText = acc + "%";
    document.getElementById('res-errors').innerText = mis;
    
    document.getElementById('result-modal').style.display = 'flex';
}

// ============================================================================
// ADMIN CONSOLE ACTION HOOK
// ============================================================================
const btnAdminSave = document.getElementById('btn-admin-save');
if (btnAdminSave) {
    btnAdminSave.addEventListener('click', () => {
        const lang = document.getElementById('ad-lang').value;
        const text = document.getElementById('ad-text').value.trim();
        const timestamp = Date.now();

        if (!text) {
            alert("कृपया पहले पैसेज का टेक्स्ट बॉक्स भरें!");
            return;
        }

        set(ref(db, `paragraphLibrary/${lang}/p_${timestamp}`), text)
            .then(() => {
                alert("सफलतापूर्वक! नया पैसेज क्लाउड डेटाबेस में सुरक्षित पुश कर दिया गया है।");
                document.getElementById('ad-text').value = "";
            }).catch(err => alert("त्रुटि: " + err.message));
    });
}

// ट्रिगर ऑनलोड
window.addEventListener('DOMContentLoaded', () => {
    initConfig();
});
