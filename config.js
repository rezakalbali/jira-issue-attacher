var JIRA_ATTACHER_DEFAULTS = {
  'url': 'https://analytics.mohaymen.ir/dev/Analytics%20Collection/Analytics/_git/Web/pullrequestcreate',
  'param': 'sourceRef',
  'pattern': 'DATALM-\\d+',
  'url-for-extract-title': 'https://jira.mohaymen.ir/browse/{{pattern}}',
  'title-selector': 'input[aria-label="Enter a title"]',
  'description-selector': 'textarea[aria-label="Description"]',
  'description-template': '<div dir="rtl">\n\nاستوری\u200cهای مرتبط:\n\n- [{{title}}]({{link}})\n\n</div>'
};
