'''
If you encounter this error during the build process:
    CMake Error at .pio/build/esp32dev/CMakeFiles/git-data/grabRef.cmake:48 (file):
  file failed to open for reading (No such file or directory):
uncomment the specific script by removing the semicolon in front of pre:script/clear_git_cmake_cache.py inside the extra_scripts parameter."
'''
import os
import shutil


def clear_cmake_git_cache() -> None:
    tag = "[clear_git_cmake_cache.py]"
    
    script_path = globals().get("__file__", clear_cmake_git_cache.__code__.co_filename)
    script_dir = os.path.dirname(os.path.abspath(script_path))
    project_dir = os.path.dirname(script_dir)
    
    home_dir = os.path.expanduser("~")
    current_ceiling = os.environ.get("GIT_CEILING_DIRECTORIES", "")
    ceiling_parts = [p for p in current_ceiling.split(os.pathsep) if p] if current_ceiling else []

    for candidate in [project_dir, home_dir]:
        if candidate not in ceiling_parts:
            ceiling_parts.append(candidate)

    os.environ["GIT_CEILING_DIRECTORIES"] = os.pathsep.join(ceiling_parts)
    print(f"{tag}: GIT_CEILING_DIRECTORIES={os.environ['GIT_CEILING_DIRECTORIES']}")

    pio_build_dir = os.path.join(project_dir, ".pio", "build", "esp32dev")

    # Some failures come from bootloader/CMakeFiles/git-data, others from CMakeFiles/git-data.
    candidate_dirs = [
        os.path.join(pio_build_dir, "bootloader", "CMakeFiles", "git-data"),
        os.path.join(pio_build_dir, "CMakeFiles", "git-data"),
    ]

    for git_data_dir in candidate_dirs:
        if os.path.exists(git_data_dir):
            print(f"{tag}: Removing stale cache: {git_data_dir}")
            try:
                shutil.rmtree(git_data_dir)
                print(f"{tag}: Removed")
            except Exception as exc:
                print(f"{tag}: Failed to remove {git_data_dir}: {exc}")

clear_cmake_git_cache()