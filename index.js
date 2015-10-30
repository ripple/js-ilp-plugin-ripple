'use strict'
const _ = require('lodash')
const co = require('co')
const Condition = require('@ripple/five-bells-condition').Condition
const UnmetConditionError = require('@ripple/five-bells-shared/errors/unmet-condition-error')
const TransferAPI = require('./lib/transfer-api')
const Subscriber = require('./lib/subscriber')
const utils = require('./lib/utils')

// options -
//   ledger_id   - String, e.g. "wss://s.altnet.rippletest.net:51233"
//   credentials - {address, secret}
//   log         - A logger instance
//   sourceSubscriptions
function RippledLedger (options) {
  this.id = options.ledger_id
  this.credentials = options.credentials // {address, secret}
  this.log = options.log || console
  this.sourceSubscriptions = options.sourceSubscriptions
  this.client = new TransferAPI(this.id, this.credentials, this.log)

  this.client.transferPool.on('expire', function (transfers) {
    co(this._rejectTransfers.bind(this), transfers)
      .catch(this.onExpireError.bind(this))
  }.bind(this))
}

RippledLedger.TYPE = 'https://ripple.com/ilp/v1'
RippledLedger.validateTransfer = require('./lib/validate')

// template - {amount}
RippledLedger.prototype.makeFundTemplate = function (template) {
  template.address = this.credentials.address
  return template
}

RippledLedger.prototype.getState = function (transfer) {
  throw new Error('RippledLedger#getState is not implemented')
}

// pre-prepared -> place hold on debited funds -> prepared
RippledLedger.prototype.putTransfer = function * (transfer) {
  if (transfer.debits.length !== 1) {
    throw new Error('XRP transfers must have exactly 1 debit')
  }
  if (transfer.credits.length !== 1) {
    throw new Error('XRP transfers must have exactly 1 credit')
  }

  if (transfer.state === undefined) {
    // do nothing: propose is a noop
    transfer.state = 'proposed'
  }
  if (transfer.state === 'proposed' && isAuthorized(transfer)) {
    yield this.client.suspendedPaymentCreate(transfer)
  }
  if (transfer.state === 'prepared') {
    if (transfer.execution_condition &&
      transfer.execution_condition_fulfillment) {
      let isValidFulfillment = Condition.testFulfillment(transfer.execution_condition,
        transfer.execution_condition_fulfillment)
      if (!isValidFulfillment) {
        throw new UnmetConditionError('Invalid ConditionFulfillment')
      }
      yield this.client.suspendedPaymentFinish(transfer)
    } else if (!transfer.execution_condition) {
      yield this.client.suspendedPaymentFinish(transfer)
    }
  }
}

// postTransfer - function*(transfer)
RippledLedger.prototype.subscribe = function * (postTransfer) {
  let subscriber = new Subscriber(this.client, this.sourceSubscriptions, postTransfer)
  yield this.client.subscribe(function * (notif) {
    yield subscriber.onTransaction(notif)
  })
}

// /////////////////////////////////////////////////////////////////////////////
// Expiration
// /////////////////////////////////////////////////////////////////////////////

RippledLedger.prototype._rejectTransfers = function * (transfers) {
  yield transfers.map(this._rejectTransfer, this)
}

RippledLedger.prototype._rejectTransfer = function * (transfer) {
  utils.setTransferState(transfer, 'rejected')
  yield this.client.suspendedPaymentCancel(transfer)
}

RippledLedger.prototype.onExpireError = function (err) {
  this.log.warn('expire error', err.stack)
}

function isAuthorized (transfer) {
  return _.every(transfer.debits, 'authorized')
}

module.exports = RippledLedger
