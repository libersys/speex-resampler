"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const perf_hooks_1 = require("perf_hooks");
const path_1 = __importDefault(require("path"));
const index_1 = require("./index");
// Simple assertion helper
const assert = (condition, message) => {
    if (!condition)
        throw new Error(message);
};
const audioTests = [
    {
        inFile: path_1.default.resolve(__dirname, "../resources/24000hz_mono_test.pcm"),
        inRate: 24000,
        outRate: 48000,
        channels: 1,
        quality: 5,
    },
    {
        inFile: path_1.default.resolve(__dirname, "../resources/24000hz_test.pcm"),
        inRate: 24000,
        outRate: 24000,
        channels: 2,
        quality: 5,
    },
    {
        inFile: path_1.default.resolve(__dirname, "../resources/24000hz_test.pcm"),
        inRate: 24000,
        outRate: 48000,
        channels: 2,
        quality: 10,
    },
    {
        inFile: path_1.default.resolve(__dirname, "../resources/44100hz_test.pcm"),
        inRate: 44100,
        outRate: 48000,
        channels: 2,
    },
    {
        inFile: path_1.default.resolve(__dirname, "../resources/44100hz_test.pcm"),
        inRate: 44100,
        outRate: 48000,
        channels: 2,
        quality: 10,
    },
    {
        inFile: path_1.default.resolve(__dirname, "../resources/44100hz_test.pcm"),
        inRate: 44100,
        outRate: 48000,
        channels: 2,
        quality: 1,
    },
    {
        inFile: path_1.default.resolve(__dirname, "../resources/44100hz_test.pcm"),
        inRate: 44100,
        outRate: 24000,
        channels: 2,
        quality: 5,
    },
];
// ---------------------------
//  Promise-based API testing
// ---------------------------
async function promiseBasedTest() {
    for (const test of audioTests) {
        console.log(`Resampling file ${test.inFile} with ${test.channels} channel(s) from ${test.inRate}Hz to ${test.outRate}Hz (quality: ${test.quality ?? 7})`);
        const resampler = new index_1.SpeexResampler(test.channels, test.inRate, test.outRate, test.quality);
        const filename = path_1.default.parse(test.inFile).name;
        const pcmData = (0, fs_1.readFileSync)(test.inFile);
        const start = perf_hooks_1.performance.now();
        const res = await resampler.processChunk(pcmData);
        const end = perf_hooks_1.performance.now();
        console.log(`Resampled in ${Math.floor(end - start)}ms`);
        console.log(`Input stream: ${pcmData.length} bytes, ${(pcmData.length /
            test.inRate /
            2 /
            test.channels).toFixed(2)}s`);
        console.log(`Output stream: ${res.length} bytes, ${(res.length /
            test.outRate /
            2 /
            test.channels).toFixed(2)}s`);
        const inputDuration = pcmData.length / test.inRate / 2 / test.channels;
        const outputDuration = res.length / test.outRate / 2 / test.channels;
        assert(Math.abs(inputDuration - outputDuration) < 0.01, `Stream duration mismatch: in=${inputDuration}s out=${outputDuration}s`);
        // Uncomment to save output
        // writeFileSync(path.resolve(__dirname, `../resources/${filename}_${test.outRate}_${test.quality || 7}_output.pcm`), res);
        console.log();
    }
}
// ---------------------------
//  Transform stream testing
// ---------------------------
async function streamBasedTest() {
    console.log("=================");
    console.log("Transform Stream Test");
    console.log("=================");
    for (const test of audioTests) {
        console.log(`Resampling file ${test.inFile} with ${test.channels} channel(s) from ${test.inRate}Hz to ${test.outRate}Hz (quality: ${test.quality ?? 7})`);
        const readFileStream = (0, fs_1.createReadStream)(test.inFile);
        const transformStream = new index_1.SpeexResamplerTransform(test.channels, test.inRate, test.outRate, test.quality);
        let pcmData = Buffer.alloc(0);
        let resampledData = Buffer.alloc(0);
        readFileStream.on("data", (chunk) => {
            pcmData = Buffer.concat([pcmData, chunk]);
        });
        transformStream.on("data", (chunk) => {
            resampledData = Buffer.concat([resampledData, chunk]);
        });
        const start = perf_hooks_1.performance.now();
        readFileStream.pipe(transformStream);
        await new Promise((resolve) => transformStream.on("end", resolve));
        const end = perf_hooks_1.performance.now();
        console.log(`Resampled in ${Math.floor(end - start)}ms`);
        console.log(`Input stream: ${pcmData.length} bytes, ${(pcmData.length /
            test.inRate /
            2 /
            test.channels).toFixed(2)}s`);
        console.log(`Output stream: ${resampledData.length} bytes, ${(resampledData.length /
            test.outRate /
            2 /
            test.channels).toFixed(2)}s`);
        const inputDuration = pcmData.length / test.inRate / 2 / test.channels;
        const outputDuration = resampledData.length / test.outRate / 2 / test.channels;
        assert(Math.abs(inputDuration - outputDuration) < 0.01, `Stream duration mismatch: in=${inputDuration}s out=${outputDuration}s`);
        console.log();
    }
}
// ---------------------------
//  Run both test suites
// ---------------------------
(async () => {
    try {
        await promiseBasedTest();
        await streamBasedTest();
        console.log("✅ All tests completed successfully.");
    }
    catch (err) {
        console.error("❌ Test failed:", err);
        process.exit(1);
    }
})();
