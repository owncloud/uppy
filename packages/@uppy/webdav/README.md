# @uppy/webdav

<img src="https://uppy.io/img/logo.svg" width="120" alt="Uppy logo: a smiling puppy above a pink upwards arrow" align="right">

[![npm version](https://img.shields.io/npm/v/@uppy/webdav.svg?style=flat-square)](https://www.npmjs.com/package/@uppy/webdav)
![CI status for Uppy tests](https://github.com/transloadit/uppy/workflows/Tests/badge.svg)
![CI status for Companion tests](https://github.com/transloadit/uppy/workflows/Companion/badge.svg)
![CI status for browser tests](https://github.com/transloadit/uppy/workflows/End-to-end%20tests/badge.svg)

The WebDAV plugins let users import files from [ownCloud 10](https://owncloud.com) or [Nextcloud](https://nextcloud.com) instances.
Files from the personal folder can be imported with the `WebDavAuth` plugin and files from (unprotected) public links can be selected via the `WebDavPublicLink` plugin.
Both plugins can be used in parallel and several times while showing icons for ownCloud and Nextcloud.

A [Companion](https://uppy.io/docs/companion) instance is required for the WebDAV plugins to work.
Companion handles downloads the files, and uploads them to the destination. This saves the user bandwidth, especially helpful if they are on a mobile connection.
In case of the `WebDavAuth` plugin Companion handles also OAuth 2 authentication with ownCloud and Nextcloud.

Uppy is being developed by the folks at [Transloadit](https://transloadit.com), a versatile file encoding service.

## Example

```js
import Uppy from '@uppy/core'
import { WebDavAuth, WebDavPublicLink } from '@uppy/webdav'

const uppy = new Uppy()
uppy.use(WebDavAuth, {
  id: 'owncloudAuth',
  cloudType: 'owncloud',
})
uppy.use(WebDavAuth, {
  id: 'nextcloudAuth',
  cloudType: 'nextcloud',
})

uppy.use(WebDavPublicLink, {
  id: 'owncloudPublicLink',
  cloudType: 'owncloud',
})
uppy.use(WebDavPublicLink, {
  id: 'nextcloudPublicLink',
  cloudType: 'nextcloud',
})
```

## Installation

```bash
$ npm install @uppy/webdav
```

Alternatively, you can also use this plugin in a pre-built bundle from Transloadit’s CDN: Edgly. In that case `Uppy` will attach itself to the global `window.Uppy` object. See the [main Uppy documentation](https://uppy.io/docs/#Installation) for instructions.

## Documentation

Documentation for this plugin can be found on the [Uppy website](https://uppy.io/docs/webdav).

## License

[The MIT License](./LICENSE).
