import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';


const COMFYUI_URL = 'http://127.0.0.1:8188';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const prompt = formData.get('prompt') as string;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // 1. Upload original image to ComfyUI's input folder
    const uploadFormData = new FormData();
    uploadFormData.append('image', file);
    uploadFormData.append('overwrite', 'true');
    
    let uploadRes;
    try {
      uploadRes = await fetch(`${COMFYUI_URL}/upload/image`, {
        method: 'POST',
        body: uploadFormData,
      });
    } catch (e) {
      throw new Error(`Cannot reach ComfyUI at ${COMFYUI_URL}. Is it running?`);
    }
    
    if (!uploadRes.ok) throw new Error('Failed to upload image to ComfyUI');
    const uploadData = await uploadRes.json();
    const filename = uploadData.name;

    // 2. Build the workflow JSON with a segmentation step (GroundingDINO + SAM), VAE Encode for Inpainting, and ControlNet Depth to preserve structure
    // This targets only the roof region and uses a Depth ControlNet to lock down structural geometry.
    const workflow = {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "seed": Math.floor(Math.random() * 10000000),
          "steps": 20,
          "cfg": 8,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 0.85,
          "model": ["4", 0],
          "positive": ["17", 0], // Connected to positive output (index 0) of ControlNetApplyAdvanced
          "negative": ["17", 1], // Connected to negative output (index 1) of ControlNetApplyAdvanced
          "latent_image": ["8", 0]
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "sd_xl_base_1.0_inpainting_0.1.safetensors"
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": prompt,
          "clip": ["4", 1]
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "text, watermark, ugly, deformed, blurry",
          "clip": ["4", 1]
        }
      },
      "8": {
        "class_type": "VAEEncodeForInpaint",
        "inputs": {
          "pixels": ["9", 0],
          "vae": ["4", 2],
          "mask": ["14", 0], // Connects to the native SAM3_Detect MASK output (index 0)
          "grow_mask_by": 6
        }
      },
      "9": {
        "class_type": "LoadImage",
        "inputs": {
          "image": filename
        }
      },
      "10": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        }
      },
      "11": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "roof_tile_visualizer",
          "images": ["10", 0]
        }
      },
      "12": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "sam3.1_multiplex_fp16.safetensors"
        }
      },
      "14": {
        "class_type": "SAM3_Detect",
        "inputs": {
          "model": ["12", 0],
          "image": ["9", 0],
          "conditioning": ["18", 0],
          "threshold": 0.3,
          "refine_iterations": 2,
          "individual_masks": false
        }
      },
      "18": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "roof",
          "clip": ["12", 1] // Uses CLIP model from SAM 3.1 checkpoint loader
        }
      },
      "15": {
        "class_type": "ControlNetLoader",
        "inputs": {
          "control_net_name": "diffusion_pytorch_model.safetensors"
        }
      },
      "16": {
        "class_type": "MiDaS-DepthMapPreprocessor",
        "inputs": {
          "image": ["9", 0],
          "a": 6.283185307179586,
          "bg_threshold": 0.1,
          "resolution": 512
        }
      },
      "17": {
        "class_type": "ControlNetApplyAdvanced",
        "inputs": {
          "strength": 0.8,
          "start_percent": 0.0,
          "end_percent": 1.0,
          "positive": ["6", 0],
          "negative": ["7", 0],
          "control_net": ["15", 0],
          "image": ["16", 0]
        }
      }
    };

    // 3. Queue the prompt
    const promptRes = await fetch(`${COMFYUI_URL}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
    });

    if (!promptRes.ok) {
      const errText = await promptRes.text();
      throw new Error(`Failed to queue prompt in ComfyUI: ${errText}`);
    }
    
    const promptData = await promptRes.json();
    const promptId = promptData.prompt_id;

    // 4. Poll for completion (Server-side polling since we are running locally)
    let isDone = false;
    let outputImageInfo: any = null;
    let pollAttempts = 0;

    while (!isDone && pollAttempts < 60) { // 2 minutes max
      await new Promise(resolve => setTimeout(resolve, 2000));
      const historyRes = await fetch(`${COMFYUI_URL}/history/${promptId}`);
      const historyData = await historyRes.json();
      
      if (historyData[promptId]) {
        // Find the SaveImage node output (node 11 in our placeholder workflow)
        const outputs = historyData[promptId].outputs;
        for (const nodeId in outputs) {
          if (outputs[nodeId].images && outputs[nodeId].images.length > 0) {
            outputImageInfo = outputs[nodeId].images[0];
            isDone = true;
            break;
          }
        }
      }
      pollAttempts++;
    }

    if (!isDone || !outputImageInfo) {
      throw new Error('Timeout or failed to get generated image from ComfyUI');
    }

    // 5. Save output image locally to data/output/ folder as an interim step
    console.log("ComfyUI Output Image Info:", outputImageInfo);
    try {
      const viewUrl = `${COMFYUI_URL}/view?filename=${encodeURIComponent(outputImageInfo.filename)}&subfolder=${encodeURIComponent(outputImageInfo.subfolder || '')}&type=${encodeURIComponent(outputImageInfo.type || 'output')}`;
      const imgRes = await fetch(viewUrl);
      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const outputDir = path.join(process.cwd(), 'data', 'output');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        const filePath = path.join(outputDir, outputImageInfo.filename);
        fs.writeFileSync(filePath, buffer);
        console.log(`Saved output image locally to ${filePath}`);
      } else {
        console.error(`Failed to fetch output image from ComfyUI to save locally: ${imgRes.statusText}`);
      }
    } catch (saveError) {
      console.error('Failed to save output image locally:', saveError);
    }
    
    const params = new URLSearchParams();
    params.append('filename', outputImageInfo.filename);
    if (outputImageInfo.subfolder) params.append('subfolder', outputImageInfo.subfolder);
    params.append('type', outputImageInfo.type);

    return NextResponse.json({ url: `/api/image?${params.toString()}` });

  } catch (error: any) {
    console.error('Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}
