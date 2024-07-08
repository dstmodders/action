FROM dstmodders/dst-mod:debian

ENV NODE_ENV="production"

USER root
WORKDIR /opt/action/
COPY . .
RUN NODE_ENV="development" yarn install \
  && rm -Rf ./node_modules/ \
  && yarn install --ignore-scripts \
  && yarn cache clean \
  && rm -Rf \
    ./src/ \
    ./tsconfig.json

USER dst-mod
ENTRYPOINT ["node", "/opt/action/lib/index.js"]
