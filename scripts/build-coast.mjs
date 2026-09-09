import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const blender = process.env.BLENDER_BIN || (process.platform === 'darwin' && existsSync('/Applications/Blender.app/Contents/MacOS/Blender')
    ? '/Applications/Blender.app/Contents/MacOS/Blender' : 'blender');
for (const [command, args] of [[process.execPath, ['scripts/coast/seed.mjs']],
    [blender, ['--background', '--factory-startup', '--python', 'scripts/coast/build.py']]]) {
    const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status) process.exit(result.status);
}
