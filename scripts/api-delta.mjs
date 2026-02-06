import { readdir, readFile, stat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFilePath), "..");
const packagesDir = path.join(rootDir, "packages");
const baselineDir = path.join(rootDir, "docs", "api");

const args = new Set(process.argv.slice(2));
const updateMode = args.has("--update");
const checkMode = args.has("--check") || !updateMode;

if (updateMode && args.has("--check")) {
  console.error("Use only one mode: --check or --update");
  process.exit(1);
}

const packageDirs = await getPackageDirs(packagesDir);

if (updateMode) {
  await mkdir(baselineDir, { recursive: true });
}

const missingBuildOutputs = [];
const missingBaselines = [];
const mismatchedBaselines = [];

for (const packageDirName of packageDirs) {
  const packageDir = path.join(packagesDir, packageDirName);
  const packageJsonPath = path.join(packageDir, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const packageName = String(packageJson.name || packageDirName);

  const declarationPath = path.join(packageDir, "dist", "index.d.ts");
  const baselinePath = path.join(baselineDir, `${packageDirName}.d.ts`);

  if (!(await exists(declarationPath))) {
    missingBuildOutputs.push({ packageName, declarationPath });
    continue;
  }

  const declarationSource = await readFile(declarationPath, "utf8");

  if (updateMode) {
    const header = `// API baseline for ${packageName}\n`;
    await writeFile(baselinePath, `${header}${declarationSource}`, "utf8");
    continue;
  }

  if (!(await exists(baselinePath))) {
    missingBaselines.push({ packageName, baselinePath });
    continue;
  }

  const baselineSource = await readFile(baselinePath, "utf8");
  const expectedBaseline = `// API baseline for ${packageName}\n${declarationSource}`;

  if (baselineSource !== expectedBaseline) {
    mismatchedBaselines.push({ packageName, baselinePath });
  }
}

if (missingBuildOutputs.length > 0) {
  console.error("API delta check failed: missing declaration build outputs.");
  for (const item of missingBuildOutputs) {
    console.error(`- ${item.packageName}: ${item.declarationPath}`);
  }
  console.error("Run `npm run build` before `npm run api:check`.");
  process.exit(1);
}

if (
  checkMode &&
  (missingBaselines.length > 0 || mismatchedBaselines.length > 0)
) {
  console.error("API delta check failed: API baseline drift detected.");

  if (missingBaselines.length > 0) {
    console.error("Missing baseline files:");
    for (const item of missingBaselines) {
      console.error(`- ${item.packageName}: ${item.baselinePath}`);
    }
  }

  if (mismatchedBaselines.length > 0) {
    console.error("Changed API baselines:");
    for (const item of mismatchedBaselines) {
      console.error(`- ${item.packageName}: ${item.baselinePath}`);
    }
  }

  console.error(
    "Run `npm run api:update` to accept intentional public API changes.",
  );
  process.exit(1);
}

if (updateMode) {
  console.log(`Updated API baselines for ${packageDirs.length} package(s).`);
} else {
  console.log(`API baselines verified for ${packageDirs.length} package(s).`);
}

async function getPackageDirs(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const dirNames = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const packageJsonPath = path.join(root, entry.name, "package.json");
    if (await exists(packageJsonPath)) {
      dirNames.push(entry.name);
    }
  }

  dirNames.sort();
  return dirNames;
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
