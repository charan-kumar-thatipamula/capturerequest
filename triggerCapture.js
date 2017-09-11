function execute() {
  try {
    nlapiLogExecution('DEBUG', 'Starting the Capture', '')
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
    var i = 0
    var flag = false
    resultSet.forEachResult(function (searchResult) {
      if (flag) {
        return true
      }
      // nlapiLogExecution('DEBUG', 'i', i)
      var fieldValueMap = {}
      for (var f in fieldsMap) {
        if (fieldsMap.hasOwnProperty(f)) {
          var field = fieldsMap[f]
          fieldValueMap[f] = searchResult.getValue(field)
          // nlapiLogExecution('DEBUG', 'field and value', field + ' : ' + fieldValueMap[f])
        }
      }
      try {
        // if (updateCaptureAmount(fieldValueMap)) {
        var transR = updateCaptureAmount(fieldValueMap)
        var res = sendRequest(fieldValueMap, [creds.username, creds.password])
        res = JSON.parse(res)
        if (res.transactionId) {
          createBill(fieldValueMap, transR)
          // flag = true
        } else {
          nlapiLogExecution('ERROR', 'Error capturing payment', JSON.stringify(res))
        }
        // }
      } catch (e) {
        nlapiLogExecution('DEBUG', 'SendRequest exception', e)
      }
      i++
      return true
    })
  } catch (e) {
    nlapiLogExecution('ERROR', 'Error capturing payment', e)
  }
  nlapiLogExecution('DEBUG', 'End of Capture', '')
}

function updateCaptureAmount(fieldValueMap) {
  try {
    var rec = nlapiTransformRecord('salesorder', fieldValueMap.orderid, 'cashsale')
    fieldValueMap.amount = rec.getFieldValue('total') || '0.00'
    nlapiLogExecution('DEBUG', 'Amount to Capture for Sales order #' + fieldValueMap.orderid, fieldValueMap.amount)
    return rec
  } catch (e) {
    nlapiLogExecution('ERROR', 'error updating capture amount', e)
    return false
  }
}

function createBill(fieldValueMap, rec) {
  try {
    nlapiLogExecution('DEBUG', 'Creating Bill', fieldValueMap.orderid)
    // var rec = nlapiTransformRecord('salesorder', fieldValueMap.orderid, 'cashsale')
    if (!rec.getFieldValue('ccnumber')) {
      if (rec.getFieldValue('paymentmethod') === '5') {
        rec.setFieldValue('ccnumber', '4242424242424242')
      } else if (rec.getFieldValue('paymentmethod') === '4') {
        rec.setFieldValue('ccnumber', '5404000000000001')
      }
    }
    rec.setFieldValue('ccexpiredate', '01/2030')
    rec.setFieldValue('ccapproved', 'T')
    // nlapiLogExecution('DEBUG', 'Expiration Date', rec.getFieldValue())
    var recId = nlapiSubmitRecord(rec, true)
    nlapiLogExecution('DEBUG', 'Cashsale created for Sales order #' + fieldValueMap.orderid, recId)
    return recId
  } catch (e) {
    nlapiLogExecution('ERROR', 'Failed to create CashSale', e)
  }
}

function sendRequest(fieldsMap, creds) {
  try {
    // nlapiLogExecution('DEBUG', 'Credentials', JSON.stringify(creds))
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

    nlapiLogExecution('DEBUG', 'cUri', cUri)
    nlapiLogExecution('DEBUG', 'headers', JSON.stringify(headers))
    var res = nlapiRequestURLWithCredentials(creds, cUri, headers)
    nlapiLogExecution('DEBUG', 'Capture response', res.body)
    return res.body
  } catch (e) {
    throw e
  }
}

// {
// 	'transactionId': '82921414287852773',
// 	'data': {
// 		'litleTxnId': '82921414287852773',
// 		'response': '000',
// 		'responseTime': '2017-09-10T07:55:03',
// 		'postDate': '2017-09-10',
// 		'message': 'Approved',
// 		'@attributes': {
// 			'id': '59b4efd64cb343.76014286',
// 			'reportGroup': 'Default Report Group'
// 		},
// 		'RESULT': 0,
// 		'PNREF': '82921414287852773',
// 		'RESPMSG': 'Approved',
// 		'TRANSTIME': '2017-09-10T07:55:03'
// 	}
// }
