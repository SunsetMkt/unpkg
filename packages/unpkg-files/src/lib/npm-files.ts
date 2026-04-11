import { Readable } from "node:stream";
import crypto from "node:crypto";

import gunzipMaybe from "gunzip-maybe";
import tar from "tar-stream";
import type { PackageFile, PackageFileMetadata } from "unpkg-worker";

import { getContentType } from "./content-type.ts";

export async function getFile(
  registry: string,
  packageName: string,
  version: string,
  filename: string
): Promise<PackageFile | null> {
  let file: PackageFile | null = null;

  await fetchAndParsePackage(registry, packageName, version, {
    match(path) {
      return path.toLowerCase() === filename.toLowerCase() ? "buffer" : "skip";
    },
    onFile(path, parsedFile) {
      file = {
        path,
        body: parsedFile.content!,
        size: parsedFile.size,
        type: getContentType(path),
        integrity: parsedFile.integrity,
      };
    },
  });

  return file;
}

export async function listFiles(
  registry: string,
  packageName: string,
  version: string,
  prefix = "/"
): Promise<PackageFileMetadata[]> {
  let files: PackageFileMetadata[] = [];

  await fetchAndParsePackage(registry, packageName, version, {
    match(path) {
      if (path.endsWith("/") || !path.startsWith(prefix)) {
        return "skip";
      }
      return "hash";
    },
    onFile(path, parsedFile) {
      files.push({
        path,
        size: parsedFile.size,
        type: getContentType(path),
        integrity: parsedFile.integrity,
      });
    },
  });

  return files;
}

export class PackageNotFoundError extends Error {
  registry: string;
  packageName: string;
  version: string;

  constructor(message: string, registry: string, packageName: string, version: string) {
    super(message);
    this.name = "PackageNotFoundError";
    this.registry = registry;
    this.packageName = packageName;
    this.version = version;
  }
}

async function fetchAndParsePackage(
  registry: string,
  packageName: string,
  version: string,
  handler: ParseHandler
): Promise<void> {
  let tarballUrl = createTarballUrl(registry, packageName, version);

  let response = await fetch(tarballUrl);
  if (!response.ok || !response.body) {
    if (response.status === 404) {
      throw new PackageNotFoundError(`Package not found: ${packageName}`, registry, packageName, version);
    }
    throw new Error(`Failed to fetch tarball: ${response.status} ${response.statusText}`);
  }

  let tarball = Readable.from(response.body!);
  let gunzip = gunzipMaybe();
  let extract = tar.extract();

  const cleanup = () => {
    try {
      // Destroy all streams in the pipeline
      tarball.destroy();
      gunzip.destroy();
      extract.destroy();

      // If the response body is a ReadableStream, cancel it
      if (response.body && typeof response.body.cancel === "function") {
        response.body.cancel();
      }
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
    }
  };

  return new Promise((resolve, reject) => {
    extract.on("error", (error) => {
      cleanup();
      reject(error);
    });

    gunzip.on("error", (error) => {
      cleanup();
      reject(error);
    });

    tarball.on("error", (error) => {
      cleanup();
      reject(error);
    });

    extract.on("finish", () => {
      resolve();
    });

    extract.on("entry", (header, stream, next) => {
      if (header.type === "directory") {
        stream.resume();
        return next();
      }

      let name = header.name.replace(/^[^\/]+\//, "/");
      let mode = handler.match(name, header);
      if (mode === "skip") {
        stream.resume();
        return next();
      }

      let hash = crypto.createHash("sha256");
      let size = 0;
      let chunks: Buffer[] | null = mode === "buffer" ? [] : null;

      stream.on("error", (error) => {
        cleanup();
        reject(error);
      });

      stream.on("data", (chunk) => {
        size += chunk.length;
        hash.update(chunk);
        chunks?.push(chunk);
      });

      stream.on("end", () => {
        try {
          let integrity = `sha256-${hash.digest("base64")}`;
          handler.onFile(name, { content: chunks ? Buffer.concat(chunks) : undefined, size, integrity }, header);
          next();
        } catch (error) {
          cleanup();
          reject(error);
        }
      });
    });

    tarball.pipe(gunzip).pipe(extract);
  });
}

type ParseMode = "skip" | "hash" | "buffer";

interface ParsedFile {
  content?: Uint8Array;
  size: number;
  integrity: string;
}

interface ParseHandler {
  match(name: string, header: tar.Headers): ParseMode;
  onFile(name: string, parsedFile: ParsedFile, header: tar.Headers): void;
}

function createTarballUrl(registry: string, packageName: string, version: string): URL {
  let basename = packageName.split("/").pop()!.toLowerCase();
  return new URL(`/${packageName.toLowerCase()}/-/${basename}-${version}.tgz`, registry);
}
