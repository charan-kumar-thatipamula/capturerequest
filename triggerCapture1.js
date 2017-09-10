/**
 *@NApiVersion 2.x
 */
require(['N/http', 'N/runtime', 'N/search', 'N/log'],
  function (http, runtime, search, log) {
    function execute() {
      try {
        var searchId = runtime.getCurrentScript().getParameter('custscript_searchid') || ''
        if (!searchId) {
          log.error('searchId is mandatory.')
          return
        }
        searchId = parseInt(searchId, 10)
        var sObj = search.load({ id: searchId })
        // var sResultSet = sObj.run()
        sObj.run().each(function (result) {
          var internalid = result.getValue({ name: 'internalid' })
          var authcode = result.getValue({ name: 'authcode' })
          var amount = result.getValue({ name: 'amount' })
          var memo = result.getValue({ name: 'memo' })
          return true
        })
      } catch (e) {
        log.error('Exception while capturing: ' + e)
      }
      // var searchId = runtime.getCurrentScript().getParameter('custscript_searchid')
      // var response = http.get({
      //   url: 'http://www.google.com'
      // });
    }
    return {
      execute: execute
    }
    // sendGetRequest();
  })