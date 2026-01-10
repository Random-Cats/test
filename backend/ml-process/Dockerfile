# ML/native dependency Lambda as a container image (cross-platform reliable)
FROM public.ecr.aws/lambda/nodejs:20

# Install dependencies inside Linux container so native modules (tfjs-node/sharp) are correct
WORKDIR /var/task
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# App code
COPY app.js ./

CMD ["app.handler"]
