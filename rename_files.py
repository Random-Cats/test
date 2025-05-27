# import os
# import re

# def read_last_number(file_path):
#     if os.path.exists(file_path):
#         with open(file_path, "r") as f:
#             try:
#                 return int(f.read().strip())
#             except ValueError:
#                 return 0
#     return 0

# def write_last_number(file_path, number):
#     with open(file_path, "w") as f:
#         f.write(str(number))

# def rename_cat_images(folder_path, prefix="Cat_", digits=5, file_extensions=(".jpg", ".jpeg", ".png", ".gif", ".webp"), tracker_file="last_number.txt"):
#     # Regex to match correct filenames like "Cat_00001"
#     pattern = re.compile(rf"{re.escape(prefix)}(\d{{{digits}}})")

#     # Path to number tracker
#     tracker_path = os.path.join(folder_path, tracker_file)
#     current_max = read_last_number(tracker_path)

#     files_to_rename = []

#     # Only check for new files to rename
#     for filename in sorted(os.listdir(folder_path)):
#         if not filename.lower().endswith(file_extensions):
#             continue

#         match = pattern.fullmatch(os.path.splitext(filename)[0])
#         if match:
#             continue  # Already correctly named
#         files_to_rename.append(filename)

#     # Rename and update the counter
#     for filename in files_to_rename:
#         _, ext = os.path.splitext(filename)
#         current_max += 1
#         new_name = f"{prefix}{str(current_max).zfill(digits)}{ext}"
#         src = os.path.join(folder_path, filename)
#         dst = os.path.join(folder_path, new_name)
#         print(f"Renaming: {filename} -> {new_name}")
#         os.rename(src, dst)

#     write_last_number(tracker_path, current_max)
#     print(f"\nRenaming complete. {len(files_to_rename)} files updated. Last number is now {current_max}.")



# folder = r"Cat-Imgs"
# rename_cat_images(folder)


import os

def simple_rename(folder_path, prefix="Cat_", digits=5, file_extensions=(".jpg", ".jpeg", ".png", ".gif", ".webp")):
    files = sorted(
        [f for f in os.listdir(folder_path) if f.lower().endswith(file_extensions)]
    )

    for i, filename in enumerate(files, start=1):
        _, ext = os.path.splitext(filename)
        new_name = f"{prefix}{str(i).zfill(digits)}{ext}"
        src = os.path.join(folder_path, filename)
        dst = os.path.join(folder_path, new_name)
        print(f"Renaming: {filename} -> {new_name}")
        os.rename(src, dst)

    print(f"\nDone. Renamed {len(files)} files.")

# Example usage:
folder = r"Cat-Imgs"
simple_rename(folder)
