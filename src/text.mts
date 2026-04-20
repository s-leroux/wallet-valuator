type TextSource = string | Iterable<string> | Text;

export class Text {
  private content: string[];

  private add(src: TextSource): this {
    if (src instanceof Text) {
      for (const line of src.content) {
        this.content.push(line);
      }
    } else if (typeof src === "string") {
      const lines = src.split(/\r?\n/);

      // Drop the “split artifact” when the text ends with a line terminator.
      if (src.endsWith("\n")) lines.pop();

      for (const line of lines) {
        this.content.push(line);
      }
    } else {
      for (const item of src) {
        this.add(item); // will split on embedded \n
      }
    }
    return this;
  }

  constructor(text: TextSource) {
    this.content = [];
    this.add(text);
  }

  push(text: TextSource): this {
    return this.add(text);
  }

  get length(): number {
    return this.content.length;
  }

  lines(): readonly string[] {
    return this.content;
  }

  toString() {
    return this.content.join("\n");
  }

  toDisplayString() {
    return this.content.join("\n");
  }
}
