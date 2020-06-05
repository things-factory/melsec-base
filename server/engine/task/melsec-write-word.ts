import { Connections, TaskRegistry } from '@things-factory/integration-base'
import { MelsecPLCConnector } from '../connector/melsec-plc'

async function MelsecWriteWord(step, { logger }) {
  var {
    connection: connectionName,
    params: { plcAddress: address, value }
  } = step

  var connection = Connections.getConnection(connectionName)
  if (!connection) {
    throw new Error(`connection '${connectionName}' is not established.`)
  }

  var { request } = connection

  var w_address = address
  var deviceCode = w_address.substring(0, 1) + '*'

  var af_address = Number(w_address.substring(1)).toString()
  var len = af_address.length
  for (var i = 0; i < 6 - len; i++) {
    af_address = '0' + af_address
  }
  var writeStartDevice = af_address

  var valueDefine = Number(value).toString(16)
  var writeWordValue = ''

  if (valueDefine.length == 1) {
    writeWordValue = '000' + Number(value).toString(16)
  } else if (valueDefine.length == 2) {
    writeWordValue = '00' + Number(value).toString(16)
  } else if (valueDefine.length == 3) {
    writeWordValue = '0' + Number(value).toString(16)
  } else if (valueDefine.length == 4) {
    writeWordValue = Number(value).toString(16)
  }

  var sendMessage = MelsecPLCConnector.getWriteWordCommand(deviceCode, writeStartDevice, writeWordValue)
  var content = await request(sendMessage, { logger })

  var writtenValue = content.substring(22, 26)

  logger.info(`received response: ${content}`)

  return {
    data: parseInt(writtenValue, 16)
  }
}

MelsecWriteWord.parameterSpec = [
  {
    type: 'string',
    name: 'plcAddress',
    placeholder: 'M0,Y1,..',
    label: 'plc_address'
  },
  {
    type: 'number',
    name: 'value',
    label: 'value'
  }
]

TaskRegistry.registerTaskHandler('melsec-write-word', MelsecWriteWord)
