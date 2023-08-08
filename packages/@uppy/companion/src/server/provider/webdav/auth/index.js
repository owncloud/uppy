const { XMLParser } = require('fast-xml-parser')

const WebdavProvider = require('../WebdavProvider')
const { getProtectedGot, validateURL } = require('../../../helpers/request')

const cloudTypePathMappings = {
  nextcloud: {
    manual_revoke_url: '/settings/user/security',
  },
  owncloud: {
    manual_revoke_url: '/settings/personal?sectionid=security',
  },
}

class WebdavAuth extends WebdavProvider {
  constructor (options) {
    super(options)
    this.authProvider = WebdavAuth.authProvider
  }

  // for "grant"
  static getExtraConfig () {
    return {}
  }

  static get authProvider () {
    return 'webdavAuth'
  }

  getBaseUrl ({ query: { subdomain } }) {
    const { protocol } = this.providerOptions

    return `${protocol}://${subdomain}`
  }

  async getUsername ({ token, query }) {
    const { allowLocalUrls } = this

    const url = `${this.getBaseUrl({ query })}/ocs/v1.php/cloud/user`
    if (!validateURL(url, allowLocalUrls)) {
      throw new Error('invalid user url')
    }

    const response = await getProtectedGot({ url, blockLocalIPs: !allowLocalUrls }).get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).text()

    const parser = new XMLParser()
    const data = parser.parse(response)
    return data?.ocs?.data?.id
  }

  async getClient ({ username, token, query }) {
    const url = `${this.getBaseUrl({ query })}/remote.php/dav/files/${username}`

    const { AuthType } = await import('webdav') // eslint-disable-line import/no-unresolved
    return this.getClientHelper({
      url,
      authType: AuthType.Token,
      token: {
        access_token: token,
        token_type: 'Bearer',
      },
    })
  }

  async logout ({ query }) {
    const { cloudType } = query
    const manual_revoke_url = cloudTypePathMappings[cloudType]?.manual_revoke_url
    return {
      revoked: false,
      ...(manual_revoke_url && { manual_revoke_url: `${this.getBaseUrl({ query })}${manual_revoke_url}` }),
    }
  }
}

module.exports = WebdavAuth
