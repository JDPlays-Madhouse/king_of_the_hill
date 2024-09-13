#!/bin/env bash

. ${0%/*}/pages.sh

version=$1

for page in "${pages[@]}"; do
    echo $page;
    if [[ -e $page ]]; then
        sed -e "s/([0-9a-zA-Z_.+-]*)/($version)/" $page | tee $page.tmp 1>/dev/null  
        mv -f ${page}.tmp ${page}
    fi
done
