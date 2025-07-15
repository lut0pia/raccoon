# syntax=docker/dockerfile:1

FROM node:18-alpine
EXPOSE 80/tcp

WORKDIR /app
COPY ./package*.json /app/
RUN npm install

COPY . /app

CMD ["node", "src/js/srv/main.js"]
