# CAT-Net backend reference

The CAT-Net v2 model itself is **not** vendored into this repository. It is a
clone of [mjkwon2021/CAT-Net](https://github.com/mjkwon2021/CAT-Net), which
carries several GB of model weights and a Python virtualenv — both far beyond
what belongs in (or fits in) a Git repository.

This folder holds only the parts that are ours: the HTTP wrapper that exposes
CAT-Net inference to the frontend, and notes on the changes needed to get the
upstream code running on a current Python environment.

## Contents

| File | Purpose |
| --- | --- |
| `api_server.py` | FastAPI wrapper exposing CAT-Net inference over HTTP |

`api_server.py` is designed to be dropped into the root of a CAT-Net clone
(alongside `project_config.py`), because it relies on the same relative
imports and working directory that `tools/infer.py` does. It loads the model
once at startup rather than per request.

```bash
# from the root of the CAT-Net clone, with its virtualenv active
uvicorn api_server:app --host 0.0.0.0 --port 8000
```

## Required upstream fixes

Upstream CAT-Net was written against an older NumPy. On NumPy 2.x the
following two aliases were removed outright and the code raises
`AttributeError` without them. Both are one-line changes to the upstream
clone:

| File | Change |
| --- | --- |
| `lib/models/network_DCT.py` | `np.int(np.sum(...))` → `int(np.sum(...))` |
| `Splicing/data/AbstractDataset.py` | `.astype(np.float)` → `.astype(float)` |

The first runs during model construction, so it breaks every startup. The
second runs while reading JPEG quantization tables, so it breaks every
inference. Not every clone has both — check before patching:

```bash
grep -rn "np\.int\|np\.float" lib/models/network_DCT.py Splicing/data/AbstractDataset.py
```

Apply them with a read-verify-write step rather than in-place `sed`, so a
failed match can't truncate the file:

```bash
python3 - <<'EOF'
path = "lib/models/network_DCT.py"
src = open(path).read()
target = "last_inp_channels = np.int(np.sum(DC_final_stage_channels))"
assert src.count(target) == 1, "no single match — inspect manually"
open(path, "w").write(src.replace(target, target.replace("np.int(", "int(")))
print("patched")
EOF
```

### Binary compatibility

PyTorch builds are compiled against a specific NumPy major version. Pairing an
older Torch (1.x) with NumPy 2.x produces:

```
Failed to initialize NumPy: _ARRAY_API not found
```

This is a **correctness** problem, not just a warning — conversions between
NumPy arrays and tensors silently stop working. Either pin `numpy<2` to match
the Torch build, or use a Torch built against NumPy 2.x.

### jpegio on Windows

`jpegio` is required for reading DCT coefficients and does not build cleanly
under MSVC. On Windows it needs the C++ Build Tools, the **x64** Native Tools
prompt specifically, and a patch replacing the GCC-only `__inline__` with
`__inline` in `jpegio/libjpeg/include/jconfig.h`. On Linux it builds normally.

## Note on the deployed service

The backend actually used for demos runs on a separate Linux machine and
exposes a slightly different contract (`POST /predict`) than `api_server.py`
here (`POST /api/analyze`). That service file lives on that machine and is not
mirrored here; copy it into this folder if it should be version-controlled
too.
