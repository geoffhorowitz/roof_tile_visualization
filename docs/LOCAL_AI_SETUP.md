# Local AI Setup (RTX 3060)

This guide provides instructions to set up a local AI image generation endpoint using your NVIDIA GeForce RTX 3060 (12GB VRAM). We will use this local setup to test the Roof Tile Visualizer pipeline for free before migrating to Vertex AI in production.

## Prerequisites
- NVIDIA Driver installed
- Python 3.10.x installed
- Git installed

## Setting up ComfyUI
We recommend [ComfyUI](https://github.com/comfyanonymous/ComfyUI) for its lightweight overhead and excellent API support for ControlNet + Inpainting workflows.

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/comfyanonymous/ComfyUI.git
   cd ComfyUI
   ```

2. **Create a Virtual Environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
   pip install -r requirements.txt
   ```

4. **Download Required Models & Install Custom Nodes**:
   - Save the SDXL Inpainting Checkpoint (e.g., `sd_xl_base_1.0_inpainting_0.1.safetensors`) into `ComfyUI/models/checkpoints/`.
   - Save the SAM 3.1 multiplex model `sam3.1_multiplex_fp16.safetensors` into `ComfyUI/models/checkpoints/`.
   - Save the ControlNet [ControlNet SDXL Depth](https://huggingface.co/diffusers/controlnet-depth-sdxl-1.0/resolve/main/diffusion_pytorch_model.safetensors) into `ComfyUI/models/controlnet/`.
   - Install the **`comfyui_controlnet_aux`** (ControlNet Preprocessors) custom node pack (using the ComfyUI Manager or git clone; needed for the MiDaS depth preprocessor).

5. **Start the API Server**:
   ```bash
   python main.py --listen --port 8188
   ```

## Verifying the API
Once the server is running, the Roof Tile Visualizer Next.js backend will send HTTP POST requests to `http://127.0.0.1:8188/prompt` with the workflow JSON.

You can run the included automated test suite to ensure the pipeline connection works:
```bash
python tests/test_local_ai.py
```

And run the segmentation workflow structure validation:
```bash
python tests/test_segmentation_api.py
```
