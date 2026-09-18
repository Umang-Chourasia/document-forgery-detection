# CLAUDE.md — Document Forgery Detection Application

## Project
Production-style document forgery detection application.

- Frontend: React + Tailwind CSS, running on my Windows PC.
- Model server: CAT-Net v2 on a separate server on the same LAN.
- Frontend communicates with the model server through HTTP APIs.
- Do NOT put ML inference inside React.
- Product model: DOCUMENT → PAGE → EVIDENCE.
- UI should feel like a professional forensic/security product, not a generic AI upload dashboard.

## Core Model

### CAT-Net v2

Official repository:

https://github.com/mjkwon2021/CAT-Net.git

CAT-Net v2 / CAT_full_v2 uses:

- RGB information
- DCT/compression artifact information
- pixel-level manipulation localization

CAT-Net produces a **heatmap/localization output**.

Important:
- CAT-Net does **not** natively provide a simple FAKE/REAL classification output.
- Treat CAT-Net primarily as localization/evidence.
- Do not invent CAT-Net confidence/probability values.
- Do not convert heatmap intensity into an invented percentage or probability.
- Do not invent forensic conclusions that are not supported by backend results.

