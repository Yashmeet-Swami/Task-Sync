FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -q --spider http://localhost:5000/health || exit 1

CMD ["node", "index.js"]
