import { Transform, TransformCallback } from "stream";
/**
 * SpeexResampler
 *
 * High-performance wrapper around the SpeexDSP resampler via N-API.
 * Provides an asynchronous interface for PCM16 buffers.
 */
export declare class SpeexResampler {
    private readonly _channels;
    private readonly _resampler;
    private _processing;
    /**
     * Create a SpeexResampler instance.
     * @param channels Number of channels, minimum is 1, no maximum
     * @param inRate Frequency in Hz for the input chunk
     * @param outRate Frequency in Hz for the target chunk
     * @param quality Number from 1 to 10 (default 7).
     * `1` is fastest but lower quality, `10` is slowest but highest quality.
     */
    constructor(channels: number, inRate: number, outRate: number, quality?: number);
    /**
     * Resample a chunk of interleaved PCM16 audio data.
     * The buffer length must be a multiple of (channels × 2 bytes).
     *
     * @param pcmData Interleaved PCM16 buffer (signed 16-bit little-endian samples)
     * @returns A Promise resolving to a Buffer containing the resampled PCM16 data.
     */
    processChunk(pcmData: Buffer): Promise<Buffer>;
    /** Reference to the transform stream class for piping use cases. */
    static TransformStream: typeof SpeexResamplerTransform;
}
/**
 * SpeexResamplerTransform
 *
 * A Transform stream that resamples PCM16 audio in real-time using SpeexDSP.
 * Useful for piping audio between different sample rates.
 */
export declare class SpeexResamplerTransform extends Transform {
    private readonly resampler;
    private readonly channels;
    private readonly _alignmentBuffer;
    private _alignmentBufferLength;
    /**
     * Create a SpeexResampler transform stream.
     * @param channels Number of channels, minimum is 1, no maximum
     * @param inRate Frequency in Hz for the input chunk
     * @param outRate Frequency in Hz for the target chunk
     * @param quality Number from 1 to 10 (default 7).
     * `1` is fastest but lower quality, `10` is slowest but highest quality.
     */
    constructor(channels: number, inRate: number, outRate: number, quality?: number);
    /**
     * Internal transform handler called by Node streams.
     * Buffers leftover bytes to maintain 16-bit channel alignment.
     */
    _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): Promise<void>;
}
export default SpeexResampler;
