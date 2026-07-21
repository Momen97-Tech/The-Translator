let sessions = {};
try {
  sessions = JSON.parse(localStorage.getItem('sessions') || '{}');
} catch(e) {
  sessions = {};
}

let quizWords    = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount   = 0;
let currentAnswer = '';
let answered     = false;
let currentSession = '';

document.addEventListener("DOMContentLoaded", () => {
  loadSessions();
});

function loadSessions() {
  const select = document.getElementById('sessionSelect');
  if (!select) return;
  select.innerHTML = '';
  let found = false;
  for (let s in sessions) {
    if (sessions[s].length >= 2) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = `${s} (${sessions[s].length} كلمة)`;
      select.appendChild(opt);
      found = true;
    }
  }
  if (!found) {
    select.innerHTML = '<option disabled>لا توجد جلسات بها كلمات كافية (2 على الأقل)</option>';
    document.getElementById('startBtn').disabled = true;
  }
  select.onchange = updateWordCount;
  updateWordCount();
}

function updateWordCount() {
  const select = document.getElementById('sessionSelect');
  const s = select.value;
  const count = sessions[s] ? sessions[s].length : 0;
  document.getElementById('wordCountInfo').textContent =
    count > 0 ? `📖 عدد الكلمات في هذه الجلسة: ${count}` : '';
}

function startQuiz() {
  const select = document.getElementById('sessionSelect');
  currentSession = select.value;
  const words = sessions[currentSession];
  if (!words || words.length < 2) {
    alert('تحتاج إلى كلمتين على الأقل للبدء!');
    return;
  }

  quizWords = shuffle([...words]);
  currentIndex = 0;
  correctCount = 0;
  wrongCount   = 0;

  document.getElementById('sessionSelector').style.display = 'none';
  document.getElementById('resultScreen').style.display    = 'none';
  document.getElementById('quizArea').style.display        = 'block';

  updateStats();
  showQuestion();
}

function showQuestion() {
  if (currentIndex >= quizWords.length) {
    showResult();
    return;
  }

  answered = false;
  const word = quizWords[currentIndex];

  const showArabic = Math.random() > 0.5;
  const question   = showArabic ? word[0] : word[1];
  const answer     = showArabic ? word[1] : word[0];
  currentAnswer    = answer;

  document.getElementById('questionType').textContent =
    showArabic ? '🇸🇦 ترجم إلى الإنجليزية' : '🇬🇧 ترجم إلى العربية';

  document.getElementById('questionWord').textContent = question;

  const progress = (currentIndex / quizWords.length) * 100;
  document.getElementById('progressFill').style.width = progress + '%';
  document.getElementById('progressText').textContent =
    `السؤال ${currentIndex + 1} من ${quizWords.length}`;

  document.getElementById('feedback').textContent = '';
  document.getElementById('feedback').className   = '';
  document.getElementById('nextBtn').style.display = 'none';

  buildOptions(answer, showArabic);
}

function buildOptions(correctAnswer, showArabic) {
  const grid = document.getElementById('optionsGrid');
  grid.innerHTML = '';

  const allWords   = sessions[currentSession];
  const otherWords = allWords.filter(w =>
    (showArabic ? w[1] : w[0]) !== correctAnswer
  );
  const wrongPool = shuffle(otherWords).slice(0, 3).map(w => showArabic ? w[1] : w[0]);

  while (wrongPool.length < 3) {
    wrongPool.push('---');
  }

  const options = shuffle([correctAnswer, ...wrongPool]);

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className   = 'option-btn';
    btn.textContent = opt;
    btn.onclick     = () => selectAnswer(btn, opt, correctAnswer);
    grid.appendChild(btn);
  });
}

function selectAnswer(btn, selected, correct) {
  if (answered) return;
  answered = true;

  document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);

  if (selected === correct) {
    btn.classList.add('correct');
    document.getElementById('feedback').textContent = '✅ إجابة صحيحة!';
    document.getElementById('feedback').className   = 'correct';
    correctCount++;
  } else {
    btn.classList.add('wrong');
    document.querySelectorAll('.option-btn').forEach(b => {
      if (b.textContent === correct) b.classList.add('correct');
    });
    document.getElementById('feedback').textContent = `❌ الإجابة الصحيحة: ${correct}`;
    document.getElementById('feedback').className   = 'wrong';
    wrongCount++;
  }

  updateStats();
  document.getElementById('nextBtn').style.display = 'inline-block';
}

function nextQuestion() {
  currentIndex++;
  showQuestion();
}

function updateStats() {
  document.getElementById('statCorrect').textContent   = correctCount;
  document.getElementById('statWrong').textContent     = wrongCount;
  document.getElementById('statRemaining').textContent = quizWords.length - currentIndex;
}

function listenQuestion() {
  const text = document.getElementById('questionWord').textContent;
  if (!text || !window.speechSynthesis) return;
  const isArabic  = /[\u0600-\u06FF]/.test(text);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang  = isArabic ? 'ar-SA' : 'en-US';
  utterance.rate  = 0.9;
  speechSynthesis.cancel();
  setTimeout(() => speechSynthesis.speak(utterance), 50);
}

function showResult() {
  document.getElementById('quizArea').style.display     = 'none';
  document.getElementById('resultScreen').style.display = 'block';

  const total   = quizWords.length;
  const percent = Math.round((correctCount / total) * 100);

  document.getElementById('resultScore').textContent = `${correctCount} / ${total}`;
  document.getElementById('resultMessage').textContent = `نسبة النجاح: ${percent}%`;

  let emoji = '😢';
  if (percent === 100) emoji = '🏆 ممتاز! أتقنت جميع الكلمات!';
  else if (percent >= 80) emoji = '🎉 أحسنت! نتيجة رائعة';
  else if (percent >= 60) emoji = '👍 جيد! استمر في التدريب';
  else if (percent >= 40) emoji = '💪 لا بأس، حاول مرة أخرى';
  else emoji = '📚 تحتاج إلى مزيد من المراجعة';

  document.getElementById('resultEmoji').textContent = emoji;
}

function restartQuiz() {
  document.getElementById('resultScreen').style.display = 'none';
  startQuiz();
}

function goHome() {
  window.location.href = 'index.html';
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}