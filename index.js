'use strict'
const co = require('co')
const formats = require('./lib/formats/optimistic')
const EventEmitter = require('eventemitter2')
const RippleAPI = require('ripple-lib').RippleAPI
const debug = require('debug')('ilp-plugin-ripple')

const find = require('lodash/fp/find')
const findXrpBalance = find(['currency', 'XRP'])

// options -
//   server      - String, e.g. "wss://s.altnet.rippletest.net:51233"
//   address     - String, Ripple address
//   secret      - String, Ripple secret
//   log         - A logger instance
//   sourceSubscriptions
class RipplePlugin extends EventEmitter {
  constructor (options) {
    super()

    this.server = options.server
    this.address = options.address
    this.secret = options.secret
    this.log = options.log || console
    this.sourceSubscriptions = options.sourceSubscriptions
    // this.client = new TransferAPI(this.id, this.credentials, this.log)
    this.api = new RippleAPI({ server: this.server })
    this.connected = false

    // this.client.transferPool.on('expire', function (transfers) {
    //   co(this._rejectTransfers.bind(this), transfers)
    //   .catch(this.onExpireError.bind(this))
    // }.bind(this))

    this.api.on('connected', () => {
      // Ripple API doesn't officially support subscribing to transactions, but
      // we can do it by sending a subscribe request manually.
      this.api.connection.request({
        command: 'subscribe',
        accounts: [this.address]
      }).catch((err) => {
        console.warn('ilp-plugin-ripple: unable to subscribe to transactions: ' +
          (err && err.toString()))
      })

      this.emit('connect')
    })

    this.api.on('disconnected', () => {
      this.emit('disconnect')
    })

    // Listen for transactions
    this.api.connection.on('transaction', (ev) => {
      if (ev.engine_result !== 'tesSUCCESS') return
      if (!ev.validated) return

      this._onTransaction(ev.transaction)
    })
  }

  connect () {
    return this.api.connect().then(() => null)
  }

  isConnected () {
    return this.api.isConnected()
  }

  disconnect () {
    return this.api.disconnect().then(() => null)
  }

  getAccount () {
    return Promise.resolve('ripple.' + this.address)
  }

  getBalance () {
    return co.wrap(this._getBalance).call(this)
  }

  * _getBalance () {
    const balances = yield this.api.getBalances(this.address)

    return findXrpBalance(balances).value
  }

  getInfo () {
    return Promise.resolve({
      scale: 2,
      precision: 4
    })
  }

  getPrefix () {
    return Promise.resolve('ripple.')
  }

  sendTransfer (transfer) {
    return co.wrap(this._send).call(this, transfer)
  }

  * _send (transfer) {
    let transaction
    if (transfer.execution_condition) {
      debug('tried to do universal mode payment (which is not supported)')
      throw new Error('Conditional payments are not yet implemented')
    } else {
      debug('send transfer', transfer)
      const ripplePayment = formats.outgoingIlpToRipple(this.address, transfer)
      debug('converted to ripple payment format', ripplePayment)
      transaction = yield this.api.preparePayment(this.address, ripplePayment)
    }

    debug('prepared ripple transaction', transaction)
    const signedTransaction = this.api.sign(transaction.txJSON, this.secret)
    debug('signed ripple transaction', signedTransaction)
    const result = yield this.api.submit(signedTransaction.signedTransaction)
    debug('submitted ripple transaction', result)

    return Promise.resolve(null)
  }

  getConnectors () {
    return Promise.resolve([])
  }

  _onTransaction (transaction) {
    // Filter out non-XRP payments
    if (typeof transaction.Amount !== 'string') return

    // Optimistic payment
    if (transaction.TransactionType === 'Payment') {
      if (transaction.Destination === this.address) {
        this.emitAsync('incoming_transfer', formats.incomingRippleToIlp(transaction))
      } else if (transaction.Account === this.address) {
        this.emitAsync('outgoing_transfer', formats.outgoingRippleToIlp(transaction))
      }
    }
  }
}

module.exports = RipplePlugin
