import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const run = (command, args, cwd = root, env = process.env) => execFileSync(command, args, { cwd, env, stdio: 'inherit' });
const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8' }).trim();
run('npm', ['run', 'build:editor']);
run('npm', ['run', 'build'], root, { ...process.env, VITE_BASE_PATH: '/water/' });
const work = await mkdtemp(join(tmpdir(), 'water-pages-'));
try {
    run('git', ['clone', '--branch', 'gh-pages', '--single-branch', remote, work]);
    for (const entry of await readdir(work)) if (entry !== '.git') await rm(join(work, entry), { recursive: true, force: true });
    await cp(join(root, 'dist'), work, { recursive: true });
    await writeFile(join(work, '.nojekyll'), '');
    run('git', ['add', '-A'], work);
    const changed = execFileSync('git', ['status', '--porcelain'], { cwd: work, encoding: 'utf8' }).trim();
    if (changed) { run('git', ['commit', '-m', 'Deploy water studies'], work); run('git', ['push', 'origin', 'gh-pages'], work); }
    else console.log('The deployed files already match this build.');
} finally { await rm(work, { recursive: true, force: true }); }
