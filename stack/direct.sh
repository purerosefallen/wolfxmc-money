#!/bin/bash
# curl https://water.mycard.moe:9000/nanahira/wolfx/direct.sh | sudo bash -

wget -O docker-compose.yml https://water.mycard.moe:9000/nanahira/wolfx/docker-compose.yml
docker-compose up
