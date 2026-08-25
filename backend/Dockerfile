# backend/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Jika menggunakan TypeScript dan butuh build (tsc) gunakan perintah di bawah:
# RUN npm run build
EXPOSE 5000
CMD ["npm", "run", "dev"]
