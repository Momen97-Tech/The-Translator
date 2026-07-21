// ===== صوت الأزرار =====
const sound = new Audio("click.mp3");
function clickSound() {
  sound.play();
}

// ===== إدارة الثيم (الوضع الداكن) =====
(function applySavedTheme() {
  const darkToggleBtn = document.getElementById('darkToggle');
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
    if (darkToggleBtn) darkToggleBtn.textContent = '☀️ Light Mode';
  } else {
    if (darkToggleBtn) darkToggleBtn.textContent = '🌙 Dark Mode';
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  const darkToggleBtn = document.getElementById("darkToggle");
  if (darkToggleBtn) {
    darkToggleBtn.onclick = () => {
      clickSound();
      document.body.classList.toggle("dark");
      const isDark = document.body.classList.contains("dark");
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      darkToggleBtn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    };
  }
});