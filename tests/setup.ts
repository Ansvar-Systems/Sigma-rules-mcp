import { copyFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';

const sourceDbPath = join(process.cwd(), 'data', 'sigma_rules.db');
const tmpDbPath = join('/tmp', `sigma-rules-test-${process.pid}.db`);
const tmpLockPath = `${tmpDbPath}.lock`;

if (!existsSync(sourceDbPath)) {
  throw new Error(
    `Missing test database at ${sourceDbPath}. Run "npm run build:db" before running tests.`
  );
}

if (existsSync(tmpLockPath)) {
  rmSync(tmpLockPath, { recursive: true, force: true });
}

copyFileSync(sourceDbPath, tmpDbPath);
process.env.SIGMA_RULES_DB_PATH = tmpDbPath;
