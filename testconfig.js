// This field contains the constructor for a plugin
exports.plugin = require('.')

exports.timeout = 15

// These objects specify the configs of different
// plugins. There must be 2, so that they can send
// transfers to one another.
exports.options = [
  // options for the first plugin
  {
    // These are the PluginOptions passed into the plugin's
    // constructor.
    'pluginOptions': {
      'type': 'ripple',
      'server': 'wss://s.altnet.rippletest.net:51233',
      'address': 'r33L6z6LMD8Lk39iEQhyXeSWqNN7pFVaM6',
      'secret': 'ssyFYib1wv4tKrYfQEARxGREH6T3b',
      'connector': 'http://localhost:4000'
    },
    // These objects are merged with transfers originating from
    // their respective plugins. Should specify the other plugin's
    // account, so that the two plugins can send to one another
    'transfer': {
      'account': 'ripple.rhgqyGePxksRqgmTgVLJymXSsY8JcMsD2H'
    }
  },
  // options for the second plugin
  {
    'pluginOptions': {
      'type': 'ripple',
      'server': 'wss://s.altnet.rippletest.net:51233',
      'address': 'rhgqyGePxksRqgmTgVLJymXSsY8JcMsD2H',
      'secret': 'shnDvcy5fNoXEiMPfWLE8AHaeRv3P',
      'connector': 'http://localhost:4000'
    },
    'transfer': {
      'account': 'ripple.r33L6z6LMD8Lk39iEQhyXeSWqNN7pFVaM6'
    }
  }
]
