import {
  EditCommand, EditorError, type ShapeCatalog, type SvgDocument,
} from "../../../src/extensions/index.js";

export class CreateCommand extends EditCommand {
  constructor(private readonly factory: ShapeCatalog) {
    super("create <type> <id> [params...] [in <containerId>]", "Create a shape, optionally inside a group.");
  }

  protected override apply(args: readonly string[], document: SvgDocument): string {
    const type = args[0];
    const id = args[1];
    if (type === undefined || id === undefined) {
      throw new EditorError(`usage: ${this.usage}`);
    }

    let parameters = args.slice(2);
    let containerId: string | undefined;
    if (parameters.length >= 2 && parameters.at(-2) === "in") {
      containerId = parameters.at(-1)!;
      parameters = parameters.slice(0, -2);
    }

    const shape = this.factory.create(type, id, parameters);
    document.addShape(shape, containerId);
    const parent = document.parentOf(shape.id);
    return `${shape.creationSummary}${parent === undefined ? "" : ` in ${parent.label}`}`;
  }
}
