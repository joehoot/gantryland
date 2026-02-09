import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFilePath), "..");
const changesetDir = path.join(rootDir, ".changeset");
const packagesDir = path.join(rootDir, "packages");

const files = await readdir(changesetDir, { withFileTypes: true });
const changesetFiles = files.filter(
  (file) => file.isFile() && file.name.endsWith(".md"),
);

if (changesetFiles.length > 0) {
  console.log(
    `Changeset guard passed: ${changesetFiles.length} changeset file(s) found.`,
  );
  process.exit(0);
}

const packageDirs = (await readdir(packagesDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const versions = await Promise.all(
  packageDirs.map(async (dir) => {
    const packageJsonPath = path.join(packagesDir, dir, "package.json");
    const source = await readFile(packageJsonPath, "utf8");
    const pkg = JSON.parse(source);
    return String(pkg.version ?? "");
  }),
);

const isBootstrapRelease =
  versions.length > 0 && versions.every((v) => v === "0.4.0");

if (isBootstrapRelease) {
  console.log(
    "Changeset guard: no changesets found, allowing v0.4.0 bootstrap release.",
  );
  process.exit(0);
}

console.error("Changeset guard failed: no changeset files found.");
console.error("Create one with `npm run release:changeset`.");
process.exit(1);
