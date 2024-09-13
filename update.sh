# !/usr/bin/env bash
version="v0.2.0"
set -o errexit

usage() {
cat <<EOF
Usage: $0 {-V|-c|-s|-a|-p|-h} [-m message] [-t tag]

Help:
  -a            Git Add
  -c            Git Commit
  -m message    Message for the Git Commit, if -m used -c is not required.
  -p            Git Push
  -s            Git Status
  -t tag        Git Tag number.

  -h            Usage help.
  -V            Version
EOF
}

if [[ -z $@ ]]; then
  usage
  exit
fi

while getopts 'Vcm:sat:ph' OPTION; do
case "$OPTION" in
  V )
    echo "$version"
    exit
    ;;
  m )
    COMMIT=true
    msg=$OPTARG;
    ;;
  c )
    COMMIT=true
    ;;
  s )
    STATUS=true
    ;;
  a )
    ADD=true
    ;;
  t )
    git_tag=$OPTARG
    ;;
  p )
    PUSH=true
    ;;
  h | ? )
    usage
    exit
    ;;
esac;
done

if [[ -n "$git_tag" ]]; then
  sed -i "s/\(image:.*:\).*$/\1${git_tag}/" ./docker-compose.yaml
  ${0%/*}/scripts/version.sh v${git_tag}
fi
if [[ -n "$ADD" ]]; then
  git add ${0%/*}
fi
if [[ -n "$COMMIT" ]]; then
echo "commit"
  if [[ -n "$msg" ]]; then
    git commit -a --allow-empty -m "${msg}"
  else
    echo "right place"
    git commit -a --allow-empty
  fi
  git-chglog -o CHANGELOG.md
  git commit -a --allow-empty -m "Update CHANGELOG.md"
fi
if [[ -n "$git_tag" ]]; then
  git tag v${git_tag}
  git-chglog -o CHANGELOG.md
  git commit -a --allow-empty -m "Update CHANGELOG.md"
  git tag -f v${git_tag}
fi
if [[ -n "$PUSH" ]]; then
  git push origin HEAD --tags
fi
if [[ -n "$STATUS" ]]; then
  git status
fi
