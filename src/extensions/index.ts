// Public surface for independently built plugins.
export type * from "./Contracts.js";
export { Command } from "../application/commands/Command.js";
export { CommandArguments } from "../application/CommandArguments.js";
export type { EditorSession } from "../application/EditorSession.js";
export { EditorError } from "../domain/EditorError.js";
export { NumericValue } from "../domain/NumericValue.js";
export { SvgDocument } from "../domain/SvgDocument.js";
export { Shape } from "../domain/shapes/Shape.js";
export { Group } from "../domain/shapes/Group.js";
export { Rect } from "../domain/shapes/Rect.js";
export { Text } from "../domain/shapes/Text.js";
export { Circle } from "../domain/shapes/Circle.js";
export { Ellipse } from "../domain/shapes/Ellipse.js";
export { Line } from "../domain/shapes/Line.js";
export { EditCommand } from "../application/commands/EditCommand.js";
export type { CommandCatalog } from "../application/ports/CommandCatalog.js";
export type { SvgCodec } from "../application/ports/SvgCodec.js";
export type { TextFileStore } from "../application/ports/TextFileStore.js";
