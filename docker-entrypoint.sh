#!/bin/bash

# Generate VAPID keys if not set
if [ -z "$VAPID_PRIVATE_KEY" ] || [ -z "$VAPID_PUBLIC_KEY" ]; then
    echo "Generating VAPID keys..."
    KEYS=$(node -e "
        const webPush = require('web-push');
        const keys = webPush.generateVAPIDKeys();
        console.log(JSON.stringify(keys));
    ")

    export VAPID_PUBLIC_KEY=$(echo "$KEYS" | node -e "const k=JSON.parse(require('fs').readFileSync(0)); console.log(k.publicKey)")
    export VAPID_PRIVATE_KEY=$(echo "$KEYS" | node -e "const k=JSON.parse(require('fs').readFileSync(0)); console.log(k.privateKey)")

    echo "VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY"
    echo "VAPID_PRIVATE_KEY=$VAPID_PRIVATE_KEY"
    echo "NEXT_PUBLIC_VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY"
fi

exec node server.js
