// Runs synchronously in <head>: apply the saved theme before first paint and set up analytics.
(function () {
  try {
    var theme = localStorage.getItem('plssize:theme');
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  } catch (e) { /* storage blocked */ }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-Z4Q23E9QXZ');
})();
