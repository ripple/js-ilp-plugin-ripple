'use strict'

const path = require('path')
const Validator = require('@ripple/five-bells-shared/lib/validator')
const validator = new Validator()
validator.loadSharedSchemas()
validator.loadSchemasFromDirectory(path.join(__dirname, '/../schemas'))

module.exports = function (transfer) {
  return validator.tv4.validateMultiple(transfer, 'RippleTransferTemplate')
}
