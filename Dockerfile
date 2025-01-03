# Use the latest Node.js image as the base
FROM node:latest

# Set the working directory inside the container
WORKDIR /api

# Copy dependency files to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Build the project (if needed, e.g., using webpack)
RUN npm run build

# Expose the port the application will use (if applicable)
EXPOSE 8080

# Command to start the application
CMD [ "node", "./dist/bundle.js" ]
