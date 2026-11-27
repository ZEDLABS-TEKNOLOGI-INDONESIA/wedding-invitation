package sqlfs

import "embed"

//go:embed migrasi/*.sql
var MigrasiFS embed.FS
