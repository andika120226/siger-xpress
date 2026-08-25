# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Use --legacy-peer-deps to avoid peer dependency conflicts with React 19/Next 16
RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
