import { strict as assert } from "node:assert";
import { answerQuestion } from "./agent";
assert.equal(answerQuestion("hello"), "I can help with that.");
