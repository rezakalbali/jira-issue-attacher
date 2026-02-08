const pending = new Map();
const TITLE_WAIT_MS = 15000;
const STORAGE_KEYS = ['url', 'url-for-extract-title'];
const DEFAULT_URL = 'https://analytics.mohaymen.ir/dev/Analytics%20Collection/Analytics/_git/Web/pullrequestcreate';

let savedUrl = DEFAULT_URL;
const injectedTabs = new Set();

function pathnameBase(u) {
  if (!u || typeof u !== 'string') return '';
  try {
    const url = new URL(u.trim());
    return url.origin + url.pathname.replace(/\/$/, '');
  } catch (_) {
    return '';
  }
}

function urlMatches(stored, currentHref) {
  const base = pathnameBase(stored);
  if (!base) return false;
  const current = pathnameBase(currentHref);
  return current === base || current.startsWith(base + '/');
}

function loadSavedUrl() {
  chrome.storage.sync.get(STORAGE_KEYS, (stored) => {
    savedUrl = stored.url || DEFAULT_URL;
  });
}

function tryInjectContentScript(tabId, tabUrl) {
  if (!urlMatches(savedUrl, tabUrl)) return;
  const origin = new URL(tabUrl).origin;
  const originPattern = origin + '/*';
  chrome.permissions.contains({ origins: [originPattern] }, (has) => {
    if (!has) return;
    if (injectedTabs.has(tabId)) return;
    chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }, () => {
      if (!chrome.runtime.lastError) injectedTabs.add(tabId);
    });
  });
}

chrome.runtime.onStartup.addListener(loadSavedUrl);
chrome.runtime.onInstalled.addListener(loadSavedUrl);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes.url || changes['url-for-extract-title'])) loadSavedUrl();
});
loadSavedUrl();

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') injectedTabs.delete(tabId);
  if (changeInfo.status === 'complete' && tab?.url) {
    tryInjectContentScript(tabId, tab.url);
    const data = pending.get(tabId);
    if (data) {
      const title = (tab?.title ?? '').trim();
      clearTimeout(data.timeoutId);
      pending.delete(tabId);
      chrome.tabs.remove(tabId).then(() => {}).catch(() => {});
      chrome.tabs.sendMessage(data.senderTabId, { type: 'getPageTitleResult', requestId: data.requestId, ok: true, title: title || null }).catch(() => {});
    }
  }
});
chrome.tabs.onRemoved.addListener((tabId) => injectedTabs.delete(tabId));

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'getPageTitle') return;
  const { url, requestId } = msg;
  const senderTabId = sender.tab?.id;
  if (!url || senderTabId == null) {
    sendResponse({ ok: false, title: null });
    return false;
  }
  chrome.tabs.create({ url, active: false }, (tab) => {
    if (chrome.runtime.lastError || !tab?.id) {
      sendResponse({ ok: false, title: null });
      return;
    }
    const timeoutId = setTimeout(() => {
      if (pending.has(tab.id)) {
        pending.delete(tab.id);
        chrome.tabs.remove(tab.id).catch(() => {});
        chrome.tabs.sendMessage(senderTabId, { type: 'getPageTitleResult', requestId, ok: false, title: null }).catch(() => {});
      }
    }, TITLE_WAIT_MS);
    pending.set(tab.id, { senderTabId, requestId, timeoutId });
    sendResponse({ ok: true });
  });
  return true;
});
