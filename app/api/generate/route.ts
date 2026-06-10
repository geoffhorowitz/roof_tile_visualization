import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient, isMockMode } from '../../../utils/supabase/server';

const COMFYUI_URL = process.env.COMFYUI_URL || 'http://127.0.0.1:8188';

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Please sign in first' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    const prompt = formData.get('prompt') as string;
    const tileId = formData.get('tileId') as string;

    const originalFileName = (formData.get('originalFileName') as string) || 'house.jpg';
    const tileCategory = (formData.get('tileCategory') as string) || 'Architectural Tiles';
    const tileName = (formData.get('tileName') as string) || 'Custom';
    const timestamp = (formData.get('timestamp') as string) || '';

    // Build output filename according to convention:
    // {original_image_name_without_extension}_{tile style}_{tile name}_{timestamp}.png
    const originalBaseName = originalFileName.replace(/\.[^/.]+$/, "");
    const sanitizedCategory = tileCategory.replace(/[^a-zA-Z0-9_ -]/g, "");
    const sanitizedTileName = tileName.replace(/[^a-zA-Z0-9_ -]/g, "");
    const sanitizedTimestamp = timestamp.replace(/[^a-zA-Z0-9_.-]/g, "");
    
    // Fallback timestamp if not provided by client
    const activeTimestamp = sanitizedTimestamp || new Date().toISOString().replace(/[:.]/g, "-");
    const outputFileName = `${originalBaseName}_${sanitizedCategory}_${sanitizedTileName}_${activeTimestamp}.png`;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // 2. Upload original image to Supabase Storage (if not in mock mode)
    let originalImageUrl = '';
    const fileExt = file.name.split('.').pop() || 'png';
    const uniqueInputName = `inputs/${user.id}/${Date.now()}_original.${fileExt}`;

    if (!isMockMode) {
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('roof-visualizer')
        .upload(uniqueInputName, fileBuffer, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        console.error('Supabase Storage Upload Error:', uploadError);
        throw new Error(`Failed to upload original image: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('roof-visualizer')
        .getPublicUrl(uniqueInputName);
      originalImageUrl = publicUrl;
    } else {
      // Mock mode original URL fallback using unique name format locally
      originalImageUrl = `/api/image?filename=${file.name}`;
    }

    // 3. Upload original image to ComfyUI's input folder
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

    // 4. Build the workflow JSON with a segmentation step, VAE Encode, and ControlNet Depth
    const workflow = {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "seed": Math.floor(Math.random() * 10000000),
          "steps": 20,
          "cfg": 8,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1.0,
          "model": ["4", 0],
          "positive": ["17", 0],
          "negative": ["17", 1],
          "latent_image": ["8", 0]
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "sd_xl_base_1.0.safetensors"
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": `photorealistic house roof inpainting, ${prompt}, detailed shingle texture, high quality photography`,
          "clip": ["4", 1]
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "text, watermark, ugly, deformed, blurry, forest, trees, nature, landscape, grass, leaves, branches, birch trees, vegetation, outdoors scene",
          "clip": ["4", 1]
        }
      },
      "8": {
        "class_type": "VAEEncodeForInpaint",
        "inputs": {
          "pixels": ["9", 0],
          "vae": ["4", 2],
          "mask": ["14", 0],
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
          "text": "roof:10",
          "clip": ["12", 1]
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
          "strength": 0.45,
          "start_percent": 0.0,
          "end_percent": 1.0,
          "positive": ["6", 0],
          "negative": ["7", 0],
          "control_net": ["15", 0],
          "image": ["16", 0]
        }
      }
    };

    // 5. Queue the prompt
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

    // 6. Poll for completion (Server-side polling)
    let isDone = false;
    let outputImageInfo: any = null;
    let pollAttempts = 0;

    while (!isDone && pollAttempts < 60) { // 2 minutes max
      await new Promise(resolve => setTimeout(resolve, 2000));
      const historyRes = await fetch(`${COMFYUI_URL}/history/${promptId}`);
      const historyData = await historyRes.json();
      
      if (historyData[promptId]) {
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

    // 7. Save output image locally first
    let generatedImageUrl = '';
    let imageBuffer: Buffer | null = null;
    
    try {
      const viewUrl = `${COMFYUI_URL}/view?filename=${encodeURIComponent(outputImageInfo.filename)}&subfolder=${encodeURIComponent(outputImageInfo.subfolder || '')}&type=${encodeURIComponent(outputImageInfo.type || 'output')}`;
      const imgRes = await fetch(viewUrl);
      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        
        const outputDir = path.join(process.cwd(), 'data', 'output');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        const filePath = path.join(outputDir, outputFileName);
        fs.writeFileSync(filePath, imageBuffer);
        console.log(`Saved output image locally to ${filePath}`);
      } else {
        console.error(`Failed to fetch output image from ComfyUI to save locally: ${imgRes.statusText}`);
      }
    } catch (saveError) {
      console.error('Failed to save output image locally:', saveError);
    }

    if (!imageBuffer) {
      throw new Error('Failed to retrieve generated image data from ComfyUI');
    }

    // 8. Upload generated result to Supabase Storage (if not in mock mode)
    const uniqueOutputName = `outputs/${user.id}/${outputFileName}`;
    
    if (!isMockMode) {
      const { data: outputUploadData, error: outputUploadError } = await supabase.storage
        .from('roof-visualizer')
        .upload(uniqueOutputName, imageBuffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (outputUploadError) {
        console.error('Supabase Storage Output Upload Error:', outputUploadError);
        throw new Error(`Failed to upload generated image: ${outputUploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('roof-visualizer')
        .getPublicUrl(uniqueOutputName);
      generatedImageUrl = publicUrl;

      // 9. Insert generation record into database
      const { error: dbError } = await supabase.from('generations').insert({
        user_id: user.id,
        tile_id: tileId || null,
        prompt: prompt,
        original_image_url: originalImageUrl,
        generated_image_url: generatedImageUrl
      });

      if (dbError) {
        console.error('Failed to record generation in database:', dbError);
      }
    } else {
      // Mock mode returns the local proxy URL
      const params = new URLSearchParams();
      params.append('filename', outputFileName);
      params.append('type', 'output');
      generatedImageUrl = `/api/image?${params.toString()}`;
    }

    return NextResponse.json({ url: generatedImageUrl });

  } catch (error: any) {
    console.error('Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}
