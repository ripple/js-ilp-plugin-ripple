'use strict'

const common = require('./common')
const createMetaMemo = common.createMetaMemo
const getMetaMemo = common.getMetaMemo
const convertRippleAmountToIlp = common.convertRippleAmountToIlp

exports.outgoingIlpToRipple = (sourceAddress, transfer) => {
  return {
    source: {
      address: sourceAddress,
      maxAmount: {
        currency: 'XRP',
        value: transfer.amount
      }
    },
    destination: {
      address: transfer.account.replace(/^ripple./, ''),
      amount: {
        currency: 'XRP',
        value: transfer.amount
      }
    },
    memos: [
      createMetaMemo({
        id: transfer.id
      })
    ]
  }
}

exports.incomingRippleToIlp = (transaction) => {
  const metaData = getMetaMemo(transaction.Memos)

  return {
    id: metaData.id,
    amount: convertRippleAmountToIlp(transaction.Amount),
    address: 'ripple.' + transaction.Account
  }
}

exports.outgoingRippleToIlp = (transaction) => {
  const metaData = getMetaMemo(transaction.Memos)

  return {
    id: metaData.id,
    amount: convertRippleAmountToIlp(transaction.Amount),
    address: 'ripple.' + transaction.Destination
  }
}
