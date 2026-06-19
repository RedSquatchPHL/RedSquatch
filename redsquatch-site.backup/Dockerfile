FROM node:18.20.8

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port 5173
EXPOSE 5173

# Run Vite dev server (listening on all interfaces)
CMD ["npm", "run", "dev"]
