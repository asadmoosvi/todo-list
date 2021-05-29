#!/usr/bin/env bash

distname='dist'
echo 'running sass...'
sass src/scss:src/css
mkdir --verbose $distname
cp -r --verbose src/* $distname
echo "distribution '$distname' created"
