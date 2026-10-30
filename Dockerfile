FROM node:20-slim
WORKDIR /app
COPY apps/server/package.json ./apps/server/package.json
RUN cd apps/server && npm install --omit=dev
COPY apps ./apps
ENV PORT=3000
EXPOSE 3000
CMD ["sh","-c","cd apps/server && npm start"]
