import assert from "node:assert/strict";
import test from "node:test";
import { CommandLineParser } from "../src/cli/CommandLineParser.js";

test("the parser ignores blank input and full-line comments, including indentation", () => {
  const parser = new CommandLineParser();
  for (const line of ["", " \t ", "# replay notes", "  # comment with unmatched \""]) {
    assert.deepEqual(parser.parse(line), []);
  }
});

test("double quotes preserve spaces, Chinese content, and empty arguments", () => {
  const parser = new CommandLineParser();
  assert.deepEqual(parser.parse('create text title 20 40 "开始 处理数据"'), ["create", "text", "title", "20", "40", "开始 处理数据"]);
  assert.deepEqual(parser.parse('set title text ""'), ["set", "title", "text", ""]);
});

test("quoted arguments support escaped quotes and backslashes", () => {
  const parser = new CommandLineParser();
  const line = String.raw`set title text "他说 \"开始\" C:\\diagrams"`;
  assert.deepEqual(parser.parse(line), ["set", "title", "text", '他说 "开始" C:\\diagrams']);
});

test("hash-prefixed colors and inline hashes remain arguments", () => {
  const parser = new CommandLineParser();
  assert.deepEqual(parser.parse("create rect bg 0 0 800 600 #ffffff"), ["create", "rect", "bg", "0", "0", "800", "600", "#ffffff"]);
  assert.deepEqual(parser.parse('set title text "#开始"'), ["set", "title", "text", "#开始"]);
  assert.deepEqual(parser.parse("init # comment"), ["init", "#", "comment"]);
});

test("an unterminated quote is rejected and does not affect the next parsed line", () => {
  const parser = new CommandLineParser();
  assert.throws(() => parser.parse('set title text "开始'), /unterminated double quote/);
  assert.deepEqual(parser.parse("init 320 240"), ["init", "320", "240"]);
});
