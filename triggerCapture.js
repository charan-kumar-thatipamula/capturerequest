function execute() {
  try {
    var searchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_so_payment_capture')
    var fieldsMap = nlapiGetContext().getSetting('SCRIPT', 'custscript_fields_map') // { 'internalid': 'internalid', 'authcode': 'authcode', 'amount': 'custbody_amount_to_capture', 'note': 'custbody_note', 'is_final_capture': 'custbody_is_final_capture' }
    var creds = nlapiGetContext().getSetting('SCRIPT', 'custscript_credentials')
    if (!fieldsMap) {
      nlapiLogExecution('ERROR', 'Fields Map is mandatory', 'Missing Mappings')
      return
    }
    creds = creds ? JSON.parse(creds) : {}
    if (!creds || !creds.username || !creds.password) {
      nlapiLogExecution('ERROR', 'Credentials mandatory', 'Ensure username and password are entered. Example: {"username":"testuser","password":"Testpassword"}')
      return
    }
    fieldsMap = JSON.parse(fieldsMap)
    if (!searchId) {
      nlapiLogExecution('ERROR', 'search Id is empty ' + searchId, 'Search Id is mandatory')
      return
    }
    var search = nlapiLoadSearch('salesorder', searchId)
    var resultSet = search.runSearch()
    var i=0
    resultSet.forEachResult(function (searchResult) {
      if (i>2) {
        // return true
      }
      var fieldValueMap = {}
      for (var f in fieldsMap) {
        if (fieldsMap.hasOwnProperty(f)) {
          var field = fieldsMap[f]
          fieldValueMap[f] = searchResult.getValue(field)
          nlapiLogExecution('DEBUG', 'field and value', field + ' : ' + fieldValueMap[f])
        }
      }
      try {
        sendRequest(fieldValueMap, [creds.username, creds.password])
      } catch (e) {
        nlapiLogExecution('DEBUG', 'SendRequest exception', e)
      }
      i++
      return true
    })
  } catch (e) {
    nlapiLogExecution('ERROR', 'Error capturing payment', e)
  }
}

function sendRequest(fieldsMap, creds) {
  try {
    nlapiLogExecution('DEBUG', 'Credentials', JSON.stringify(creds))
    var endPoint = nlapiGetContext().getSetting('SCRIPT', 'custscript_endpoint') // '/api/v1/payment/{orderId}/authorization/{authorizationId}/capture'
    if (!endPoint) {
      nlapiLogExecution('ERROR', 'endPoint is mandatory', '')
      return
    }
    var uri = nlapiGetContext().getSetting('SCRIPT', 'custscript_uri')
    if (!uri) {
      nlapiLogExecution('ERROR', 'uri is mandatory', '')
      return
    }
    if (!fieldsMap.internalid && !fieldsMap.authcode) {
      nlapiLogExecution('ERROR', 'Order ID and Authcode is mandatory', '')
      return
    }

    var cUri = uri + endPoint
    cUri = cUri.replace('{orderId}', fieldsMap.internalid)
    cUri = cUri.replace('{authorizationId}', fieldsMap.authcode)

    var headers = {
      'amount': parseFloat(fieldsMap.amount),
      'note': fieldsMap.note,
      'is_final_capture': fieldsMap.is_final_capture === null || fieldsMap.is_final_capture === 'T'
    }

    // headers.amount = 1.00
    nlapiLogExecution('DEBUG', 'cUri', cUri)
    nlapiLogExecution('DEBUG', 'headers', JSON.stringify(headers))
    var res = nlapiRequestURLWithCredentials(creds, cUri, headers)
    // var res1 = nlapiRequestURLWithCredentials(creds,'https://test-cartapi.ylighting.com/api/v1/payment/712125/authorization/82921352348550764/capture',{'amount':2,'note':"test",'is_final_capture':false})
    // seen an exception on covernting res as JSON.stringify. Need to get the body of the response and convet to JSON
    var resBody = JSON.stringify(res.body)
    nlapiLogExecution('DEBUG', 'Capture response', resBody)
  } catch (e) {
    throw e
  }

  /* function sendRequest(fieldsMap, creds) {
    try {
      nlapiLogExecution('DEBUG', 'Credentials', JSON.stringify(creds))
      var endPoint = nlapiGetContext().getSetting('SCRIPT', 'custscript_endpoint') // '/api/v1/payment/{orderId}/authorization/{authorizationId}/capture'
      if (!endPoint) {
        nlapiLogExecution('ERROR', 'endPoint is mandatory', '')
        return
      }
      var uri = nlapiGetContext().getSetting('SCRIPT', 'custscript_uri')
      if (!uri) {
        nlapiLogExecution('ERROR', 'uri is mandatory', '')
        return
      }
      var cUri = uri + endPoint
      cUri = cUri.replace('{orderId}', fieldsMap.internalid)
      cUri = cUri.replace('{authorizationId}', fieldsMap.authcode)
      cUri = cUri + '?'
      cUri = cUri + 'profile_id=' + '{' + creds[0] + '}'
      cUri = cUri + '&profile_key=' + '{' + creds[1] + '}'
      // fieldsMap.amount
      var postData = {
        'amount': 1,
        'note': fieldsMap.note,
        'is_final_capture': fieldsMap.is_final_capture === null || fieldsMap.is_final_capture === 'T'
      }
  
      nlapiLogExecution('DEBUG', 'cUri', cUri)
      nlapiLogExecution('DEBUG', 'creds', creds)
      nlapiLogExecution('DEBUG', 'creds', Array.isArray(creds))
      nlapiLogExecution('DEBUG', 'postData', JSON.stringify(postData))
      // var res = nlapiRequestURLWithCredentials(creds, cUri, postData, { 'Content-Type': 'application/json' }, 'POST')
      var res = nlapiRequestURLWithCredentials(['shashank.maddela90@gmail.com', 'mytestaccount'], 'https://www.facebook.com/') // , postData, { 'Content-Type': 'application/json' }, 'POST')
      nlapiLogExecution('DEBUG', 'Capture response', JSON.stringify(res))
    } catch (e) {
      throw e
    } */
}