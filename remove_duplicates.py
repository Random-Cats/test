import os
import imagehash
from PIL import Image
from collections import defaultdict
from datetime import datetime

def find_duplicates(folder):
    hashes = defaultdict(list)

    for filename in os.listdir(folder):
        filepath = os.path.join(folder, filename)
        try:
            with Image.open(filepath) as img:
                hash_value = imagehash.average_hash(img)
                hashes[hash_value].append(filename)  # Store only filename
        except Exception as e:
            print(f"Could not process {filename}: {e}")

    duplicates = [files for files in hashes.values() if len(files) > 1]
    return duplicates

def save_duplicates_to_file(duplicates, folder):
    timestamp = datetime.now().strftime("%H-%M-%S-%p_%Y-%m-%d")
    output_file = os.path.join(folder, f"report_{timestamp}.txt")

    with open(output_file, "w") as f:
        f.write("=" * 50 + "\n")
        f.write(f"Duplicate Image Report - {datetime.now().strftime('%x %H:%M:%S:%p')}\n")
        f.write("-" * 50 + "\n\n")

        if duplicates:
            for i, group in enumerate(duplicates, 1):
                f.write(f"Duplicate Set {i}:\n")
                for filename in group:
                    f.write(f"  {filename}\n")
                f.write("\n")
        else:
            f.write("No duplicates found.\n")
        f.write("=" * 50 + "\n\n")

    print(f"Duplicate report saved to: {output_file}")

folder_path = "Cat-Imgs"
duplicate_report_path = "Duplicate-Reports"
duplicates = find_duplicates(folder_path)
save_duplicates_to_file(duplicates, duplicate_report_path)

