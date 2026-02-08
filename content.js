(function () {
  'use strict';

  if (window !== window.top) return;

  const STORAGE_KEYS = ['url', 'param', 'pattern'];
  const CLICK_STORAGE_KEYS = ['url-for-extract-title', 'title-selector', 'description-selector', 'description-template'];
  const DEFAULT_URL = 'https://analytics.mohaymen.ir/dev/Analytics%20Collection/Analytics/_git/Web/pullrequestcreate';
  const DEFAULT_PARAM = 'sourceRef';
  const DEFAULT_PATTERN = 'DATALM-\\d+';
  const BUTTON_OFFSET_DEFAULT = -52;
  const BUTTON_OFFSET_HOVER = -6;
  const URL_POLL_MS = 350;
  const RETRY_DELAYS_MS = [800, 2000];

  function pathnameBase(u) {
    if (!u || typeof u !== 'string') return '';
    try {
      const url = new URL(u.trim(), window.location.origin);
      const path = url.origin + url.pathname.replace(/\/$/, '');
      return path;
    } catch (_) {
      return '';
    }
  }

  function urlMatches(storedUrl, currentHref) {
    const base = pathnameBase(storedUrl || DEFAULT_URL);
    if (!base) return false;
    const current = pathnameBase(currentHref);
    return current === base || current.startsWith(base + '/');
  }

  function patternFoundInParam(paramName, patternStr, currentHref) {
    if (!paramName || typeof paramName !== 'string') return false;
    try {
      const url = new URL(currentHref, window.location.origin);
      const value = url.searchParams.get(paramName.trim());
      if (value == null || value === '') return false;
      if (!patternStr || typeof patternStr !== 'string') return false;
      const re = new RegExp(patternStr.trim());
      return re.test(value);
    } catch (_) {
      return false;
    }
  }

  function getPatternMatch(paramName, patternStr, currentHref) {
    try {
      const url = new URL(currentHref, window.location.origin);
      const value = url.searchParams.get(paramName?.trim() ?? '');
      if (value == null || value === '') return null;
      const re = new RegExp((patternStr ?? '').trim());
      const m = value.match(re);
      return m ? m[0] : null;
    } catch (_) {
      return null;
    }
  }

  function createButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Update');
    btn.innerHTML = 'Get From Jira';
    btn.style.cssText = [
      'position:fixed',
      'top:5rem',
      `inset-inline-end:${BUTTON_OFFSET_DEFAULT}px`,
      'width:165px',
      'min-width:165px',
      'height:48px',
      'border-radius:4px',
      'border:none',
      'background:#0078D4',
      'box-shadow:0 2px 6px rgba(0,0,0,0.2)',
      'cursor:pointer',
      'display:flex',
      'align-items:center',
      'justify-content:flex-start',
      'z-index:2147483647',
      'padding:0 18px 0 16px',
      'transition:inset-inline-end .2s ease, box-shadow .2s ease, background .15s ease',
      'color:rgba(255,255,255,0.95)',
      'font-family:system-ui,sans-serif',
      'font-size:14px',
      'font-weight:600',
      'text-shadow:0 1px 1px rgba(0,0,0,0.1)',
      'white-space:nowrap',
      'overflow:visible',
      'box-sizing:border-box'
    ].join(';');
    btn.addEventListener('mouseenter', () => {
      btn.style.insetInlineEnd = `${BUTTON_OFFSET_HOVER}px`;
      btn.style.background = '#106EBE';
      btn.style.boxShadow = '0 3px 10px rgba(0,0,0,0.25)';
    });
    const tooltip = document.createElement('span');
    tooltip.textContent = 'Fill PR title and description from Jira story link';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.style.cssText = [
      'position:fixed',
      'top:calc(5rem + 24px)',
      'inset-inline-end:232px',
      'transform:translateY(-50%)',
      'max-width:260px',
      'padding:10px 14px',
      'background:#1a1a1a',
      'color:#e8e8e8',
      'font-size:12px',
      'line-height:1.45',
      'border-radius:6px',
      'opacity:0',
      'pointer-events:none',
      'z-index:2147483646',
      'transition:opacity .15s ease',
      'box-shadow:0 4px 12px rgba(0,0,0,0.4)'
    ].join(';');
    let tooltipTimer = null;
    btn.addEventListener('mouseenter', () => {
      btn.style.insetInlineEnd = `${BUTTON_OFFSET_HOVER}px`;
      btn.style.background = '#106EBE';
      btn.style.boxShadow = '0 3px 10px rgba(0,0,0,0.25)';
      tooltipTimer = setTimeout(() => { tooltip.style.opacity = '1'; }, 400);
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.insetInlineEnd = `${BUTTON_OFFSET_DEFAULT}px`;
      btn.style.background = '#0078D4';
      btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
      if (tooltipTimer) clearTimeout(tooltipTimer);
      tooltip.style.opacity = '0';
    });
    btn.addEventListener('click', onButtonClick);
    const wrapper = document.createElement('div');
    wrapper.appendChild(tooltip);
    wrapper.appendChild(btn);
    return wrapper;
  }

  function onButtonClick() {
    const href = window.location.href;
    chrome.storage.sync.get([...STORAGE_KEYS, ...CLICK_STORAGE_KEYS], (stored) => {
      const param = stored.param ?? DEFAULT_PARAM;
      const pattern = stored.pattern ?? DEFAULT_PATTERN;
      const urlForExtractTitle = stored['url-for-extract-title'] ?? 'https://jira.mohaymen.ir/browse/{{pattern}}';
      const titleSelector = stored['title-selector'] ?? 'input[aria-label="Enter a title"]';
      const descriptionSelector = stored['description-selector'] ?? 'textarea[aria-label="Description"]';
      const descriptionTemplate = stored['description-template'] ?? '<div dir="rtl">\n\nاستوری\u200cهای مرتبط:\n\n- [{{title}}]({{link}})\n\n</div>';
      const match = getPatternMatch(param, pattern, href);
      if (!match) return;
      const extractUrl = urlForExtractTitle.replace(/\{\{pattern\}\}/g, match);
      const requestId = Date.now() + '-' + Math.random();
      const onResult = (msg) => {
        if (msg.type !== 'getPageTitleResult' || msg.requestId !== requestId) return;
        chrome.runtime.onMessage.removeListener(onResult);
        if (!msg.ok || msg.title == null) return;
        let rawTitle = String(msg.title).trim();
        const keyPrefix = `[${match}] `;
        if (rawTitle.startsWith(keyPrefix)) rawTitle = rawTitle.slice(keyPrefix.length);
        if (rawTitle.endsWith(' - Jira')) rawTitle = rawTitle.slice(0, -7).trim();
        const cleanTitle = rawTitle || match;
        const link = extractUrl;
        const titleEl = document.querySelector(titleSelector);
        const descEl = document.querySelector(descriptionSelector);
        if (titleEl) {
          titleEl.value = cleanTitle;
          titleEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (descEl && descriptionTemplate) {
          const body = descriptionTemplate.replace(/\{\{title\}\}/g, cleanTitle).replace(/\{\{link\}\}/g, link);
          descEl.value = body;
          descEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
      };
      chrome.runtime.onMessage.addListener(onResult);
      chrome.runtime.sendMessage({ type: 'getPageTitle', url: extractUrl, requestId }, (res) => {
        if (chrome.runtime.lastError || !(res && res.ok)) chrome.runtime.onMessage.removeListener(onResult);
      });
    });
  }

  let btnEl = null;

  function ensureButton() {
    if (btnEl && btnEl.parentNode) return;
    btnEl = createButton();
    document.body.appendChild(btnEl);
  }

  function removeButton() {
    if (btnEl && btnEl.parentNode) {
      btnEl.remove();
      btnEl = null;
    }
  }

  function syncButton(match) {
    if (match) ensureButton();
    else removeButton();
  }

  let lastHref = '';

  function checkUrl() {
    if (!document.body) {
      setTimeout(checkUrl, 50);
      return;
    }
    const href = window.location.href;
    if (href === lastHref) return;
    lastHref = href;
    chrome.storage.sync.get(STORAGE_KEYS, (stored) => {
      const configuredUrl = stored.url;
      const param = stored.param ?? DEFAULT_PARAM;
      const pattern = stored.pattern ?? DEFAULT_PATTERN;
      const onRightUrl = urlMatches(configuredUrl, href);
      const patternMatch = patternFoundInParam(param, pattern, href);
      syncButton(onRightUrl && patternMatch);
    });
  }

  function onUrlChange() {
    if (window.location.href === lastHref) return;
    checkUrl();
  }

  function runCheck() {
    lastHref = '';
    checkUrl();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runCheck);
  } else {
    runCheck();
  }

  RETRY_DELAYS_MS.forEach((ms) => setTimeout(runCheck, ms));

  window.addEventListener('popstate', onUrlChange);
  window.addEventListener('hashchange', onUrlChange);

  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args) {
    origPush.apply(this, args);
    setTimeout(onUrlChange, 0);
  };
  history.replaceState = function (...args) {
    origReplace.apply(this, args);
    setTimeout(onUrlChange, 0);
  };

  setInterval(onUrlChange, URL_POLL_MS);
})();
