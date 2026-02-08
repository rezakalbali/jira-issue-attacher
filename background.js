const pending = new Map();
const TITLE_WAIT_MS = 15000;

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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const data = pending.get(tabId);
  if (!data) return;
  if (changeInfo.status !== 'complete') return;
  const title = (tab?.title ?? '').trim();
  clearTimeout(data.timeoutId);
  pending.delete(tabId);
  chrome.tabs.remove(tabId).then(() => {}).catch(() => {});
  chrome.tabs.sendMessage(data.senderTabId, { type: 'getPageTitleResult', requestId: data.requestId, ok: true, title: title || null }).catch(() => {});
});
