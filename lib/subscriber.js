'use strict'
const utils = require('./utils')

// api          - TransferAPI
// postTransfer - function*(transfer)
function Subscriber (api, sourceSubscriptions, postTransfer) {
  this.api = api
  this.trader_address = api.credentials.address
  this.sourceSubscriptions = sourceSubscriptions
  this.postTransfer = postTransfer
}

Subscriber.prototype.onTransaction = function * (notif) {
  let type = getTransactionType(notif)
  if (type === 'SuspendedPaymentCreate') {
    yield this.onSuspendedPaymentCreate(notif.transaction)
  }
  if (type === 'SuspendedPaymentFinish') {
    yield this.onSuspendedPaymentFinish(notif.transaction)
  }
}

// A suspended payment was created, so find the corresponding transfer
// (if any) and mark it as prepared, then notify the trader.
Subscriber.prototype.onSuspendedPaymentCreate = function * (transaction) {
  let transfer_id = utils.transactionToTransferID(transaction)
  if (!transfer_id) {
    throw new Error('Missing required memo: "transfer_id"')
  }
  let payment = this.sourceSubscriptions.get(transfer_id)
  if (!payment) {
    return
  }
  let transfer = payment.source_transfers[0]
  transfer.payment_sequence = transaction.Sequence
  utils.setTransferState(transfer, 'prepared')
  yield this.postTransfer(transfer)
}

// A suspended payment has been executed, so update the transfer with the
// condition_fulfillment and notify the trader. The trader will then execute
// any pending source transfers.
Subscriber.prototype.onSuspendedPaymentFinish = function * (transaction) {
  let transfer = this.api.transferPool.findByTransaction(transaction)
  if (!transfer) {
    return
  }
  utils.setTransferState(transfer, 'executed')
  transfer.execution_condition_fulfillment = {
    type: methodToString(transaction.Method),
    message: utils.hexToString(transaction.Proof)
  }
  // Notify ourselves so that the source transfers get executed.
  yield this.postTransfer(transfer)
  this.api.transferPool.remove(transfer)
}

function methodToString (method) {
  if (method === 1) {
    return 'sha256'
  }
  throw new Error('Unsupported method ' + method)
}

function getTransactionType (notif) {
  return notif.engine_result === 'tesSUCCESS' &&
         notif.type === 'transaction' &&
         notif.validated &&
         notif.transaction &&
         notif.transaction.TransactionType
}

module.exports = Subscriber
