FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

# Install Python & system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 python3-pip git wget curl \
    && rm -rf /var/lib/apt/lists/*

# Clone ComfyUI
WORKDIR /app
RUN git clone https://github.com/comfyanonymous/ComfyUI.git .
RUN pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
RUN pip install -r requirements.txt

# Download checkpoints into the image (or mount them via Cloud Storage / Filestore)
RUN wget -O models/checkpoints/sd_xl_base_1.0.safetensors https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors
RUN wget -O models/checkpoints/sam3.1_multiplex_fp16.safetensors https://huggingface.co/Comfy-Org/sam3.1/resolve/main/checkpoints/sam3.1_multiplex_fp16.safetensors
RUN wget -O models/controlnet/diffusion_pytorch_model.safetensors https://huggingface.co/diffusers/controlnet-depth-sdxl-1.0/resolve/main/diffusion_pytorch_model.safetensors

# Install ComfyUI-ControlNet-Aux preprocessor node
RUN git clone https://github.com/Fannovel16/comfyui_controlnet_aux.git custom_nodes/comfyui_controlnet_aux \
    && pip install -r custom_nodes/comfyui_controlnet_aux/requirements.txt

# Copy prediction wrapper script (placed in the same folder during docker context build)
COPY vertex_predictor.py /app/vertex_predictor.py

EXPOSE 8080
ENTRYPOINT ["python3", "vertex_predictor.py"]
