/**
 * ArcSign i18n — Core module (lightweight)
 * Detects language, loads the correct translation file, applies translations.
 * Split from i18n.js for performance — loads ~50KB less per page.
 */

(function () {
  'use strict';

  // Detect language: localStorage > html lang attribute > browser > default
  var pageLang = document.documentElement.lang === 'zh-TW' ? 'zh-TW' : 'en';
  var currentLang = localStorage.getItem('arcsign-lang') || pageLang;
  if (currentLang !== 'zh-TW' && currentLang !== 'en') currentLang = 'en';

  // Resolve script base path (handles /en/ subdirectory)
  var scripts = document.getElementsByTagName('script');
  var basePath = '';
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src || '';
    if (src.indexOf('i18n-core.js') !== -1) {
      basePath = src.substring(0, src.lastIndexOf('/') + 1);
      break;
    }
  }

  function t(key) {
    var trans = window.__i18n_translations;
    return (trans && trans[key]) || key;
  }

  function updatePageTranslations() {
    // Update elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var translation = t(key);
      if (translation.indexOf('<') !== -1 && translation.indexOf('>') !== -1) {
        el.innerHTML = translation;
      } else {
        el.textContent = translation;
      }
    });

    // Update elements with data-i18n-html (always innerHTML)
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      el.innerHTML = t(key);
    });

    // Update elements with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });

    // Update document title
    var titleEl = document.querySelector('title');
    var titleKey = titleEl ? titleEl.getAttribute('data-i18n') : null;
    if (titleKey) document.title = t(titleKey);

    // Update html lang
    document.documentElement.lang = currentLang === 'zh-TW' ? 'zh-TW' : 'en';

    // Update toggle button
    var toggles = document.querySelectorAll('.lang-toggle');
    toggles.forEach(function (btn) {
      btn.textContent = currentLang === 'zh-TW' ? 'EN' : '\u4e2d';
    });
  }

  function loadTranslationFile(lang, callback) {
    var file = basePath + 'i18n-' + lang + '.js';
    var script = document.createElement('script');
    script.src = file;
    script.onload = function () {
      callback();
    };
    script.onerror = function () {
      console.warn('Failed to load ' + file + ', falling back to inline');
      callback();
    };
    document.head.appendChild(script);
  }

  function switchLanguage(lang) {
    if (lang !== 'zh-TW' && lang !== 'en') lang = 'en';
    currentLang = lang;
    localStorage.setItem('arcsign-lang', lang);
    loadTranslationFile(lang, function () {
      updatePageTranslations();
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: lang } }));
    });
  }

  function toggleLanguage() {
    switchLanguage(currentLang === 'zh-TW' ? 'en' : 'zh-TW');
  }

  function getCurrentLang() {
    return currentLang;
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    loadTranslationFile(currentLang, function () {
      updatePageTranslations();
    });

    document.querySelectorAll('.lang-toggle').forEach(function (btn) {
      btn.addEventListener('click', toggleLanguage);
    });
  });

  // Export
  window.i18n = {
    t: t,
    switchLanguage: switchLanguage,
    toggleLanguage: toggleLanguage,
    getCurrentLang: getCurrentLang,
    updatePageTranslations: updatePageTranslations
  };
})();
