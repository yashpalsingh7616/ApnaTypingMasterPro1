/**
 * anti-copy.js — casual copy-paste deterrents.
 *
 * ⚠️ HONEST NOTE: none of this actually stops a technically capable person.
 * Browser dev tools can always be reopened (undocked window, browser
 * extensions, mobile remote debugging, curl/view-source, etc). This only
 * adds friction for a casual visitor trying to right-click → View Source or
 * Ctrl+U out of curiosity. Real protection against backend abuse comes from
 * Firebase App Check + Database/Storage rules + API key domain restriction
 * (see firebase-config.js) — this file is just a small extra speed bump.
 *
 * Do NOT include this on admin.html — the admin needs real dev tools access.
 */
(function(){
  document.addEventListener('contextmenu', function(e){ e.preventDefault(); });

  document.addEventListener('keydown', function(e){
    const k = e.key;
    const blocked =
      k === 'F12' ||
      (e.ctrlKey && e.shiftKey && (k === 'I' || k === 'i' || k === 'J' || k === 'j' || k === 'C' || k === 'c')) ||
      (e.ctrlKey && (k === 'U' || k === 'u' || k === 'S' || k === 's'));
    if(blocked) e.preventDefault();
  });

  console.log('%c⛔ Ruk jaaiye!', 'color:#e74c3c;font-size:24px;font-weight:bold;');
  console.log('%cYe browser feature developers ke liye hai. Is website ka code copy karke istemal karna copyright violation hai.', 'font-size:14px;');
  console.log('%c© Apna Typing Master Pro — Sabhi adhikar surakshit.', 'color:#888;font-size:12px;');
})();
