#!/usr/bin/bash

set -e

if [[ "$STAGING" == true ]]; then
    TEST="--test-cert"
    echo Using staging server!
else
    TEST=""
    echo Using production server!
fi

if [[ -v "HOSTNAME" && -v "EMAIL" ]]; then
    echo Creating nginx config...
    sed -i "s/SERVERNAME/$HOSTNAME/" /etc/nginx/conf.d/poketube.conf
    echo Starting certbot
    certbot run --nginx -n \
        -d $HOSTNAME \
        -d www.$HOSTNAME --agree-tos \
        --email $EMAIL \
        $TEST
    echo Starting nginx
    nginx -s reload

else
    echo Please set HOSTNAME and/or EMAIL!
    exit 1
fi

exec "$@"
