#!/bin/env bash

set -e


file_dir=${1:-"./"}
done_webp_folder="$file_dir/webp/"
if [ ! -d "$done_webp_folder" ]; then 
    mkdir "$done_webp_folder";
fi
webp_files=$(ls "$file_dir" | grep --color=never .webp)

for file in $webp_files
do
    path="$file_dir/$file"
    echo "$path"
    dwebp "$path" -o "$(echo "$path" | sed s/\.webp//g).png"
    mv "$path" "$done_webp_folder"
done

