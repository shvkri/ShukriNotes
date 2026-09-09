# ShukriNotes: A Cloudflare-Powered Notes and Knowledge Base

**ShukriNotes** is a powerful and high-performance serverless application for notes and knowledge management. Built entirely on the Cloudflare ecosystem (Workers, Pages, D1, R2, KV), it provides a private, cost-effective notes solution that you can own forever.

## ✨ Features

-   **✍️ Full-featured Markdown Support**: Supports real-time preview, split-screen editing, and smart pasting from rich text to Markdown.
-   **🎛️ Flexible Views & Workflow**: Manage notes via archiving, favoriting, and pinning. Customize your display with list, waterfall, and date-grouped views.
-   **🗂️ Files & Attachments**: Supports drag-and-drop or pasting to upload images (to R2 or Imgur) and various file types.
-   **🔗 Public Sharing**: Generate unique, publicly accessible links for any individual memo or file within your notes, with optional expiration times.
-   **🤖 Telegram Integration**: Record text, images, videos, and files on the go via a Telegram Bot, with a proxy option to save storage space.
-   **📚 Powerful Organization**: Automatic tagging, full-text search, timeline, calendar, and a contribution heatmap.
-   **📃 Knowledge Base (Docs)**: A separate, tree-structured documentation center, perfect for building organized knowledge systems.
-   **🎨 Highly Customizable**: Light/dark themes, custom primary colors, background images, glassmorphism effects, and fine-grained layout and feature visibility adjustments.
-   **🚀 High Performance & Low Cost**: Blazing fast responses powered by the Cloudflare global network, running at virtually zero cost on the free tier.

## 💡 Tips

-   **Preview Raw Files**: In the main interface or on a public share page, you can **right-click** on any text-based file attachment (like `.txt`, `.md`, `.json`, `.js`) to open its raw content directly in a new tab.
-   **Understanding "Telegram Proxy"**: This setting (found in the Settings panel) controls how videos and files from Telegram are handled.
	-   **Proxy ON**: Saves R2 storage space. Your Worker creates a link that *proxies* to Telegram's file. **Risk**: If the original file is deleted from Telegram, your link will break.
	-   **Proxy OFF**: Uses R2 storage. Your Worker downloads the file from Telegram and re-uploads it to your R2 bucket, ensuring you have a permanent copy.
-   **Understanding "Keep Time"**: When editing a note, you'll see a "Keep Time" checkbox.
	-   **Checked (Default)**: When you save the edit, the note's original timestamp will be preserved. It will **not** jump to the top of your timeline.
	-   **Unchecked**: When you save, the note's timestamp will be updated to the current time, making it the most recent note.

## 🔍 Rebuilding Search Index (Recommended)

If you are updating from an older version (<20260206) and want to enable searching by **filenames**, you need to rebuild your Full-Text Search (FTS) index.

1.  Go to your Cloudflare Dashboard -> **Workers & Pages** -> **D1**.
2.  Select your database (e.g., `notes-db`).
3.  Click on the **Console** tab.
4.  Copy the entire content of `src/migrate_fts.sql` from this repository and paste it into the console.
5.  Click **Execute**.

This will update your search index to include filenames and refresh all existing data.

## 🔧 Development (Wrangler)

### 1. Local Development (Simulated Environment)

**Initialize local database**:
```bash
npx wrangler d1 execute YOUR_D1_NAME --local --file=./src/schema.sql
```

**Start the dev server**:
```bash
npx wrangler dev
```

### 2. Local Development (Connected to Cloud Resources)

This mode connects your local dev server to your actual Cloudflare resources.

1.  **Configure `wrangler.toml`**: Ensure the resource IDs from your Cloudflare Dashboard are filled in this file.
	```toml
	# wrangler.toml
	[[d1_databases]]
	binding = "DB"
	database_name = "notes-db"
	database_id = "YOUR_D1_DATABASE_ID" # Replace

	[[kv_namespaces]]
	binding = "NOTES_KV"
	id = "YOUR_KV_NAMESPACE_ID" # Replace

	[[r2_buckets]]
	binding = "NOTES_R2_BUCKET"
	bucket_name = "notes-r2-bucket"
	```
2.  **Create `.dev.vars` file**: Create this file in the project root for your local secrets.
	```ini
	# .dev.vars (This file is ignored by Git)
	USERNAME="dev_user"
	PASSWORD="dev_password"
	```
3.  **Start the remote-connected dev server**:
	```bash
	npx wrangler dev --remote
	```
