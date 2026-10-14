// Tests for the dashboard's display helpers.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { shortName, tightName, skillNoteDetail, scoreOf } from "../components/elo/format.js";

describe("shortName", () => {
  test("drops edition-style subtitles", () => {
    assert.equal(shortName("Anomia: Party Edition"), "Anomia");
    assert.equal(shortName("Twilight Imperium: Fourth Edition"), "Twilight Imperium");
    assert.equal(shortName("Pax Pamir: Second Edition"), "Pax Pamir");
  });

  test("keeps subtitles that are the game's identity", () => {
    // Brass: Lancashire is a different game
    assert.equal(shortName("Brass: Birmingham"), "Brass: Birmingham");
    assert.equal(shortName("The Crew: Mission Deep Sea"), "The Crew: Mission Deep Sea");
    assert.equal(shortName("Indonesia"), "Indonesia");
  });

  test("tightName layers hand-picked initialisms over it", () => {
    assert.equal(tightName("The Old King's Crown"), "TOKC");
    assert.equal(tightName("Anomia: Party Edition"), "Anomia");
  });
});

describe("skillNoteDetail", () => {
  test("the explanation after the em dash, trimmed", () => {
    assert.equal(
      skillNoteDetail("Indonesia — zero randomness, pure economic play"),
      "zero randomness, pure economic play",
    );
  });

  test("only the first em dash splits", () => {
    assert.equal(skillNoteDetail("G — luck — but less"), "luck — but less");
  });

  test("uncurated notes without a dash have no detail", () => {
    assert.equal(skillNoteDetail("no curation; default"), "");
    assert.equal(skillNoteDetail(undefined), "");
  });
});

describe("scoreOf", () => {
  test("numbers pass through, including zero", () => {
    assert.equal(scoreOf(22), 22);
    assert.equal(scoreOf(0), 0);
  });

  test("anything else is unscored", () => {
    assert.equal(scoreOf(null), null);
    assert.equal(scoreOf(undefined), null);
    assert.equal(scoreOf(NaN), null);
  });

  test("strings are not scores — the export contract is numeric or null", () => {
    // tests/data-invariants.test.js pins "never strings"; a string here
    // means the export regressed, and coercing it would hide that
    assert.equal(scoreOf("22"), null);
    assert.equal(scoreOf(""), null);
  });
});
