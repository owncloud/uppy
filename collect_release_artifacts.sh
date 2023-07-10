#!/usr/bin/env bash

set -euo pipefail

mkdir -p release/
for f in packages/**/**/package.tgz; do
  package="$(echo "${f}" | cut -b 11- | rev | cut -b 13- | rev)"
  cp "${f}" "release/$(echo ${package} | sed 's/\//-/').tgz"
done

