#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
root=$(git rev-parse --show-toplevel)
sha=$(git rev-parse --verify "$1^{commit}") || exit 1
rev=${sha:0:12}
mkdir -p "$root/local/releases"
chmod 700 "$root/local/releases"
log="$root/local/releases/release-$rev.log"
: > "$log"
chmod 600 "$log"
exec > >(tee "$log") 2>&1
started=$SECONDS
step_name=
activated=0
tmp=$(mktemp -d)
finish_step() {
  if [[ -n $step_name ]]; then
    printf 'STEP %s duration=%ss\n' "$step_name" "$((SECONDS - step_started))"
  fi
}
step() {
  finish_step
  step_name=$1
  step_started=$SECONDS
  printf 'START %s %s\n' "$(date -u +%FT%TZ)" "$step_name"
}
finish() {
  code=$?
  trap - EXIT
  finish_step
  rm -rf "$tmp"
  case $code in 0) result=success ;; 1) result=before-activation-failed ;; 2) result=rolled-back ;; 3) result=rollback-failed ;; esac
  printf 'RESULT %s exit=%s total=%ss\n' "$result" "$code" "$((SECONDS - started))"
}
trap finish EXIT
run_at() {
  local host=$1 command
  shift
  printf -v command '%q ' bash -c $'set -euo pipefail\n'"$1" "${@:2}"
  if [[ -n $host ]]; then
    ssh -o BatchMode=yes "$host" "$command"
  else
    bash -c "$command"
  fi
}
health() {
  local deadline=$((SECONDS + 60))
  while ((SECONDS < deadline)); do
    if [[ $(curl -fsS --max-time "$((deadline - SECONDS))" "$BASE_URL/api/health" 2>/dev/null) == '{"ok":true}' ]]; then return 0; fi
    sleep 1
  done
  return 1
}
failed() {
  trap - ERR
  if ((activated == 0)); then exit 1; fi
  step rollback
  if run_at "$TARGET_SSH" '
    d=$1; compose=$2; project=$3; rev=$4
    $d tag "idesk:before-$rev" "$project-idesk:latest"
    $d compose -p "$project" -f "$compose" up -d --no-build --pull never --no-deps --force-recreate idesk
  ' _ "$DOCKER" "$COMPOSE_FILE" "$COMPOSE_PROJECT" "$rev" && health &&
    [[ $(curl -fsS -o /dev/null -w '%{http_code}' "$BASE_URL/login") == 200 ]]; then
    exit 2
  fi
  exit 3
}
trap failed ERR
set -a
source "$root/deploy/release/targets/$TARGET.env"
set +a
release_dir="$RELEASE_DIR/$(date -u +%Y%m%dT%H%M%S)-$rev"
printf 'TARGET release_dir=%s backup_dir=%s/backup\n' "$release_dir" "$release_dir"
archive="idesk-$rev.tar.gz"
step build
mkdir "$tmp/context"
git archive "$sha" | (umask 022; tar -x -C "$tmp/context")
read -r -a build_wrapper <<< "$BUILD_WRAPPER"
"${build_wrapper[@]}" docker build -f "$tmp/context/deploy/Dockerfile" --build-arg WITH_OFFICE=true \
  --label "org.opencontainers.image.revision=$sha" -t "idesk:$rev" "$tmp/context"
step package
docker save "idesk:$rev" | gzip > "$tmp/$archive"
archive_bytes=$(wc -c < "$tmp/$archive")
printf 'ARCHIVE bytes=%d\n' "$archive_bytes"
checksum=$(sha256sum "$tmp/$archive")
checksum=${checksum%% *}
printf 'ARCHIVE sha256=%s\n' "$checksum"
step transfer
run_at "$TARGET_SSH" 'umask 077; mkdir -p -m 700 "$1"' _ "$release_dir"
if [[ -n $RELAY_SSH ]]; then
  run_at "$RELAY_SSH" 'umask 077; mkdir -p -m 700 "$1"' _ "$RELAY_DIR"
  ssh-keygen -F "${TARGET_SSH##*@}" > "$tmp/known_hosts"
  transfer_started=$SECONDS
  scp -C "$tmp/$archive" "$tmp/known_hosts" "$RELAY_SSH:$RELAY_DIR/"
  printf 'TRANSFER leg=local-to-relay duration=%ss\n' "$((SECONDS - transfer_started))"
  run_at "$RELAY_SSH" '
    cd "$1"
    printf "%s  %s\n" "$2" "$3" | sha256sum -c -
    transfer_started=$SECONDS
    scp -C -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$1/known_hosts" "$3" "$4:$5/"
    printf "TRANSFER leg=relay-to-target duration=%ss\n" "$((SECONDS - transfer_started))"
  ' _ "$RELAY_DIR" "$checksum" "$archive" "$TARGET_SSH" "$release_dir"
elif [[ -n $TARGET_SSH ]]; then
  transfer_started=$SECONDS
  scp -C "$tmp/$archive" "$TARGET_SSH:$release_dir/"
  printf 'TRANSFER leg=local-to-target duration=%ss\n' "$((SECONDS - transfer_started))"
else
  transfer_started=$SECONDS
  cp "$tmp/$archive" "$release_dir/$archive"
  printf 'TRANSFER leg=local-copy duration=%ss\n' "$((SECONDS - transfer_started))"
fi
run_at "$TARGET_SSH" 'cd "$1"; printf "%s  %s\n" "$2" "$3" | sha256sum -c -' _ "$release_dir" "$checksum" "$archive"
if [[ -n $RELAY_SSH ]]; then
  run_at "$RELAY_SSH" 'rm "$1/$2" "$1/known_hosts"' _ "$RELAY_DIR" "$archive"
fi
step load
run_at "$TARGET_SSH" 'gunzip -c "$1/$2" | $3 load; rm "$1/$2"' _ "$release_dir" "$archive" "$DOCKER"
step backup
run_at "$TARGET_SSH" '
  umask 077
  d=$1; compose=$2; project=$3; dir=$4/backup; rev=$5
  container=$($d compose -p "$project" -f "$compose" ps -q idesk)
  mkdir -m 700 "$dir"
  $d inspect --format "{{.Config.Image}} {{.Image}}" "$container" > "$dir/image.txt"
  $d tag "$($d inspect --format "{{.Image}}" "$container")" "idesk:before-$rev"
  $d exec "$container" sh -c "umask 077; ./node_modules/.bin/tsx src/db/backup.ts /data/maintenance-backup.db"
  $d cp "$container:/data/maintenance-backup.db" "$dir/idesk.db"
  sudo chown "$(id -u):$(id -g)" "$dir/idesk.db"
  $d exec "$container" sh -c '\''cd /data; for d in plugins plugin-data office; do if [ -d "$d" ]; then printf "%s\n" "$d"; fi; done | tar -czf - -T -'\'' > "$dir/files.tar.gz"
  cp "$(dirname "$compose")/../.env" "$dir/env"
  cp "$compose" "$dir/compose.yml"
  chmod 600 "$dir"/*
  $d exec "$container" rm /data/maintenance-backup.db
' _ "$DOCKER" "$COMPOSE_FILE" "$COMPOSE_PROJECT" "$release_dir" "$rev"
count=$(node "$root/deploy/release/smoke.mjs" count)
printf 'TASKS before=%s\n' "$count"
step activate
activated=1
run_at "$TARGET_SSH" '
  d=$1; compose=$2; project=$3; rev=$4
  $d tag "idesk:$rev" "$project-idesk:latest"
  $d compose -p "$project" -f "$compose" up -d --no-build --pull never --no-deps --force-recreate idesk
' _ "$DOCKER" "$COMPOSE_FILE" "$COMPOSE_PROJECT" "$rev"
health
step smoke
read -r -a browser_wrapper <<< "$BROWSER_WRAPPER"
"${browser_wrapper[@]}" node "$root/deploy/release/smoke.mjs" check "$count"
run_at "$TARGET_SSH" 'umask 077; printf "%s\n" "$1" > "$2"' _ "$sha" "$MARKER_FILE"
exit 0
