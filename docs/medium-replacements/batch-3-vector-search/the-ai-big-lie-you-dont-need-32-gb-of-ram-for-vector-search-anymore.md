# TurboQuant, TurboVec, and the Real RAM Math for Local Vector Search

TurboQuant and TurboVec can make local vector search dramatically smaller, but the exact RAM savings depend on dimensions, bit width, metadata, and index overhead.

Replace the original opening and memory sections with the corrected framing from the website article. The critical replacement text is:

```markdown
Local RAG and semantic search have a boring but expensive problem: embeddings are large.

A single float32 embedding costs four bytes per dimension. That sounds harmless until the corpus grows:

- 10 million vectors at 768 dimensions: about 30.72 GB for raw float32 values.
- 10 million vectors at 1,536 dimensions: about 61.44 GB for raw float32 values.
- 10 million vectors at 3,072 dimensions: about 122.88 GB for raw float32 values.

Those numbers are just the raw vector payload. A real system also stores document text, IDs, metadata, filters, persistence files, allocator overhead, caches, and whatever index structure the engine needs.
```

Replace the TurboQuant sourcing section with:

```markdown
[TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate](https://arxiv.org/abs/2504.19874) is a 2025 paper by Amir Zandieh, Majid Daliri, Majid Hadian, and Vahab Mirrokni. The paper proposes a data-oblivious vector quantization method: instead of training a codebook on your corpus, it uses random rotation and scalar quantizers derived from the expected coordinate distribution of high-dimensional vectors.
```

Replace the TurboVec status section with:

```markdown
[TurboVec](https://github.com/RyanCodrai/turbovec) is an open-source Rust vector index with Python bindings that implements TurboQuant-style compression for vector search. Its [PyPI package](https://pypi.org/project/turbovec/) is currently published as `turbovec` `1.0.0`, but the package still carries the classifier `Development Status :: 3 - Alpha`.

That combination should guide how you adopt it:

- Treat the public API as real enough to prototype against.
- Treat production use as something that requires your own benchmark, recovery test, and upgrade plan.
- Do not assume that a `1.0.0` package version cancels the explicit alpha classifier.
```

Replace the compression explanation with:

```markdown
For a 1,536-dimensional vector:

- Float32: 1,536 dimensions x 4 bytes = 6,144 bytes per vector.
- 4-bit quantization: 1,536 dimensions x 4 bits = 768 bytes per vector before side data.
- 2-bit quantization: 1,536 dimensions x 2 bits = 384 bytes per vector before side data.

A 4-bit representation is an 8x reduction of the raw float32 coordinate payload. A 2-bit representation is a 16x reduction of that same payload.
```
