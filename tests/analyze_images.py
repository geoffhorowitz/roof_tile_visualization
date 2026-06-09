import sys
from PIL import Image
import numpy as np

def analyze_image(path):
    print(f"\n--- Analysis of {path} ---")
    try:
        with Image.open(path) as img:
            print(f"Format: {img.format}, Size: {img.size}, Mode: {img.mode}")
            arr = np.array(img)
            mean_color = arr.mean(axis=(0,1))
            print(f"Mean RGB color: {mean_color}")
            
            # If RGB, calculate color diversity / standard dev
            if len(mean_color) >= 3:
                std_color = arr.std(axis=(0,1))
                print(f"Std dev RGB color: {std_color}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    analyze_image('public/architectural/terracotta_red.png')
    analyze_image('data/output/roof_tile_visualizer_00018_.png')
