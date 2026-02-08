const KEYS = {
  url: 'url',
  param: 'param',
  pattern: 'pattern',
  urlForExtractTitle: 'url-for-extract-title',
  titleSelector: 'title-selector',
  descriptionSelector: 'description-selector',
  descriptionTemplate: 'description-template'
};

const DEFAULTS = {
  url: 'https://analytics.mohaymen.ir/dev/Analytics%20Collection/Analytics/_git/Web/pullrequestcreate',
  param: 'sourceRef',
  pattern: 'DATALM-\\d+',
  urlForExtractTitle: 'https://jira.mohaymen.ir/browse/{{pattern}}',
  titleSelector: 'input[aria-label="Enter a title"]',
  descriptionSelector: 'textarea[aria-label="Description"]',
  descriptionTemplate: '<div dir="rtl">\n\n## Developer\n\nاستوری\u200cهای مرتبط:\n\n- [{{title}}]({{link}})\n\n</div>'
};

const form = document.getElementById('form');
const statusEl = document.getElementById('status');
const fields = {
  url: document.getElementById('url'),
  param: document.getElementById('param'),
  pattern: document.getElementById('pattern'),
  urlForExtractTitle: document.getElementById('url-for-extract-title'),
  titleSelector: document.getElementById('title-selector'),
  descriptionSelector: document.getElementById('description-selector'),
  descriptionTemplate: document.getElementById('description-template')
};

function showStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? '#f48771' : '#4ec9b0';
}

function load() {
  chrome.storage.sync.get(Object.values(KEYS), (stored) => {
    fields.url.value = stored[KEYS.url] ?? DEFAULTS.url;
    fields.param.value = stored[KEYS.param] ?? DEFAULTS.param;
    fields.pattern.value = stored[KEYS.pattern] ?? DEFAULTS.pattern;
    fields.urlForExtractTitle.value = stored[KEYS.urlForExtractTitle] ?? DEFAULTS.urlForExtractTitle;
    fields.titleSelector.value = stored[KEYS.titleSelector] ?? DEFAULTS.titleSelector;
    fields.descriptionSelector.value = stored[KEYS.descriptionSelector] ?? DEFAULTS.descriptionSelector;
    fields.descriptionTemplate.value = stored[KEYS.descriptionTemplate] ?? DEFAULTS.descriptionTemplate;
  });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const url = fields.url.value.trim();
  const param = fields.param.value.trim();
  const pattern = fields.pattern.value.trim();
  const urlForExtractTitle = fields.urlForExtractTitle.value.trim();
  const titleSelector = fields.titleSelector.value.trim();
  const descriptionSelector = fields.descriptionSelector.value.trim();
  const descriptionTemplate = fields.descriptionTemplate.value.trim();

  if (pattern) {
    try {
      new RegExp(pattern);
    } catch (_) {
      showStatus('Invalid regex pattern.', true);
      return;
    }
  }

  chrome.storage.sync.set(
    {
      [KEYS.url]: url,
      [KEYS.param]: param,
      [KEYS.pattern]: pattern,
      [KEYS.urlForExtractTitle]: urlForExtractTitle,
      [KEYS.titleSelector]: titleSelector,
      [KEYS.descriptionSelector]: descriptionSelector,
      [KEYS.descriptionTemplate]: descriptionTemplate
    },
    () => {
      const origins = [];
      try {
        if (url) origins.push(new URL(url).origin + '/*');
        if (urlForExtractTitle) origins.push(new URL(urlForExtractTitle.replace(/\{\{pattern\}\}/g, 'x')).origin + '/*');
      } catch (_) {}
      const unique = [...new Set(origins)];
      if (unique.length) {
        chrome.permissions.request({ origins: unique }, (granted) => {
          showStatus(granted ? 'Saved. Permission granted.' : 'Saved. Grant host permission for the extension to work on the configured URL(s).');
        });
      } else {
        showStatus('Saved.');
      }
    }
  );
});

const resetBtn = document.getElementById('reset-btn');
resetBtn.addEventListener('click', () => {
  const defaultsToStore = {};
  for (const k of Object.keys(KEYS)) {
    defaultsToStore[KEYS[k]] = DEFAULTS[k];
  }
  chrome.storage.sync.set(defaultsToStore, () => {
    const origins = [];
    try {
      origins.push(new URL(DEFAULTS.url).origin + '/*');
      origins.push(new URL(DEFAULTS.urlForExtractTitle.replace(/\{\{pattern\}\}/g, 'x')).origin + '/*');
    } catch (_) {}
    chrome.permissions.request({ origins }, (granted) => {
      showStatus(granted ? 'Reset to defaults. Permission granted.' : 'Reset to defaults.');
      load();
    });
  });
});

load();
