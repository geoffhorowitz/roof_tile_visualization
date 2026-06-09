import PIL.Image
import numpy as np
import glob
import os

def check_identity():
    paths = sorted(glob.glob('data/output/roof_tile_visualizer_*.png'))
    print(f"Found {len(paths)} output files.")
    for i in range(len(paths)):
        img_i = np.array(PIL.Image.open(paths[i]).convert('RGB'))
        for j in range(i+1, len(paths)):
            img_j = np.array(PIL.Image.open(paths[j]).convert('RGB'))
            if img_i.shape == img_j.shape:
                diff = np.abs(img_i.astype(float) - img_j.astype(float)).mean()
                print(f"{os.path.basename(paths[i])} vs {os.path.basename(paths[j])} MAD: {diff:.4f}")

if __name__ == '__main__':
    check_identity()
