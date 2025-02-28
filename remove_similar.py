import os
import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim
from itertools import combinations

def calculate_ssim(image1, image2):
    # Convert to grayscale for accurate comparison
    image1_gray = cv2.cvtColor(image1, cv2.COLOR_BGR2GRAY)
    image2_gray = cv2.cvtColor(image2, cv2.COLOR_BGR2GRAY)

    # Resize images to the same dimensions if necessary
    if image1_gray.shape != image2_gray.shape:
        image2_gray = cv2.resize(image2_gray, (image1_gray.shape[1], image1_gray.shape[0]))

    return ssim(image1_gray, image2_gray)

def find_similar_images(folder, threshold=0.9):
    images = {}
    results = []

    # Load all images in the folder
    for filename in os.listdir(folder):
        filepath = os.path.join(folder, filename)
        try:
            img = cv2.imread(filepath)
            if img is not None:
                images[filename] = img
        except Exception as e:
            print(f"Error loading {filename}: {e}")

    # Compare all image pairs
    new_images = os.listdir("Cat-Imgs")

    for (file1, img1), (file2, img2) in combinations(images.items(), 2):
        similarity = calculate_ssim(img1, img2)
        if similarity >= threshold:  # Only keep highly similar images
            results.append((file1, file2, round(similarity, 3)))

    return results

folder_path = "Cat-Imgs"
similar_images = find_similar_images(folder_path, threshold=0.8)

# Print results
if similar_images:
    for img1, img2, score in similar_images:
        print(f"Similarity: {score} - {img1} <-> {img2}")
else:
    print("No similar images found.")
