FROM node:20-alpine
WORKDIR /app
# Vamos a montar volúmenes dinámicos
CMD ["npm", "run", "dev"]