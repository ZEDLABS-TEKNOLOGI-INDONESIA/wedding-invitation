import { getWeddingByCustomDomain, type WeddingRecord } from "./db";
import {
  DOMAIN_UTAMA,
  ambilHostPermintaan,
  apakahHostUtamaAtauLokal,
  normalkanDomain,
  validasiDomainKustom,
} from "./domainUtils";

export {
  DOMAIN_UTAMA,
  ambilHostPermintaan,
  apakahHostUtamaAtauLokal,
  normalkanDomain,
  validasiDomainKustom,
};

export interface ResolusiHost {
  host: string;
  mode: "utama" | "kustom" | "tidak_dikenal";
  wedding: WeddingRecord | null;
}

export function resolusiHostUndangan(request: Request, url?: URL): ResolusiHost {
  const host = ambilHostPermintaan(request, url);
  if (apakahHostUtamaAtauLokal(host)) {
    return { host, mode: "utama", wedding: null };
  }
  const wedding = getWeddingByCustomDomain(host);
  if (wedding && wedding.status === "active") {
    return { host, mode: "kustom", wedding };
  }
  return { host, mode: "tidak_dikenal", wedding: null };
}
