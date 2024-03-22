// Module
import { NLPModel } from "../src/i2t-model-xs";
import { expect, test } from "@jest/globals";

const test1 = [
    { className: "cat", probability: 0.9 },
    { className: "wolf", probability: 0.4 },
    { className: "bird", probability: 0.01 },
    { className: "dog", probability: 0.8 },
    { className: "fish", probability: 0.4 },
    { className: "shark", probability: 0.01 }
];

const test2 = [
    { className: "cat", probability: 0.9 },
    { className: "wolf", probability: 0.4 },
    { className: "bird", probability: 0.1 }
];

const test3 = [
    { className: "dog", probability: 0.7 },
    { className: "cat", probability: 0.9 },
    { className: "wolf", probability: 0.9 },
    { className: "bird", probability: 0.4 },
    { className: "cow", probability: 0.3 },
    { className: "horse", probability: 0.2 },
    { className: "fish", probability: 0.01 },
    { className: "shark", probability: 0.02 },
    { className: "whale", probability: 0.04 }
];

const test4 = [
    { className: "bird", probability: 0.4 },
    { className: "horse", probability: 0.2 },
    { className: "wolf", probability: 0.2 },
    { className: "fish", probability: 0.01 },
    { className: "shark", probability: 0.01 }
];

const test5 = [
    { className: "horse", probability: 0.02 },
    { className: "fish", probability: 0.01 },
];

const test6 = [];


const nlp = new NLPModel();

test("Test 1", () => {
    const actual = nlp.textContentFromPrediction(test1);
    const expected = "Image that contains cat and dog and maybe has wolf and fish and could possibly have bird and shark."
    expect(actual).toBe(expected);
})

test("Test 2", () => {
    const actual = nlp.textContentFromPrediction(test2);
    const expected = "Image that contains cat and maybe has wolf and bird."
    expect(actual).toBe(expected);
})

test("Test 3", () => {
    const actual = nlp.textContentFromPrediction(test3);
    const expected = "Image that contains dog, cat and wolf and maybe has bird, cow and horse and could possibly have fish, shark and whale."
    expect(actual).toBe(expected);
})

test("Test 4", () => {
    const actual = nlp.textContentFromPrediction(test4);
    const expected = "Image that may contain bird, horse and wolf and could possibly have fish and shark."
    expect(actual).toBe(expected);
})

test("Test 5", () => {
    const actual = nlp.textContentFromPrediction(test5);
    const expected = "Image that possibly contains horse and fish."
    expect(actual).toBe(expected);
})

test("Test 6", () => {
    const actual = nlp.textContentFromPrediction(test6);
    const expected = "Image unclear"
    expect(actual).toBe(expected);
})
