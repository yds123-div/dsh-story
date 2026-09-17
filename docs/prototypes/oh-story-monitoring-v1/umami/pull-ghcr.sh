#!/usr/bin/env bash
# PROTOTYPE helper — curl-pull an OCI image from ghcr.io and docker load it.
# Workaround: docker daemon gets EOF on ghcr token/manifest requests while curl works.
# Usage: bash pull-ghcr.sh <repo-without-ghcr.io-prefix> <tag> <final-tag>
set -euo pipefail

REPO="${1:?repo, e.g. umami-software/umami}"
TAG="${2:?tag}"
FINAL_TAG="${3:?final local tag}"

WORK="ghcr-pull-$$"
mkdir -p "$WORK/blobs/sha256"
trap 'rm -rf "$WORK"' EXIT

TOKEN=$(curl -sS "https://ghcr.io/token?scope=repository:${REPO}:pull" | python -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
ACCEPT="application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.oci.image.manifest.v1+json,application/vnd.docker.distribution.manifest.v2+json"

fetch() { # fetch <digest> -> blobs/sha256/<hex>
  local hex="${1#sha256:}"
  [ -s "$WORK/blobs/sha256/$hex" ] && return 0
  echo ">> blob $hex"
  curl -sS --retry 5 --retry-delay 2 -L -H "$AUTH" \
    "https://ghcr.io/v2/$REPO/blobs/sha256:$hex" -o "$WORK/blobs/sha256/$hex"
  echo "$hex  $WORK/blobs/sha256/$hex" | sha256sum -c --status || { echo "DIGEST MISMATCH $hex"; exit 1; }
}

fetch_manifest() { # fetch_manifest <digest> (manifests endpoint, not blobs)
  local hex="${1#sha256:}"
  [ -s "$WORK/blobs/sha256/$hex" ] && return 0
  echo ">> manifest $hex"
  curl -sS --retry 5 --retry-delay 2 -L -H "$AUTH" -H "Accept: $ACCEPT" \
    "https://ghcr.io/v2/$REPO/manifests/sha256:$hex" -o "$WORK/blobs/sha256/$hex"
  echo "$hex  $WORK/blobs/sha256/$hex" | sha256sum -c --status || { echo "DIGEST MISMATCH $hex"; exit 1; }
}

curl -sS -H "$AUTH" -H "Accept: $ACCEPT" "https://ghcr.io/v2/$REPO/manifests/$TAG" -o "$WORK/top.json"

# resolve index -> amd64 manifest
MANI_DIGEST=$(python - "$WORK/top.json" <<'EOF'
import json, sys
doc = json.load(open(sys.argv[1]))
if 'manifests' in doc:
    for m in doc['manifests']:
        p = m.get('platform', {})
        if p.get('os') == 'linux' and p.get('architecture') == 'amd64':
            print(m['digest']); break
    else:
        sys.exit('no linux/amd64 manifest')
else:
    print('')  # already a single manifest
EOF
)
if [ -n "$MANI_DIGEST" ]; then
  fetch_manifest "$MANI_DIGEST"
  MANI_HEX="${MANI_DIGEST#sha256:}"
else
  # single manifest: digest of the file itself
  MANI_HEX=$(sha256sum "$WORK/top.json" | cut -d' ' -f1)
  cp "$WORK/top.json" "$WORK/blobs/sha256/$MANI_HEX"
fi
MANI="$WORK/blobs/sha256/$MANI_HEX"
echo ">> manifest $MANI_HEX"

CONFIG_DIGEST=$(python -c "import json;print(json.load(open('$MANI'))['config']['digest'])")
fetch "$CONFIG_DIGEST"

python - "$MANI" <<'EOF' > "$WORK/layers.txt"
import json, sys
doc = json.load(open(sys.argv[1]))
for l in doc['layers']:
    print(l['digest'])
EOF
tr -d '\r' < "$WORK/layers.txt" > "$WORK/layers.clean" && mv "$WORK/layers.clean" "$WORK/layers.txt"
while read -r d; do fetch "$d"; done < "$WORK/layers.txt"

echo '{"imageLayoutVersion":"1.0.0"}' > "$WORK/oci-layout"
SIZE=$(stat -c %s "$MANI")
python - "$MANI_HEX" "$SIZE" > "$WORK/index.json" <<'EOF'
import json, sys
print(json.dumps({"schemaVersion": 2, "manifests": [{
    "mediaType": "application/vnd.oci.image.manifest.v1+json",
    "digest": f"sha256:{sys.argv[1]}", "size": int(sys.argv[2])}]}))
EOF

tar -C "$WORK" -cf "$WORK/image.tar" oci-layout index.json blobs
LOADED=$(docker load -i "$WORK/image.tar" | sed -n 's/^Loaded image ID: //p')
if [ -z "$LOADED" ]; then
  # fell back to a repo-tagged load
  docker tag "ghcr.io/$REPO:$TAG" "$FINAL_TAG"
else
  docker tag "$LOADED" "$FINAL_TAG"
fi
echo "DONE: $FINAL_TAG ($LOADED)"
