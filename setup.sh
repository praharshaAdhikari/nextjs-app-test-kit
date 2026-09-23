#!/usr/bin/env bash
# Adds the nextjs-app-test-kit unit test setup (Jest + Testing Library) to the Next.js app in the
# current directory. Run it from the app's root:
#
#   curl -fsSL https://raw.githubusercontent.com/praharshaAdhikari/nextjs-app-test-kit/main/setup.sh | bash
#   curl -fsSL .../setup.sh | bash -s -- --examples     also copy the reference tests
#
# It downloads the kit to a temporary folder, copies the files the app needs, installs the
# dev dependencies, adds the npm scripts, wires ESLint, checks that Jest starts, and deletes
# the download. It never overwrites an existing file unless you pass --force.
#
# Options:
#   --examples     copy the reference tests and the code they test into src/examples/
#   --force        overwrite kit files that already exist in the app
#   --no-install   copy and configure only; skip installing dependencies and the Jest check
#
# Environment:
#   QA_KIT_REPO    git URL to download from (default below)
#   QA_KIT_REF     branch or tag (default: main)
#   QA_KIT_DIR     use this local copy of the kit instead of downloading

set -euo pipefail

# Everything is inside main() so that `curl ... | bash` reads the whole script before running
# any of it; otherwise a command that reads stdin could swallow the rest of the script.
main() {
  local repo_url="${QA_KIT_REPO:-https://github.com/praharshaAdhikari/nextjs-app-test-kit.git}"
  local ref="${QA_KIT_REF:-main}"
  local examples=0 force=0 install=1

  while [ $# -gt 0 ]; do
    case "$1" in
      --examples) examples=1 ;;
      --force) force=1 ;;
      --no-install) install=0 ;;
      -h | --help)
        usage
        return 0
        ;;
      *) fail "Unknown option: $1 (try --help)" ;;
    esac
    shift
  done

  # --- Preflight: is this a Next.js app we can set up? -------------------------------------

  command -v node >/dev/null || fail "node is not installed."
  command -v npm >/dev/null || fail "npm is not installed."
  [ -f package.json ] || fail "No package.json here. Run this from the root of a Next.js app."

  node -e '
    const p = require("./package.json");
    const deps = { ...p.dependencies, ...p.devDependencies };
    if (!deps.next) { console.error("next"); process.exit(1); }
    if (deps.vitest) { console.error("vitest"); process.exit(2); }
  ' 2>/dev/null || {
    case $? in
      1) fail "package.json does not depend on next. Run this from the root of a Next.js app." ;;
      2) fail "This app already uses Vitest. Keep one unit test runner: see 'Already using Vitest?' in the kit README." ;;
    esac
  }

  local other
  for other in jest.config.js jest.config.ts jest.config.cjs jest.config.json; do
    [ -e "$other" ] && fail "$other already exists. Merge the kit's jest.config.mjs into it by hand: see 'Already using Jest?' in the kit README."
  done
  if node -e 'process.exit(require("./package.json").jest ? 0 : 1)'; then
    fail "package.json has a \"jest\" section. Merge the kit's jest.config.mjs into it by hand: see 'Already using Jest?' in the kit README."
  fi

  # With a src/ folder, files go in src/. Without one, at the root, and the configs are adjusted.
  local base
  if [ -d src ]; then base=src; else base=.; fi

  if [ -f tsconfig.json ] && ! grep -q '"@/\*"' tsconfig.json; then
    warn 'tsconfig.json has no "@/*" path alias. jest.setup.ts imports "@/test/navigation"; add the alias (create-next-app --import-alias "@/*") or edit that import.'
  fi

  # --- Download ----------------------------------------------------------------------------

  local tmp kit
  tmp="$(mktemp -d)"
  # shellcheck disable=SC2064 # expand $tmp now
  trap "rm -rf '$tmp'" EXIT

  if [ -n "${QA_KIT_DIR:-}" ]; then
    kit="$(cd "$QA_KIT_DIR" && pwd)"
    step "Using the kit at $kit"
  else
    command -v git >/dev/null || fail "git is not installed."
    step "Downloading the kit from $repo_url ($ref)"
    git clone --quiet --depth 1 --branch "$ref" "$repo_url" "$tmp/kit" ||
      fail "Could not download $repo_url"
    kit="$tmp/kit"
  fi
  [ -f "$kit/jest.config.mjs" ] || fail "$kit does not look like the nextjs-app-test-kit repo."

  # --- Copy --------------------------------------------------------------------------------

  step "Copying files"
  local conflicts=()
  local pair src dest
  local files=(
    "jest.config.mjs:jest.config.mjs"
    "jest.setup.ts:jest.setup.ts"
    "jest.environment.mjs:jest.environment.mjs"
    "eslint.testing.mjs:eslint.testing.mjs"
    "src/test/render.tsx:$base/test/render.tsx"
    "src/test/navigation.ts:$base/test/navigation.ts"
    "src/test/server.ts:$base/test/server.ts"
    "src/test-ids.ts:$base/test-ids.ts"
  )
  # The examples are one folder: nothing else in the app imports them, so deleting the folder
  # removes them cleanly. They are not under app/, so they add no routes to the site.
  if [ "$examples" = 1 ]; then
    files+=("src/examples:$base/examples")
  fi

  for pair in "${files[@]}"; do
    dest="${pair#*:}"
    [ -e "$dest" ] && conflicts+=("${dest#./}")
  done
  if [ "${#conflicts[@]}" -gt 0 ] && [ "$force" = 0 ]; then
    fail "These files already exist: ${conflicts[*]}. Nothing was changed. Merge them by hand, or re-run with --force to overwrite."
  fi

  for pair in "${files[@]}"; do
    src="${pair%%:*}"
    dest="${pair#*:}"
    mkdir -p "$(dirname "$dest")"
    if [ -d "$kit/$src" ]; then
      rm -rf "$dest"
      cp -R "$kit/$src" "$dest"
      echo "  ${dest#./}/ ($(find "$dest" -name '*.test.*' | wc -l | tr -d ' ') test files)"
    else
      cp "$kit/$src" "$dest"
      echo "  ${dest#./}"
    fi
  done
  if [ ! -e .nvmrc ]; then
    cp "$kit/.nvmrc" .nvmrc
    echo "  .nvmrc"
  fi

  if [ "$base" = . ]; then
    step "No src/ folder: pointing the Jest and ESLint config at the project root"
    node - <<'NODE'
const fs = require('fs');
const edit = (file, pairs) => {
  let s = fs.readFileSync(file, 'utf8');
  for (const [from, to] of pairs) s = s.split(from).join(to);
  fs.writeFileSync(file, s);
};
edit('jest.config.mjs', [
  ["'<rootDir>/src/**/*.test.{ts,tsx}'", "'<rootDir>/**/*.test.{ts,tsx}'"],
  ["'<rootDir>/src/$1'", "'<rootDir>/$1'"],
  ["'src/**/*.{ts,tsx}',", "'**/*.{ts,tsx}',\n    '!**/node_modules/**',\n    '!.next/**',\n    '!coverage/**',\n    '!tests/**',\n    '!e2e/**',\n    '!*.config.{ts,mjs}',\n    '!next-env.d.ts',"],
  ["'!src/", "'!"],
  ['only picks up src/', 'only picks up '],
]);
// Every 'src/...' glob (including 'src/test/**'), and the paths named in comments.
edit('eslint.testing.mjs', [["'src/", "'"], ['src/test-ids.ts', 'test-ids.ts']]);
edit('jest.setup.ts', [['src/test/', 'test/']]);
if (fs.existsSync('examples/components/cart.test.tsx')) {
  edit('examples/components/cart.test.tsx', [['src/test/', 'test/']]);
}
NODE
  fi

  # --- package.json scripts ----------------------------------------------------------------

  step "Adding npm scripts"
  KIT="$kit" node - <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const { scripts } = JSON.parse(fs.readFileSync(`${process.env.KIT}/package.additions.json`, 'utf8'));
pkg.scripts ??= {};
for (const [name, command] of Object.entries(scripts)) {
  if (pkg.scripts[name] === undefined) {
    pkg.scripts[name] = command;
    console.log(`  ${name}: ${command}`);
  } else if (pkg.scripts[name] !== command) {
    console.log(`  ${name}: kept yours ("${pkg.scripts[name]}"); the kit's is "${command}"`);
  }
}
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
NODE

  # --- ESLint ------------------------------------------------------------------------------

  step "Wiring ESLint"
  local eslint_status extra_deps=""
  eslint_status="$(node - <<'NODE'
const fs = require('fs');
const file = ['eslint.config.mjs', 'eslint.config.js', 'eslint.config.ts'].find((f) => fs.existsSync(f));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const legacy =
  ['.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml'].find((f) =>
    fs.existsSync(f),
  ) || (pkg.eslintConfig ? 'package.json "eslintConfig"' : null);

if (!file && legacy) { console.log(`legacy:${legacy}`); process.exit(0); }

if (!file) {
  // No ESLint set up at all (common in apps that relied on `next lint`). Lint the tests only:
  // turning on Next's full rule set here would fail `npm run check` on code nobody has linted.
  fs.writeFileSync('eslint.config.mjs', `import { globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { testingConfig } from './eslint.testing.mjs';

/**
 * Created by nextjs-app-test-kit's setup.sh, because this app had no ESLint config.
 *
 * It only checks test files and data-testid values, so existing code is not judged by rules it
 * was never written against. To lint the whole app the way a new Next.js app does, see
 * "No ESLint config yet?" in the kit README.
 */
export default [
  globalIgnores(['.next/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts']),
  // Existing eslint-disable comments name rules this config does not turn on; do not report them.
  { linterOptions: { reportUnusedDisableDirectives: 'off' } },
  // Lets ESLint read TypeScript and JSX. Adds no rules by itself.
  { files: ['**/*.{ts,tsx,mts,cts}'], languageOptions: { parser: tseslint.parser } },
  { files: ['**/*.{js,jsx,mjs,cjs}'], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
  ...testingConfig,
];
`);
  console.log('created');
  process.exit(0);
}

let s = fs.readFileSync(file, 'utf8');
if (s.includes('testingConfig')) { console.log(`already:${file}`); process.exit(0); }
const exportLine = /^export default eslintConfig;\s*$/m;
if (!exportLine.test(s)) { console.log(`manual:${file}`); process.exit(0); }

// Put the import after the last import statement.
const lines = s.split('\n');
let lastImport = -1;
lines.forEach((line, i) => { if (/^import\s/.test(line) || /\sfrom\s+['"][^'"]+['"];?\s*$/.test(line)) lastImport = i; });
lines.splice(lastImport + 1, 0, "import { testingConfig } from './eslint.testing.mjs';");
s = lines.join('\n').replace(
  exportLine,
  "// Unit test rules (nextjs-app-test-kit). ESLint does not read .gitignore, so ignore the coverage report.\n" +
    "eslintConfig.push(...testingConfig, { ignores: ['coverage/**'] });\n\n" +
    'export default eslintConfig;\n',
);
fs.writeFileSync(file, s);
console.log(`done:${file}`);
NODE
)"
  case "$eslint_status" in
    done:*) echo "  ${eslint_status#done:}: added testingConfig and ignored coverage/" ;;
    already:*) echo "  ${eslint_status#already:} already uses testingConfig" ;;
    created)
      echo "  eslint.config.mjs: created, with the testing rules only (the app had no ESLint config)"
      extra_deps="eslint typescript-eslint"
      ;;
    legacy:*) warn "ESLint is configured in ${eslint_status#legacy:} (the old format). The kit's rules need eslint.config.mjs: see 'ESLint config the script cannot edit' in the kit README." ;;
    manual:*) warn "${eslint_status#manual:} has no 'export default eslintConfig;' line. Add testingConfig by hand: see 'Wire ESLint' in the kit README." ;;
  esac

  # `next lint` was removed in Next 16; there it fails with "Invalid project directory provided".
  node - <<'NODE'
const fs = require('fs');
const path = require('path');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
let nextMajor = NaN;
try {
  nextMajor = parseInt(JSON.parse(fs.readFileSync(path.resolve('node_modules/next/package.json'), 'utf8')).version, 10);
} catch {
  const range = { ...pkg.dependencies, ...pkg.devDependencies }.next || '';
  nextMajor = parseInt((range.match(/\d+/) || [])[0], 10);
}
const lint = pkg.scripts?.lint;
if (lint && /^next lint\b/.test(lint) && nextMajor >= 16) {
  pkg.scripts.lint = 'eslint .';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  lint: was "${lint}", which Next ${nextMajor} no longer has; now "eslint ."`);
} else if (!lint && fs.existsSync('eslint.config.mjs')) {
  pkg.scripts = { ...pkg.scripts, lint: 'eslint .' };
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  console.log('  lint: eslint .');
}
NODE

  # --- Install and check -------------------------------------------------------------------

  if [ "$install" = 1 ]; then
    local deps pm
    deps="$(KIT="$kit" node -e '
      const { devDependencies } = require(process.env.KIT + "/package.additions.json");
      console.log(Object.entries(devDependencies).map(([n, v]) => `${n}@${v}`).join(" "));
    ')"
    [ -n "$extra_deps" ] && deps="$deps $extra_deps"
    if [ -f pnpm-lock.yaml ]; then pm=pnpm
    elif [ -f yarn.lock ]; then pm=yarn
    elif [ -f bun.lock ] || [ -f bun.lockb ]; then pm=bun
    else pm=npm; fi

    step "Installing dev dependencies with $pm"
    # shellcheck disable=SC2086 # $deps is a space-separated list on purpose
    case "$pm" in
      pnpm)
        # pnpm 11 stops on dependencies with install scripts nobody has approved yet, and writes
        # a placeholder into pnpm-workspace.yaml. Two come with this kit, and neither is needed:
        # msw's copies a browser service worker (Jest does not use it) and @parcel/watcher's
        # compiles a file watcher only when no prebuilt binary fits. Deny those two, like
        # create-next-app does for sharp; anything else is left for you to decide.
        pnpm add -D --config.strict-dep-builds=false $deps </dev/null
        if [ -f pnpm-workspace.yaml ] && grep -q 'set this to true or false' pnpm-workspace.yaml; then
          sed -i.bak -E "s/^( +(msw|'@parcel\/watcher')): set this to true or false$/\1: false/" pnpm-workspace.yaml
          rm -f pnpm-workspace.yaml.bak
          if grep -q 'set this to true or false' pnpm-workspace.yaml; then
            warn "pnpm-workspace.yaml lists packages waiting for a build decision. Run 'pnpm approve-builds'."
          else
            pnpm install </dev/null
          fi
        fi
        ;;
      yarn) yarn add -D $deps </dev/null ;;
      bun) bun add -d $deps </dev/null ;;
      npm) npm install -D --no-audit --no-fund $deps </dev/null ;;
    esac

    step "Checking that Jest starts"
    npx jest --passWithNoTests </dev/null
  fi

  # --- Done --------------------------------------------------------------------------------

  step "Done"
  cat <<EOF
Next:
  npm run test:unit:watch     write a test next to your code (x.test.ts beside x.ts)
  npm run check               lint + typecheck + unit tests, run before pushing

Until the first test exists, 'npm run test:unit' reports "No tests found"; that is expected.
How to write tests: https://github.com/praharshaAdhikari/nextjs-app-test-kit#writing-a-function-and-its-tests
EOF
}

usage() {
  cat <<'EOF'
Adds Jest + Testing Library unit tests to the Next.js app in the current directory.

Usage: curl -fsSL <url>/setup.sh | bash -s -- [options]

Options:
  --examples     also copy the reference tests into src/examples/ (delete it when done)
  --force        overwrite kit files that already exist in the app
  --no-install   copy and configure only; skip installing dependencies and the Jest check
  -h, --help     show this help

Environment:
  QA_KIT_REPO    git URL to download the kit from
  QA_KIT_REF     branch or tag (default: main)
  QA_KIT_DIR     use a local copy of the kit instead of downloading
EOF
}

step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33mwarning:\033[0m %s\n' "$*" >&2; }
fail() {
  printf '\033[31merror:\033[0m %s\n' "$*" >&2
  exit 1
}

main "$@"
