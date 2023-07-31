import { UIPlugin } from '@uppy/core'
import { Provider } from '@uppy/companion-client'
import { ProviderViews } from '@uppy/provider-views'

import packageJson from '../../package.json'
import locale from '../locale.js'
import * as cloudTypes from '../cloudTypes/index.js'

export default class WebdavPublicLink extends UIPlugin {
  static VERSION = packageJson.version

  constructor (uppy, opts) {
    super(uppy, opts)
    this.id = this.opts.id || `webdavPublicLink${this.opts.cloudType || ''}`
    Provider.initPlugin(this, opts)
    this.cloudType = cloudTypes[this.opts.cloudType]
    this.icon = this.cloudType?.icon

    this.defaultLocale = locale
    this.i18nInit()

    this.title = this.i18n('pluginNameWebdavPublicLink')

    this.provider = new Provider(uppy, {
      companionUrl: this.opts.companionUrl,
      companionHeaders: this.opts.companionHeaders,
      companionKeysParams: this.opts.companionKeysParams,
      companionCookiesRule: this.opts.companionCookiesRule,
      provider: 'webdavPublicLink',
      pluginId: this.id,
    })
    this.provider.login = async () => {
    }
    this.provider.logout = async () => {
      return { ok: true, revoked: true }
    }

    this.onFirstRender = this.onFirstRender.bind(this)
    this.render = this.render.bind(this)
  }

  install () {
    this.view = new ProviderViews(this, {
      provider: this.provider,
      viewType: 'list',
      showTitles: true,
      showFilter: true,
      showBreadcrumbs: true,
      authInputs: [
        {
          name: 'publicLinkURL',
          label: this.i18n('publicLinkURLLabel'),
          description: this.i18n('publicLinkURLDescription'),
        },
      ],
    })

    const { target } = this.opts
    if (target) {
      this.mount(target, this)
    }
  }

  uninstall () {
    this.view.tearDown()
    this.unmount()
  }

  onFirstRender () {
    if (!this.provider.cutomQueryParams?.publicLinkURL) {
      return true
    }
    return this.view.getFolder()
  }

  render (state) {
    return this.view.render(state)
  }
}
