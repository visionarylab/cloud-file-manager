import { ProviderInterface, CloudContent, CloudMetadata } from "./provider-interface"

type anyForNow = any

type loadCallbackSig = (error: string|Error, content: anyForNow) => void
type shareCallbackSig = (error: string|Error, content: anyForNow) => void

interface IPermissionSpec { _permissions: number }

export interface IShareProvider {
  client: anyForNow //
  provider: ProviderInterface
  loadSharedContent: (id:String, callback: loadCallbackSig) => void
  getSharingMetadata: (shared: boolean) => IPermissionSpec
  share: (
    shared: boolean,
    masterContent: CloudContent,
    sharedContent: CloudContent,
    metadata: CloudMetadata,
    callback: shareCallbackSig) => void
}
