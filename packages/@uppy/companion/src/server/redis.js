const Redis = require('ioredis').default

const logger = require('./logger')

let redisClient

/**
 * A Singleton module that provides a single redis client through out
 * the lifetime of the server
 *
 * @param {Record<string, any>} [opts] node-redis client options
 */
function createClient (opts) {
  if (!redisClient) {
    redisClient = new Redis(opts.url, opts)

    redisClient.on('error', err => logger.error('redis error', err.toString()))
  }

  return redisClient
}

module.exports.client = (companionOptions) => {
  if (!companionOptions) {
    return redisClient
  }

  return createClient({ ...companionOptions.redisOptions, url: companionOptions.redisUrl })
}
