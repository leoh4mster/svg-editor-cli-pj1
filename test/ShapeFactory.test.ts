import assert from "node:assert/strict";
import test from "node:test";
import { ShapeFactory } from "../src/application/ShapeFactory.js";

const factory = new ShapeFactory();

test("the built-in factory creates exactly the six required shape types", () => {
  const cases: Array<[string, string[], RegExp]> = [
    ["rect", ["1", "2", "3", "4"], /x=1 y=2 w=3 h=4/],
    ["circle", ["1", "2", "3"], /cx=1 cy=2 r=3/],
    ["ellipse", ["1", "2", "3", "4"], /cx=1 cy=2 rx=3 ry=4/],
    ["line", ["1", "2", "3", "4"], /\(1,2\) -> \(3,4\)/],
    ["text", ["1", "2", "开始 处理数据"], /\(1,2\) "开始 处理数据"/],
    ["g", [], /^g#example$/],
  ];
  for (const [type, args, geometry] of cases) {
    const shape = factory.create(type, "example", args);
    assert.equal(shape.type, type);
    assert.equal(shape.id, "example");
    assert.equal(shape.label, `${type}#example`);
    assert.equal(shape.isContainer, type === "g");
    assert.deepEqual(shape.children, []);
    assert.match(shape.summary(), geometry);
    assert.deepEqual([...shape.walk()], [shape]);
  }
  assert.equal(factory.describeTypes().length, 6);
});

test("appearance values are preserved while omitted attributes stay absent", () => {
  const cases: Array<[string, string[], string]> = [
    ["rect", ["1", "2", "3", "4"], "fill"],
    ["circle", ["1", "2", "3"], "fill"],
    ["ellipse", ["1", "2", "3", "4"], "fill"],
    ["line", ["1", "2", "3", "4"], "stroke"],
  ];
  for (const [type, args, attribute] of cases) {
    const plain = factory.create(type, "plain", args);
    assert.doesNotMatch(plain.summary(), /\b(?:fill|stroke)=/);
    assert.doesNotMatch(plain.details().join("\n"), /\b(?:fill|stroke)=/);
    const styled = factory.create(type, "styled", [...args, "#a0B1c2"]);
    assert.match(styled.summary(), new RegExp(`${attribute}=#a0B1c2`));
    assert.ok(styled.details().includes(`${attribute}=#a0B1c2`));
  }
});

test("SVG coordinates accept finite signed decimals and degenerate nonnegative sizes", () => {
  const rect = factory.create("rect", "r", ["-1.5", "+2e1", "0", ".25"]);
  assert.match(rect.summary(), /x=-1.5 y=20 w=0 h=0.25/);
  assert.match(factory.create("circle", "c", ["-1", "-2", "0"]).summary(), /cx=-1 cy=-2 r=0/);
  assert.match(factory.create("ellipse", "e", ["0", "0", "0", "0"]).summary(), /rx=0 ry=0/);
  assert.match(factory.create("line", "l", ["-4", "-3", "-2", "-1"]).summary(), /\(-4,-3\) -> \(-2,-1\)/);
});

test("shape creation rejects malformed and nonfinite numbers and negative sizes", () => {
  for (const value of ["", "nope", "NaN", "Infinity", "-Infinity", "1e309", "0x10", "1px"]) {
    assert.throws(() => factory.create("rect", "r", [value, "0", "1", "1"]));
    assert.throws(() => factory.create("text", "t", ["0", value, "text"]));
  }
  for (const [type, args] of [
    ["rect", ["0", "0", "-1", "1"]],
    ["rect", ["0", "0", "1", "-1"]],
    ["circle", ["0", "0", "-1"]],
    ["ellipse", ["0", "0", "-1", "1"]],
    ["ellipse", ["0", "0", "1", "-1"]],
  ] as const) {
    assert.throws(() => factory.create(type, "bad", args));
  }
});

test("all six type signatures reject missing and surplus arguments", () => {
  const validArguments: Array<[string, string[]]> = [
    ["rect", ["0", "0", "10", "20", "red"]],
    ["circle", ["0", "0", "10", "red"]],
    ["ellipse", ["0", "0", "10", "20", "red"]],
    ["line", ["0", "0", "10", "20", "black"]],
    ["text", ["0", "0", "text"]],
    ["g", []],
  ];
  for (const [type, args] of validArguments) {
    assert.throws(() => factory.create(type, "bad", [...args, "extra"]));
    if (type !== "g") {
      assert.throws(() => factory.create(type, "bad", args.slice(0, -2)));
    }
  }
});

test("ids are nonempty and whitespace free, while Chinese and case distinctions are retained", () => {
  for (const id of ["", "two words", "tab\tid", "line\nid", "control\u0000id"]) {
    assert.throws(() => factory.create("g", id, []));
  }
  for (const id of ["R1", "r1", "节点-1", "in"]) {
    assert.equal(factory.create("g", id, []).id, id);
  }
});

test("unregistered and case mismatched type names use the specified plugin error", () => {
  for (const type of ["box", "hexagon", "Rect"]) {
    assert.throws(() => factory.create(type, "n1", []), {
      message: `unknown shape type: ${type} (is the plugin loaded?)`,
    });
  }
});
