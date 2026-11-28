#!/usr/bin/env bash
# Build a native Arch Linux package from this source tree.
#
#   ./packaging/build-arch.sh
#
# The package is written to artifacts/. makepkg must run as an unprivileged user.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if [[ $EUID -eq 0 ]]; then
  echo "makepkg refuses to run as root. Run this script as your normal user." >&2
  exit 1
fi

version="$(node -p "require('./package.json').version")"
tarball="$root/packaging/ivlyrics-overlay-$version.tar.gz"

echo "==> Creating source tarball ivlyrics-overlay-$version.tar.gz"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/ivlyrics-overlay-$version"
tar -C "$root" \
  --exclude='./.git' \
  --exclude='./node_modules' \
  --exclude='./dist' \
  --exclude='./artifacts' \
  --exclude='./src-tauri/target' \
  --exclude='./.ptc-repl-*' \
  --exclude='./packaging/src' \
  --exclude='./packaging/pkg' \
  --exclude='./packaging/ivlyrics-overlay-*.tar.gz' \
  --exclude='./packaging/*.pkg.tar.*' \
  -cf - . | tar -C "$tmp/ivlyrics-overlay-$version" -xf -
tar -C "$tmp" -czf "$tarball" "ivlyrics-overlay-$version"

echo "==> Building package with makepkg"
(
  cd packaging
  # -C removes a previous $srcdir; reusing one can mix artifacts from a
  # different Rust feature set and fail to link.
  makepkg -f -C
)

mkdir -p "$root/artifacts"
package="$(cd packaging && makepkg --packagelist)"
cp "$package" "$root/artifacts/"
echo "==> Wrote $root/artifacts/$(basename "$package")"
