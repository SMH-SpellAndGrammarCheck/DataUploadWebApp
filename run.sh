#!/usr/bin/env bash

sudo docker stop uploadd
sudo docker rm uploadd

echo "Please enter the Queue name for this instance: "
read QUEUE_NAME
echo
echo "Please enter the connection string for this instance: "
read CONNECTION_STRING

sudo docker run -d -it \
    -p 1337:1337 \
    -e QUEUE_NAME="${QUEUE_NAME}" \
    -e CONNECTION_STRING="${CONNECTION_STRING}" \
    --name=uploadd \
    upload_service
