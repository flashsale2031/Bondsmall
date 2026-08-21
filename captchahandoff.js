/*
 * Standalone user-assisted CAPTCHA handoff utility.
 *
 * This file does not solve CAPTCHA, interpret CAPTCHA images, submit forms,
 * navigate to third-party sites, or connect to seller.html/classifiedads.js.
 * The user must read the CAPTCHA and paste the text manually.
 */
(function (global) {
  'use strict';

  function resolveInput(root, selector) {
    const scope = root || document;
    if (!scope || typeof scope.querySelector !== 'function') {
      throw new Error('A DOM root is required.');
    }
    const input = scope.querySelector(selector || 'input[name="captcha"]');
    if (!input || !('value' in input)) throw new Error('CAPTCHA input was not found.');
    return input;
  }

  function createNotice(input, options = {}) {
    const notice = document.createElement('div');
    notice.className = options.noticeClass || 'captcha-handoff-notice';
    notice.setAttribute('role', 'status');
    notice.textContent = options.message || 'Read the CAPTCHA yourself, then paste it into the field below.';
    notice.style.margin = '8px 0';
    notice.style.padding = '8px 10px';
    notice.style.border = '1px solid #d97706';
    notice.style.borderRadius = '6px';
    notice.style.background = '#fffbeb';
    notice.style.color = '#92400e';
    input.insertAdjacentElement('beforebegin', notice);
    return notice;
  }

  function requestManualEntry({ root = document, selector = 'input[name="captcha"]', message, onPaste } = {}) {
    const input = resolveInput(root, selector);
    const notice = createNotice(input, { message });
    input.focus({ preventScroll: false });
    input.select?.();

    const handlePaste = event => {
      // This helper observes only the user’s paste event. It does not read
      // images, invoke OCR, fetch CAPTCHA content, or generate a solution.
      const value = event.clipboardData?.getData('text') || '';
      queueMicrotask(() => {
        if (typeof onPaste === 'function') onPaste({ value, input, notice });
      });
    };
    input.addEventListener('paste', handlePaste, { once: true });

    return {
      input,
      notice,
      cancel() {
        input.removeEventListener('paste', handlePaste);
        notice.remove();
      },
      isFilled() {
        return Boolean(input.value.trim());
      }
    };
  }

  function validateManualEntry({ root = document, selector = 'input[name="captcha"]' } = {}) {
    const input = resolveInput(root, selector);
    const value = input.value.trim();
    if (!value) throw new Error('Enter the CAPTCHA text manually before continuing.');
    return { entered: true, length: value.length };
  }

  global.BondsCaptchaHandoff = Object.freeze({ requestManualEntry, validateManualEntry });
})(typeof window !== 'undefined' ? window : globalThis);
