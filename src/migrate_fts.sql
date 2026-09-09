
DROP TRIGGER IF EXISTS notes_after_insert;
DROP TRIGGER IF EXISTS notes_after_delete;
DROP TRIGGER IF EXISTS notes_after_update;


DROP TABLE IF EXISTS notes_fts;


CREATE VIRTUAL TABLE notes_fts USING fts5(
  content,
  files,
  content='notes',
  content_rowid='id'
);



INSERT INTO notes_fts(rowid, content, files) SELECT id, content, files FROM notes;


CREATE TRIGGER notes_after_insert AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, content, files) VALUES (new.id, new.content, new.files);
END;

CREATE TRIGGER notes_after_delete AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, content, files) VALUES ('delete', old.id, old.content, old.files);
END;

CREATE TRIGGER notes_after_update AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, content, files) VALUES ('delete', old.id, old.content, old.files);
  INSERT INTO notes_fts(rowid, content, files) VALUES (new.id, new.content, new.files);
END;
