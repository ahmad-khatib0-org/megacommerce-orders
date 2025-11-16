import { Config } from '@megacommerce/proto/common/v1'
import { ConfigGetRequest } from '@megacommerce/proto/common/v1/config'

import { commonClient } from '@/helpers'
import { appErrorProtoToError, ErrorType, InternalError, Trans } from '@/models'

export class Common {
  constructor() { }

  private _config!: Config.Config

  public get config(): Config.Config {
    return this._config
  }

  async init(): Promise<void> {
    const path = 'orders.common.init'

    const ie = (err: Error, msg: string, typ?: ErrorType) => {
      return new InternalError(path, err, typ ?? ErrorType.ConfigError, false, msg)
    }

    await new Promise((res, _) => {
      commonClient().ping({}, (err, response) => {
        if (err) throw ie(err, 'failed to ping common service')
        if (response) res(response)
      })
    })

    const config = await new Promise<Config.Config>((res, _) => {
      commonClient().configGet(ConfigGetRequest.create(), (err, response) => {
        const msg = 'failed to get configurations'
        if (err) throw ie(err, msg)
        if (response.error) throw ie(appErrorProtoToError(response.error), msg)
        if (!response.data) throw ie(new Error('empty configurations'), 'received an empty configurations')
        res(response.data)
      })
    })
    this._config = config

    await Trans.init(commonClient())
  }
}
