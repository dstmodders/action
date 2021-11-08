FROM dstmodders/dst-mod:debian

WORKDIR /opt/action/
COPY . .
RUN yarn install

ENTRYPOINT ["node", "/opt/action/lib/main.js"]
