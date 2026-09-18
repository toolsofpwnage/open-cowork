import fs from 'node:fs/promises';
import type { Stats } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listRecentWorkspaceFiles } from '../src/main/utils/recent-workspace-files';

/** The timestamp `listRecentWorkspaceFiles` compares against `sinceMs`. */
function stampOf(stat: Stats): number {
  return Math.max(stat.mtimeMs, stat.birthtimeMs || 0);
}

/**
 * Produce a cutoff from the same clock that stamps the files under test.
 *
 * Inode timestamps come from the kernel's coarse clock, which trails
 * `Date.now()` by up to a timer tick, so a cutoff taken from `Date.now()` can
 * land *after* a file written later — and that file then gets filtered out.
 * Writing a throwaway marker and reading its mtime keeps both sides of the
 * comparison on one clock. The marker is removed before the scan, so it never
 * shows up in results.
 */
async function cutoffFromFileClock(dir: string): Promise<number> {
  const markerPath = path.join(dir, '.recent-files-cutoff-marker');
  await fs.writeFile(markerPath, '');
  const stat = await fs.stat(markerPath);
  await fs.rm(markerPath, { force: true });
  return stampOf(stat);
}

/**
 * Block until the file clock reads past `afterMs`, so the next file written is
 * strictly newer than an earlier one instead of sharing its tick.
 */
async function waitForFileClockTick(dir: string, afterMs: number): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if ((await cutoffFromFileClock(dir)) > afterMs) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  throw new Error('filesystem clock did not advance');
}

describe('listRecentWorkspaceFiles', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'open-cowork-recent-files-'));
  });

  afterEach(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  it('returns files created after the given timestamp', async () => {
    const before = await cutoffFromFileClock(rootDir);

    const filePath = path.join(rootDir, 'deck.pptx');
    await fs.writeFile(filePath, 'ppt');

    const files = await listRecentWorkspaceFiles(rootDir, before);

    expect(files.map((item) => path.basename(item.path))).toContain('deck.pptx');
  });

  it('excludes files last touched before the given timestamp', async () => {
    const stale = path.join(rootDir, 'stale.txt');
    await fs.writeFile(stale, 'old');
    await waitForFileClockTick(rootDir, stampOf(await fs.stat(stale)));

    const before = await cutoffFromFileClock(rootDir);
    await fs.writeFile(path.join(rootDir, 'fresh.txt'), 'new');

    const names = (await listRecentWorkspaceFiles(rootDir, before)).map((item) =>
      path.basename(item.path)
    );

    expect(names).toContain('fresh.txt');
    expect(names).not.toContain('stale.txt');
  });

  it('ignores files inside excluded directories', async () => {
    const before = await cutoffFromFileClock(rootDir);

    await fs.mkdir(path.join(rootDir, 'node_modules'), { recursive: true });
    await fs.writeFile(path.join(rootDir, 'node_modules', 'ignored.txt'), 'ignore');
    await fs.writeFile(path.join(rootDir, 'report.html'), 'ok');

    const files = await listRecentWorkspaceFiles(rootDir, before);

    expect(files.map((item) => path.basename(item.path))).toContain('report.html');
    expect(files.map((item) => path.basename(item.path))).not.toContain('ignored.txt');
  });

  it('ignores system metadata files like .DS_Store', async () => {
    const before = await cutoffFromFileClock(rootDir);

    await fs.writeFile(path.join(rootDir, '.DS_Store'), 'noise');
    await fs.writeFile(path.join(rootDir, 'slides.pptx'), 'ppt');

    const files = await listRecentWorkspaceFiles(rootDir, before);

    expect(files.map((item) => path.basename(item.path))).toContain('slides.pptx');
    expect(files.map((item) => path.basename(item.path))).not.toContain('.DS_Store');
  });

  it('ignores common temp, lock, and backup file patterns', async () => {
    const before = await cutoffFromFileClock(rootDir);

    const noiseFiles = [
      '._slides.pptx',
      '~$deck.pptx',
      '.~lock.deck.pptx#',
      'draft.md~',
      'report.tmp',
      'download.crdownload',
    ];

    for (const name of noiseFiles) {
      await fs.writeFile(path.join(rootDir, name), 'noise');
    }
    await fs.writeFile(path.join(rootDir, 'real-output.pdf'), 'pdf');

    const files = await listRecentWorkspaceFiles(rootDir, before);
    const names = files.map((item) => path.basename(item.path));

    expect(names).toContain('real-output.pdf');
    for (const name of noiseFiles) {
      expect(names).not.toContain(name);
    }
  });

  it('ignores cache directories like __pycache__', async () => {
    const before = await cutoffFromFileClock(rootDir);

    await fs.mkdir(path.join(rootDir, '__pycache__'), { recursive: true });
    await fs.writeFile(path.join(rootDir, '__pycache__', 'script.cpython-311.pyc'), 'pyc');
    await fs.writeFile(path.join(rootDir, 'presentation.pptx'), 'ppt');

    const files = await listRecentWorkspaceFiles(rootDir, before);
    const names = files.map((item) => path.basename(item.path));

    expect(names).toContain('presentation.pptx');
    expect(names).not.toContain('script.cpython-311.pyc');
  });

  it('orders results by most recent change first', async () => {
    const before = await cutoffFromFileClock(rootDir);

    const older = path.join(rootDir, 'older.txt');
    const newer = path.join(rootDir, 'newer.txt');
    await fs.writeFile(older, '1');
    await waitForFileClockTick(rootDir, stampOf(await fs.stat(older)));
    await fs.writeFile(newer, '2');

    const files = await listRecentWorkspaceFiles(rootDir, before);

    expect(files[0]?.path).toBe(newer);
    expect(files[1]?.path).toBe(older);
  });
});
