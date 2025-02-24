/**
 * @module provider
 */
const dropbox = require('./dropbox')
const box = require('./box')
const drive = require('./drive')
const instagram = require('./instagram/graph')
const facebook = require('./facebook')
const onedrive = require('./onedrive')
const unsplash = require('./unsplash')
const zoom = require('./zoom')
const webdavAuth = require('./webdav/auth')
const webdavPublicLink = require('./webdav/publicLink')
const { getURLBuilder } = require('../helpers/utils')
const logger = require('../logger')
const { getCredentialsResolver } = require('./credentials')
// eslint-disable-next-line
const Provider = require('./Provider')

const { isOAuthProvider } = Provider

/**
 *
 * @param {{server: object}} options
 */
const validOptions = (options) => {
  return options.server.host && options.server.protocol
}

/**
 *
 * @param {string} name of the provider
 * @param {{server: object, providerOptions: object}} options
 * @returns {string} the authProvider for this provider
 */
const providerNameToAuthName = (name, options) => { // eslint-disable-line no-unused-vars
  const providers = exports.getDefaultProviders()
  return (providers[name] || {}).authProvider
}

/**
 * adds the desired provider module to the request object,
 * based on the providerName parameter specified
 *
 * @param {Record<string, typeof Provider>} providers
 */
module.exports.getProviderMiddleware = (providers) => {
  /**
   *
   * @param {object} req
   * @param {object} res
   * @param {Function} next
   * @param {string} providerName
   */
  const middleware = (req, res, next, providerName) => {
    const ProviderClass = providers[providerName]
    if (ProviderClass && validOptions(req.companion.options)) {
      const providerOptions = req.companion.options.providerOptions[providerName] || {}
      const { allowLocalUrls } = req.companion.options
      req.companion.provider = new ProviderClass({ providerName, providerOptions, allowLocalUrls })
      req.companion.providerClass = ProviderClass

      if (isOAuthProvider(ProviderClass.authProvider)) {
        req.companion.getProviderCredentials = getCredentialsResolver(providerName, req.companion.options, req)
      }
    } else {
      logger.warn('invalid provider options detected. Provider will not be loaded', 'provider.middleware.invalid', req.id)
    }
    next()
  }

  return middleware
}

/**
 * @returns {Record<string, typeof Provider>}
 */
module.exports.getDefaultProviders = () => {
  const providers = { dropbox, box, drive, facebook, onedrive, zoom, instagram, unsplash, webdavAuth, webdavPublicLink }

  return providers
}

/**
 *
 * @typedef {{'module': typeof Provider, config: Record<string,unknown>}} CustomProvider
 *
 * @param {Record<string, CustomProvider>} customProviders
 * @param {Record<string, typeof Provider>} providers
 * @param {object} grantConfig
 */
module.exports.addCustomProviders = (customProviders, providers, grantConfig) => {
  Object.keys(customProviders).forEach((providerName) => {
    const customProvider = customProviders[providerName]

    // eslint-disable-next-line no-param-reassign
    providers[providerName] = customProvider.module

    if (isOAuthProvider(customProvider.module.authProvider)) {
      // eslint-disable-next-line no-param-reassign
      grantConfig[providerName] = {
        ...customProvider.config,
        // todo: consider setting these options from a universal point also used
        // by official providers. It'll prevent these from getting left out if the
        // requirement changes.
        callback: `/${providerName}/callback`,
        transport: 'session',
      }
    }
  })
}

/**
 *
 * @param {{server: object, providerOptions: object}} companionOptions
 * @param {object} grantConfig
 */
module.exports.addProviderOptions = (companionOptions, grantConfig) => {
  const { server, providerOptions } = companionOptions
  if (!validOptions({ server })) {
    logger.warn('invalid provider options detected. Providers will not be loaded', 'provider.options.invalid')
    return
  }

  // eslint-disable-next-line no-param-reassign
  grantConfig.defaults = {
    host: server.host,
    protocol: server.protocol,
    path: server.path,
  }

  const { oauthDomain } = server
  const keys = Object.keys(providerOptions).filter((key) => key !== 'server')
  keys.forEach((providerName) => {
    const authProvider = providerNameToAuthName(providerName, companionOptions)
    if (isOAuthProvider(authProvider) && grantConfig[authProvider]) {
      // explicitly add providerOptions so users don't override other providerOptions.
      // eslint-disable-next-line no-param-reassign
      grantConfig[authProvider].key = providerOptions[providerName].key
      // eslint-disable-next-line no-param-reassign
      grantConfig[authProvider].secret = providerOptions[providerName].secret
      if (providerOptions[providerName].credentialsURL) {
        // eslint-disable-next-line no-param-reassign
        grantConfig[authProvider].dynamic = ['key', 'secret', 'redirect_uri']
      }

      const provider = exports.getDefaultProviders()[providerName]
      Object.assign(grantConfig[authProvider], provider.getExtraConfig())

      // override grant.js redirect uri with companion's custom redirect url
      const isExternal = !!server.implicitPath
      const redirectPath = `/${providerName}/redirect`
      // eslint-disable-next-line no-param-reassign
      grantConfig[authProvider].redirect_uri = getURLBuilder(companionOptions)(redirectPath, isExternal)
      if (oauthDomain) {
        const fullRedirectPath = getURLBuilder(companionOptions)(redirectPath, isExternal, true)
        // eslint-disable-next-line no-param-reassign
        grantConfig[authProvider].redirect_uri = `${server.protocol}://${oauthDomain}${fullRedirectPath}`
      }

      if (server.implicitPath) {
        // no url builder is used for this because grant internally adds the path
        // eslint-disable-next-line no-param-reassign
        grantConfig[authProvider].callback = `${server.implicitPath}${grantConfig[authProvider].callback}`
      } else if (server.path) {
        // eslint-disable-next-line no-param-reassign
        grantConfig[authProvider].callback = `${server.path}${grantConfig[authProvider].callback}`
      }
    }
  })
}
