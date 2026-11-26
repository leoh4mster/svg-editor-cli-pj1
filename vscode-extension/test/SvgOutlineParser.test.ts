import { test } from "node:test";
import assert = require("node:assert/strict");
import { SvgOutlineParser } from "../src/SvgOutlineParser";

test("keeps root, nested groups, anonymous leaves and sibling order", () => {
  const [root] = new SvgOutlineParser().parse('<svg><g id="a"><g id="b"><text/></g><rect id="r"/></g></svg>');
  assert.equal(root?.label, "svg");
  const [group] = root!.children;
  assert.equal(group!.label, "g#a");
  assert.deepEqual(group!.children.map(n => n.label), ["g#b", "rect#r"]);
  assert.equal(group!.children[0]!.children[0]!.label, "text");
});

test("offsets select original markup with CRLF, emoji, comments and multiline tags", () => {
  const leaf = '<x:rect\r\n id="a&amp;b" data-x=">"/>';
  const source = '<?xml version="1.0"?>\r\n<svg xmlns:x="urn:test"><!-- <rect/> -->🌱' + leaf + '<![CDATA[<not-a-tag/>]]></svg>';
  const [root] = new SvgOutlineParser().parse(source);
  const [rect] = root!.children;
  assert.equal(root!.end, source.length);
  assert.equal(root!.children.length, 1);
  assert.equal(rect!.label, "x:rect#a&b");
  assert.equal(source.slice(rect!.start, rect!.end), leaf);
  assert.equal(source.slice(rect!.start + 1, rect!.start + 1 + rect!.tagName.length), "x:rect");
});

test("handles CRLF immediately after the tag name and normal closing tags", () => {
  const element = "<g\r\n id='one'><text>标题</text></g>";
  const source = "<svg>" + element + "</svg>";
  const group = new SvgOutlineParser().parse(source)[0]!.children[0]!;
  assert.equal(source.slice(group.start, group.end), element);
});

test("an incomplete edit clears all symbols and the next valid version recovers", () => {
  const parser = new SvgOutlineParser();
  assert.equal(parser.parse("<svg><path/></svg>")[0]!.children[0]!.label, "path");
  for (const invalid of ["", "<svg><g", "<svg><g></svg>", '<svg id="', "<svg/>extra"]) {
    assert.deepEqual(parser.parse(invalid), []);
  }
  assert.equal(parser.parse('<svg><path id="updated"/></svg>')[0]!.children[0]!.label, "path#updated");
  assert.deepEqual(parser.parse("<html/>"), []);
});
