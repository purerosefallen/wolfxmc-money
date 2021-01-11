FROM node:buster-slim
RUN apt update && apt -y install python3 build-essential proxychains4 && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
WORKDIR /usr/src/app
COPY ./package*.json ./
RUN npm ci
COPY . ./
RUN npm run build
ENV USERNAME Ayane

CMD ["./run.sh"]
