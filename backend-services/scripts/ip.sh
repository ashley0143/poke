#!/bin/bash

#CHANGE BOTH OF THESE TO THE CORRECT VALUES
domain="server_ddns_ip_here"
wireguard_file="/path/to/wg0.conf"

new_ip=$(dig +short "$domain" | tail -n1)
current_ip=$(grep -Eo 'Endpoint = [0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' "$wireguard_file" | awk '{print $3}')

while true; do
read -p "Are you sure you want to run this? Have you checked the gluetun logs first? [Yy/Nn]" yn
case $yn in Y|y|Yes|yes* )
  if [[ "$new_ip" == "$current_ip" ]]; then
     echo "IP is already up to date: $current_ip"
     exit 0
else
    sed -i -r "s/^(Endpoint = +)([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)(:[0-9]+)/\1$new_ip\3/" "$wireguard_file"

    echo "IP updated in $wireguard_file, new IP is: $(grep '^Endpoint' "$wireguard_file")"

    echo "Restarting gluetun..."

    docker restart gluetun >/dev/null 2>&1

    echo "Restarting companion..."

    docker restart invidious-companion-1 >/dev/null 2>&1

exit 0
fi
;;

N|n|No|no* ) exit;;
        * ) echo "Please answer yes or no.";;

    esac
done
