import net from 'net'
import PromiseSocket from 'promise-socket'
import PQueue from 'p-queue'
import { sleep } from '@things-factory/utils'

import { Connections, Connector } from '@things-factory/integration-base'

const subHeader = '5000'
const networkNumber = '00'
const requireNumber = 'FF'
const requireIoNumber = '03FF'
const requireMultiNumber = '00'
const readrequireLength = '0018'
const writerequireLength = '0019'
const writewordrequireLength = '001C'
const reserve = '0000'
const readCommand = '0401'
const readWordSubCommand = '0000'
const readCoilSubCommand = '0001'
const writeCommand = '1401'
const writeWordSubCommand = '0000'
const writeSubCommand = '0001'
const readLengthDevice = '0001'
const writeLengthDevice = '0001'

export class MelsecPLCConnector implements Connector {
  static getWriteCoilCommand(deviceCode, writeStartDevice, writeCoilValue, writeLength) {
    if (writeLength) {
      writeLength = writeLength.toString().padStart(4, '0')
    }

    return (
      subHeader +
      networkNumber +
      requireNumber +
      requireIoNumber +
      requireMultiNumber +
      writerequireLength +
      reserve +
      writeCommand +
      writeSubCommand +
      deviceCode +
      writeStartDevice +
      (writeLength || writeLengthDevice) +
      writeCoilValue
    )
  }

  static getWriteWordCommand(deviceCode, writeStartDevice, writeWordValue) {
    return (
      subHeader +
      networkNumber +
      requireNumber +
      requireIoNumber +
      requireMultiNumber +
      writewordrequireLength +
      reserve +
      writeCommand +
      writeWordSubCommand +
      deviceCode +
      writeStartDevice +
      writeLengthDevice +
      writeWordValue
    )
  }

  static getReadCoilCommand(deviceCode, readStartDevice, readLength) {
    if (readLength) {
      readLength = readLength.toString().padStart(4, '0')
    }

    return (
      subHeader +
      networkNumber +
      requireNumber +
      requireIoNumber +
      requireMultiNumber +
      readrequireLength +
      reserve +
      readCommand +
      readCoilSubCommand +
      deviceCode +
      readStartDevice +
      (readLength || readLengthDevice)
    )
  }

  static getReadWordCommand(deviceCode, readStartDevice) {
    return (
      subHeader +
      networkNumber +
      requireNumber +
      requireIoNumber +
      requireMultiNumber +
      readrequireLength +
      reserve +
      readCommand +
      readWordSubCommand +
      deviceCode +
      readStartDevice +
      readLengthDevice
    )
  }

  async ready(connectionConfigs) {
    await Promise.all(connectionConfigs.map(this.connect))

    Connections.logger.info('mitsubishi-plc connections are ready')
  }

  async connect(config) {
    if (Connections.getConnection(config.name)) {
      return
    }

    var [host, port] = config.endpoint.split(':')

    var socket = new PromiseSocket(new net.Socket())

    await socket.connect(port, host)

    var queue = new PQueue({ concurrency: 1 })
    var keepalive = true

    Connections.addConnection(config.name, {
      request: async function (message, { logger }) {
        return await queue.add(async () => {
          while (keepalive) {
            try {
              await socket.write(message)
              logger && logger.info(`Request : ${message}`)

              var response = await socket.read()
              if (!response) {
                // socket ended or closed
                throw new Error('socket closed')
              }

              logger && logger.info(`Response : ${response.toString()}`)
              return response.toString()
            } catch (e) {
              logger.error('plc command(write-read) failed.')
              logger.error(e)

              if (keepalive) {
                socket && socket.destroy()

                socket = new PromiseSocket(new net.Socket())
                await socket.connect(port, host)

                await sleep(1000)
              } else {
                throw e
              }
            }
          }
        })
      },
      close: function () {
        queue.clear()
        keepalive = false
        socket.destroy()
      }
    })

    Connections.logger.info(`mitsubishi-plc connection(${config.name}:${config.endpoint}) is connected`)
  }

  async disconnect(name: String) {
    var { close } = Connections.removeConnection(name)
    close()

    Connections.logger.info(`mitsubishi-plc connection(${name}) is disconnected`)
  }

  get parameterSpec() {
    return [
      {
        type: 'checkbox',
        name: 'keepalive',
        label: 'keepalive'
      }
    ]
  }

  get taskPrefixes() {
    return ['melsec']
  }
}

Connections.registerConnector('melsec-plc', new MelsecPLCConnector())
