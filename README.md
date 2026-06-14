# Roof Tile Visualizer

A premium Next.js web application designed to allow users to upload an image of their house, select a roofing style, and see a photorealistic preview of their new roof using local AI generation (ComfyUI).

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **NVIDIA GPU**: Required for local AI generation (tested on RTX 3060 12GB)
- **Python**: v3.10.x (for running ComfyUI and testing script)

---

## Local AI Setup (ComfyUI Backend)

For a complete step-by-step model setup guide, see [LOCAL_AI_SETUP.md](file:///home/gh-wsl/github_repos/personal/roof_tile_visualizer/docs/LOCAL_AI_SETUP.md).

For production Agent Platform Custom Prediction Endpoint deployment, see [AGENT_PLATFORM_SETUP.md](file:///home/gh-wsl/github_repos/personal/roof_tile_visualizer/docs/AGENT_PLATFORM_SETUP.md).

1. Clone and install ComfyUI:
   ```bash
   git clone https://github.com/comfyanonymous/ComfyUI.git
   cd ComfyUI
   python -m venv .venv
   
   # Activate virtual environment
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate

   # Install dependencies (NVIDIA CUDA 12.1 torch setup)
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
   pip install -r requirements.txt
   ```
2. Download model checkpoints:
   - Save the standard SDXL Base checkpoint (e.g., `sd_xl_base_1.0.safetensors`) into `ComfyUI/models/checkpoints/`
   - Save the SAM 3.1 multiplex model `sam3.1_multiplex_fp16.safetensors` into `ComfyUI/models/checkpoints/` (required for native SAM 3.1 segmentation)
   - Save [ControlNet SDXL Depth](https://huggingface.co/diffusers/controlnet-depth-sdxl-1.0/resolve/main/diffusion_pytorch_model.safetensors) into `ComfyUI/models/controlnet/`
3. Install Custom Node Extensions:
   - Install `comfyui_controlnet_aux` (ControlNet Preprocessors) extension in `ComfyUI/custom_nodes/` (via ComfyUI Manager or by cloning; needed for the MiDaS depth preprocessor).
4. Launch ComfyUI API server:
   ```bash
   python main.py --listen --port 8188
   ```

---

## Running the Web Frontend

1. Install Node.js packages in the project root:
   ```bash
   npm install
   ```
2. Run the Next.js development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Configuration & Customization

- **ComfyUI API Server URL**: Configured at the top of [app/api/generate/route.ts](file:///c:/Users/geoff/github_repos/personal/roof_tile_visualizer/app/api/generate/route.ts) and [app/api/image/route.ts](file:///c:/Users/geoff/github_repos/personal/roof_tile_visualizer/app/api/image/route.ts):
  ```typescript
  const COMFYUI_URL = 'http://127.0.0.1:8188';
  ```
- **Roof Tile Styles Catalog**: Hardcoded in [components/TileSelector.tsx](file:///c:/Users/geoff/github_repos/personal/roof_tile_visualizer/components/TileSelector.tsx) under `TILE_CATALOG`. You can customize the name, preview color, and CLIP generation prompts here.
- **Workflow JSON**: The generation pipeline workflow can be modified in [app/api/generate/route.ts](file:///c:/Users/geoff/github_repos/personal/roof_tile_visualizer/app/api/generate/route.ts) under the `workflow` variable.

---

## Testing & Verification

We provide automated Python scripts to verify the connection and workflow validation to the ComfyUI server.

1. Ensure the Python environment is set up.
2. Run the connection test:
   ```bash
   python tests/test_local_ai.py
   ```
   This verifies if the ComfyUI API is reachable and warns of any server connection issues.
3. Run the workflow schema validation:
   ```bash
   python tests/test_segmentation_api.py
   ```
   This verifies that the ComfyUI server accepts the updated segmentation and inpainting workflow structure.

---

## Input Data Types & Outputs
- **Input Images**: Support `.png`, `.jpg`, `.jpeg`, and `.webp` images of houses (preferably with a clear, unobstructed view of the roof).
- **Outputs**: 
  - Generated images are temporarily written to ComfyUI's internal output folder.
  - The Next.js API returns a proxy route (`/api/image?filename=...`) which streams the bytes back to the frontend.
  - *Future roadmap*: Outputs will be saved directly into Supabase Storage buckets.
