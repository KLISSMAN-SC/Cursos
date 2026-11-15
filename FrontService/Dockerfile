FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY angular.json tsconfig*.json ./
COPY src ./src
COPY public ./public
ARG APP_CONFIGURATION=production
RUN npm run build -- --configuration=$APP_CONFIGURATION

FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/cursos-front/browser /usr/share/nginx/html
EXPOSE 80
