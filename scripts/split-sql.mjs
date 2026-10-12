/**
 * Split a SQL migration into one-statement files.
 *
 * The Supabase SQL Editor rejects a multi-statement paste with "cannot insert
 * multiple commands into a prepared statement", so each statement has to be run
 * on its own. This splits a file into numbered, individually-runnable parts.
 *
 * Comment-only blocks are dropped: they are documentation, not statements.
 *
 * Usage: node scripts/split-sql.mjs <input.sql> [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';

function splitSql(sql) {
	const stmts = [];
	let buf = '';
	let i = 0;
	const n = sql.length;

	let inLine = false;
	let inBlock = false;
	let inString = false;
	let inIdent = false;
	let dollarTag = '';

	while (i < n) {
		const c = sql[i];
		const next = i + 1 < n ? sql[i + 1] : '';

		// Consume each region verbatim so a `;` inside it cannot split a
		// statement, and comments survive intact.
		if (inLine) {
			if (c === '\n') inLine = false;
			buf += c;
			i++;
			continue;
		}
		if (inBlock) {
			if (c === '*' && next === '/') {
				inBlock = false;
				buf += c + next;
				i += 2;
				continue;
			}
			buf += c;
			i++;
			continue;
		}
		if (inString) {
			if (c === "'") {
				if (next === "'") {
					buf += c + next;
					i += 2;
					continue;
				}
				inString = false;
			}
			buf += c;
			i++;
			continue;
		}
		if (inIdent) {
			if (c === '"') inIdent = false;
			buf += c;
			i++;
			continue;
		}
		if (dollarTag) {
			if (sql.startsWith(dollarTag, i)) {
				buf += dollarTag;
				i += dollarTag.length;
				dollarTag = '';
				continue;
			}
			buf += c;
			i++;
			continue;
		}

		if (c === '-' && next === '-') {
			inLine = true;
			buf += c + next;
			i += 2;
			continue;
		}
		if (c === '/' && next === '*') {
			inBlock = true;
			buf += c + next;
			i += 2;
			continue;
		}
		if (c === "'") {
			inString = true;
			buf += c;
			i++;
			continue;
		}
		if (c === '"') {
			inIdent = true;
			buf += c;
			i++;
			continue;
		}
		if (c === '$') {
			const m = /^\$([A-Za-z_][A-Za-z_0-9]*)?\$/.exec(sql.slice(i));
			if (m) {
				dollarTag = m[0];
				buf += dollarTag;
				i += dollarTag.length;
				continue;
			}
		}
		if (c === ';') {
			const stmt = buf.trim();
			if (stmt) stmts.push(stmt);
			buf = '';
			i++;
			continue;
		}
		buf += c;
		i++;
	}

	const tail = buf.trim();
	if (tail) stmts.push(tail);
	return stmts;
}

function nameFor(stmt) {
	const m =
		stmt.match(/create\s+table\s+if\s+not\s+exists\s+(\w+)/i) ||
		stmt.match(/create\s+(?:unique\s+)?index\s+if\s+not\s+exists\s+(\w+)/i) ||
		stmt.match(/alter\s+table\s+(\w+)/i) ||
		stmt.match(/insert\s+into\s+(\w+)/i) ||
		stmt.match(/update\s+(\w+)/i);
	return m ? m[1] || m[2] : 'step';
}

const isCommentOnly = (stmt) =>
	stmt.split('\n').every((line) => line.trim() === '' || line.trim().startsWith('--'));

const [src, outDir] = process.argv.slice(2);
if (!src) {
	console.error('usage: node scripts/split-sql.mjs <input.sql> [out-dir]');
	process.exit(1);
}
const dest = outDir ?? path.join(path.dirname(src), 'steps');

const stmts = splitSql(fs.readFileSync(src, 'utf8')).filter((s) => !isCommentOnly(s));
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

stmts.forEach((stmt, i) => {
	const num = String(i + 1).padStart(2, '0');
	const file = path.join(dest, `${num}_${nameFor(stmt)}.sql`);
	fs.writeFileSync(file, stmt + '\n');
	console.log(`${file}  (${stmt.length} chars)`);
});
console.log(`\n${stmts.length} statements written to ${dest}`);
