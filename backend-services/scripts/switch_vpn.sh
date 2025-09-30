#!/bin/bash
path=/your/path/here/
opts=("Switch to router VPN" "Switch to Cloudflare VPN")
PS3="Choose an option:"
select o in "${opts[@]}"
do
    case "$REPLY" in
   1) echo "Switching to router VPN..."
      rm $path/wg0.conf
      ln -s wg0.conf.router wg0.conf
      docker compose -f $path/docker-compose.yml down >/dev/null 2>&1
      docker compose -f $path/docker-compose.yml up -d >/dev/null 2>&1
      exit 0
;;

2) echo "Switching to Cloudflare VPN..."
   rm $path/wg0.conf
   ln -s wg0.conf.cf wg0.conf
   docker compose -f $path/docker-compose.yml down >/dev/null 2>&1
   docker compose -f $path/docker-compose.yml up -d >/dev/null 2>&1
   exit 0
;;
esac
done