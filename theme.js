/*
 * Light/dark theme switching.
 *
 * Loaded synchronously from <head> so data-theme is set on <html> before the
 * first paint (no flash of the wrong theme). Resolution order:
 *   1. the user's saved choice in localStorage;
 *   2. otherwise the system preference (prefers-color-scheme), which is also
 *      followed live until the user picks a theme (saved earlier, or toggled
 *      in this page view even if storage is unavailable).
 *
 * Tests: tests/theme.test.js (run `node --test` from the repository root).
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'dan-theme';
  const DARK = 'dark';
  const LIGHT = 'light';
  const TOGGLE_ID = 'theme-toggle';

  const root = document.documentElement;
  const darkQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  // Set when the user toggles in this page view. Stops system changes from
  // overriding them even if localStorage could not save the choice.
  let userChose = false;

  // localStorage can throw (blocked storage, some private modes): fall back
  // to the system preference and simply skip persisting.
  function readSavedTheme() {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      return value === DARK || value === LIGHT ? value : null;
    } catch (error) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // Not persisted; the choice still applies for this page view.
    }
  }

  function systemTheme() {
    return darkQuery && darkQuery.matches ? DARK : LIGHT;
  }

  function currentTheme() {
    return root.getAttribute('data-theme') === DARK ? DARK : LIGHT;
  }

  function syncToggle(theme) {
    const toggle = document.getElementById(TOGGLE_ID);
    if (toggle) {
      toggle.setAttribute('aria-checked', String(theme === DARK));
    }
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    syncToggle(theme);
  }

  applyTheme(readSavedTheme() || systemTheme());

  if (darkQuery && typeof darkQuery.addEventListener === 'function') {
    darkQuery.addEventListener('change', function () {
      if (!userChose && !readSavedTheme()) {
        applyTheme(systemTheme());
      }
    });
  }

  function initToggle() {
    const toggle = document.getElementById(TOGGLE_ID);
    if (!toggle) {
      return;
    }
    syncToggle(currentTheme());
    toggle.addEventListener('click', function () {
      const next = currentTheme() === DARK ? LIGHT : DARK;
      userChose = true;
      applyTheme(next);
      saveTheme(next);
    });
    toggle.hidden = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initToggle);
  } else {
    initToggle();
  }
})();
