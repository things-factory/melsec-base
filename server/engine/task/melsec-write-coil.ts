import { Connections, TaskRegistry } from '@things-factory/integration-base'
import { MelsecPLCConnector } from '../connector/melsec-plc'

import { sleep } from '@things-factory/utils'

async function MelsecWriteCoil(step, { logger }) {
  var {
    connection: connectionName,
    params: { plcAddress: address, value, writeLength = 1, autoReset, delay = 50 }
  } = step

  var connection = Connections.getConnection(connectionName)
  if (!connection) {
    throw new Error(`connection '${connectionName}' is not established.`)
  }

  var { request } = connection

  var w_address = address
  var w_value = value
  var deviceCode = w_address.substring(0, 1) + '*'

  var af_address = Number(w_address.substring(1)).toString()
  var len = af_address.length
  for (var i = 0; i < 6 - len; i++) {
    af_address = '0' + af_address
  }
  var writeStartDevice = af_address

  if (w_value == 1) {
    var writeCoilValue = '1'
  } else {
    var writeCoilValue = '0'
  }

  await doRequest(request, deviceCode, writeStartDevice, writeCoilValue, writeLength, logger)

  if (autoReset) {
    await sleep(delay)

    await doRequest(request, deviceCode, writeStartDevice, Number(!Number(writeCoilValue)), writeLength, logger)
  }
}

async function doRequest(request, deviceCode, writeStartDevice, writeCoilValue, writeLength, logger) {
  var sendMessage = MelsecPLCConnector.getWriteCoilCommand(deviceCode, writeStartDevice, writeCoilValue, writeLength)
  // 500000FF03FF000019000014010001M*00033300011
  var content = await request(sendMessage, { logger })

  // TODO writeLength 1이 아닐때 데이터 처리.
  if (content.substring(17, 18) == '4') {
    // ok
    return {
      data: content.substring(22, 23)
    }
  } else {
    // error
    throw new Error('response not applicable')
  }
}

MelsecWriteCoil.parameterSpec = [
  {
    type: 'string',
    name: 'plcAddress',
    placeholder: 'M0,Y1,..',
    label: 'plc_address'
  },
  {
    type: 'number',
    name: 'writeLength',
    label: 'write_length'
  },
  {
    type: 'number',
    name: 'value',
    label: 'value'
  },
  {
    type: 'checkbox',
    name: 'autoReset',
    label: 'auto_reset'
  },
  {
    type: 'number',
    name: 'delay',
    placeholder: 'milisecodes, default is 50ms',
    label: 'reset_delay'
  }
]

TaskRegistry.registerTaskHandler('melsec-write-coil', MelsecWriteCoil)
