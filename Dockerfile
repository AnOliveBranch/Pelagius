# Base Image: Start with a Nodejs base image
FROM node:22-alpine

# Setup directories
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY package.json ./
COPY yarn.lock ./

# Need to set up docker data persistence for tokens.json and config.json
VOLUME [ "/home/node/app/data" ]

# Install yarn
RUN npm install -g corepack

# Switch to node user
USER node

# Install node packages
RUN yarn install

# Copy project
COPY --chown=node:node . .

# Start the bot
CMD ["yarn", "start"]