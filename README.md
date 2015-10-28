# five-bells-trader-lib-ripple

Connect a five-bells-trader to Rippled.

# Example

    var trader = require('@ripple/five-bells-trader')
    trader.addLedger('rippled',
      require('@ripple/five-bells-trader-lib-ripple'))
    trader.listen()

Credentials look like:

    {
      "type":    "rippled",
      "address": "rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "secret":  "sXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    }

And be sure to set `TRADER_BACKEND`:

    TRADER_BACKEND='fixerio-plus-xrp'

