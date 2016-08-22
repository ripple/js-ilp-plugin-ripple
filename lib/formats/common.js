'use strict'

const BigNumber = require('bignumber.js')
const map = require('lodash/fp/map')
const find = require('lodash/fp/find')
const get = require('lodash/fp/get')
const flow = require('lodash/fp/flow')

const hexToString = (h) => new Buffer(h, 'hex').toString('utf-8')
const stringToHex = (s) => new Buffer(s, 'utf-8').toString('hex').toUpperCase()

// Type identifier for metadata memo field
const META_MEMO_TYPE = 'meta'

// Parse metadata memo from memos
const findMetaMemo = (typeId) => find(['MemoType', stringToHex(typeId)])
const getJsonMemo = (typeId) => flow(
  map('Memo'),
  findMetaMemo(typeId),
  get('MemoData'),
  hexToString,
  JSON.parse
)
exports.getMetaMemo = getJsonMemo(META_MEMO_TYPE)

exports.createMetaMemo = (memo) => {
  return {
    data: JSON.stringify(memo),
    format: 'application/json',
    type: META_MEMO_TYPE
  }
}

exports.convertRippleAmountToIlp = (amount) => {
  return new BigNumber(amount).div(1000000).toFixed(6)
}
