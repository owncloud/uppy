import type { PluginOptions, UIPlugin, PluginTarget } from '@uppy/core'
import type { PublicProviderOptions, TokenStorage } from '@uppy/companion-client'

export interface WebdavPublicLinkOptions extends PluginOptions, PublicProviderOptions {
    target?: PluginTarget
    title?: string
    storage?: TokenStorage
}

declare class WebdavPublicLink extends UIPlugin<WebdavPublicLinkOptions> {}

export default WebdavPublicLink
