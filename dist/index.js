"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeexResamplerTransform = exports.SpeexResampler = void 0;
const stream_1 = require("stream");
// Import the native module built with node-gyp
// Using require ensures it loads even before ESM exports
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nativeSpeex = require("../build/Release/speex.node");
/**
 * SpeexResampler
 *
 * High-performance wrapper around the SpeexDSP resampler via N-API.
 * Provides an asynchronous interface for PCM16 buffers.
 */
class SpeexResampler {
    /**
     * Create a SpeexResampler instance.
     * @param channels Number of channels, minimum is 1, no maximum
     * @param inRate Frequency in Hz for the input chunk
     * @param outRate Frequency in Hz for the target chunk
     * @param quality Number from 1 to 10 (default 7).
     * `1` is fastest but lower quality, `10` is slowest but highest quality.
     */
    constructor(channels, inRate, outRate, quality = 7) {
        this._processing = false;
        if (channels < 1)
            throw new Error("Channels must be >= 1");
        this._channels = channels;
        this._resampler = nativeSpeex.createResampler(channels, inRate, outRate, quality);
    }
    /**
     * Resample a chunk of interleaved PCM16 audio data.
     * The buffer length must be a multiple of (channels × 2 bytes).
     *
     * @param pcmData Interleaved PCM16 buffer (signed 16-bit little-endian samples)
     * @returns A Promise resolving to a Buffer containing the resampled PCM16 data.
     */
    async processChunk(pcmData) {
        if (this._processing) {
            throw new Error("Concurrent processing not allowed. Wait for the previous chunk to finish.");
        }
        this._processing = true;
        if (pcmData.length % (this._channels * 2) !== 0) {
            this._processing = false;
            throw new Error("Chunk length must be multiple of channels × 2 bytes (16-bit PCM alignment).");
        }
        return new Promise((resolve, reject) => {
            nativeSpeex.resampleChunk(this._resampler, pcmData, this._channels, (err, buf) => {
                this._processing = false;
                if (err)
                    return reject(err);
                if (!buf)
                    return reject(new Error("No output buffer returned from native module."));
                resolve(buf);
            });
        });
    }
}
exports.SpeexResampler = SpeexResampler;
/**
 * SpeexResamplerTransform
 *
 * A Transform stream that resamples PCM16 audio in real-time using SpeexDSP.
 * Useful for piping audio between different sample rates.
 */
class SpeexResamplerTransform extends stream_1.Transform {
    /**
     * Create a SpeexResampler transform stream.
     * @param channels Number of channels, minimum is 1, no maximum
     * @param inRate Frequency in Hz for the input chunk
     * @param outRate Frequency in Hz for the target chunk
     * @param quality Number from 1 to 10 (default 7).
     * `1` is fastest but lower quality, `10` is slowest but highest quality.
     */
    constructor(channels, inRate, outRate, quality = 7) {
        super();
        this._alignmentBufferLength = 0;
        this.resampler = new SpeexResampler(channels, inRate, outRate, quality);
        this.channels = channels;
        this._alignmentBuffer = Buffer.alloc(this.channels * 2);
    }
    /**
     * Internal transform handler called by Node streams.
     * Buffers leftover bytes to maintain 16-bit channel alignment.
     */
    async _transform(chunk, _encoding, callback) {
        let chunkToProcess = chunk;
        // Prepend leftover bytes from previous chunk if needed
        if (this._alignmentBufferLength > 0) {
            chunkToProcess = Buffer.concat([
                this._alignmentBuffer.subarray(0, this._alignmentBufferLength),
                chunk,
            ]);
            this._alignmentBufferLength = 0;
        }
        // Ensure buffer is aligned to (channels × 2) bytes
        const extraneousBytesCount = chunkToProcess.length % (this.channels * 2);
        if (extraneousBytesCount !== 0) {
            // Store extraneous bytes for next chunk
            chunkToProcess.copy(this._alignmentBuffer, 0, chunkToProcess.length - extraneousBytesCount);
            this._alignmentBufferLength = extraneousBytesCount;
            chunkToProcess = chunkToProcess.subarray(0, chunkToProcess.length - extraneousBytesCount);
        }
        try {
            const resampled = await this.resampler.processChunk(chunkToProcess);
            callback(null, resampled);
        }
        catch (err) {
            callback(err);
        }
    }
}
exports.SpeexResamplerTransform = SpeexResamplerTransform;
// Backward compatibility: expose TransformStream on class constructor
SpeexResampler.TransformStream = SpeexResamplerTransform;
exports.default = SpeexResampler;
