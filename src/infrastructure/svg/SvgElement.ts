export class SvgElement {
  private readonly childElements: SvgElement[] = [];
  private readonly attributesByName: ReadonlyMap<string, string>;
  private content = "";

  constructor(private readonly localName: string, attributes: ReadonlyMap<string, string>) {
    this.attributesByName = new Map(attributes);
  }

  get type(): string {
    return this.localName;
  }

  get attributes(): ReadonlyMap<string, string> {
    return new Map(this.attributesByName);
  }

  get children(): readonly SvgElement[] {
    return [...this.childElements];
  }

  get text(): string {
    return this.content;
  }

  appendChild(child: SvgElement): void {
    this.childElements.push(child);
  }

  appendText(text: string): void {
    this.content += text;
  }

  preorder(): readonly SvgElement[] {
    return [this, ...this.childElements.flatMap((child) => child.preorder())];
  }
}
