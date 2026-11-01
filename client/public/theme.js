// runs before the app loads, so a dark page never flashes white first
(function () {
  var stored = null;
  try {
    stored = localStorage.getItem('theme');
  } catch (e) {}
  var dark =
    stored === 'dark' ||
    (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
})();
