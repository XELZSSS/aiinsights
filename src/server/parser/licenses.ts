const OPEN_LICENSES = new Set([
  "apache-2.0",
  "mit",
  "bsd",
  "bsd-2-clause",
  "bsd-3-clause",
  "isc",
  "cc",
  "cc0-1.0",
  "cc-by-4.0",
  "cc-by-sa-4.0",
  "bigscience-openrail-m",
  "bigscience-bloom-rail-1.0",
  "openrail",
  "creativeml-openrail-m",
  "openrail++",
  "bigcode-openrail-m",
  "llama3.1",
  "llama3",
  "llama2",
  "gemma",
  "gemma2",
  "gemma-2.0",
  "qwen",
  "falcon",
  "mpt",
  "deepseek",
  "yi",
  "gpl",
  "gpl-2.0",
  "gpl-3.0",
  "agpl-3.0",
  "lgpl",
  "lgpl-2.1",
  "lgpl-3.0",
  "mpl-2.0",
  "epl-2.0",
  "osl-3.0",
  "unlicense",
  "zlib",
  "mulanpsl-1.0",
  "mulanpsl-2.0",
  "nvidia-open-model-license",
  "sil-openrail-1.0",
]);

const LICENSE_PREFIX = "license:";

export function getOpenLicense(tags: string[]): string | null {
  for (const tag of tags) {
    if (!tag.startsWith(LICENSE_PREFIX)) continue;
    const id = tag.slice(LICENSE_PREFIX.length);
    if (OPEN_LICENSES.has(id)) return id;
  }
  return null;
}
