# Use the official Node.js 20 image.
FROM node:20-slim

# Create and change to the app directory.
WORKDIR /app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json and package-lock.json are copied.
COPY package*.json ./

# Install production dependencies.
RUN npm install

# Copy local code to the container image.
COPY . .

# Build the frontend and backend.
RUN npm run build

# Service must listen to $PORT environment variable.
# Cloud Run sets this variable by default.
ENV PORT 8080

# Run the web service on container startup.
CMD [ "npm", "start" ]
