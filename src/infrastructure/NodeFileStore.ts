import { randomUUID } from "node:crypto";
import {
  accessSync, closeSync, constants, fchmodSync, fsyncSync, lstatSync, openSync,
  readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import type { TextFileStore } from "../application/ports/TextFileStore.js";

export class NodeFileStore implements TextFileStore {
  readText(path: string): string {
    if (path.length === 0 || !statSync(path).isFile()) {
      throw new Error("a regular input file is required");
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(path));
  }

  writeText(path: string, content: string): void {
    if (path.length === 0) {
      throw new Error("an output file path is required");
    }
    let target = resolve(path);
    const existing = lstatSync(target, { throwIfNoEntry: false });
    if (existing?.isSymbolicLink()) {
      target = realpathSync(target);
    }
    const status = statSync(target, { throwIfNoEntry: false });
    if (status !== undefined) {
      if (!status.isFile()) {
        throw new Error("a regular output file is required");
      }
      accessSync(target, constants.W_OK);
    }
    const temporary = join(dirname(target), `.${basename(target)}.${randomUUID()}.tmp`);
    let descriptor: number | undefined;
    let ownsTemporary = false;
    try {
      descriptor = openSync(temporary, "wx", status === undefined ? 0o666 : status.mode & 0o777);
      ownsTemporary = true;
      if (status !== undefined) {
        fchmodSync(descriptor, status.mode & 0o777);
      }
      writeFileSync(descriptor, content, "utf8");
      fsyncSync(descriptor);
      closeSync(descriptor);
      descriptor = undefined;
      renameSync(temporary, target);
      ownsTemporary = false;
    } finally {
      if (descriptor !== undefined) {
        try { closeSync(descriptor); } catch { /* Keep the original write error. */ }
      }
      if (ownsTemporary) {
        try { unlinkSync(temporary); } catch { /* Keep the original write error. */ }
      }
    }
  }
}
