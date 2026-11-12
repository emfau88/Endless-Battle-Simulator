import { lstat, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { throwIfAborted } from './process.mjs';

// Gleicher Datenträger: geprüfte MP4 + JSON gemeinsam übernehmen, bei Fehler/Abbruch zurückrollen.
// Kein Schutz gegen Stromausfall/Prozess-Kill mitten zwischen den Dateiumbenennungen.
export async function publishOutputs(files, { backupDir, signal } = {}) {
  const changed = [];
  try {
    for (const [i, { staged, target }] of files.entries()) {
      throwIfAborted(signal);
      const entry = { target, backup: join(backupDir, `previous-${i}`), saved: false, published: false };
      const old = await lstat(target).catch((e) => { if (e.code !== 'ENOENT') throw e; return null; });
      if (old && !old.isFile()) throw new Error(`Ausgabe ist keine reguläre Datei: ${target}`);
      changed.push(entry);
      if (old) { await rename(target, entry.backup); entry.saved = true; }
      throwIfAborted(signal);
      await rename(staged, target); entry.published = true;
    }
    throwIfAborted(signal);
  } catch (e) {
    const failures = [];
    for (const entry of changed.reverse()) {
      try {
        if (entry.published) await rm(entry.target, { force: true });
        if (entry.saved) await rename(entry.backup, entry.target);
      } catch (restoreError) { failures.push(restoreError); }
    }
    if (failures.length) throw Object.assign(new AggregateError([e, ...failures],
      `Ausgabe konnte nicht vollständig wiederhergestellt werden. Sicherungen erhalten: ${backupDir}`), { recoveryDir: backupDir });
    throw e;
  }
}
