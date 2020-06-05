import { Connections, TaskRegistry } from '@things-factory/integration-base'
import { MelsecPLCConnector } from '../connector/melsec-plc'

async function MelsecReadWord(step, { logger }) {
  var {
    connection: connectionName,
    params: { plcAddress: address, signed = false }
  } = step

  var connection = Connections.getConnection(connectionName)
  if (!connection) {
    throw new Error(`connection '${connectionName}' is not established.`)
  }

  var { request } = connection

  var deviceCode = address.substring(0, 1) + '*'
  var af_address = Number(address.substring(1)).toString()
  var len = af_address.length
  for (var i = 0; i < 6 - len; i++) {
    af_address = '0' + af_address
  }
  var readStartDevice = af_address
  var sendMessage = MelsecPLCConnector.getReadWordCommand(deviceCode, readStartDevice)

  var content = await request(sendMessage, { logger })

  var wordValue = content.substring(22, 26)
  var data = parseInt(wordValue, 16)

  if (signed && (data & 0x8000) > 0) {
    data -= 0x10000
  }

  logger.info(content)
  logger.info(`received response is ok. received: ${data}`)

  return {
    data
  }
}

MelsecReadWord.parameterSpec = [
  {
    type: 'string',
    name: 'plcAddress',
    label: 'plc_address'
  },
  {
    type: 'checkbox',
    name: 'signed',
    label: 'signed'
  }
]

TaskRegistry.registerTaskHandler('melsec-read-word', MelsecReadWord)
