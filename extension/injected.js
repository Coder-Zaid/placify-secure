// Placify Secure — Main World Injected Script
// Runs natively in the page execution context (MAIN world) without CSP violations
(function() {
  try {
    window.__PLACIFY_EXTENSION_INSTALLED__ = true;
    window.PLACIFY_SECURE_EXTENSION_INSTALLED = true;
    if (document.documentElement) {
      document.documentElement.setAttribute('data-placify-extension-installed', 'true');
      document.documentElement.setAttribute('data-placify-secure', 'enabled');
    }
    window.dispatchEvent(new CustomEvent('placify-extension-ready'));
  } catch (e) {}
})();
