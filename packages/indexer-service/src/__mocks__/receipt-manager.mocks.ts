import { utils, Wallet, constants } from 'ethers'
import {
  State,
  makeDestination,
  BN,
  signState,
  SimpleAllocation,
} from '@statechannels/wallet-core'
import { alice as me } from '@statechannels/server-wallet/lib/src/wallet/__test__/fixtures/signing-wallets'
import { Message as WireMessage } from '@statechannels/client-api-schema'
import { getChannelId } from '@statechannels/nitro-protocol'
import {
  AppData,
  StateType,
  fromJS,
  Attestation as SCAttestation,
} from '@statechannels/graph'

export const mockSCAttestation = (): SCAttestation => ({
  responseCID: constants.HashZero,
  signature: utils.joinSignature({ r: constants.HashZero, s: constants.HashZero, v: 0 }),
})

const sampleAttestation = mockSCAttestation()
export const mockAppData = (): AppData => ({
  constants: {
    chainId: 0,
    canonicalIndexerAddress: constants.AddressZero,
    verifyingContract: constants.AddressZero,
    subgraphDeploymentID: constants.HashZero,
  },
  variable: {
    ...sampleAttestation,
    requestCID: constants.HashZero,
    stateType: StateType.QueryRequested,
    paymentAmount: 1,
    signature: '0x',
  },
})

const MOCK_GATEWAY = {
  wallet: Wallet.createRandom(),
}

const mockFirstState = (): State => ({
  channelNonce: 0,
  chainId: '0',
  appDefinition: constants.AddressZero,
  appData: fromJS(mockAppData()),
  participants: [
    {
      participantId: 'gateway',
      destination: makeDestination(MOCK_GATEWAY.wallet.address),
      signingAddress: MOCK_GATEWAY.wallet.address,
    },
    {
      participantId: 'me',
      destination: makeDestination(me().address),
      signingAddress: me().address,
    },
  ],
  turnNum: 0,
  isFinal: false,
  challengeDuration: 0,
  outcome: {
    type: 'SimpleAllocation',
    assetHolderAddress: constants.AddressZero,
    allocationItems: [
      {
        amount: BN.from(100),
        destination: makeDestination(constants.AddressZero),
      },
      {
        amount: BN.from(0),
        destination: makeDestination(constants.AddressZero),
      },
    ],
  },
})

const sampleFirstState = mockFirstState()
export const mockChannelId = getChannelId({
  channelNonce: sampleFirstState.channelNonce,
  participants: sampleFirstState.participants.map(
    participant => participant.signingAddress,
  ),
  chainId: sampleFirstState.chainId,
})

// A prefund1 state with where every allocation amount is zero
const mockFirstStateZeroChannels = () => ({
  ...sampleFirstState,
  outcome: {
    ...sampleFirstState.outcome,
    allocationItems: (sampleFirstState.outcome as SimpleAllocation).allocationItems.map(
      item => ({ ...item, amount: BN.from(0) }),
    ),
  },
})

export const mockCreatedChannelMessage = (): WireMessage =>
  mockGatewayMessage(mockFirstState())

export const mockCreatedZeroChannelMessage = (): WireMessage =>
  mockGatewayMessage(mockFirstStateZeroChannels())

const mockPostFundState = (): State => ({
  ...mockFirstState(),
  turnNum: 2,
})

export const mockPostFundMessage = (): WireMessage =>
  mockGatewayMessage(mockPostFundState())

const mockRunningState = (): State => ({
  ...mockFirstState(),
  turnNum: 4,
})

export const mockQueryRequestMessage = (): WireMessage =>
  mockGatewayMessage(mockRunningState())

const mockClosingState = (): State => ({
  ...mockFirstState(),
  turnNum: 4,
  isFinal: true,
})

export const mockCloseChannelMessage = (): WireMessage =>
  mockGatewayMessage(mockClosingState())

const mockGatewayMessage = (state: State): WireMessage => ({
  sender: 'gateway',
  recipient: 'me',
  data: {
    signedStates: [
      {
        ...state,
        signatures: [
          {
            signer: MOCK_GATEWAY.wallet.address,
            signature: signState(state, MOCK_GATEWAY.wallet.privateKey),
          },
        ],
      },
    ],
  },
})
