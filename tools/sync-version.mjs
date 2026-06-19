import { readFile, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packagePath = path.join(root, 'package.json')
const cargoPath = path.join(root, 'src-tauri', 'Cargo.toml')
const tauriConfigPath = path.join(root, 'src-tauri', 'tauri.conf.json')

const packageJson = JSON.parse(await readFile(packagePath, 'utf8'))
const version = packageJson.version

if (typeof version !== 'string' || !version.trim()) {
  throw new Error('package.json version is missing.')
}

function replaceRequired(content, pattern, replacement, label) {
  if (!pattern.test(content)) {
    throw new Error(`Could not find version field in ${label}.`)
  }
  return content.replace(pattern, replacement)
}

const cargoToml = await readFile(cargoPath, 'utf8')
const nextCargoToml = replaceRequired(
  cargoToml,
  /(^\[package\][\s\S]*?^version\s*=\s*")[^"]+(")/m,
  `$1${version}$2`,
  'src-tauri/Cargo.toml',
)
await writeFile(cargoPath, nextCargoToml)

const tauriConfig = await readFile(tauriConfigPath, 'utf8')
const nextTauriConfig = replaceRequired(
  tauriConfig,
  /("version"\s*:\s*")[^"]+(")/,
  `$1${version}$2`,
  'src-tauri/tauri.conf.json',
)
await writeFile(tauriConfigPath, nextTauriConfig)

const { stdout, stderr } = await execFileAsync(
  'cargo',
  ['update', '-p', packageJson.name, '--manifest-path', cargoPath],
  { cwd: root },
)

if (stdout.trim()) console.log(stdout.trim())
if (stderr.trim()) console.error(stderr.trim())
console.log(`Synced Tauri/Rust version to ${version}`)
