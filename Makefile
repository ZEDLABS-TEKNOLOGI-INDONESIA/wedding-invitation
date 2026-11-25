.PHONY: help dev build preview lint typecheck test check format \
	install update clean backup pull deploy cek-deploy cek-deploy-publik sync push

INFRA_DIR ?= $(abspath ../infra-server)

help: ## Tampilkan daftar perintah
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Install dependency dengan pnpm
	pnpm install

update: ## Perbarui dependency
	pnpm update

dev: ## Jalankan development server lokal
	pnpm run dev

build: ## Build aplikasi untuk produksi
	ASTRO_TELEMETRY_DISABLED=1 pnpm run build

preview: ## Jalankan preview hasil build lokal
	node ./dist/server/entry.mjs

lint: ## Jalankan ESLint
	ASTRO_TELEMETRY_DISABLED=1 pnpm run lint

typecheck: ## Jalankan Astro sync dan TypeScript check
	ASTRO_TELEMETRY_DISABLED=1 pnpm run typecheck

test: ## Jalankan seluruh unit test
	pnpm run test

format: ## Format seluruh kode dengan Prettier
	pnpm run format

check: lint typecheck test build ## Quality gate lengkap: lint, typecheck, test, build
	@echo "Semua pemeriksaan selesai."

clean: ## Hapus artefak build lokal
	rm -rf dist .astro

backup: ## Backup database SQLite dan folder uploads ke ./backups
	@mkdir -p backups
	@tar -czf backups/database-$$(date +%Y%m%d-%H%M%S).tar.gz database
	@echo "Backup tersimpan di folder backups/"

pull: ## Tarik perubahan terbaru dari GitHub tanpa stash tersembunyi
	git pull --ff-only

deploy: ## Deploy ke CT 204 (zl-wedding) lewat infra-server: make deploy [VERSI=HEAD] [DRY_RUN=1]
	@REPO_WEDDING="$(CURDIR)" bash "$(INFRA_DIR)/layanan/zl-wedding/deploy.sh" $(VERSI)

cek-deploy: ## Periksa layanan zl-wedding di CT 204 lewat IP
	@bash "$(INFRA_DIR)/layanan/zl-wedding/cek.sh"

cek-deploy-publik: ## Periksa layanan zl-wedding lewat domain publik
	@bash "$(INFRA_DIR)/layanan/zl-wedding/cek.sh" publik

sync: ## Samakan persis dengan GitHub (buang perubahan lokal terlacak)
	git fetch origin
	git reset --hard origin/main

push: check ## Commit berkas terlacak dan push: make push MSG="pesan"
	@test -n "$(MSG)" || { echo 'Pakai: make push MSG="pesan commit"'; exit 1; }
	git add -u
	git commit -m "$(MSG)"
	git push
