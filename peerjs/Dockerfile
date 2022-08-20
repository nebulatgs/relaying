FROM node:lts-alpine
RUN yarn global add peer
EXPOSE 9000
ENTRYPOINT peerjs --port 9000 --proxied true -k relaying