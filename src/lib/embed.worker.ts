import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers"

// Small sentence-embedding model (~23MB quantized), downloaded once and cached
// by the browser.
const MODEL = "Xenova/all-MiniLM-L6-v2"

let extractor: Promise<FeatureExtractionPipeline> | null = null

function getExtractor() {
  extractor ??= pipeline("feature-extraction", MODEL, { dtype: "q8" })
  return extractor
}

export type EmbedRequest = { id: number; texts: string[] }
export type EmbedResponse =
  | { id: number; vectors: Float32Array[] }
  | { id: number; error: string }

self.onmessage = async (event: MessageEvent<EmbedRequest>) => {
  const { id, texts } = event.data
  try {
    const extract = await getExtractor()
    const output = await extract(texts, { pooling: "mean", normalize: true })
    const [count, size] = output.dims
    const data = output.data as Float32Array
    const vectors = Array.from({ length: count }, (_, i) =>
      data.slice(i * size, (i + 1) * size)
    )
    self.postMessage({ id, vectors } satisfies EmbedResponse)
  } catch (error) {
    self.postMessage({ id, error: String(error) } satisfies EmbedResponse)
  }
}
