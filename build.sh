#!/bin/sh
set -e
cd "$(dirname "$0")"
V=$(sed -n 's/^Version: //p' pkg/control/control)
rm -rf build && mkdir build
echo 2.0 > build/debian-binary
tar czf build/control.tar.gz --owner=0 --group=0 -C pkg/control .
tar czf build/data.tar.gz --owner=0 --group=0 -C pkg/data .
cd build
tar czf "../luci-app-upnp-client_${V}_all.ipk" --owner=0 --group=0 \
    ./debian-binary ./control.tar.gz ./data.tar.gz
echo "built luci-app-upnp-client_${V}_all.ipk"
