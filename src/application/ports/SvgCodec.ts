import type { SvgDocument } from "../../domain/SvgDocument.js";
import type { SvgReadResult } from "../SvgReadResult.js";

export interface SvgCodec {
  decode(xml: string): SvgReadResult;
  encode(document: SvgDocument): string;
}
