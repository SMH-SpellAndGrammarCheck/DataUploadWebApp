#!/usr/bin/env bash

sudo docker stop maild
sudo docker rm maild

sudo docker run -d -it \
    -p 1337:1337 \
    --name=uploadd \
    upload_service
