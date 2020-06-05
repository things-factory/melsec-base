import { Connections, TaskRegistry } from '@things-factory/integration-base'
import { MelsecPLCConnector } from '../connector/melsec-plc'

async function MelsecReadCoil(step, { logger }) {
  var {
    connection: connectionName,
    params: { plcAddress: address, readLength: readLength }
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
  // 500000FF03FF000018000004010001M*0001000001
  var sendMessage = MelsecPLCConnector.getReadCoilCommand(deviceCode, readStartDevice, readLength)

  var content = await request(sendMessage, { logger })

  // TODO readLength가 1이 아닐때 데이터 처리.
  if (content.substring(17, 18) == '5') {
    var data = content.substring(22, 23)

    logger.info(content)
    logger.info(`received response is ok. received: ${data}`)

    return {
      data
    }
  } else {
    // error
    throw new Error('response not applicable')
  }
}

MelsecReadCoil.parameterSpec = [
  {
    type: 'string',
    name: 'plcAddress',
    label: 'plc_address'
  },
  {
    type: 'number',
    name: 'readLength',
    label: 'read_length'
  }
]

TaskRegistry.registerTaskHandler('melsec-read-coil', MelsecReadCoil)
