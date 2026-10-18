# luci-app-upnp-client

LuCI page and helpers for OpenWrt devices that sit behind another
NAT router (double NAT). It lets UPnP and NAT-PMP port requests
reach the upstream NAT router.

## What it does

- Finds the upstream NAT router by itself (search first, then probing).
- Requests saved port mappings upstream, by hand or when the WAN comes up.
- Relays ports that LAN devices request from miniupnpd, and removes
  them upstream when the lease ends.
- Applies and reverts the miniupnpd setting needed for a private WAN
  address (button on the page).

## Requirements

- OpenWrt 24.10 with firewall4 (nftables)
- miniupnpd-nftables, miniupnpc, curl, jshn, rpcd, luci-base

## Install

    opkg install luci-app-upnp-client_1.1.0-2_all.ipk

Then open Services, UPnP Client in LuCI. The switch starts off.

## Build

    ./build.sh

## Status

Tested on one device as an upgrade. A clean install on a device that
never had the package is not yet tested. Reverting the double-NAT
setting when an earlier custom miniupnpd config existed is untested.

## Licence

Apache-2.0. See LICENSE.
