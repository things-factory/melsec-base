import { Connections, TaskRegistry } from '@things-factory/integration-base'
import { sleep } from '@things-factory/utils'
import { MelsecPLCConnector } from '../connector/melsec-plc'

async function MelsecWaitForCoil(step, { logger, root }) {
  var {
    connection: connectionName,
    params: { plcAddress: address, value, waitTerm = 50 }
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
  var sendMessage = MelsecPLCConnector.getReadCoilCommand(deviceCode, readStartDevice, undefined)

  while (true) {
    let state = root.getState()
    if (state == 1 /* STARTED */) {
      var content = await request(sendMessage, { logger })

      if (content.substring(17, 18) == '5') {
        var coilValue = content.substring(22, 23)

        if (value == coilValue) {
          logger.info('received response is ok. required: %s, received: %s', value, coilValue)

          return {
            data: coilValue
          }
        } else {
          logger.info('received response, but not accepted. required: %s, received: %s', value, coilValue)
          await sleep(waitTerm)
          continue
        }
      } else {
        // error
        throw new Error('response not applicable')
      }
    } else if (state == 2 /* PAUSED */) {
      await sleep(waitTerm)
    } else {
      throw new Error('scenario stopped unexpectedly')
    }
  }
}

MelsecWaitForCoil.parameterSpec = [
  {
    type: 'string',
    name: 'plcAddress',
    label: 'plc_address'
  },
  {
    type: 'string',
    name: 'value',
    label: 'expected_value'
  },
  {
    type: 'number',
    name: 'waitTerm',
    placeholder: 'milli-seconds',
    label: 'wait_term'
  }
]

TaskRegistry.registerTaskHandler('melsec-wait-coil', MelsecWaitForCoil)
