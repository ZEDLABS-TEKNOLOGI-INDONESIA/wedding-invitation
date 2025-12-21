```bash
set -euo pipefail
OUT=".draft.md"
ROOT="."
EXCLUDE_PATTERNS=( 
  "./node_modules/*" 
  "./.git/*" 
  "./.yarn/*" 
  "./.astro/*" 
  "./dist/*" 
  "./package-lock.json" 
  "./pnpm-lock.yaml"
  "./bun.lockb"
  "./yarn.lock"
  "./.generate.sh" 
  "./wedding.db" 
  "./wedding.db-shm" 
  "./wedding.db-wal" 
  "./$OUT" 
  "./.gitignore"
  "./gambar.png"
  "./video.mp4"
  "./README.md"
  "./.gitattributes"
  "./.yarnrc.yml"
  "./.DS_Store"
  "*.png" "*.jpg" "*.jpeg" "*.webp" "*.ico" "*.gif" "*.svg" "*.avif"
  "*.woff" "*.woff2" "*.ttf" "*.otf" "*.eot"
  "*.mp3" "*.mp4"
)
lang_for_ext() {
  case "$1" in
    astro) printf "astro" ;;
    tsx)   printf "tsx" ;;
    ts)    printf "ts" ;;
    mjs)   printf "javascript" ;;
    cjs)   printf "javascript" ;;
    js)    printf "js" ;;
    jsx)   printf "jsx" ;;
    json)  printf "json" ;;
    md)    printf "markdown" ;;
    mdx)   printf "markdown" ;;
    html)  printf "html" ;;
    css)   printf "css" ;;
    scss)  printf "scss" ;;
    svg)   printf "xml" ;;
    txt)   printf "text" ;;
    yml|yaml) printf "yaml" ;;
    sh)    printf "bash" ;;
    py)    printf "python" ;;
    go)    printf "go" ;;
    java)  printf "java" ;;
    Dockerfile) printf "dockerfile" ;;
    Makefile)   printf "makefile" ;;
    *)     printf "" ;;
  esac
}
: > "$OUT"
files=()
while IFS= read -r -d '' f; do
  skip=false
  for pat in "${EXCLUDE_PATTERNS[@]}"; do
    if [[ "$f" == $pat ]]; then
      skip=true
      break
    fi
  done
  $skip && continue
  files+=("$f")
done < <(find "$ROOT" -type f -print0)
if [ "${#files[@]}" -eq 0 ]; then
  echo "Tidak ada file ditemukan untuk diproses."
  exit 0
fi
declare -A groups
for f in "${files[@]}"; do
  p="${f#./}"
  if [[ "$p" == */* ]]; then
    top="${p%%/*}"
  else
    top="ROOT"
  fi
  rel="./${p}"
  if [ -z "${groups[$top]:-}" ]; then
    groups[$top]="$rel"
  else
    groups[$top]="${groups[$top]}"$'\n'"$rel"
  fi
done
IFS=$'\n'
for top in $(printf '%s\n' "${!groups[@]}" | sort -V); do
  printf "## Direktory: %s\n\n" "$top" >> "$OUT"
  mapfile -t flist < <(printf '%s\n' "${groups[$top]}" | sort -V)
  for file in "${flist[@]}"; do
    case "$file" in
      "./$OUT" | "$OUT" | "./generate.sh" | "generate.sh") continue ;;
    esac
    filename="$(basename -- "$file")"
    if [[ "$filename" == *.* ]]; then
      ext="${filename##*.}"
    else
      ext="$filename"
    fi
    lang="$(lang_for_ext "$ext")"
    printf "### File: \`%s\`\n\n" "$file" >> "$OUT"
    if [ -n "$lang" ]; then
      printf '```%s\n' "$lang" >> "$OUT"
    else
      printf '```\n' >> "$OUT"
    fi
    sed 's/\r$//' "$file" >> "$OUT"
    printf '\n```\n\n---\n\n' >> "$OUT"
  done
done
echo "Selesai. File '$OUT' telah dibuat/diupdate (Mode: Astro Project)."
```
