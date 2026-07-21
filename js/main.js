// ===== Auto-resize + sync heights =====
const MIN_BOX_H = 90;

function syncBoxHeights() {
  const inputTA  = document.getElementById('inputWord');
  const outputTA = document.getElementById('outputWord');
  if (!inputTA || !outputTA) return;

  if (window.innerWidth > 900) {
    inputTA.style.height  = 'auto';
    outputTA.style.height = 'auto';
    const shared = Math.max(inputTA.scrollHeight, outputTA.scrollHeight, MIN_BOX_H);
    inputTA.style.height  = shared + 'px';
    outputTA.style.height = shared + 'px';
  } else {
    inputTA.style.height  = 'auto';
    inputTA.style.height  = Math.max(inputTA.scrollHeight, MIN_BOX_H) + 'px';
    outputTA.style.height = 'auto';
    outputTA.style.height = Math.max(outputTA.scrollHeight, MIN_BOX_H) + 'px';
  }
}

function autoResize() {
  syncBoxHeights();
}

window.addEventListener('resize', syncBoxHeights);
window.addEventListener('load', syncBoxHeights);

// ===== TTS =====
let activeSpeakBtn = null;

function toggleSpeak(textareaId, btnId) {
  const btn = document.getElementById(btnId);
  if (btn.classList.contains('playing')) {
    stopSpeak();
    return;
  }
  stopSpeak();
  const text = document.getElementById(textareaId).value.trim();
  if (!text) return;
  speakText(text, btn);
}

function stopSpeak() {
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (activeSpeakBtn) {
    activeSpeakBtn.classList.remove('playing');
    activeSpeakBtn.textContent = '🔊';
    activeSpeakBtn = null;
  }
}

function setBtnPlaying(b) {
  if (!b) return;
  b.classList.add('playing');
  b.textContent = '⏹️';
  activeSpeakBtn = b;
}

function resetBtn(b) {
  if (!b) return;
  b.classList.remove('playing');
  b.textContent = '🔊';
  if (activeSpeakBtn === b) activeSpeakBtn = null;
}

function speakText(text, btn) {
  if (!text) return;
  if (!window.speechSynthesis) {
    alert("متصفحك لا يدعم النطق.");
    return;
  }

  const isArabic = /[\u0600-\u06FF]/.test(text);
  const lang = isArabic ? 'ar-SA' : 'en-US';

  const speak = () => {
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang   = lang;
    utterance.rate   = 0.9;
    utterance.pitch  = 1;
    utterance.volume = 1;

    setBtnPlaying(btn);

    utterance.onstart = () => setBtnPlaying(btn);
    utterance.onend   = () => resetBtn(btn);
    utterance.onerror = (e) => {
      resetBtn(btn);
      console.warn("Speech error:", e.error);
    };

    speechSynthesis.speak(utterance);
  };

  setTimeout(speak, 50);
}

// ===== Copy =====
async function copyText(e, textToCopy) {
  e.stopPropagation();
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(textToCopy);
      showCopyFeedback(e.currentTarget);
    } catch (err) {
      if (document.execCommand) fallbackCopy(textToCopy, e.currentTarget);
      else alert('النسخ فشل. متصفحك لا يدعم واجهات النسخ المتقدمة.');
    }
  } else if (document.execCommand) {
    fallbackCopy(textToCopy, e.currentTarget);
  } else {
    alert('النسخ فشل. لا يتوفر دعم للحافظة.');
  }
}

function fallbackCopy(text, button) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showCopyFeedback(button);
  } catch (err) {
    console.error('Fallback copy failed:', err);
  } finally {
    document.body.removeChild(textarea);
  }
}

function showCopyFeedback(button) {
  const originalText = button.textContent;
  button.textContent = '✅';
  setTimeout(() => { button.textContent = originalText; }, 1500);
}

// ===== Sessions & Data =====
const DEFAULT_SESSION_NAME = "جلسة العمل الحالية";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let debounceTimer;
let sessions = {};

try {
  sessions = JSON.parse(localStorage.getItem("sessions") || "{}");
} catch (e) {
  console.error("خطأ في قراءة الجلسات من localStorage:", e);
  sessions = {};
}

if (Object.keys(sessions).length === 0) {
  sessions[DEFAULT_SESSION_NAME] = [];
}

let current = localStorage.getItem("currentSession") || DEFAULT_SESSION_NAME;
if (!sessions[current]) current = DEFAULT_SESSION_NAME;

let dragSrcIndex = null;

document.addEventListener("DOMContentLoaded", () => {
  renderSessions();
  renderWords();

  const toggleSidebarBtn = document.getElementById("toggleSidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  if (toggleSidebarBtn) {
    toggleSidebarBtn.onclick = () => {
      clickSound();
      const sidebar = document.getElementById("sidebar");
      if (sidebar.classList.contains("hidden")) {
        openSidebar();
      } else {
        closeSidebar();
      }
    };
  }

  if (sidebarOverlay) {
    sidebarOverlay.onclick = () => {
      closeSidebar();
    };
  }
});

// ===== Sidebar =====
function openSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  sidebar.classList.remove("hidden");
  overlay.classList.add("active");
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  sidebar.classList.add("hidden");
  overlay.classList.remove("active");
}

// ===== Session Logic =====
function newSession() {
  let name = prompt("اسم الجلسة الجديدة:");
  if (!name) return;
  if (sessions[name]) { alert("هذا الاسم مستخدم بالفعل!"); return; }
  sessions[name] = [];
  current = name;
  saveSessions();
  renderSessions();
  renderWords();
  closeSidebar();
}

function editSessionName(oldName) {
  let newName = prompt(`تعديل اسم الجلسة "${oldName}":`, oldName);
  if (!newName || newName === oldName || !newName.trim()) return;
  if (sessions[newName]) { alert("هذا الاسم مستخدم بالفعل أو هو اسم الجلسة الافتراضية."); return; }
  sessions[newName] = sessions[oldName];
  delete sessions[oldName];
  if (current === oldName) current = newName;
  saveSessions();
  renderSessions();
}

function renderSessions() {
  let box = document.getElementById("sessionList");
  if (!box) return;
  box.innerHTML = "";
  document.getElementById("currentSessionDisplay").textContent = current;
  if (!sessions[DEFAULT_SESSION_NAME]) sessions[DEFAULT_SESSION_NAME] = [];
  localStorage.setItem("currentSession", current);

  for (let s in sessions) {
    let div = document.createElement("div");
    div.className = "session-item";
    if (s === current) div.classList.add("active");
    let isDefault = (s === DEFAULT_SESSION_NAME);
    let editBtnHtml   = !isDefault ? `<button class="edit-btn" onclick="editSessionName('${s.replace(/'/g, "\\'")}'), clickSound()" title="Change name">✏️</button>` : '';
    let deleteBtnHtml = !isDefault ? `<button onclick="deleteSession(event, '${s.replace(/'/g, "\\'")}'), clickSound()" title="Delete">✖</button>` : '';
    div.innerHTML = `<span>${escapeHtml(s)}</span><div>${editBtnHtml}${deleteBtnHtml}</div>`;
    div.onclick = (e) => {
      if (e.target.tagName !== "BUTTON") {
        current = s;
        renderSessions();
        renderWords();
        closeSidebar();
      }
    };
    box.appendChild(div);
  }
}

function deleteSession(e, name) {
  e.stopPropagation();
  delete sessions[name];
  if (current === name) current = DEFAULT_SESSION_NAME;
  saveSessions();
  renderSessions();
  renderWords();
}

function renderWords() {
  let box = document.getElementById("savedWords");
  if (!box) return;
  box.innerHTML = "";
  if (!current || !sessions[current]) {
    box.innerHTML = `<p>اختر جلسة أو ابدأ جلسة جديدة لحفظ الكلمات. (الجلسة الحالية: ${escapeHtml(current)})</p>`;
    updateCounter(0);
    return;
  }

  updateCounter(sessions[current].length);

  sessions[current].forEach((w, i) => {
    let d = document.createElement("div");
    d.className = "word-row";
    d.draggable = true;
    d.dataset.index = i;
    d.innerHTML = `
      <div class="word-pair">
        <button class="speak-btn" onclick="speakText('${w[0].replace(/'/g, "\\'")}', null)" title="Listen">🔊</button>
        <button class="copy-btn-word" onclick="copyText(event, \`${w[0].replace(/`/g, '\\`').replace(/'/g, "\\'")}\`)" title="Copy">📋</button>
        <span onclick="loadWord('${w[0].replace(/'/g, "\\'")}', '${w[1].replace(/'/g, "\\'")}')">${escapeHtml(w[0])}</span>
      </div>
      <div class="word-pair">
        <button class="speak-btn" onclick="speakText('${w[1].replace(/'/g, "\\'")}', null)" title="Listen">🔊</button>
        <button class="copy-btn-word" onclick="copyText(event, \`${w[1].replace(/`/g, '\\`').replace(/'/g, "\\'")}\`)" title="Copy">📋</button>
        <span onclick="loadWord('${w[0].replace(/'/g, "\\'")}', '${w[1].replace(/'/g, "\\'")}')">${escapeHtml(w[1])}</span>
      </div>
      <div class="controls">
        <button onclick="del(event, ${i})" title="Delete">✖</button>
      </div>
    `;
    d.addEventListener("dragstart", dragStart);
    d.addEventListener("dragover",  dragOver);
    d.addEventListener("drop",      drop);
    d.addEventListener("dragend",   dragEnd);
    box.appendChild(d);
  });
}

function loadWord(source, target) {
  document.getElementById("inputWord").value  = source;
  document.getElementById("outputWord").value = target;
  autoResize();
}

function dragStart(e) {
  dragSrcIndex = e.currentTarget.dataset.index;
  e.dataTransfer.effectAllowed = "move";
  e.currentTarget.style.opacity = '0.4';
}
function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}
function drop(e) {
  e.preventDefault();
  let targetIndex = e.currentTarget.dataset.index;
  if (dragSrcIndex === null || targetIndex === dragSrcIndex) return;
  let itemToMove = sessions[current].splice(dragSrcIndex, 1)[0];
  sessions[current].splice(targetIndex, 0, itemToMove);
  dragSrcIndex = null;
  saveSessions();
  renderWords();
}
function dragEnd(e) {
  e.currentTarget.style.opacity = '1';
  dragSrcIndex = null;
}

function saveWord() {
  let w = document.getElementById("inputWord").value.trim();
  if (!w) return;
  if (!current) current = DEFAULT_SESSION_NAME;
  let t = document.getElementById("outputWord").value.trim();
  if (!t || t === "يتم الترجمة...") { alert("الرجاء انتظار ظهور الترجمة أولاً."); return; }
  sessions[current].push([w, t]);
  saveSessions();
  renderWords();
  document.getElementById("inputWord").value  = "";
  document.getElementById("outputWord").value = "";
  autoResize();
}

function clearOutput() {
  document.getElementById("inputWord").value  = "";
  document.getElementById("outputWord").value = "";
  autoResize();
  stopSpeak();
}

function del(e, i) {
  e.stopPropagation();
  sessions[current].splice(i, 1);
  saveSessions();
  renderWords();
}

function saveSessions() {
  localStorage.setItem("sessions", JSON.stringify(sessions));
}

// ===== Translation =====
async function translate(text) {
  if (!text) return "";
  try {
    let isArabic   = /[\u0600-\u06FF]/.test(text);
    let targetLang = isArabic ? "en" : "ar";
    let sourceLang = isArabic ? "ar" : "en";
    let textForApi = isArabic ? text : text.charAt(0).toUpperCase() + text.slice(1);
    let r    = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textForApi)}&langpair=${sourceLang}|${targetLang}`);
    let data = await r.json();
    if (data.responseStatus && data.responseStatus !== 200) {
      console.error("Translation API error:", data.responseDetails);
      return "تم الوصول للحد اليومي، حاول لاحقًا";
    }
    return data.responseData.translatedText;
  } catch (e) {
    console.error("Translation error:", e);
    return "خطأ في الاتصال";
  }
}

function handleInput() {
  clearTimeout(debounceTimer);
  const inputEl  = document.getElementById("inputWord");
  const outputEl = document.getElementById("outputWord");
  let text = inputEl.value.trim();
  if (!text) { outputEl.value = ""; autoResize(); return; }
  outputEl.value = "يتم الترجمة...";
  autoResize();
  debounceTimer = setTimeout(async () => {
    outputEl.value = await translate(text);
    autoResize();
  }, 500);
}

// ===== عداد الكلمات =====
function updateCounter(count) {
  const counterNumber = document.getElementById("counterNumber");
  if (counterNumber) counterNumber.textContent = count;
}

// ===== وظيفة البحث =====
function handleSearch() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const box   = document.getElementById("savedWords");
  box.innerHTML = "";

  if (!current || !sessions[current]) return;

  const words = sessions[current];

  if (!query) {
    renderWords();
    return;
  }

  const results = words.filter(w =>
    w[0].toLowerCase().includes(query) || w[1].toLowerCase().includes(query)
  );

  updateCounter(results.length);

  if (results.length === 0) {
    box.innerHTML = `<p style="color: #888;">لا توجد نتائج للبحث عن: "${escapeHtml(query)}"</p>`;
    return;
  }

  results.forEach((w) => {
    const realIndex = words.indexOf(w);
    let d = document.createElement("div");
    d.className = "word-row";
    d.draggable = false;
    d.dataset.index = realIndex;

    const highlightedW0 = highlightText(w[0], query);
    const highlightedW1 = highlightText(w[1], query);

    d.innerHTML = `
      <div class="word-pair">
        <button class="speak-btn" onclick="speakText('${w[0].replace(/'/g, "\\'")}', null)" title="Listen">🔊</button>
        <button class="copy-btn-word" onclick="copyText(event, \`${w[0].replace(/`/g, '\\`').replace(/'/g, "\\'")}\`)" title="Copy">📋</button>
        <span onclick="loadWord('${w[0].replace(/'/g, "\\'")}', '${w[1].replace(/'/g, "\\'")}')">${highlightedW0}</span>
      </div>
      <div class="word-pair">
        <button class="speak-btn" onclick="speakText('${w[1].replace(/'/g, "\\'")}', null)" title="Listen">🔊</button>
        <button class="copy-btn-word" onclick="copyText(event, \`${w[1].replace(/`/g, '\\`').replace(/'/g, "\\'")}\`)" title="Copy">📋</button>
        <span onclick="loadWord('${w[0].replace(/'/g, "\\'")}', '${w[1].replace(/'/g, "\\'")}')">${highlightedW1}</span>
      </div>
      <div class="controls">
        <button onclick="del(event, ${realIndex})" title="Delete">✖</button>
      </div>
    `;
    box.appendChild(d);
  });
}

function highlightText(text, query) {
  const safeText = escapeHtml(text);
  if (!query) return safeText;
  const safeQuery = escapeHtml(query);
  const regex = new RegExp(`(${safeQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return safeText.replace(regex, '<mark class="search-highlight">$1</mark>');
}

function clearSearch() {
  document.getElementById("searchInput").value = "";
  renderWords();
}