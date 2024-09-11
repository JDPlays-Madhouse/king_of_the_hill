#!/bin/env bash

. ${0%/*}/pages.sh

for page in "${pages[@]}"; do
    echo $page;
    if [[ -e $page ]]; then
        sed -e "s/src=\"\/static/src=\".\/static/" -e "s/href=\"\/static/href=\".\/static/" $page | tee $page.tmp 1>/dev/null  
        mv -f ${page}.tmp ${page}
    fi
done
