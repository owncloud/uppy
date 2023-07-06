import type { PluginOptions, UIPlugin, PluginTarget } from '@uppy/core'
import type { PublicProviderOptions, TokenStorage } from '@uppy/companion-client'

export interface WebdavAuthOptions extends PluginOptions, PublicProviderOptions {
    target?: PluginTarget
    title?: string
    storage?: TokenStorage
}

declare class WebdavAuth extends UIPlugin<WebdavAuthOptions> {}

export default WebdavAuth
