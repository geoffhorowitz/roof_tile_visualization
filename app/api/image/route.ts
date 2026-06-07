import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const COMFYUI_URL = 'http://127.0.0.1:8188';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');
  const subfolder = searchParams.get('subfolder') || '';
  const type = searchParams.get('type') || 'output';

  if (!filename) {
    return new NextResponse('Filename is required', { status: 400 });
  }

  // Check if file is stored locally in data/output/
  const outputDir = path.join(process.cwd(), 'data', 'output');
  const localFilePath = path.join(outputDir, filename);

  if (fs.existsSync(localFilePath)) {
    try {
      const buffer = fs.readFileSync(localFilePath);
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.gif') contentType = 'image/gif';

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (readError) {
      console.error('Failed to read local image file:', readError);
      // Fallback to fetching from ComfyUI
    }
  }

  const comfyUrl = `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`;

  try {
    const res = await fetch(comfyUrl);
    if (!res.ok) {
      return new NextResponse('Failed to fetch image from ComfyUI', { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    const buffer = await res.arrayBuffer();

    // Cache it locally in data/output/ for future requests
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(localFilePath, Buffer.from(buffer));
      console.log(`Cached image locally at ${localFilePath}`);
    } catch (saveError) {
      console.error('Failed to cache image locally:', saveError);
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

