import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { EditorSession } from "../src/application/EditorSession.js";
import { ShapeFactory } from "../src/application/ShapeFactory.js";
import { SvgReadResult } from "../src/application/SvgReadResult.js";
import { CreateCommand } from "../src/application/commands/CreateCommand.js";
import { GroupCommand } from "../src/application/commands/GroupCommand.js";
import type { SvgDocument } from "../src/domain/SvgDocument.js";
import type { Shape } from "../src/domain/shapes/Shape.js";
import { SvgXmlCodec } from "../src/infrastructure/svg/SvgXmlCodec.js";

const codec = new SvgXmlCodec(new ShapeFactory());
const namespace = 'xmlns="http://www.w3.org/2000/svg"';

function shapeState(shape: Shape): unknown {
  return {
    type: shape.type,
    attributes: Object.fromEntries(shape.svgAttributes),
    text: shape.textContent,
    children: shape.children.map(shapeState),
  };
}

function documentState(document: SvgDocument): unknown {
  return { width: document.width, height: document.height, children: document.children.map(shapeState) };
}

test("assignment import creates the seven-node hierarchy and reports exactly the missing id", () => {
  const xml = readFileSync(new URL("../../examples/imported.svg", import.meta.url), "utf8");
  const result = codec.decode(xml);
  const document = result.copyDocument();
  assert.deepEqual(result.warnings, ["warning: assigned id rect1 to unnamed <rect>"]);
  assert.equal(document.width, 400);
  assert.equal(document.height, 300);
  assert.deepEqual(document.children.map((shape) => shape.id), ["rect1", "t1", "c1", "g1", "e1"]);
  assert.deepEqual(document.findShape("g1").children.map((shape) => shape.id), ["r2", "c2"]);
  assert.equal(document.children.flatMap((shape) => shape.walk()).length, 7);
  assert.equal(document.parentOf("r2")?.id, "g1");
  assert.equal(document.findShape("t1").textContent, "imported");
  assert.deepEqual(documentState(codec.decode(codec.encode(document)).copyDocument()), documentState(document));
});

test("auto ids follow preorder and skip every explicit id including root and later elements", () => {
  const result = codec.decode(`<svg ${namespace} id="rect1"><rect/><rect id="rect2"/><g><circle/><rect id=""/></g><circle id="circle1"/></svg>`);
  const document = result.copyDocument();
  assert.deepEqual(result.warnings, [
    "warning: assigned id rect3 to unnamed <rect>",
    "warning: assigned id g1 to unnamed <g>",
    "warning: assigned id circle2 to unnamed <circle>",
    "warning: assigned id rect4 to unnamed <rect>",
  ]);
  assert.deepEqual(document.children.flatMap((shape) => shape.walk()).map((shape) => shape.id), [
    "rect3", "rect2", "g1", "circle2", "rect4", "circle1",
  ]);
  assert.deepEqual(codec.decode(codec.encode(document)).warnings, []);
});

test("SVG defaults, px numbers and viewBox dimensions produce finite domain geometry", () => {
  const document = codec.decode(`<svg ${namespace} viewBox="-10 20 321 234"><rect id="r"/><circle id="c"/><ellipse id="e"/><line id="l"/><text id="t">默认</text></svg>`).copyDocument();
  assert.equal(document.width, 321);
  assert.equal(document.height, 234);
  for (const shape of document.children) {
    for (const [name, value] of shape.svgAttributes) {
      if (name !== "id") assert.equal(value, "0");
    }
  }
  assert.equal(document.findShape("t").textContent, "默认");
  const pixels = codec.decode(`<svg ${namespace} width="640px" height="480.5px"><rect id="r" x="-.5px" y="2e1" width="1.25px" height="0"/></svg>`).copyDocument();
  assert.equal(pixels.width, 640);
  assert.equal(pixels.height, 480.5);
  assert.equal(pixels.findShape("r").svgAttributes.get("x"), "-0.5");
  assert.equal(pixels.findShape("r").svgAttributes.get("y"), "20");
  const defaults = codec.decode(`<svg ${namespace}/>`).copyDocument();
  assert.equal(defaults.width, 800);
  assert.equal(defaults.height, 600);
});

test("whole-model roundtrip retains all six types, omitted styles, zero stroke, Unicode and passive attributes", () => {
  const source = `<svg ${namespace} width="640" height="480" viewBox="-5 10 640 480" data-project="课程 &amp; CLI">
    <g id="scene" fill="#abc" opacity="0.6" data-kind="box">
      <rect id="r" x="1.5" y="-2" width="3" height="4" stroke="black" stroke-width="0" data-note="A &quot;quoted&quot; &amp; B"/>
      <circle id="c" cx="2" cy="3" r="4"/>
      <ellipse id="e" cx="4" cy="5" rx="6" ry="7" fill="none"/>
      <line id="l" x1="1" y1="2" x2="3" y2="4" stroke="#123456"/>
      <text id="t" x="10" y="20" font-size="18" text-anchor="middle"> 课程 &amp; &lt;SVG&gt; &#x1F600; <![CDATA[<raw>]]> </text>
    </g>
  </svg>`;
  const document = codec.decode(source).copyDocument();
  const output = codec.encode(document);
  assert.deepEqual(documentState(codec.decode(output).copyDocument()), documentState(document));
  assert.equal(document.findShape("r").svgAttributes.get("stroke-width"), "0");
  assert.equal(document.findShape("c").svgAttributes.has("fill"), false);
  assert.equal(document.findShape("c").svgAttributes.has("stroke"), false);
  assert.equal(document.findShape("t").textContent, " 课程 & <SVG> 😀 <raw> ");
  assert.match(output, /viewBox="-5 10 640 480"/);
  assert.match(output, /data-project="课程 &amp; CLI"/);
  assert.doesNotMatch(output, /\stext=/);
});

test("namespace prefixes, comments and namespace bindings survive a semantic roundtrip", () => {
  const document = codec.decode(`<?xml version="1.0"?><s:svg xmlns:s="http://www.w3.org/2000/svg" xmlns:meta="urn:course"><!-- comment --><s:g id="g"><s:text id="t" x="1" y="2">A<!-- split -->B</s:text></s:g></s:svg>`).copyDocument();
  const encoded = codec.encode(document);
  assert.equal(document.findShape("t").textContent, "AB");
  assert.match(encoded, /xmlns:meta="urn:course"/);
  assert.deepEqual(documentState(codec.decode(encoded).copyDocument()), documentState(document));
});

test("moving namespaced attributes out of an ancestor retains their original namespace URI", () => {
  for (const targetBinding of ["urn:outer", "urn:different"]) {
    const document = codec.decode(`<svg ${namespace} xmlns:m="urn:outer"><g id="g" xmlns:m="urn:inner"><rect id="r" m:note="keep"/></g><g id="target" xmlns:m="${targetBinding}"/></svg>`).copyDocument();
    document.addTo("target", "r");
    assert.equal(document.parentOf("r")?.id, "target");
    let reread = codec.decode(codec.encode(document)).copyDocument();
    assert.equal(reread.findShape("r").svgAttributes.get("m:note"), "keep");
    assert.equal(reread.findShape("r").svgAttributes.get("xmlns:m"), "urn:inner");
    // An imported group can also be dissolved after it is nested elsewhere.
    const nested = codec.decode(`<svg ${namespace} xmlns:m="urn:outer"><g id="parent"><g id="inner" xmlns:m="urn:inner"><rect id="r" m:note="keep"/></g></g></svg>`).copyDocument();
    nested.ungroupShape("inner");
    reread = codec.decode(codec.encode(nested)).copyDocument();
    assert.equal(reread.parentOf("r")?.id, "parent");
    assert.equal(reread.findShape("r").svgAttributes.get("m:note"), "keep");
    assert.equal(reread.findShape("r").svgAttributes.get("xmlns:m"), "urn:inner");
  }
});

test("CDATA obeys XML newline normalization while character references preserve literal carriage returns", () => {
  const document = codec.decode(`<svg ${namespace}><text id="t"><![CDATA[A\rB\r\nC\nD]]>&#13;</text></svg>`).copyDocument();
  const expected = "A\nB\nC\nD\r";
  assert.equal(document.findShape("t").textContent, expected);
  assert.equal(codec.decode(codec.encode(document)).copyDocument().findShape("t").textContent, expected);
});

test("text and attribute escaping roundtrips literal XML metacharacters and CR LF TAB", () => {
  const document = codec.decode(`<svg ${namespace}><text id="t" data-note="A&#13;B&#10;C&#9;&quot;&amp;&lt;">x</text></svg>`).copyDocument();
  const content = '中文 😀 <tag> & "quoted" \'apostrophe\'\r\n\tend';
  document.setAttribute("t", "text", content);
  const encoded = codec.encode(document);
  const reread = codec.decode(encoded).copyDocument();
  assert.equal(reread.findShape("t").textContent, content);
  assert.equal(reread.findShape("t").svgAttributes.get("data-note"), 'A\rB\nC\t"&<');
  assert.match(encoded, /&lt;tag&gt;/);
  assert.match(encoded, /&amp;/);
  assert.match(encoded, /&#(?:13|x[dD]);/);
});

test("root metadata and shape extras survive transformations, hierarchy edits and snapshot history", () => {
  const session = new EditorSession();
  session.loadDocument(codec.decode(`<svg ${namespace} id="canvas-root" width="100" height="90" viewBox="-2 -3 200 180" data-author="student"><g id="outer" opacity="0.4"><g id="inner" data-kind="box"><rect id="r" x="1" y="2" width="3" height="4" data-note="keep"/><text id="t" x="2" y="3" font-size="12">开始</text></g><circle id="c" r="1"/></g></svg>`).copyDocument(), "source.svg");
  const before = codec.encode(session.requireDocument());
  session.executeEdit((draft) => {
    draft.moveShape("inner", 10, 20);
    draft.scaleShape("inner", 2);
    draft.setAttribute("r", "stroke-width", "0");
    draft.groupShapes("pair", ["r", "t"]);
    draft.bringToFront("r");
    draft.addTo("outer", "pair");
    draft.ungroupShape("pair");
    return "compound test edit";
  });
  const document = session.requireDocument();
  assert.equal(document.findShape("r").svgAttributes.get("x"), "22");
  assert.equal(document.findShape("r").svgAttributes.get("y"), "44");
  assert.equal(document.findShape("r").svgAttributes.get("width"), "6");
  assert.equal(document.findShape("r").svgAttributes.get("data-note"), "keep");
  assert.equal(document.findShape("t").svgAttributes.get("font-size"), "12");
  assert.equal(document.findShape("inner").svgAttributes.get("data-kind"), "box");
  const after = codec.encode(document);
  assert.match(after, /viewBox="-2 -3 200 180"/);
  assert.match(after, /data-author="student"/);
  assert.deepEqual(documentState(codec.decode(after).copyDocument()), documentState(document));
  session.undo();
  assert.equal(codec.encode(session.requireDocument()), before);
  session.redo();
  assert.equal(codec.encode(session.requireDocument()), after);
  session.resizeCanvas(320, 240);
  const resized = codec.encode(session.requireDocument());
  assert.match(resized, /viewBox="0 0 320 240"/);
  assert.match(resized, /data-author="student"/);
});

test("imported root ids remain reserved when create and group add nodes", () => {
  const session = new EditorSession();
  session.loadDocument(codec.decode(`<svg ${namespace} id="root"><circle id="a"/><circle id="b"/></svg>`).copyDocument(), "root.svg");
  assert.throws(() => new CreateCommand(new ShapeFactory()).execute(["g", "root"], session), { message: "id already exists: root" });
  assert.throws(() => new GroupCommand().execute(["root", "a", "b"], session), { message: "id already exists: root" });
  assert.match(codec.encode(session.requireDocument()), /id="root"/);
});

test("SvgReadResult owns copies of its document and warnings", () => {
  const document = codec.decode(`<svg ${namespace}><text id="t">original</text></svg>`).copyDocument();
  const warnings = ["warning: example"];
  const result = new SvgReadResult(document, warnings);
  document.setAttribute("t", "text", "external change");
  warnings.push("external warning");
  const first = result.copyDocument();
  first.setAttribute("t", "text", "retained copy change");
  assert.equal(result.copyDocument().findShape("t").textContent, "original");
  assert.deepEqual(result.warnings, ["warning: example"]);
  assert.notStrictEqual(result.copyDocument(), first);
});

test("malformed XML, declarations, unsupported structures and namespace confusion are rejected", () => {
  const rejected = [
    "", "<svg>", "<svg/><svg/>", "<svg><rect></svg>",
    '<?xml version="1.1"?><svg/>',
    '<?xml-stylesheet type="text/css" href="external.css"?><svg/>',
    '<?xml version="1.0"?><svg><?xml version="1.0"?></svg>',
    '<!DOCTYPE svg [<!ENTITY x "expanded">]><svg><text id="t">&x;</text></svg>',
    '<svg><text id="t">&unknown;</text></svg>',
    '<svg><rect id="a" id="b"/></svg>',
    '<svg xmlns:a="urn:meta" xmlns:b="urn:meta"><rect id="r" a:note="one" b:note="two"/></svg>',
    '<s:svg xmlns:s="http://www.w3.org/2000/svg"><s:g xmlns:s="" id="g"/></s:svg>',
    '<svg xmlns:xml="urn:incorrect"/>',
    '<html/>', '<svg xmlns="urn:not-svg"/>',
    `<svg ${namespace}><rect xmlns="urn:not-svg" id="r"/></svg>`,
    `<svg ${namespace}><path id="p" d="M0 0"/></svg>`,
    `<svg ${namespace}><rect id="r"><circle id="c"/></rect></svg>`,
    `<svg ${namespace}><text id="t"><tspan>nested</tspan></text></svg>`,
    `<svg ${namespace}><g id="g">unexpected text</g></svg>`,
    `<svg ${namespace} id="same"><rect id="same"/></svg>`,
    `<svg ${namespace}><rect id="same"/><circle id="same"/></svg>`,
    `<svg ${namespace}><rect id="bad id"/></svg>`,
  ];
  for (const xml of rejected) assert.throws(() => codec.decode(xml), xml);
});

test("unsupported presentation and active attributes fail instead of silently changing the SVG", () => {
  const attributes = [
    'transform="translate(10)"', 'style="fill:red"', 'href="#target"',
    'onclick="run()"', 'onload="run()"', 'xlink:href="#x" xmlns:xlink="http://www.w3.org/1999/xlink"',
  ];
  for (const attribute of attributes) {
    assert.throws(() => codec.decode(`<svg ${namespace}><g id="g" ${attribute}/></svg>`), attribute);
    assert.throws(() => codec.decode(`<svg ${namespace} ${attribute}/>`), attribute);
  }
});

test("invalid numbers and viewBoxes never yield partial or nonfinite documents", () => {
  const rejected = [
    'width="0"', 'height="-2"', 'width="Infinity"', 'height="NaN"',
    'viewBox="0 0 10"', 'viewBox="0 0 0 10"', 'viewBox="0 0 10 -1"', 'viewBox="0 0 1e309 10"',
  ];
  for (const attributes of rejected) assert.throws(() => codec.decode(`<svg ${namespace} ${attributes}/>`), attributes);
  for (const value of ["-1", "NaN", "Infinity", "1e309", "10%", "0x10", "12oops"]) {
    assert.throws(() => codec.decode(`<svg ${namespace}><rect id="r" width="${value}"/></svg>`), value);
  }
  assert.throws(() => codec.decode(`<svg ${namespace}><circle id="c" r="-1"/></svg>`));
  assert.throws(() => codec.decode(`<svg ${namespace}><rect id="r" stroke-width="-1"/></svg>`));
});

test("serialization rejects characters which XML 1.0 cannot represent", () => {
  const document = codec.decode(`<svg ${namespace}><text id="t">safe</text></svg>`).copyDocument();
  for (const content of ["bad\u0000text", "bad\u0001text", "bad\ud800text"]) {
    document.setAttribute("t", "text", content);
    assert.throws(() => codec.encode(document));
  }
});
