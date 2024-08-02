#!/bin/env bash

set -e


file_dir=$1

webp_files=$(ls | grep --color=never .webp)

for file in $webp_files
do
    dwebp $file -o $(echo $file | sed s/\.webp//g).png
done

