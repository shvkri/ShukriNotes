const NOTES_PER_PAGE = 10;
const SESSION_DURATION_SECONDS = 30*86400; 
const SESSION_COOKIE = '__session';
export default {
	async fetch(request, env, ctx) {
		return await handleApiRequest(request, env);
	},
};


async function handleApiRequest(request, env) {
	const { pathname } = new URL(request.url);

	
	
	const sharePageMatch = pathname.match(/^\/share\/([a-zA-Z0-9-]+)$/);
	if (sharePageMatch) {
		const publicId = sharePageMatch[1];
		
		const targetUrl = new URL('/share.html', request.url);
		targetUrl.searchParams.set('id', publicId);
		
		return Response.redirect(targetUrl.toString(), 302);
	}
	
	const publicNoteMatch = pathname.match(/^\/api\/public\/note\/([a-zA-Z0-9-]+)$/);
	if (publicNoteMatch && request.method === 'GET') {
		const publicId = publicNoteMatch[1];
		return handlePublicNoteRequest(publicId, env);
	}
	
	const publicRawNoteMatch = pathname.match(/^\/api\/public\/note\/raw\/([a-zA-Z0-9-]+)$/);
	if (publicRawNoteMatch && request.method === 'GET') {
		const publicId = publicRawNoteMatch[1];
		return handlePublicRawNoteRequest(publicId, env);
	}
	

	
	const publicFileMatch = pathname.match(/^\/api\/public\/file\/([a-zA-Z0-9-]+)$/);
	if (publicFileMatch) {
		const publicId = publicFileMatch[1];
		return handlePublicFileRequest(publicId, request, env);
	}

	const tgProxyMatch = pathname.match(/^\/api\/tg-media-proxy\/([^\/]+)$/);
	if (tgProxyMatch) {
		return handleTelegramProxy(request, env);
	}
	
	const telegramMatch = pathname.match(/^\/api\/telegram_webhook\/([^\/]+)$/);
	if (request.method === 'POST' && telegramMatch) {
		const secret = telegramMatch[1];
		return handleTelegramWebhook(request, env, secret);
	}

	if (request.method === 'POST' && pathname === '/api/login') {
		return handleLogin(request, env);
	}
	if (request.method === 'POST' && pathname === '/api/logout') {
		return handleLogout(request, env);
	}

	
	const session = await isSessionAuthenticated(request, env);
	if (!session) {
		return jsonResponse({ error: 'Unauthorized' }, 401);
	}

	if (request.method === 'POST' && pathname === '/api/notes/merge') {
		return handleMergeNotes(request, env);
	}

	const shareNoteMatch = pathname.match(/^\/api\/notes\/(\d+)\/share$/);
	if (shareNoteMatch) {
		const [, noteId] = shareNoteMatch;
		if (request.method === 'POST') {
			return handleShareNoteRequest(noteId, request, env);
		}
		if (request.method === 'DELETE') {
			return handleUnshareNoteRequest(noteId, env);
		}
	}

	const shareFileMatch = pathname.match(/^\/api\/notes\/(\d+)\/files\/([a-zA-Z0-9-]+)\/share$/);
	if (shareFileMatch && request.method === 'POST') {
		const [, noteId, fileId] = shareFileMatch;
		return handleShareFileRequest(noteId, fileId, request, env);
	}

	
	if (pathname.startsWith('/api/docs')) {
		if (pathname === '/api/docs/tree' && request.method === 'GET') {
			return handleDocsTree(request, env);
		}
		if (pathname === '/api/docs/node' && request.method === 'POST') {
			return handleDocsNodeCreate(request, env);
		}

		
		const renameMatch = pathname.match(/^\/api\/docs\/node\/([a-zA-Z0-9-]+)\/rename$/);
		if (renameMatch && request.method === 'POST') {
			const nodeId = renameMatch[1];
			return handleDocsNodeRename(request, nodeId, env);
		}

		
		const nodeDetailMatch = pathname.match(/^\/api\/docs\/node\/([a-zA-Z0-9-]+)$/);
		if (nodeDetailMatch) {
			const nodeId = nodeDetailMatch[1];
			if (request.method === 'GET') {
				return handleDocsNodeGet(request, nodeId, env);
			}
			if (request.method === 'PUT') {
				return handleDocsNodeUpdate(request, nodeId, env);
			}
			if (request.method === 'DELETE') {
				return handleDocsNodeDelete(request, nodeId, env);
			}
			if (request.method === 'PATCH') {
				return handleDocsNodeMove(request, nodeId, env);
			}
		}
	}
	

	if (pathname === '/api/settings') {
		if (request.method === 'GET') {
			return handleGetSettings(request, env);
		}
		if (request.method === 'PUT') {
			return handleSetSettings(request, env);
		}
	}
	if (request.method === 'POST' && pathname === '/api/upload/image') {
		return handleStandaloneImageUpload(request, env);
	}
	const imageMatch = pathname.match(/^\/api\/images\/([a-zA-Z0-9-]+)$/);
	if (imageMatch) {
		const imageId = imageMatch[1];
		return handleServeStandaloneImage(imageId, env);
	}
	if (request.method === 'GET' && pathname === '/api/attachments') {
		return handleGetAllAttachments(request, env);
	}
	if (request.method === 'POST' && pathname === '/api/proxy/upload/imgur') {
		return handleImgurProxyUpload(request, env);
	}
	if (pathname === '/api/stats') {
		return handleStatsRequest(request, env);
	}
	if (pathname === '/api/tags') {
		return handleTagsList(request, env);
	}
	const fileMatch = pathname.match(/^\/api\/files\/([^\/]+)\/([^\/]+)$/);
	if (fileMatch) {
		const [, noteId, fileId] = fileMatch;
		return handleFileRequest(noteId, fileId, request, env);
	}
	if (pathname === '/api/notes/timeline') {
		return handleTimelineRequest(request, env);
	}
	if (pathname === '/api/search') {
		return handleSearchRequest(request, env);
	}
	const noteDetailMatch = pathname.match(/^\/api\/notes\/([^\/]+)$/);
	if (noteDetailMatch) {
		const noteId = noteDetailMatch[1];
		return handleNoteDetail(request, noteId, env);
	}

	if (pathname === '/api/notes') {
		return handleNotesList(request, env);
	}
	return new Response('Not Found', { status: 404 });
}


async function handleStatsRequest(request, env) {
	const db = env.DB;
	try {
		const memosCountQuery = db.prepare("SELECT COUNT(*) as total FROM notes");
		const tagsCountQuery = db.prepare("SELECT COUNT(DISTINCT tag_id) as total FROM note_tags");
		const oldestNoteQuery = db.prepare("SELECT MIN(updated_at) as oldest_ts FROM notes");

		
		const [memosResult, tagsResult, oldestNoteResult] = await Promise.all([
			memosCountQuery.first(),
			tagsCountQuery.first(),
			oldestNoteQuery.first()
		]);

		
		const stats = {
			memos: memosResult.total || 0,
			tags: tagsResult.total || 0,
			oldestNoteTimestamp: oldestNoteResult.oldest_ts || null
		};
		return jsonResponse(stats);
	} catch (e) {
		console.error("Stats Error:", e.message);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}


async function handleTimelineRequest(request, env) {
	const db = env.DB;
	try {
		const { searchParams } = new URL(request.url);
		const timezone = searchParams.get('timezone') || 'UTC';
		
		
		
		const stmt = db.prepare("SELECT updated_at FROM notes ORDER BY updated_at DESC");
		const { results } = await stmt.all();
		if (!results) {
			return jsonResponse({});
		}
		const timezoneFormatter = new Intl.DateTimeFormat('en-US', { 
			timeZone: timezone,
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
		});
		
		const timeline = {};
		for (const note of results) {
			const date = new Date(note.updated_at);
			const parts = timezoneFormatter.formatToParts(date);
			const year = parseInt(parts.find(p => p.type === 'year').value, 10);
			const month = parseInt(parts.find(p => p.type === 'month').value, 10);
			const day = parseInt(parts.find(p => p.type === 'day').value, 10);

			
			if (!timeline[year]) {
				timeline[year] = { count: 0, months: {} };
			}
			
			if (!timeline[year].months[month]) {
				timeline[year].months[month] = { count: 0, days: {} };
			}
			
			if (!timeline[year].months[month].days[day]) {
				timeline[year].months[month].days[day] = { count: 0 };
			}
			
			timeline[year].count++;
			timeline[year].months[month].count++;
			timeline[year].months[month].days[day].count++;
		}
		return jsonResponse(timeline);
	} catch (e) {
		console.error("Timeline Error:", e.message);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

async function handleSearchRequest(request, env) {
	const { searchParams } = new URL(request.url);
	const query = searchParams.get('q');

	
	if (!query || query.trim().length === 0) {
		
		return handleNotesList(request, env);
	}
	
	if (query.trim().length < 2) {
		return jsonResponse({ notes: [], hasMore: false });
	}

	
	const page = parseInt(searchParams.get('page') || '1');
	const offset = (page - 1) * NOTES_PER_PAGE;
	const limit = NOTES_PER_PAGE;
	const tagName = searchParams.get('tag');
	const startTimestamp = searchParams.get('startTimestamp');
	const endTimestamp = searchParams.get('endTimestamp');
	const isFavoritesMode = searchParams.get('favorites') === 'true';

	const db = env.DB;
	try {
		// Escape double quotes and wrap in double quotes to handle hyphens and other special characters
		// This treats the query as a literal phrase prefix.
		const escapedQuery = query.replace(/"/g, '""');
		let whereClauses = ["notes_fts MATCH ?"];
		let bindings = [`"${escapedQuery}"*`];
		let joinClause = "";
		if (isFavoritesMode) {
			whereClauses.push("n.is_favorited = 1");
		}
		if (startTimestamp && endTimestamp) {
			const startMs = parseInt(startTimestamp);
			const endMs = parseInt(endTimestamp);
			if (!isNaN(startMs) && !isNaN(endMs)) {
				whereClauses.push("n.updated_at >= ? AND n.updated_at < ?");
				bindings.push(startMs, endMs);
			}
		}
		if (tagName) {
			joinClause = `
                JOIN note_tags nt ON n.id = nt.note_id
                JOIN tags t ON nt.tag_id = t.id
            `;
			whereClauses.push("t.name = ?");
			bindings.push(tagName);
		}

		const whereString = whereClauses.join(" AND ");
		const stmt = db.prepare(`
            SELECT n.* FROM notes n
            JOIN notes_fts fts ON n.id = fts.rowid
            ${joinClause}
            WHERE ${whereString}
            ORDER BY rank
            LIMIT ? OFFSET ?
        `);

		bindings.push(limit + 1, offset);
		const { results: notesPlusOne } = await stmt.bind(...bindings).all();

		const hasMore = notesPlusOne.length > limit;
		const notes = notesPlusOne.slice(0, limit);

		notes.forEach(note => {
			if (typeof note.files === 'string') {
				try { note.files = JSON.parse(note.files); } catch (e) { note.files = []; }
			}
		});
		return jsonResponse({ notes, hasMore });
	} catch (e) {
		console.error("Search Error:", e.message);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}


async function handleTagsList(request, env) {
	const db = env.DB;
	try {
		
		
		const stmt = db.prepare(`
            SELECT t.name, COUNT(nt.note_id) as count
            FROM tags t
            LEFT JOIN note_tags nt ON t.id = nt.tag_id
            GROUP BY t.id, t.name
            HAVING count > 0 
            ORDER BY count DESC, t.name ASC
        `);
		const { results } = await stmt.all();
		return jsonResponse(results);
	} catch (e) {
		console.error("Tags List Error:", e.message);
		return jsonResponse({ error: 'Database Error' }, 500);
	}
}


async function isSessionAuthenticated(request, env) {
	const cookieHeader = request.headers.get('Cookie');
	if (!cookieHeader || !cookieHeader.includes(SESSION_COOKIE)) {
		return null;
	}
	const cookies = cookieHeader.split(';').map(c => c.trim());
	const sessionCookie = cookies.find(c => c.startsWith(`${SESSION_COOKIE}=`));
	if (!sessionCookie) return null;
	const sessionId = sessionCookie.split('=')[1];
	if (!sessionId) return null;
	const session = await env.NOTES_KV.get(`session:${sessionId}`, 'json');
	return session || null;
}


async function handleLogin(request, env) {
	try {
		const { username, password } = await request.json();
		if (username === env.USERNAME && password === env.PASSWORD) {
			const sessionId = crypto.randomUUID();
			const sessionData = { username, loggedInAt: Date.now() };
			await env.NOTES_KV.put(`session:${sessionId}`, JSON.stringify(sessionData), {
				expirationTtl: SESSION_DURATION_SECONDS,
			});
			const headers = new Headers();
			headers.append('Set-Cookie', `${SESSION_COOKIE}=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION_SECONDS}`);
			return jsonResponse({ success: true }, 200, headers);
		}
	} catch (e) {
		console.error("Login Error:", e.message);
	}
	return jsonResponse({ error: 'Invalid credentials' }, 401);
}


async function handleLogout(request, env) {
	const cookieHeader = request.headers.get('Cookie');
	if (cookieHeader && cookieHeader.includes(SESSION_COOKIE)) {
		const sessionId = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
		if (sessionId) {
			await env.NOTES_KV.delete(`session:${sessionId}`);
		}
	}
	const headers = new Headers();
	headers.append('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
	return jsonResponse({ success: true }, 200, headers);
}


async function handleGetSettings(request, env) {
	const defaultSettings = {
		showSearchBar: true,
		showStatsCard: true,
		showCalendar: true,
		showTags: true,
		showTimeline: true,
		showRightSidebar: true,
		hideEditorInWaterfall: false,
		showHeatmap: true, 
		imageUploadDestination: 'local', 
		imgurClientId: '',
		surfaceColor: '#ffffff',
		surfaceColorDark: '#151f31',
		surfaceOpacity: 1,
		backgroundOpacity: 1, 
		backgroundImage: '/bg.jpg',
		backgroundBlur: 0,
		waterfallCardWidth: 320,
		enableDateGrouping: false,
		telegramProxy: false,
		showFavorites: true,  
		showArchive: true,      
		enablePinning: true,    
		enableSharing: true,    
		showDocs: true,          
		enableContentTruncation: false,
	};

	let savedSettings = await env.NOTES_KV.get('user_settings', 'json');

	
	if (!savedSettings) {
		return jsonResponse(defaultSettings);
	}
	return jsonResponse(savedSettings);
}


async function handleSetSettings(request, env) {
	try {
		const settingsToSave = await request.json();
		await env.NOTES_KV.put('user_settings', JSON.stringify(settingsToSave));
		return jsonResponse({ success: true });
	} catch (e) {
		console.error("Set Settings Error:", e.message);
		return jsonResponse({ error: 'Failed to save settings' }, 500);
	}
}


async function handleNotesList(request, env) {
	const db = env.DB;

	try {
		switch (request.method) {
			case 'GET': {
				const url = new URL(request.url);
				const page = parseInt(url.searchParams.get('page') || '1');
				const offset = (page - 1) * NOTES_PER_PAGE;
				const limit = NOTES_PER_PAGE;

				const startTimestamp = url.searchParams.get('startTimestamp');
				const endTimestamp = url.searchParams.get('endTimestamp');
				const tagName = url.searchParams.get('tag');
				const isFavoritesMode = url.searchParams.get('favorites') === 'true';
				const isArchivedMode = url.searchParams.get('archived') === 'true';

				let whereClauses = [];
				let bindings = [];
				let joinClause = "";

				if (isArchivedMode) {
					whereClauses.push("n.is_archived = 1");
				} else {
					
					whereClauses.push("n.is_archived = 0");
				}

				if (startTimestamp && endTimestamp) {
					
					const startMs = parseInt(startTimestamp);
					const endMs = parseInt(endTimestamp);

					if (!isNaN(startMs) && !isNaN(endMs)) {
						whereClauses.push("updated_at >= ? AND updated_at < ?");
						bindings.push(startMs, endMs);
					}
				}
				if (tagName) {
					joinClause = `
                    JOIN note_tags nt ON n.id = nt.note_id
                    JOIN tags t ON nt.tag_id = t.id
                `;
					whereClauses.push("t.name = ?");
					bindings.push(tagName);
				}
				if (isFavoritesMode) {
					whereClauses.push("n.is_favorited = 1");
				}
				const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

				const query = `
                SELECT n.* FROM notes n
                ${joinClause}
                ${whereClause}
                ORDER BY n.is_pinned DESC, n.updated_at DESC
                LIMIT ? OFFSET ?
            `;

				
				bindings.push(limit + 1, offset);

				const notesStmt = db.prepare(query);
				const { results: notesPlusOne } = await notesStmt.bind(...bindings).all();

				const hasMore = notesPlusOne.length > limit;
				const notes = notesPlusOne.slice(0, limit);

				notes.forEach(note => {
					if (typeof note.files === 'string') {
						try { note.files = JSON.parse(note.files); } catch (e) { note.files = []; }
					}
				});

				return jsonResponse({ notes, hasMore });
			}

			case 'POST': {
				const formData = await request.formData();
				const content = formData.get('content')?.toString() || '';
				const files = formData.getAll('file');

				if (!content.trim() && files.every(f => !f.name)) {
					return jsonResponse({ error: 'Content or file is required.' }, 400);
				}

				const now = Date.now();
				const filesMeta = [];

				
				const picUrls = extractImageUrls(content);

				
				const insertStmt = db.prepare(
					"INSERT INTO notes (content, files, is_pinned, created_at, updated_at, pics) VALUES (?, ?, 0, ?, ?, ?) RETURNING id"
				);
				
				
				const { id: noteId } = await insertStmt.bind(content, "[]", now, now, picUrls).first();
				if (!noteId) {
					throw new Error("Failed to create note and get ID.");
				}

				
				for (const file of files) {
					
					if (file.name && file.size > 0 && !file.type.startsWith('image/')) {
						const fileId = crypto.randomUUID();
						await env.NOTES_R2_BUCKET.put(`${noteId}/${fileId}`, file.stream());
						filesMeta.push({ id: fileId, name: file.name, size: file.size, type: file.type });
					}
				}

				
				if (filesMeta.length > 0) {
					const updateFilesStmt = db.prepare("UPDATE notes SET files = ? WHERE id = ?");
					await updateFilesStmt.bind(JSON.stringify(filesMeta), noteId).run();
				}

				await processNoteTags(db, noteId, content);
				
				const newNote = await db.prepare("SELECT * FROM notes WHERE id = ?").bind(noteId).first();
				if (typeof newNote.files === 'string') {
					newNote.files = JSON.parse(newNote.files);
				}

				return jsonResponse(newNote, 201);
			}
		}
	} catch (e) {
		console.error("D1 Error:", e.message, e.cause);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}


async function handleNoteDetail(request, noteId, env) {
	const db = env.DB;
	const id = parseInt(noteId);
	if (isNaN(id)) {
		return new Response('Invalid Note ID', { status: 400 });
	}

	try {
		
		let existingNote = await db.prepare("SELECT * FROM notes WHERE id = ?").bind(id).first();
		if (!existingNote) {
			return new Response('Not Found', { status: 404 });
		}
		
		try {
			if (typeof existingNote.files === 'string') {
				existingNote.files = JSON.parse(existingNote.files);
			}
		} catch(e) {
			existingNote.files = [];
		}

		switch (request.method) {
			case 'PUT': {
				const formData = await request.formData();
				const shouldUpdateTimestamp = formData.get('update_timestamp') !== 'false';

				if (formData.has('content')) {
					const content = formData.get('content')?.toString() ?? existingNote.content;
					let currentFiles = existingNote.files;

					
					
					const filesToDelete = JSON.parse(formData.get('filesToDelete') || '[]');
					if (filesToDelete.length > 0) {
						const r2KeysToDelete = filesToDelete.map(fileId => `${id}/${fileId}`);
						await env.NOTES_R2_BUCKET.delete(r2KeysToDelete);
						currentFiles = currentFiles.filter(file => !filesToDelete.includes(file.id));
					}

					
					const hasNewFiles = formData.getAll('file').some(f => f.name && f.size > 0);
					if (content.trim() === '' && currentFiles.length === 0 && !hasNewFiles) {
						
						
						const allR2Keys = existingNote.files.map(file => `${id}/${file.id}`);
						if (allR2Keys.length > 0) {
							await env.NOTES_R2_BUCKET.delete(allR2Keys);
						}
						
						await db.prepare("DELETE FROM notes WHERE id = ?").bind(id).run();
						
						return jsonResponse({ success: true, noteDeleted: true });
					}
					
					const newFiles = formData.getAll('file');
					for (const file of newFiles) {
						
						if (file.name && file.size > 0 && !file.type.startsWith('image/')) {
							const fileId = crypto.randomUUID();
							await env.NOTES_R2_BUCKET.put(`${id}/${fileId}`, file.stream());
							currentFiles.push({ id: fileId, name: file.name, size: file.size, type: file.type });
						}
					}

					
					const picUrls = extractImageUrls(content);
					const newTimestamp = shouldUpdateTimestamp ? Date.now() : existingNote.updated_at;
					
					const stmt = db.prepare(
						"UPDATE notes SET content = ?, files = ?, updated_at = ?, pics = ? WHERE id = ?"
					);
					await stmt.bind(content, JSON.stringify(currentFiles), newTimestamp, picUrls, id).run();
					await processNoteTags(db, id, content);
				}

				if (formData.has('isPinned')) { 
					const isPinned = formData.get('isPinned') === 'true' ? 1 : 0;
					const stmt = db.prepare("UPDATE notes SET is_pinned = ? WHERE id = ?");
					await stmt.bind(isPinned, id).run();
				}
				if (formData.has('isFavorited')) {
					const isFavorited = formData.get('isFavorited') === 'true' ? 1 : 0;
					const stmt = db.prepare("UPDATE notes SET is_favorited = ? WHERE id = ?");
					await stmt.bind(isFavorited, id).run();
				}
				if (formData.has('is_archived')) {
					const isArchived = formData.get('is_archived') === 'true' ? 1 : 0;
					const stmt = db.prepare("UPDATE notes SET is_archived = ? WHERE id = ?");
					await stmt.bind(isArchived, id).run();
				}

				const updatedNote = await db.prepare("SELECT * FROM notes WHERE id = ?").bind(id).first();
				if (typeof updatedNote.files === 'string') {
					updatedNote.files = JSON.parse(updatedNote.files);
				}
				return jsonResponse(updatedNote);
			}

			case 'DELETE': {
				let allR2KeysToDelete = [];

				if (existingNote.files && existingNote.files.length > 0) {
					const attachmentKeys = existingNote.files
						.filter(file => file.id)
						.map(file => `${id}/${file.id}`);
					allR2KeysToDelete.push(...attachmentKeys);
				}
				let picUrls = [];
				if (typeof existingNote.pics === 'string') {
					try { picUrls = JSON.parse(existingNote.pics); } catch (e) { }
				}

				if (picUrls.length > 0) {
					const imageKeys = picUrls.map(url => {
						const imageMatch = url.match(/^\/api\/images\/([a-zA-Z0-9-]+)$/);
						if (imageMatch) {
							return `uploads/${imageMatch[1]}`;
						}
						const fileMatch = url.match(/^\/api\/files\/\d+\/([a-zA-Z0-9-]+)$/);
						if (fileMatch) {
							return `${id}/${fileMatch[1]}`;
						}
						return null;
					}).filter(key => key !== null);

					allR2KeysToDelete.push(...imageKeys);
				}

				if (allR2KeysToDelete.length > 0) {
					await env.NOTES_R2_BUCKET.delete(allR2KeysToDelete);
				}

				await db.prepare("DELETE FROM notes WHERE id = ?").bind(id).run();

				return new Response(null, { status: 204 });
			}
		}
	} catch (e) {
		console.error("D1 Error:", e.message, e.cause);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

async function handleFileRequest(noteId, fileId, request, env) {
	const db = env.DB;
	const id = parseInt(noteId);
	if (isNaN(id)) {
		return new Response('Invalid Note ID', { status: 400 });
	}

	
	const note = await db.prepare("SELECT files FROM notes WHERE id = ?").bind(id).first();

	
	

	let files = [];
	if (note && typeof note.files === 'string') {
		try {
			files = JSON.parse(note.files);
		} catch (e) {
			
		}
	}

	const fileMeta = files.find(f => f.id === fileId);

	
	const object = await env.NOTES_R2_BUCKET.get(`${id}/${fileId}`);
	if (object === null) {
		
		return new Response('File not found in storage', { status: 404 });
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers); 
	headers.set('etag', object.httpEtag);
	headers.set('Cache-Control', 'public, max-age=86400, immutable');

	
	if (fileMeta) {
		
		const contentType = fileMeta.type || 'application/octet-stream';
		const fileExtension = fileMeta.name.split('.').pop().toLowerCase();
		const textLikeExtensions = ['yml', 'yaml', 'md', 'log', 'toml', 'sh', 'py', 'js', 'json', 'css', 'html'];

		if (contentType.startsWith('text/') || textLikeExtensions.includes(fileExtension)) {
			headers.set('Content-Type', 'text/plain; charset=utf-8');
		} else {
			headers.set('Content-Type', contentType);
		}

		const isPreview = new URL(request.url).searchParams.get('preview') === 'true';
		const disposition = isPreview ? 'inline' : 'attachment';
		headers.set('Content-Disposition', `${disposition}; filename="${encodeURIComponent(fileMeta.name)}"`);
	} else {
		
		
		
		
		headers.set('Content-Disposition', 'inline');
	}

	return new Response(object.body, { headers });
}

function telegramEntitiesToMarkdown(text, entities = []) {
	if (!entities || entities.length === 0) {
		return text;
	}

	
	const tagPriority = {
		'text_link': 10,
		'bold': 20,
		'italic': 30, 
		'underline': 40,
		'strikethrough': 50,
		'spoiler': 60,
		'code': 70,
		'pre': 80
	};
	const mods = Array.from({ length: text.length + 1 }, () => ({ openTags: [], closeTags: [] }));
	entities.forEach(entity => {
		const { type, offset, length, url, language } = entity;
		const endOffset = offset + length;
		const priority = tagPriority[type] || 100;
		let startTag = '', endTag = '';
		switch (type) {
			case 'bold':          startTag = '**'; endTag = '**'; break;
			case 'italic':        startTag = '_';  endTag = '_';  break;
			case 'underline':     startTag = '__'; endTag = '__'; break;
			case 'strikethrough': startTag = '~~'; endTag = '~~'; break;
			case 'spoiler':       startTag = '||'; endTag = '||'; break;
			case 'code':          startTag = '`';  endTag = '`';  break;
			case 'text_link':
				startTag = '[';
				const encodedUrl = url.replace(/\(/g, '%28').replace(/\)/g, '%29');
				endTag = `](${encodedUrl})`;
				break;
			case 'pre':
				startTag = `\`\`\`${language || ''}\n`; endTag = '\n```'; break;
		}

		if (startTag) {
			mods[offset].openTags.push({ tag: startTag, priority });
			mods[endOffset].closeTags.push({ tag: endTag, priority });
		}
	});

	let result = '';
	let lastIndex = 0;
	const adjacentSensitiveTags = ['**', '_', '__', '~~', '||', '`'];

	for (let i = 0; i <= text.length; i++) {
		const mod = mods[i];
		if (mod.openTags.length === 0 && mod.closeTags.length === 0) {
			continue;
		}
		result += text.substring(lastIndex, i);
		
		
		const closeTags = mod.closeTags.sort((a, b) => b.priority - a.priority);
		const openTags = mod.openTags.sort((a, b) => a.priority - b.priority);

		closeTags.forEach(({ tag }) => {
			if (adjacentSensitiveTags.includes(tag) && result.endsWith(tag)) {
				result += '\u200B'; 
			}
			result += tag;
		});

		openTags.forEach(({ tag }) => {
			if (adjacentSensitiveTags.includes(tag) && result.endsWith(tag)) {
				result += '\u200B'; 
			}
			result += tag;
		});

		lastIndex = i;
	}

	if (lastIndex < text.length) {
		result += text.substring(lastIndex);
	}
	result = result.replace(
		/\*\*((?:(?:\p{Emoji}|\p{Emoji_Component})+))\*\*/gu,
		'$1'
	);
	result = result.replace(/\*\*(\s+)\*\*/g, '$1');
	result = result.replace(/\*\*(\s+)(.*?)\*\*/g, '$1**$2**');
	return result;
}


async function handleTelegramProxy(request, env) {
	const { pathname } = new URL(request.url);
	const match = pathname.match(/^\/api\/tg-media-proxy\/([^\/]+)$/);

	if (!match || !match[1]) {
		return new Response('Invalid file_id', { status: 400 });
	}

	const fileId = match[1];
	const botToken = env.TELEGRAM_BOT_TOKEN;

	if (!botToken) {
		console.error("TELEGRAM_BOT_TOKEN secret is not set.");
		return new Response('Bot not configured', { status: 500 });
	}

	try {
		
		const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
		const fileInfoRes = await fetch(getFileUrl);
		const fileInfo = await fileInfoRes.json();

		if (!fileInfo.ok) {
			console.error(`Telegram getFile API error for file_id ${fileId}:`, fileInfo.description);
			return new Response(`Telegram API error: ${fileInfo.description}`, { status: 502 }); // 502 Bad Gateway
		}

		
		const temporaryDownloadUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;

		
		return Response.redirect(temporaryDownloadUrl, 302);

	} catch (e) {
		console.error("Telegram Proxy Error:", e.message);
		return new Response('Failed to proxy Telegram media', { status: 500 });
	}
}


async function handleTelegramWebhook(request, env, secret) {
	if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
		return new Response('Unauthorized', { status: 401 });
	}
	let chatId = null;
	const botToken = env.TELEGRAM_BOT_TOKEN;
	try {
		const update = await request.json();
		const message = update.message || update.channel_post;
		if (!message) {
			return new Response('OK', { status: 200 });
		}

		const authorizedIdsStr = env.AUTHORIZED_TELEGRAM_IDS;
		if (!authorizedIdsStr) {
			console.error("Security Warning: AUTHORIZED_TELEGRAM_IDS environment variable not set.");
			return new Response('OK', { status: 200 });
		}
		chatId = message.chat.id;
		const senderId = message.from?.id;
		if (!senderId || authorizedIdsStr != senderId.toString()) {
			console.log(`Blocked request from unauthorized or unknown user ${senderId || ''} .`);
			return new Response('OK', { status: 200 });
		}

		const db = env.DB;
		const bucket = env.NOTES_R2_BUCKET;
		if (!botToken) {
			console.error("TELEGRAM_BOT_TOKEN secret is not set.");
			return new Response('Bot not configured', { status: 500 });
		}

		const text = message.text || message.caption || '';
		const entities = message.entities || message.caption_entities || [];
		const contentFromTelegram = telegramEntitiesToMarkdown(text, entities);

		let forwardInfo = '';
		if (message.forward_from_chat) {
			const chat = message.forward_from_chat;
			const title = chat.title || 'a channel';
			if (chat.username) {
				const channelUrl = `https://t.me/${chat.username}`;
				forwardInfo = `*Forwarded from [${title}](${channelUrl})*`;
			} else {
				forwardInfo = `*Forwarded from ${title}*`;
			}
		} else if (message.forward_from) {
			const fromName = `${message.forward_from.first_name || ''} ${message.forward_from.last_name || ''}`.trim();
			forwardInfo = `*Forwarded from ${fromName}*`;
		}

		let replyMarkdown = '';
		if (message.reply_to_message) {
			const originalMessage = message.reply_to_message;
			const originalText = originalMessage.text || originalMessage.caption || '';
			const originalEntities = originalMessage.entities || originalMessage.caption_entities || [];
			const originalContentMarkdown = telegramEntitiesToMarkdown(originalText, originalEntities);
			if (originalContentMarkdown.trim()) {
				replyMarkdown = originalContentMarkdown.trim().split('\n').map(line => `> ${line}`).join('\n');
			}
		}

		const photo = message.photo ? message.photo[message.photo.length - 1] : null;
		const document = message.document;
		const video = message.video;

		if (!contentFromTelegram.trim() && !photo && !document && !video) {
			return new Response('OK', { status: 200 });
		}
		const defaultSettings = { telegramProxy: false };
		let userSettings = await env.NOTES_KV.get('user_settings', 'json');
		if (!userSettings) {
			userSettings = defaultSettings;
		}
		const settings = { ...defaultSettings, ...userSettings };
		const now = Date.now();
		let filesMeta = [];
		let picObjects = [];
		let videoObjects = [];
		let mediaEmbeds = [];

		const insertStmt = db.prepare("INSERT INTO notes (content, files, is_pinned, created_at, updated_at, pics, videos) VALUES (?, ?, 0, ?, ?, ?, ?) RETURNING id");
		const { id: noteId } = await insertStmt.bind('', '[]', now, now, '[]', '[]').first();
		if (!noteId) {
			throw new Error("Failed to create note record in database.");
		}

		
		if (photo) {
			const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${photo.file_id}`;
			const fileInfoRes = await fetch(getFileUrl);
			const fileInfo = await fileInfoRes.json();
			if (!fileInfo.ok) throw new Error(`Telegram getFile API error (photo): ${fileInfo.description}`);
			const filePath = fileInfo.result.file_path;
			const fileName = `photo_${message.message_id}.${(filePath.split('.').pop() || 'jpg')}`;
			const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
			const fileRes = await fetch(downloadUrl);
			if (!fileRes.ok) throw new Error("Failed to download image from Telegram.");
			const fileId = crypto.randomUUID();
			await bucket.put(`${noteId}/${fileId}`, fileRes.body);
			const internalFileUrl = `/api/files/${noteId}/${fileId}`;

			picObjects.push(internalFileUrl); 
			mediaEmbeds.push(`![${fileName}](${internalFileUrl})`);
		}

		if (video) {
			if (settings.telegramProxy) {
				
				const proxyUrl = `/api/tg-media-proxy/${video.file_id}`;
				videoObjects.push(proxyUrl);
				mediaEmbeds.push(`<video src="${proxyUrl}" width="100%" controls muted></video>`);
			} else {
				
				const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${video.file_id}`;
				const fileInfoRes = await fetch(getFileUrl);
				const fileInfo = await fileInfoRes.json();
				if (!fileInfo.ok) throw new Error(`Telegram getFile API error (video): ${fileInfo.description}`);
				const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;
				const fileRes = await fetch(downloadUrl);
				if (!fileRes.ok) throw new Error("Failed to download video from Telegram.");
				const fileId = crypto.randomUUID();
				await bucket.put(`${noteId}/${fileId}`, fileRes.body);
				const internalFileUrl = `/api/files/${noteId}/${fileId}`;
				videoObjects.push(internalFileUrl);
				mediaEmbeds.push(`<video src="${internalFileUrl}" width="100%" controls muted></video>`);
			}
		}

		
		if (document) {
			if (settings.telegramProxy) {
				
				
				filesMeta.push({
					type: 'telegram_document', 
					file_id: document.file_id,
					name: document.file_name,
					size: document.file_size
				});
				
				// finalContent += `\n\n[Proxy File: ${document.file_name}]`;
			} else {
				
				const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${document.file_id}`;
				const fileInfoRes = await fetch(getFileUrl);
				const fileInfo = await fileInfoRes.json();
				if (!fileInfo.ok) throw new Error(`Telegram getFile API error (document): ${fileInfo.description}`);
				const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;
				const fileRes = await fetch(downloadUrl);
				if (!fileRes.ok) throw new Error("Failed to download file from Telegram.");
				const fileId = crypto.randomUUID();
				await bucket.put(`${noteId}/${fileId}`, fileRes.body);
				filesMeta.push({
					id: fileId,
					name: document.file_name,
					size: document.file_size,
					type: document.mime_type || 'application/octet-stream'
				});
			}
		}

		const contentParts = [];
		if (forwardInfo) contentParts.push(forwardInfo);
		if (mediaEmbeds.length > 0) contentParts.push(mediaEmbeds.join('\n'));
		if (replyMarkdown) contentParts.push(replyMarkdown);
		if (contentFromTelegram.trim()) contentParts.push(contentFromTelegram.trim());

		let finalContent = "#TG " + contentParts.join('\n\n');

		const updateStmt = db.prepare("UPDATE notes SET content = ?, files = ?, pics = ?, videos = ? WHERE id = ?");
		await updateStmt.bind(
			finalContent,
			JSON.stringify(filesMeta),
			JSON.stringify(picObjects),
			JSON.stringify(videoObjects), 
			noteId
		).run();

		await processNoteTags(db, noteId, finalContent);
		await sendTelegramMessage(chatId, `✅ Note saved! (ID: ${noteId})`, botToken);

	} catch (e) {
		console.error("Telegram Webhook Error:", e.message);
		if (chatId && botToken) {
			await sendTelegramMessage(chatId, `❌ Error saving note: ${e.message}`, botToken);
		}
	}
	return new Response('OK', { status: 200 });
}

async function sendTelegramMessage(chatId, text, botToken) {
	const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
	const payload = {
		chat_id: chatId,
		text: text,
		parse_mode: 'Markdown' 
	};

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(payload)
		});
		if (!response.ok) {
			const errorBody = await response.json();
			console.error(`Failed to send Telegram message: ${errorBody.description}`);
		}
	} catch (error) {
		console.error(`Error sending Telegram message: ${error.message}`);
	}
}


function extractImageUrls(content) {
	
	
	
	
	
	const regex = /!\[.*?\]\((.*?)\)/g;

	
	
	const matches = Array.from(content.matchAll(regex));

	
	const urls = matches.map(match => match[1]);

	
	return JSON.stringify(urls);
}

async function processNoteTags(db, noteId, content) {
	const plainTextContent = content.replace(/<[^>]*>/g, '');
	
	const tagRegex = /#([\p{L}\p{N}_-]+)/gu;
	const urlRegex = /(https?:\/\/[^\s"']*[^\s"'.?,!])/g;

	
	const segments = plainTextContent.split(urlRegex);
	let allTags = [];

	
	segments.forEach(segment => {
		
		
		if (!/^(https?:\/\/[^\s"']*[^\s"'.?,!])/.test(segment)) {
			const matchedInSegment = [...segment.matchAll(tagRegex)].map(match => match[1].toLowerCase());
			allTags.push(...matchedInSegment);
		}
	});

	
	const uniqueTags = [...new Set(allTags)];

	const statements = [];
	statements.push(db.prepare("DELETE FROM note_tags WHERE note_id = ?").bind(noteId));

	if (uniqueTags.length > 0) {
		for (const tagName of uniqueTags) {
			await db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").bind(tagName).run();
			const tag = await db.prepare("SELECT id FROM tags WHERE name = ?").bind(tagName).first();
			if (tag) {
				statements.push(
					db.prepare("INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)")
						.bind(noteId, tag.id)
				);
			}
		}
	}
	if (statements.length > 0) {
		await db.batch(statements);
	}
}

async function handleStandaloneImageUpload(request, env) {
	try {
		const formData = await request.formData();
		const file = formData.get('file');

		if (!file || !file.name || file.size === 0) {
			return jsonResponse({ error: 'A file is required for upload.' }, 400);
		}

		const imageId = crypto.randomUUID();
		
		const r2Key = `uploads/${imageId}`;

		
		await env.NOTES_R2_BUCKET.put(r2Key, file.stream(), {
			httpMetadata: { contentType: file.type },
		});

		
		
		const imageUrl = `/api/images/${imageId}`;
		return jsonResponse({ success: true, url: imageUrl });

	} catch (e) {
		console.error("Standalone Image Upload Error:", e.message);
		return jsonResponse({ error: 'Upload failed', message: e.message }, 500);
	}
}


async function handleImgurProxyUpload(request, env) {
	try {
		const formData = await request.formData();
		
		const clientId = formData.get('clientId');
		if (!clientId) {
			return jsonResponse({ error: 'Imgur Client ID is required.' }, 400);
		}

		
		const imageFile = formData.get('file');
		const imgurFormData = new FormData();
		imgurFormData.append('image', imageFile);

		const imgurResponse = await fetch('https://api.imgur.com/3/image', {
			method: 'POST',
			headers: {
				'Authorization': `Client-ID ${clientId}`,
			},
			body: imgurFormData,
		});

		if (!imgurResponse.ok) {
			const errorBody = await imgurResponse.json();
			throw new Error(`Imgur API responded with status ${imgurResponse.status}: ${errorBody.data.error}`);
		}

		const result = await imgurResponse.json();

		if (!result.success) {
			throw new Error('Imgur API returned a failure response.');
		}

		return jsonResponse({ success: true, url: result.data.link });

	} catch (e) {
		console.error("Imgur Proxy Error:", e.message);
		return jsonResponse({ error: 'Imgur upload failed via proxy', message: e.message }, 500);
	}
}

async function handleGetAllAttachments(request, env) {
	const db = env.DB;
	const url = new URL(request.url);
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = 20; 
	const offset = (page - 1) * limit;

	try {
		
		const query = `
            WITH combined_attachments AS (
                SELECT
                    n.id AS noteId, n.updated_at AS timestamp, 'image' AS type,
                    json_each.value AS url, NULL AS name, NULL AS size, NULL AS id
                FROM notes n, json_each(n.pics) AS json_each
                WHERE json_valid(n.pics) AND json_array_length(n.pics) > 0

                UNION ALL

                SELECT
                    n.id AS noteId, n.updated_at AS timestamp, 'video' AS type,
                    json_each.value AS url, NULL AS name, NULL AS size, NULL AS id
                FROM notes n, json_each(n.videos) AS json_each
                WHERE json_valid(n.videos) AND json_array_length(n.videos) > 0

                UNION ALL

                SELECT
                    n.id AS noteId, n.updated_at AS timestamp, 'file' AS type,
                    NULL AS url, json_extract(json_each.value, '$.name') AS name,
                    json_extract(json_each.value, '$.size') AS size,
                    json_extract(json_each.value, '$.id') AS id
                FROM notes n, json_each(n.files) AS json_each
                WHERE json_valid(n.files) AND json_array_length(n.files) > 0
            )
            SELECT * FROM combined_attachments
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?;
        `;

		
		const stmt = db.prepare(query);
		const { results: attachmentsPlusOne } = await stmt.bind(limit + 1, offset).all();

		const hasMore = attachmentsPlusOne.length > limit;
		const attachments = attachmentsPlusOne.slice(0, limit);

		return jsonResponse({
			attachments: attachments,
			hasMore: hasMore
		});

	} catch (e) {
		console.error("Get All Attachments Error:", e.message);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}


async function handleServeStandaloneImage(imageId, env) {
	const r2Key = `uploads/${imageId}`;
	const object = await env.NOTES_R2_BUCKET.get(r2Key);

	if (object === null) {
		return new Response('File not found', { status: 404 });
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('etag', object.httpEtag);
	
	headers.set('Cache-Control', 'public, max-age=31536000, immutable');

	return new Response(object.body, { headers });
}



function buildTree(nodes, parentId = null) {
	const tree = [];
	nodes
		.filter(node => node.parent_id === parentId)
		.forEach(node => {
			const children = buildTree(nodes, node.id);
			if (children.length > 0) {
				node.children = children;
			}
			tree.push(node);
		});
	return tree;
}


async function handleDocsTree(request, env) {
	try {
		const stmt = env.DB.prepare("SELECT id, type, title, parent_id FROM nodes ORDER BY title ASC");
		const { results } = await stmt.all();
		const tree = buildTree(results, null);
		return jsonResponse(tree);
	} catch (e) {
		console.error("Docs Tree Error:", e.message);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}


async function handleDocsNodeGet(request, nodeId, env) {
	try {
		const stmt = env.DB.prepare("SELECT id, type, title, content FROM nodes WHERE id = ?");
		const node = await stmt.bind(nodeId).first();
		if (!node) {
			return jsonResponse({ error: 'Not Found' }, 404);
		}
		return jsonResponse(node);
	} catch (e) {
		console.error(`Docs Get Node Error (id: ${nodeId}):`, e.message);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}


async function handleDocsNodeUpdate(request, nodeId, env) {
	try {
		const { content } = await request.json();
		const now = Date.now();
		const stmt = env.DB.prepare("UPDATE nodes SET content = ?, updated_at = ? WHERE id = ?");
		await stmt.bind(content, now, nodeId).run();
		return jsonResponse({ success: true, id: nodeId });
	} catch (e) {
		console.error(`Docs Update Node Error (id: ${nodeId}):`, e.message);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}


async function handleDocsNodeCreate(request, env) {
	try {
		const { type, title, parent_id = null } = await request.json();
		if (!type || !title || !['file', 'folder'].includes(type)) {
			return jsonResponse({ error: 'Invalid input' }, 400);
		}

		const newNode = {
			id: crypto.randomUUID(),
			type,
			title,
			content: type === 'file' ? `# ${title}` : null,
			parent_id,
			created_at: Date.now(),
			updated_at: Date.now(),
		};

		const stmt = env.DB.prepare(
			"INSERT INTO nodes (id, type, title, content, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
		);
		await stmt.bind(...Object.values(newNode)).run();

		return jsonResponse(newNode, 201);
	} catch (e) {
		console.error("Docs Create Node Error:", e.message);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

/**
 * Recursively finds all descendant node IDs for a given parent ID.
 * @param {D1Database} db - The D1 database instance.
 * @param {string} parentId - The ID of the node to start from.
 * @returns {Promise<string[]>} A flat array of all descendant IDs.
 */
async function getAllDescendantIds(db, parentId) {
	let allIds = [];
	let queue = [parentId];
	while (queue.length > 0) {
		const currentId = queue.shift();
		const { results: children } = await db.prepare("SELECT id FROM nodes WHERE parent_id = ?").bind(currentId).all();
		if (children && children.length > 0) {
			const childIds = children.map(c => c.id);
			allIds.push(...childIds);
			queue.push(...childIds);
		}
	}
	return allIds;
}

// DELETE and REMOVE the entire `getAllDescendantIds` function.


async function handleDocsNodeDelete(request, nodeId, env) {
	const db = env.DB;
	try {
		const nodeToDelete = await db.prepare("SELECT id FROM nodes WHERE id = ?").bind(nodeId).first();
		if (!nodeToDelete) {
			return jsonResponse({ error: "Node not found." }, 404);
		}

		
		await db.prepare("DELETE FROM nodes WHERE id = ?").bind(nodeId).run();

		
		return jsonResponse({ success: true, deletedIds: [nodeId] });

	} catch (e) {
		console.error(`Docs Delete Node Error (id: ${nodeId}):`, e.message, e.cause);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

async function handleDocsNodeMove(request, nodeId, env) {
	const db = env.DB;
	try {
		const { new_parent_id } = await request.json();
		const nodeToMove = await db.prepare("SELECT * FROM nodes WHERE id = ?").bind(nodeId).first();

		// --- Validation ---
		if (!nodeToMove) {
			return jsonResponse({ error: "The node you are trying to move does not exist." }, 404);
		}
		if (nodeId === new_parent_id) {
			return jsonResponse({ error: "Cannot move a node into itself." }, 400);
		}
		if (nodeToMove.parent_id === new_parent_id) {
			return jsonResponse({ success: true, message: "Node is already in the target location." }); // No-op
		}

		if (new_parent_id !== null) {
			const parentNode = await db.prepare("SELECT type FROM nodes WHERE id = ?").bind(new_parent_id).first();
			if (!parentNode) {
				return jsonResponse({ error: "Target destination does not exist." }, 404);
			}
			if (parentNode.type !== 'folder') {
				return jsonResponse({ error: "Target destination must be a folder." }, 400);
			}
		}

		let currentParentId = new_parent_id;
		while (currentParentId !== null) {
			if (currentParentId === nodeId) {
				return jsonResponse({ error: "Cannot move a folder into one of its own descendants." }, 400);
			}
			// CRITICAL FIX: Check if the parent exists before trying to read its properties
			const parent = await db.prepare("SELECT parent_id FROM nodes WHERE id = ?").bind(currentParentId).first();
			if (!parent) {
				// This prevents a crash if the chain is broken
				break;
			}
			currentParentId = parent.parent_id;
		}

		// --- Update the node ---
		const stmt = db.prepare("UPDATE nodes SET parent_id = ?, updated_at = ? WHERE id = ?");
		await stmt.bind(new_parent_id, Date.now(), nodeId).run();

		return jsonResponse({ success: true });
	} catch (e) {
		console.error(`Docs Move Node Error (id: ${nodeId}):`, e.message, e.cause);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}

/**
 * PATCH /api/docs/node/:id/rename - Renames a node.
 */
async function handleDocsNodeRename(request, nodeId, env) {
	const db = env.DB;
	try {
		const { new_title } = await request.json();

		
		if (!new_title || typeof new_title !== 'string' || new_title.trim() === '') {
			return jsonResponse({ error: "A valid new title is required." }, 400);
		}

		const stmt = db.prepare("UPDATE nodes SET title = ?, updated_at = ? WHERE id = ?");
		await stmt.bind(new_title.trim(), Date.now(), nodeId).run();

		return jsonResponse({ success: true, new_title: new_title.trim() });
	} catch (e) {
		console.error(`Docs Rename Node Error (id: ${nodeId}):`, e.message, e.cause);
		return jsonResponse({ error: 'Database Error', message: e.message }, 500);
	}
}


async function handleShareFileRequest(noteId, fileId, request, env) {
	const db = env.DB;
	const id = parseInt(noteId);
	if (isNaN(id)) {
		return new Response('Invalid Note ID', { status: 400 });
	}

	try {
		const note = await db.prepare("SELECT files FROM notes WHERE id = ?").bind(id).first();
		if (!note) {
			return jsonResponse({ error: 'Note not found' }, 404);
		}

		let files = [];
		try {
			if (typeof note.files === 'string') {
				files = JSON.parse(note.files);
			}
		} catch(e) { /* ignore */ }

		const fileIndex = files.findIndex(f => f.id === fileId);
		if (fileIndex === -1) {
			return jsonResponse({ error: 'File not found in this note' }, 404);
		}

		const file = files[fileIndex];
		let publicId = file.public_id;

		if (!publicId) {
			publicId = crypto.randomUUID();
			
			await env.NOTES_KV.put(`public_file:${publicId}`, JSON.stringify({
				noteId: id,
				fileId: file.id,
				fileName: file.name,
				contentType: file.type
			}));

			
			files[fileIndex].public_id = publicId;
			await db.prepare("UPDATE notes SET files = ? WHERE id = ?").bind(JSON.stringify(files), id).run();
		}

		const { protocol, host } = new URL(request.url);
		const publicUrl = `${protocol}//${host}/api/public/file/${publicId}`;

		return jsonResponse({ url: publicUrl });
	} catch (e) {
		console.error(`Share File Error (noteId: ${noteId}, fileId: ${fileId}):`, e.message);
		return jsonResponse({ error: 'Database error while generating link', message: e.message }, 500);
	}
}


async function handlePublicFileRequest(publicId, request, env) {
	const kvData = await env.NOTES_KV.get(`public_file:${publicId}`, 'json');
	if (!kvData) {
		return new Response('Public link not found or has expired.', { status: 404 });
	}

	let object;
	let fileName;
	let contentType;

	if (kvData.standaloneImageId) {
		
		object = await env.NOTES_R2_BUCKET.get(`uploads/${kvData.standaloneImageId}`);
		fileName = kvData.fileName || `image_${kvData.standaloneImageId}.png`;
		contentType = kvData.contentType || 'image/png';
	} else if (kvData.noteId && kvData.fileId) {
		
		object = await env.NOTES_R2_BUCKET.get(`${kvData.noteId}/${kvData.fileId}`);
		fileName = kvData.fileName;
		contentType = kvData.contentType;
	} else {
		return new Response('Invalid public link data.', { status: 500 });
	}

	if (object === null) {
		return new Response('File not found in storage', { status: 404 });
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('etag', object.httpEtag);
	headers.set('Cache-Control', 'public, max-age=86400, immutable');

	headers.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`);
	const textLikeExtensions = ['txt', 'md', 'log', 'json', 'js', 'css', 'html', 'xml', 'yaml', 'yml', 'py', 'sh', 'rb', 'go', 'java', 'c', 'cpp'];
	if ((contentType || '').startsWith('text/') || textLikeExtensions.includes((fileName || '').split('.').pop().toLowerCase())) {
		headers.set('Content-Type', 'text/plain; charset=utf-8');
	} else {
		headers.set('Content-Type', contentType || 'application/octet-stream');
	}

	return new Response(object.body, { headers });
}


async function handleShareNoteRequest(noteId, request, env) {
	try {
		const body = await request.json().catch(() => ({}));

		if (body.publicId && body.expirationTtl !== undefined) {
			const noteShareKey = `note_share:${noteId}`;
			const publicMemoKey = `public_memo:${body.publicId}`;

			
			const storedPublicId = await env.NOTES_KV.get(noteShareKey);
			if (storedPublicId !== body.publicId) {
				return jsonResponse({ error: 'Invalid public ID for this note.' }, 400);
			}

			
			const memoData = await env.NOTES_KV.get(publicMemoKey);
			if (!memoData) {
				return jsonResponse({ error: 'Share link not found or already expired.' }, 404);
			}

			const options = {};
			if (body.expirationTtl > 0) {
				options.expirationTtl = body.expirationTtl;
			}
			

			
			await Promise.all([
				env.NOTES_KV.put(publicMemoKey, memoData, options),
				env.NOTES_KV.put(noteShareKey, body.publicId, options)
			]);

			return jsonResponse({ success: true, message: 'Expiration updated.' });

		} else {
			
			let publicId = await env.NOTES_KV.get(`note_share:${noteId}`);

			if (!publicId) {
				publicId = crypto.randomUUID();
				
				const expirationTtl = (body.expirationTtl !== undefined) ? body.expirationTtl : 3600;
				const options = {};
				if (expirationTtl > 0) {
					options.expirationTtl = expirationTtl;
				}

				await Promise.all([
					env.NOTES_KV.put(`public_memo:${publicId}`, JSON.stringify({ noteId: parseInt(noteId, 10) }), options),
					env.NOTES_KV.put(`note_share:${noteId}`, publicId, options)
				]);
			}

			const { protocol, host } = new URL(request.url);
			const displayUrl = `${protocol}//${host}/share/${publicId}`;
			const rawUrl = `${protocol}//${host}/api/public/note/raw/${publicId}`;

			return jsonResponse({ displayUrl, rawUrl, publicId }); 
		}
	} catch (e) {
		console.error(`Share/Update Note Error (noteId: ${noteId}):`, e.message);
		return jsonResponse({ error: 'Database or KV error during operation' }, 500);
	}
}


async function handleUnshareNoteRequest(noteId, env) {
	try {
		const publicId = await env.NOTES_KV.get(`note_share:${noteId}`);
		if (publicId) {
			await Promise.all([
				env.NOTES_KV.delete(`public_memo:${publicId}`),
				env.NOTES_KV.delete(`note_share:${noteId}`)
			]);
		}
		return jsonResponse({ success: true, message: 'Sharing has been revoked.' });
	} catch (e) {
		console.error(`Unshare Note Error (noteId: ${noteId}):`, e.message);
		return jsonResponse({ error: 'Database error while revoking link' }, 500);
	}
}

async function handlePublicNoteRequest(publicId, env) {
	const kvData = await env.NOTES_KV.get(`public_memo:${publicId}`, 'json');
	if (!kvData || !kvData.noteId) {
		return jsonResponse({ error: 'Shared note not found or has expired' }, 404);
	}

	const noteId = kvData.noteId;

	try {
		const note = await env.DB.prepare("SELECT id, content, updated_at, files FROM notes WHERE id = ?").bind(noteId).first();
		if (!note) {
			return jsonResponse({ error: 'Shared note content not found' }, 404);
		}

		
		const createPublicUrlFor = async (privateUrl) => {
			const fileMatch = privateUrl.match(/^\/api\/files\/(\d+)\/([a-zA-Z0-9-]+)$/);
			const imageMatch = privateUrl.match(/^\/api\/images\/([a-zA-Z0-9-]+)$/);

			let kvPayload = null;
			if (fileMatch) {
				kvPayload = { noteId: parseInt(fileMatch[1]), fileId: fileMatch[2], fileName: 'media' };
			} else if (imageMatch) {
				kvPayload = { standaloneImageId: imageMatch[1], fileName: 'image.png' };
			}

			if (kvPayload) {
				const newPublicId = crypto.randomUUID();
				await env.NOTES_KV.put(`public_file:${newPublicId}`, JSON.stringify(kvPayload));
				return `/api/public/file/${newPublicId}`;
			}

			return privateUrl; 
		};

		
		const urlRegex = /(\/api\/(?:files|images)\/[a-zA-Z0-9\/-]+)/g;
		const matches = [...note.content.matchAll(urlRegex)];
		let processedContent = note.content;
		for (const match of matches) {
			const privateUrl = match[0];
			const publicUrl = await createPublicUrlFor(privateUrl);
			processedContent = processedContent.replace(privateUrl, publicUrl);
		}
		note.content = processedContent;

		
		let files = [];
		if (typeof note.files === 'string') {
			try { files = JSON.parse(note.files); } catch (e) { /* an empty array is fine */ }
		}
		for (const file of files) {
			if (file.id) { 
				const privateUrl = `/api/files/${note.id}/${file.id}`;
				
				const filePublicId = crypto.randomUUID();
				await env.NOTES_KV.put(`public_file:${filePublicId}`, JSON.stringify({
					noteId: note.id,
					fileId: file.id,
					fileName: file.name,
					contentType: file.type
				}));
				file.public_url = `/api/public/file/${filePublicId}`;
			}
		}
		note.files = files;

		
		delete note.id;

		
		
		delete note.pics;
		delete note.videos;

		return jsonResponse(note);

	} catch (e) {
		console.error(`Public Note Error (publicId: ${publicId}):`, e.message);
		return jsonResponse({ error: 'Database Error' }, 500);
	}
}


async function handlePublicRawNoteRequest(publicId, env) {
	
	const kvData = await env.NOTES_KV.get(`public_memo:${publicId}`, 'json');
	if (!kvData || !kvData.noteId) {
		return new Response('Not Found', { status: 404 });
	}

	try {
		
		const note = await env.DB.prepare("SELECT content FROM notes WHERE id = ?").bind(kvData.noteId).first();
		if (!note) {
			return new Response('Not Found', { status: 404 });
		}
		const headers = new Headers({ 'Content-Type': 'text/plain; charset=utf-8' });
		return new Response(note.content, { headers });
	} catch (e) {
		console.error(`Public Raw Note Error (publicId: ${publicId}):`, e.message);
		return new Response('Server Error', { status: 500 });
	}
}


async function handleMergeNotes(request, env) {
	const db = env.DB;
	try {
		const { sourceNoteId, targetNoteId, addSeparator } = await request.json();

		if (!sourceNoteId || !targetNoteId || sourceNoteId === targetNoteId) {
			return jsonResponse({ error: 'Invalid source or target note ID.' }, 400);
		}

		const [sourceNote, targetNote] = await Promise.all([
			db.prepare("SELECT * FROM notes WHERE id = ?").bind(sourceNoteId).first(),
			db.prepare("SELECT * FROM notes WHERE id = ?").bind(targetNoteId).first(),
		]);

		if (!sourceNote || !targetNote) {
			return jsonResponse({ error: 'One or both notes not found.' }, 404);
		}

		
		const separator = addSeparator ? '\n\n---\n\n' : '\n\n';
		const mergedContent = targetNote.content + separator + sourceNote.content;
		const targetFiles = JSON.parse(targetNote.files || '[]');
		const sourceFiles = JSON.parse(sourceNote.files || '[]');
		const mergedFiles = JSON.stringify([...targetFiles, ...sourceFiles]);

		const mergedTimestamp = targetNote.updated_at;

		

		
		const stmt = db.prepare(
			"UPDATE notes SET content = ?, files = ?, updated_at = ? WHERE id = ?"
		);
		await stmt.bind(mergedContent, mergedFiles, mergedTimestamp, targetNote.id).run();

		
		await processNoteTags(db, targetNote.id, mergedContent);

		
		await db.prepare("DELETE FROM notes WHERE id = ?").bind(sourceNote.id).run();

		
		if (sourceFiles.length > 0) {
			const r2 = env.NOTES_R2_BUCKET;
			for (const file of sourceFiles) {
				const oldKey = `${sourceNote.id}/${file.id}`;
				const newKey = `${targetNote.id}/${file.id}`;
				const object = await r2.get(oldKey);
				if (object) {
					await r2.put(newKey, object.body);
					await r2.delete(oldKey);
				}
			}
		}

		
		const updatedMergedNote = await db.prepare("SELECT * FROM notes WHERE id = ?").bind(targetNote.id).first();
		if (typeof updatedMergedNote.files === 'string') {
			updatedMergedNote.files = JSON.parse(updatedMergedNote.files);
		}

		return jsonResponse(updatedMergedNote);

	} catch (e) {
		console.error("Merge Notes Error:", e.message, e.cause);
		return jsonResponse({ error: 'Database or R2 error during merge', message: e.message }, 500);
	}
}


function jsonResponse(data, status = 200, headers = new Headers()) {
	headers.set('Content-Type', 'application/json');
	return new Response(JSON.stringify(data, null, 2), { status, headers });
}
