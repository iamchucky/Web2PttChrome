// The background page is asking us to get the URL on the page.
if (window == top) {
  chrome.extension.onRequest.addListener(function(req, sender, sendResponse) {
    if (req.action == 'getUrl') {
      sendResponse(document.URL);
    } else if (req.action == 'changeUrl') {
      if (req.data) {
        window.open(req.data, '_self');
      }
    }
  });
  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    // only receive from the extension
    if (sender.id != 'jfnehifaakillndjaeghdpopciihipmd')
      return;
    window.postMessage(msg, window.location.origin);
    window.focus();
  });
}
