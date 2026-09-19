import { readFile } from 'node:fs/promises';

const rootPackage = JSON.parse(await readFile('package.json', 'utf8')) as {
  version: string;
};
const tauriConfig = JSON.parse(
  await readFile('src-tauri/tauri.conf.json', 'utf8'),
) as { version: string };
const cargoManifest = await readFile('src-tauri/Cargo.toml', 'utf8');
const cargoVersion = cargoManifest.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

const versions = {
  'package.json': rootPackage.version,
  'src-tauri/Cargo.toml': cargoVersion,
  'src-tauri/tauri.conf.json': tauriConfig.version,
};
const expectedVersion = rootPackage.version;
const mismatches = Object.entries(versions).filter(
  ([, version]) => version !== expectedVersion,
);

if (mismatches.length > 0) {
  console.error('Release versions are inconsistent:');
  for (const [source, version] of Object.entries(versions)) {
    console.error(`  ${source}: ${version ?? 'missing'}`);
  }
  process.exit(1);
}

const tag =
  process.env.GITHUB_REF_TYPE === 'tag'
    ? process.env.GITHUB_REF_NAME
    : undefined;
if (tag && tag !== `v${expectedVersion}`) {
  console.error(
    `Release tag ${tag} does not match application version v${expectedVersion}.`,
  );
  process.exit(1);
}

console.log(`Application version ${expectedVersion} is consistent.`);
