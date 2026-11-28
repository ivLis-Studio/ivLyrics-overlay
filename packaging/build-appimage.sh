#!/usr/bin/env bash
# Build a portable AppImage and copy it to artifacts/.
#
# NO_STRIP is required on rolling distributions: linuxdeploy ships an old
# strip that cannot read the .relr.dyn sections emitted by current binutils.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

export NO_STRIP=1
export APPIMAGE_EXTRACT_AND_RUN=1

npm run tauri build -- --bundles appimage

bundle_dir="$root/src-tauri/target/release/bundle/appimage"
appdir="$(find "$bundle_dir" -maxdepth 1 -name '*.AppDir' -print -quit)"
bundle="$(find "$bundle_dir" -maxdepth 1 -name '*.AppImage' -print -quit)"
if [[ -z "$appdir" || -z "$bundle" ]]; then
  echo "error: Tauri did not produce an AppDir/AppImage" >&2
  exit 1
fi

# Tauri's linuxdeploy bundles libxcb-render built against a newer libxcb than
# Arch ships. GDK then cannot query the window position, so the hover unlock
# never fires even though clicks pass through. The system copy is ABI
# compatible; dropping the bundled one fixes hover without affecting WebKit.
rm -f "$appdir/usr/lib/libxcb-render.so.0"

plugin="${XDG_CACHE_HOME:-$HOME/.cache}/tauri/linuxdeploy-plugin-appimage.AppImage"
if [[ ! -x "$plugin" ]]; then
  echo "error: linuxdeploy-plugin-appimage not found at $plugin" >&2
  echo "Run 'npm run tauri build -- --bundles appimage' once with network access." >&2
  exit 1
fi

fixed="${bundle%.AppImage}.fixed.AppImage"
rm -f "$fixed"
LDAI_OUTPUT="$fixed" ARCH="$(uname -m)" "$plugin" --appdir="$appdir"
mv "$fixed" "$bundle"

mkdir -p artifacts
cp "$bundle" artifacts/
echo "==> Wrote artifacts/$(basename "$bundle")"
