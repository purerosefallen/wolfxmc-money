#!/bin/bash
# curl https://water.mycard.moe:9000/nanahira/wolfx/run.sh | sudo bash -
apt-get update
apt-get -y install docker.io python3-pip
/usr/bin/pip3 install -U pip
/usr/local/bin/pip install -U docker-compose
wget -O docker-compose.yml https://water.mycard.moe:9000/nanahira/wolfx/docker-compose.yml
docker-compose up
