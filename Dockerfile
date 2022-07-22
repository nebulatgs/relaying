FROM node:lts-alpine
WORKDIR /app
COPY yarn.lock .
COPY package.json .
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build
CMD ["node", "build"]