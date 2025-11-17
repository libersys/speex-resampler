import { readFileSync, createReadStream } from "fs";
import { performance } from "perf_hooks";
import path from "path";
import { SpeexResampler, SpeexResamplerTransform } from "./index";

// Simple assertion helper
const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(message);
};

// Define test cases
interface AudioTest {
  inFile: string;
  inRate: number;
  outRate: number;
  channels: number;
  quality?: number;
}

const audioTests: AudioTest[] = [
  {
    inFile: path.resolve(__dirname, "../resources/24000hz_mono_test.pcm"),
    inRate: 24000,
    outRate: 48000,
    channels: 1,
    quality: 5,
  },
  {
    inFile: path.resolve(__dirname, "../resources/24000hz_test.pcm"),
    inRate: 24000,
    outRate: 24000,
    channels: 2,
    quality: 5,
  },
  {
    inFile: path.resolve(__dirname, "../resources/24000hz_test.pcm"),
    inRate: 24000,
    outRate: 48000,
    channels: 2,
    quality: 10,
  },
  {
    inFile: path.resolve(__dirname, "../resources/44100hz_test.pcm"),
    inRate: 44100,
    outRate: 48000,
    channels: 2,
  },
  {
    inFile: path.resolve(__dirname, "../resources/44100hz_test.pcm"),
    inRate: 44100,
    outRate: 48000,
    channels: 2,
    quality: 10,
  },
  {
    inFile: path.resolve(__dirname, "../resources/44100hz_test.pcm"),
    inRate: 44100,
    outRate: 48000,
    channels: 2,
    quality: 1,
  },
  {
    inFile: path.resolve(__dirname, "../resources/44100hz_test.pcm"),
    inRate: 44100,
    outRate: 24000,
    channels: 2,
    quality: 5,
  },
];

// ---------------------------
//  Promise-based API testing
// ---------------------------
async function promiseBasedTest(): Promise<void> {
  for (const test of audioTests) {
    console.log(
      `Resampling file ${test.inFile} with ${test.channels} channel(s) from ${
        test.inRate
      }Hz to ${test.outRate}Hz (quality: ${test.quality ?? 7})`
    );

    const resampler = new SpeexResampler(
      test.channels,
      test.inRate,
      test.outRate,
      test.quality
    );
    const filename = path.parse(test.inFile).name;
    const pcmData = readFileSync(test.inFile);

    const start = performance.now();
    const res = await resampler.processChunk(pcmData);
    const end = performance.now();

    console.log(`Resampled in ${Math.floor(end - start)}ms`);
    console.log(
      `Input stream: ${pcmData.length} bytes, ${(
        pcmData.length /
        test.inRate /
        2 /
        test.channels
      ).toFixed(2)}s`
    );
    console.log(
      `Output stream: ${res.length} bytes, ${(
        res.length /
        test.outRate /
        2 /
        test.channels
      ).toFixed(2)}s`
    );

    const inputDuration = pcmData.length / test.inRate / 2 / test.channels;
    const outputDuration = res.length / test.outRate / 2 / test.channels;

    assert(
      Math.abs(inputDuration - outputDuration) < 0.01,
      `Stream duration mismatch: in=${inputDuration}s out=${outputDuration}s`
    );

    // Uncomment to save output
    // writeFileSync(path.resolve(__dirname, `../resources/${filename}_${test.outRate}_${test.quality || 7}_output.pcm`), res);
    console.log();
  }
}

// ---------------------------
//  Transform stream testing
// ---------------------------
async function streamBasedTest(): Promise<void> {
  console.log("=================");
  console.log("Transform Stream Test");
  console.log("=================");

  for (const test of audioTests) {
    console.log(
      `Resampling file ${test.inFile} with ${test.channels} channel(s) from ${
        test.inRate
      }Hz to ${test.outRate}Hz (quality: ${test.quality ?? 7})`
    );

    const readFileStream = createReadStream(test.inFile);
    const transformStream = new SpeexResamplerTransform(
      test.channels,
      test.inRate,
      test.outRate,
      test.quality
    );
    let pcmData = Buffer.alloc(0);
    let resampledData = Buffer.alloc(0);

    readFileStream.on("data", (chunk) => {
      pcmData = Buffer.concat([pcmData, chunk as Buffer]);
    });

    transformStream.on("data", (chunk) => {
      resampledData = Buffer.concat([resampledData, chunk]);
    });

    const start = performance.now();
    readFileStream.pipe(transformStream);

    await new Promise<void>((resolve) => transformStream.on("end", resolve));

    const end = performance.now();

    console.log(`Resampled in ${Math.floor(end - start)}ms`);
    console.log(
      `Input stream: ${pcmData.length} bytes, ${(
        pcmData.length /
        test.inRate /
        2 /
        test.channels
      ).toFixed(2)}s`
    );
    console.log(
      `Output stream: ${resampledData.length} bytes, ${(
        resampledData.length /
        test.outRate /
        2 /
        test.channels
      ).toFixed(2)}s`
    );

    const inputDuration = pcmData.length / test.inRate / 2 / test.channels;
    const outputDuration =
      resampledData.length / test.outRate / 2 / test.channels;

    assert(
      Math.abs(inputDuration - outputDuration) < 0.01,
      `Stream duration mismatch: in=${inputDuration}s out=${outputDuration}s`
    );
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
  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exit(1);
  }
})();
