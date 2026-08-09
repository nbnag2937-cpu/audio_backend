FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

ARG CACHEBUST=1
RUN echo "Cache bust: $CACHEBUST"

COPY . .
RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "run", "dev"]