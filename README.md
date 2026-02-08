# Jira Issue Attacher

Chrome extension that fills PR title and description from a Jira story link.

## Features

- **Floating button** on the configured page when the URL and query param match your pattern (e.g. `sourceRef` containing a Jira key like `DATALM-108093`).
- **One click** opens the Jira story in a background tab, reads the page title, then fills the PR title and description using your template.
- **Configurable** URL, query param, regex pattern, Jira browse URL, title/description selectors, and description template.

## Installation

1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Open the extension **Options** (right‑click the icon → Options, or from the extensions page) and click **Save** or **Reset to default** so host permission is granted for your configured URL(s).

## Configuration

In **Options** you can set:

| Field | Description |
|-------|-------------|
| **URL** | Page where the extension is active (e.g. your PR create page). |
| **param** | Query param that holds the value to match (e.g. `sourceRef`). |
| **pattern** | Regex to find in that param (e.g. `DATALM-\d+`). |
| **URL for extract title** | Jira (or other) URL to open; use `{{pattern}}` for the matched key (e.g. `https://jira.example.com/browse/{{pattern}}`). |
| **Title selector** | CSS selector for the PR title input. |
| **Description selector** | CSS selector for the PR description textarea. |
| **Description template** | Template for description body. Use `{{title}}` and `{{link}}` for the story title and URL. |

Default values target Azure DevOps PR create and Jira. Use **Reset to default** to restore them.

## Usage

1. Configure options and save.
2. Open your PR create page with a URL that matches your **URL** and has the **param** matching your **pattern** (e.g. `?sourceRef=feature/DATALM-108093-...`).
3. A **Get From Jira** button appears (peeking from the right). Hover to see the tooltip and full button.
4. Click the button. The extension opens the Jira story, reads its title, then fills the PR title and description (and closes the Jira tab).

## Permissions

- **Default:** Access to the configured analytics and Jira hosts (see manifest).
- **Optional:** If you change the URLs in options to other domains, the extension will ask for permission for those hosts when you save.

## License

MIT
